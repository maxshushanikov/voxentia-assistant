import logging
import re

import chromadb
import httpx
from app.core.config import settings
from pypdf import PdfReader

logger = logging.getLogger(__name__)

_chroma_client = chromadb.PersistentClient(path=str(settings.CHROMA_DIR))
_collection = _chroma_client.get_or_create_collection(name="documents")

_SENTENCE_SPLIT = re.compile(r"(?<=[.!?])\s+")


def get_collection():
    return _collection


async def get_embedding(text: str) -> list[float]:
    try:
        async with httpx.AsyncClient(timeout=settings.OLLAMA_TIMEOUT) as client:
            response = await client.post(
                f"{settings.OLLAMA_URL}/api/embeddings",
                json={"model": settings.EMBEDDING_MODEL, "prompt": text},
            )
            response.raise_for_status()
            return response.json().get("embedding", [])
    except Exception as e:
        logger.warning("Embedding request failed: %s", e)
        return []


def extract_text_from_pdf(filepath: str) -> str:
    text = ""
    try:
        reader = PdfReader(filepath)
        for page in reader.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"
    except Exception as e:
        logger.warning("PDF extraction failed for %s: %s", filepath, e)
    return text


def split_text_sentences(
    text: str, max_chars: int | None = None, overlap: int | None = None
) -> list[str]:
    """Sentence-aware chunking with character cap per chunk."""
    max_chars = max_chars or settings.RAG_CHUNK_SIZE
    overlap = overlap or settings.RAG_CHUNK_OVERLAP
    sentences = [s.strip() for s in _SENTENCE_SPLIT.split(text) if s.strip()]
    if not sentences:
        return split_text_chars(text, max_chars, overlap)

    chunks: list[str] = []
    current = ""
    for sentence in sentences:
        candidate = f"{current} {sentence}".strip() if current else sentence
        if len(candidate) <= max_chars:
            current = candidate
        else:
            if current:
                chunks.append(current)
            current = sentence if len(sentence) <= max_chars else sentence[:max_chars]
    if current:
        chunks.append(current)

    if overlap > 0 and len(chunks) > 1:
        overlapped = [chunks[0]]
        for i in range(1, len(chunks)):
            tail = chunks[i - 1][-overlap:] if len(chunks[i - 1]) > overlap else chunks[i - 1]
            overlapped.append(f"{tail} {chunks[i]}".strip())
        return overlapped
    return chunks


def split_text_chars(text: str, chunk_size: int, overlap: int) -> list[str]:
    chunks: list[str] = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunks.append(text[start:end])
        start += chunk_size - overlap
    return chunks


def split_text(text: str, chunk_size: int | None = None, overlap: int | None = None) -> list[str]:
    return split_text_sentences(text, chunk_size, overlap)


async def process_document(filepath: str, filename: str) -> dict:
    text = extract_text_from_pdf(filepath)
    if not text.strip():
        return {"error": "No text extracted from PDF"}

    chunks = split_text(text)
    stored = 0
    
    import hashlib
    file_hash = hashlib.md5(text.encode('utf-8', errors='ignore')).hexdigest()[:8]

    for i, chunk in enumerate(chunks):
        embedding = await get_embedding(chunk)
        if not embedding:
            continue
        doc_id = f"{file_hash}_{filename}_chunk_{i}"
        _collection.upsert(
            embeddings=[embedding],
            documents=[chunk],
            metadatas=[{"source": filename, "chunk": i}],
            ids=[doc_id],
        )
        stored += 1

    if stored == 0:
        return {"error": "Could not generate embeddings (is Ollama running with nomic-embed-text?)"}

    return {"message": f"Processed {stored} chunks from {filename}", "chunks": stored}


def _distance_to_confidence(distance: float) -> float:
    return max(0.0, min(1.0, 1.0 - distance))


async def search_context(query: str, n_results: int | None = None) -> str:
    if _collection.count() == 0:
        return ""

    n_results = n_results or settings.RAG_MAX_CHUNKS
    query_embedding = await get_embedding(query)
    if not query_embedding:
        return ""

    results = _collection.query(
        query_embeddings=[query_embedding],
        n_results=min(n_results, _collection.count()),
        include=["documents", "distances"],
    )

    documents = (results.get("documents") or [[]])[0]
    distances = (results.get("distances") or [[]])[0]
    if not documents:
        return ""

    relevant: list[str] = []
    for doc, dist in zip(documents, distances):
        confidence = _distance_to_confidence(dist)
        if confidence >= settings.RAG_MIN_CONFIDENCE:
            relevant.append(doc)

    return "\n\n".join(relevant)


def list_documents() -> list[dict]:
    if _collection.count() == 0:
        return []

    meta = _collection.get(include=["metadatas"])
    sources: dict[str, int] = {}
    for item in meta.get("metadatas") or []:
        if not item:
            continue
        source = item.get("source", "unknown")
        sources[source] = sources.get(source, 0) + 1

    return [{"filename": name, "chunks": count} for name, count in sorted(sources.items())]


async def delete_document(filename: str) -> int:
    existing = _collection.get(where={"source": filename})
    ids = existing.get("ids") or []
    if ids:
        _collection.delete(ids=ids)
    upload_path = settings.UPLOADS_DIR / filename
    if upload_path.exists():
        upload_path.unlink()
    else:
        logger.warning(f"File {filename} not found in UPLOADS_DIR during deletion")
    return len(ids)
