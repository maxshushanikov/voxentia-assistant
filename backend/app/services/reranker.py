"""Optional cross-encoder re-ranking for RAG (sentence-transformers)."""

from __future__ import annotations

import logging
logger = logging.getLogger(__name__)

_cross_encoder = None
_load_failed = False


def _get_cross_encoder():
    global _cross_encoder, _load_failed
    if _load_failed:
        return None
    if _cross_encoder is not None:
        return _cross_encoder
    try:
        from sentence_transformers import CrossEncoder

        _cross_encoder = CrossEncoder("cross-encoder/ms-marco-MiniLM-L-6-v2")
        logger.info("Cross-encoder reranker loaded")
        return _cross_encoder
    except Exception as e:
        logger.warning("Cross-encoder unavailable: %s", e)
        _load_failed = True
        return None


def rerank_hits(query: str, hits: list, top_k: int) -> list:
    if not hits:
        return hits
    model = _get_cross_encoder()
    if model is None:
        return hits[:top_k]

    pairs = [(query, h.text) for h in hits if h.text]
    if not pairs:
        return hits[:top_k]

    try:
        scores = model.predict(pairs)
        scored = list(zip(hits, scores))
        scored.sort(key=lambda x: float(x[1]), reverse=True)
        result = []
        for hit, score in scored[:top_k]:
            hit.score = round(float(score), 3)
            result.append(hit)
        return result
    except Exception as e:
        logger.warning("Reranking failed: %s", e)
        return hits[:top_k]
