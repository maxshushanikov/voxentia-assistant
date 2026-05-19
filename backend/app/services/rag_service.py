import ipaddress
import logging
import re
import socket
import xml.etree.ElementTree as ET
import zipfile
from urllib.parse import urlparse

import chromadb
from app.core.config import settings
from pypdf import PdfReader

logger = logging.getLogger(__name__)

_chroma_client = None
_collection = None


def get_collection():
    global _chroma_client, _collection
    if _collection is None:
        if getattr(settings, "ENABLE_RAG", True):
            try:
                _chroma_client = chromadb.PersistentClient(path=str(settings.CHROMA_DIR))
                _collection = _chroma_client.get_or_create_collection(name="documents")
            except Exception as e:
                logger.error("ChromaDB client failed to initialize: %s. RAG features are disabled.", e)
    return _collection


_SENTENCE_SPLIT = re.compile(r"(?<=[.!?])\s+")


def _is_safe_ip(ip_str: str) -> bool:
    try:
        ip = ipaddress.ip_address(ip_str)
        return not (ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_multicast or ip.is_reserved)
    except ValueError:
        return False


def validate_url_for_ssrf(url: str) -> str:
    """Validate and resolve URL, ensuring it is a safe public endpoint to prevent SSRF and DNS rebinding."""
    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https"):
        raise ValueError("Only http and https schemes are allowed.")

    host = parsed.hostname
    if not host:
        raise ValueError("Invalid URL host.")

    try:
        addr_info = socket.getaddrinfo(host, parsed.port or (80 if parsed.scheme == "http" else 443))
        ips = [info[4][0] for info in addr_info]
    except Exception as e:
        raise ValueError(f"Could not resolve host: {e}")

    for ip in ips:
        if not _is_safe_ip(ip):
            raise ValueError(f"URL resolves to an unsafe local or private address: {ip}")

    return url


# Simple in-memory embedding cache to avoid redundant network hits for identical text
_embedding_cache: dict[str, list[float]] = {}


async def get_embedding(text: str) -> list[float]:
    if text in _embedding_cache:
        return _embedding_cache[text]

    from app.core.http_client import shared_client
    try:
        response = await shared_client.post(
            f"{settings.OLLAMA_URL}/api/embeddings",
            json={"model": settings.EMBEDDING_MODEL, "prompt": text},
            timeout=settings.OLLAMA_TIMEOUT,
        )
        response.raise_for_status()
        emb = response.json().get("embedding", [])
        if emb:
            _embedding_cache[text] = emb
        return emb
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


def extract_text_from_docx(filepath: str) -> str:
    try:
        with zipfile.ZipFile(filepath) as docx:
            xml_content = docx.read('word/document.xml')
            root = ET.fromstring(xml_content)
            namespaces = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
            text = " ".join(node.text for node in root.findall('.//w:t', namespaces) if node.text)
            return text
    except Exception as e:
        logger.warning("DOCX extraction failed for %s: %s", filepath, e)
        return ""


def extract_text_from_plain(filepath: str) -> str:
    try:
        with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
            return f.read()
    except Exception as e:
        logger.warning("Plain text extraction failed for %s: %s", filepath, e)
        return ""


def split_text(text: str, chunk_size: int | None = None, overlap: int | None = None) -> list[str]:
    return split_text_sentences(text, chunk_size, overlap)


async def process_document(filepath: str, filename: str) -> dict:
    coll = get_collection()
    if coll is None:
        return {"error": "RAG features are disabled because ChromaDB failed to initialize."}
    ext = filename.lower()
    if ext.endswith(".pdf"):
        text = extract_text_from_pdf(filepath)
    elif ext.endswith(".docx"):
        text = extract_text_from_docx(filepath)
    elif ext.endswith((".txt", ".md", ".json", ".csv")):
        text = extract_text_from_plain(filepath)
    else:
        return {"error": f"Unsupported file extension for {filename}"}

    if not text.strip():
        return {"error": f"No text extracted from {filename}"}

    chunks = split_text(text)
    stored = 0

    import hashlib
    file_hash = hashlib.md5(text.encode('utf-8', errors='ignore')).hexdigest()[:8]

    for i, chunk in enumerate(chunks):
        embedding = await get_embedding(chunk)
        if not embedding:
            continue
        doc_id = f"{file_hash}_{filename}_chunk_{i}"
        coll.upsert(
            embeddings=[embedding],
            documents=[chunk],
            metadatas=[{"source": filename, "chunk": i}],
            ids=[doc_id],
        )
        stored += 1

    if stored == 0:
        return {"error": "Could not generate embeddings (is Ollama running with nomic-embed-text?)"}

    return {"message": f"Processed {stored} chunks from {filename}", "chunks": stored}


