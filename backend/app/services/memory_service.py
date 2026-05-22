"""Persistent user facts per session and optional cross-session user profile."""

from __future__ import annotations

import logging
import os

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


def resolve_user_id(session_id: str, explicit: str | None = None) -> str | None:
    if explicit:
        return explicit[:128]
    env_fp = os.getenv("USER_FINGERPRINT", "").strip()
    if env_fp:
        return env_fp[:128]
    return None


class MemoryService:
    def __init__(self, llm: BaseLLMClient) -> None:
        self.llm = llm

    async def extract_and_store(
        self,
        db: Session,
        session_id: str,
        message: str,
        user_id: str | None = None,
    ) -> None:
        uid = resolve_user_id(session_id, user_id)
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
            key = str(f["key"])[:256]
            row_id = f"{uid or session_id}:{key}"
            db.merge(
                UserMemory(
                    id=row_id,
                    session_id=session_id,
                    user_id=uid,
                    fact_key=key,
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

    def build_memory_prompt(
        self,
        db: Session,
        session_id: str,
        user_id: str | None = None,
    ) -> str:
        uid = resolve_user_id(session_id, user_id)
        lines: list[str] = []

        if uid:
            user_facts = (
                db.query(UserMemory)
                .filter(UserMemory.user_id == uid)
                .order_by(UserMemory.created_at.desc())
                .limit(15)
                .all()
            )
            lines.extend(f"- {f.fact_key}: {f.fact_value}" for f in user_facts)

        session_facts = (
            db.query(UserMemory)
            .filter_by(session_id=session_id)
            .order_by(UserMemory.created_at.desc())
            .limit(20)
            .all()
        )
        for f in session_facts:
            line = f"- {f.fact_key}: {f.fact_value}"
            if line not in lines:
                lines.append(line)

        if not lines:
            return ""
        return "Bekannte Fakten über den User:\n" + "\n".join(lines[:25])
