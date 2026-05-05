import os
from pathlib import Path
import httpx
import chromadb
from pypdf import PdfReader
from core.config import settings

# ChromaDB setup
CHROMA_PATH = Path("data/chroma")
CHROMA_PATH.mkdir(parents=True, exist_ok=True)
chroma_client = chromadb.PersistentClient(path=str(CHROMA_PATH))
collection = chroma_client.get_or_create_collection(name="documents")

async def get_embedding(text: str) -> list[float]:
    """Get embedding from Ollama."""
    try:
        async with httpx.AsyncClient(timeout=settings.OLLAMA_TIMEOUT) as client:
            response = await client.post(
                f"{settings.OLLAMA_URL}/api/embeddings",
                json={
                    "model": "nomic-embed-text",
                    "prompt": text
                }
            )
            response.raise_for_status()
            return response.json().get("embedding", [])
    except Exception as e:
        print(f"Error getting embedding: {e}")
        return []

def extract_text_from_pdf(filepath: str) -> str:
    """Extract text from PDF file."""
    text = ""
    try:
        reader = PdfReader(filepath)
        for page in reader.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"
    except Exception as e:
        print(f"Error extracting PDF: {e}")
    return text

def split_text(text: str, chunk_size: int = 500, overlap: int = 50) -> list[str]:
    """Split text into overlapping chunks."""
    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunks.append(text[start:end])
        start += chunk_size - overlap
    return chunks

async def process_document(filepath: str, filename: str):
    """Process a document and add it to the RAG collection."""
    text = extract_text_from_pdf(filepath)
    if not text:
        return {"error": "No text extracted from PDF"}
        
    chunks = split_text(text)
    
    # Process sequentially to not overload Ollama
    for i, chunk in enumerate(chunks):
        embedding = await get_embedding(chunk)
        if embedding:
            doc_id = f"{filename}_chunk_{i}"
            collection.add(
                embeddings=[embedding],
                documents=[chunk],
                metadatas=[{"source": filename, "chunk": i}],
                ids=[doc_id]
            )
            
    return {"message": f"Processed {len(chunks)} chunks from {filename}"}

async def search_context(query: str, n_results: int = 3) -> str:
    """Search for relevant context."""
    if collection.count() == 0:
        return ""
        
    query_embedding = await get_embedding(query)
    if not query_embedding:
        return ""
        
    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=min(n_results, collection.count())
    )
    
    if results and results["documents"] and results["documents"][0]:
        contexts = results["documents"][0]
        # Combine contexts
        return "\n\n".join(contexts)
    return ""
