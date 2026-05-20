"""Personal knowledge graph — SQLite adjacency list, LLM triple extraction."""

from __future__ import annotations

import logging
import re

from app.models.knowledge import KnowledgeEdge
from sqlalchemy.orm import Session
from voxentia.services.llm_base import BaseLLMClient

logger = logging.getLogger(__name__)

EXTRACTION_PROMPT = """
Extrahiere aus der Nachricht Wissens-Dreiergruppen (Subjekt, Relation, Objekt).
Antworte NUR mit JSON-Array:
[{{"subject": "...", "relation": "...", "object": "...", "confidence": 0.0-1.0}}]
Keine Triples → [].
Nachricht: "{message}"
"""


def _slug(s: str) -> str:
    return re.sub(r"\s+", " ", s.strip())[:256]


class KnowledgeService:
    def __init__(self, llm: BaseLLMClient) -> None:
        self.llm = llm

    async def extract_and_store(
        self,
        db: Session,
        session_id: str,
        message: str,
        source_msg_id: int | None = None,
    ) -> int:
        try:
            triples = await self.llm.generate_json(
                EXTRACTION_PROMPT.format(message=message[:512]),
                temperature=0.0,
            )
        except Exception as e:
            logger.warning("Knowledge extraction failed: %s", e)
            return 0

        if not isinstance(triples, list):
            return 0

        stored = 0
        for t in triples:
            if not isinstance(t, dict):
                continue
            subj = _slug(str(t.get("subject", "")))
            rel = _slug(str(t.get("relation", "")))
            obj = _slug(str(t.get("object", "")))
            if not subj or not rel or not obj:
                continue
            try:
                conf = float(t.get("confidence", 0.8))
                conf = max(0.0, min(1.0, conf))
            except (TypeError, ValueError):
                conf = 0.8

            db.add(
                KnowledgeEdge(
                    session_id=session_id,
                    subject=subj,
                    relation=rel,
                    obj=obj,
                    confidence=conf,
                    source_msg=source_msg_id,
                )
            )
            stored += 1

        if stored:
            try:
                db.commit()
            except Exception as e:
                logger.warning("Knowledge commit failed: %s", e)
                db.rollback()
                return 0
        return stored

    def query_entity(self, db: Session, session_id: str, entity: str, limit: int = 20) -> list[KnowledgeEdge]:
        entity = _slug(entity)
        if not entity:
            return []
        return (
            db.query(KnowledgeEdge)
            .filter(
                KnowledgeEdge.session_id == session_id,
                (KnowledgeEdge.subject == entity) | (KnowledgeEdge.obj == entity),
            )
            .order_by(KnowledgeEdge.confidence.desc())
            .limit(limit)
            .all()
        )

    def build_graph_prompt(self, db: Session, session_id: str, query_hint: str = "") -> str:
        edges = (
            db.query(KnowledgeEdge)
            .filter_by(session_id=session_id)
            .order_by(KnowledgeEdge.confidence.desc())
            .limit(30)
            .all()
        )
        if query_hint:
            hinted = self.query_entity(db, session_id, query_hint, limit=15)
            seen = {e.id for e in edges}
            for e in hinted:
                if e.id not in seen:
                    edges.append(e)

        if not edges:
            return ""
        lines = [f"- {e.subject} —[{e.relation}]→ {e.obj}" for e in edges[:20]]
        return "Persönlicher Wissensgraph:\n" + "\n".join(lines)

    def list_edges(self, db: Session, session_id: str, limit: int = 100) -> list[dict]:
        rows = (
            db.query(KnowledgeEdge)
            .filter_by(session_id=session_id)
            .order_by(KnowledgeEdge.created_at.desc())
            .limit(limit)
            .all()
        )
        return [
            {
                "id": r.id,
                "subject": r.subject,
                "relation": r.relation,
                "object": r.obj,
                "confidence": r.confidence,
                "source_msg": r.source_msg,
            }
            for r in rows
        ]
