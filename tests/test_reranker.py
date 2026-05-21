from app.services.rag_service import RagSourceHit
from app.services.reranker import rerank_hits


def test_rerank_hits_fallback_without_model():
    hits = [
        RagSourceHit(filename="a.pdf", chunk_index=0, score=0.7, text="alpha doc"),
        RagSourceHit(filename="b.pdf", chunk_index=1, score=0.9, text="beta doc"),
    ]
    out = rerank_hits("query", hits, 1)
    assert len(out) == 1
