from app.services import rag_service
from app.services.embedding_cache import PersistentEmbeddingCache


def test_persistent_embedding_cache_roundtrip(tmp_path):
    cache = PersistentEmbeddingCache(tmp_path / "emb.db")
    vec = [0.1, 0.2, 0.3]
    cache.set("hello world", vec)
    loaded = cache.get("hello world")
    assert loaded is not None
    assert len(loaded) == len(vec)
    assert all(abs(a - b) < 1e-5 for a, b in zip(loaded, vec))
    assert cache.get("other") is None
    cache.close()


def test_hybrid_chunk_overlap():
    text = "First sentence here. Second sentence follows. Third one ends it."
    chunks = rag_service.hybrid_chunk(text, target_chars=40, overlap_chars=10)
    assert len(chunks) >= 2
    assert all(c.text for c in chunks)


def test_split_text_produces_chunks():
    text = ". ".join([f"Sentence number {i} with some words." for i in range(40)])
    chunks = rag_service.split_text(text, chunk_size=500, overlap=50)
    assert len(chunks) >= 2
    assert all(len(c) <= 550 for c in chunks)


def test_extract_text_from_empty_pdf(tmp_path):
    # Non-PDF file should not crash
    path = tmp_path / "empty.txt"
    path.write_text("hello", encoding="utf-8")
    result = rag_service.extract_text_from_pdf(str(path))
    assert result == ""
