import logging

import chromadb
import httpx
from app.core.config import settings
from pypdf import PdfReader

logger = logging.getLogger(__name__)

_chroma_client = chromadb.PersistentClient(path=str(settings.CHROMA_DIR))
_collection = _chroma_client.get_or_create_collection(name="documents")


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


def split_text(text: str, chunk_size: int | None = None, overlap: int | None = None) -> list[str]:
    size = chunk_size or settings.RAG_CHUNK_SIZE
    overlap_val = overlap or settings.RAG_CHUNK_OVERLAP
    chunks: list[str] = []
    start = 0
    while start < len(text):
        end = start + size
        chunks.append(text[start:end])
        start += size - overlap_val
    return chunks


async def process_document(filepath: str, filename: str) -> dict:
    text = extract_text_from_pdf(filepath)
    if not text.strip():
        return {"error": "No text extracted from PDF"}

    chunks = split_text(text)
    stored = 0

    for i, chunk in enumerate(chunks):
        embedding = await get_embedding(chunk)
        if not embedding:
            continue
        doc_id = f"{filename}_chunk_{i}"
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


async def search_context(query: str, n_results: int = 3) -> str:
    if _collection.count() == 0:
        return ""

    query_embedding = await get_embedding(query)
    if not query_embedding:
        return ""

    results = _collection.query(
        query_embeddings=[query_embedding],
        n_results=min(n_results, _collection.count()),
    )

    if results and results.get("documents") and results["documents"][0]:
        return "\n\n".join(results["documents"][0])
    return ""


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
    return len(ids)