async def process_url(url: str) -> dict:
    coll = get_collection()
    if coll is None:
        return {"error": "RAG features are disabled because ChromaDB failed to initialize."}
    try:
        # Prevent SSRF (including DNS rebinding attacks)
        validate_url_for_ssrf(url)

        from app.core.http_client import shared_client
        response = await shared_client.get(url, timeout=10.0)
        response.raise_for_status()
        html_content = response.text

        import html
        from html.parser import HTMLParser

        class HTMLTextExtractor(HTMLParser):
            def __init__(self):
                super().__init__()
                self.text = []
                self.ignore_tags = {"script", "style", "head", "nav", "footer", "noscript"}
                self.tag_stack = []

            def handle_starttag(self, tag, attrs):
                self.tag_stack.append(tag.lower())

            def handle_endtag(self, tag):
                t = tag.lower()
                if t in self.tag_stack:
                    while self.tag_stack:
                        popped = self.tag_stack.pop()
                        if popped == t:
                            break

            def handle_data(self, data):
                if not any(ignored in self.tag_stack for ignored in self.ignore_tags):
                    cleaned = html.unescape(data).strip()
                    if cleaned:
                        self.text.append(cleaned)

            def get_text(self):
                return "\n".join(self.text)

        parser = HTMLTextExtractor()
        parser.feed(html_content)
        text = parser.get_text()

        if not text.strip():
            return {"error": "No readable text extracted from URL"}

        from urllib.parse import urlparse
        parsed = urlparse(url)
        filename = f"web_{parsed.netloc}{parsed.path.replace('/', '_')}"
        if len(filename) > 60:
            filename = filename[:60]

        chunks = split_text(text)
        stored = 0
        import hashlib
        file_hash = hashlib.md5(text.encode('utf-8', errors='ignore')).hexdigest()[:8]

        for i, chunk in enumerate(chunks):
            embedding = await get_embedding(chunk)
            if not embedding:
                continue
            doc_id = f"{file_hash}_{filename}_chunk_{i}"
            coll.upsert(
                embeddings=[embedding],
                documents=[chunk],
                metadatas=[{"source": url, "chunk": i}],
                ids=[doc_id],
            )
            stored += 1

        if stored == 0:
            return {"error": "Could not generate embeddings for URL"}

        return {"message": f"Processed {stored} chunks from website {url}", "chunks": stored}
    except ValueError as ve:
        logger.warning("SSRF validation blocked request: %s", ve)
        return {"error": f"Security validation failed: {str(ve)}"}
    except Exception as e:
        logger.warning("URL extraction failed for %s: %s", url, e)
        return {"error": f"Failed to fetch or parse URL: {str(e)}"}


def _distance_to_confidence(distance: float) -> float:
    return max(0.0, min(1.0, 1.0 - distance))


async def search_context(query: str, n_results: int | None = None) -> str:
    coll = get_collection()
    if coll is None or coll.count() == 0:
        return ""

    n_results = n_results or settings.RAG_MAX_CHUNKS
    query_embedding = await get_embedding(query)
    if not query_embedding:
        return ""

    results = coll.query(
        query_embeddings=[query_embedding],
        n_results=min(n_results, coll.count()),
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
    coll = get_collection()
    if coll is None or coll.count() == 0:
        return []

    meta = coll.get(include=["metadatas"])
    sources: dict[str, int] = {}
    for item in meta.get("metadatas") or []:
        if not item:
            continue
        source = item.get("source", "unknown")
        sources[source] = sources.get(source, 0) + 1

    return [{"filename": name, "chunks": count} for name, count in sorted(sources.items())]


async def delete_document(filename: str) -> int:
    coll = get_collection()
    if coll is None:
        return 0
    existing = coll.get(where={"source": filename})
    ids = existing.get("ids") or []
    if ids:
        coll.delete(ids=ids)
    upload_path = settings.UPLOADS_DIR / filename
    if upload_path.exists():
        upload_path.unlink()
    else:
        logger.warning(f"File {filename} not found in UPLOADS_DIR during deletion")
    return len(ids)
