"""Persistent user facts per session (SQLite)."""

from __future__ import annotations

import logging

from app.models.memory import UserMemory
from sqlalchemy.orm import Session
from voxentia.services.llm_base import BaseLLMClient

logger = logging.getLogger(__name__)

EXTRACTION_PROMPT = """
Extrahiere aus der folgenden Nachricht persistente Fakten über den User.
Gib NUR JSON zurück: [{{"key": "...", "value": "...", "confidence": "high|medium|low"}}]
Keine Fakten → leeres Array [].
Nachricht: "{message}"
"""


class MemoryService:
    def __init__(self, llm: BaseLLMClient) -> None:
        self.llm = llm

    async def extract_and_store(self, db: Session, session_id: str, message: str) -> None:
        try:
            facts = await self.llm.generate_json(
                EXTRACTION_PROMPT.format(message=message[:512]),
                temperature=0.0,
            )
        except Exception as e:
            logger.warning("Memory extraction failed: %s", e)
            return

        if not isinstance(facts, list):
            return

        for f in facts:
            if not isinstance(f, dict) or not f.get("key") or not f.get("value"):
                continue
            row_id = f"{session_id}:{f['key']}"
            db.merge(
                UserMemory(
                    id=row_id,
                    session_id=session_id,
                    fact_key=str(f["key"])[:256],
                    fact_value=str(f["value"]),
                    source="extracted",
                    confidence=str(f.get("confidence", "medium"))[:8],
                )
            )
        try:
            db.commit()
        except Exception as e:
            logger.warning("Memory store commit failed: %s", e)
            db.rollback()

    def build_memory_prompt(self, db: Session, session_id: str) -> str:
        facts = (
            db.query(UserMemory)
            .filter_by(session_id=session_id)
            .order_by(UserMemory.created_at.desc())
            .limit(20)
            .all()
        )
        if not facts:
            return ""
        lines = [f"- {f.fact_key}: {f.fact_value}" for f in facts]
        return "Bekannte Fakten über den User:\n" + "\n".join(lines)
