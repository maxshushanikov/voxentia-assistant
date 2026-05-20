"""LLM-based sentiment tracking (SQLite, no extra ML model)."""

from __future__ import annotations

import logging

from app.models.sentiment import SentimentRecord
from sqlalchemy.orm import Session
from voxentia.services.llm_base import BaseLLMClient

logger = logging.getLogger(__name__)

SENTIMENT_PROMPT = """
Analysiere den emotionalen Ton der folgenden Nachricht.
Antworte NUR mit JSON: {{"score": -1.0..1.0, "label": "positive|negative|neutral"}}
Nachricht: "{message}"
"""


class EmotionService:
    def __init__(self, llm: BaseLLMClient) -> None:
        self.llm = llm

    async def analyze_and_store(self, db: Session, session_id: str, message: str) -> None:
        try:
            result = await self.llm.generate_json(
                SENTIMENT_PROMPT.format(message=message[:256]),
                temperature=0.0,
            )
        except Exception as e:
            logger.warning("Sentiment analysis failed: %s", e)
            return

        if not isinstance(result, dict):
            return

        try:
            score = float(result.get("score", 0.0))
            score = max(-1.0, min(1.0, score))
        except (TypeError, ValueError):
            score = 0.0

        label = str(result.get("label", "neutral"))
        if label not in ("positive", "negative", "neutral"):
            label = "neutral"

        db.add(SentimentRecord(session_id=session_id, score=score, label=label))
        try:
            db.commit()
        except Exception as e:
            logger.warning("Sentiment store failed: %s", e)
            db.rollback()

    def get_tone_hint(self, db: Session, session_id: str, window: int = 5) -> str:
        recent = (
            db.query(SentimentRecord)
            .filter_by(session_id=session_id)
            .order_by(SentimentRecord.recorded_at.desc())
            .limit(window)
            .all()
        )
        if not recent:
            return ""
        avg = sum(r.score for r in recent) / len(recent)
        if avg < -0.3:
            return "Der User wirkt angespannt. Antworte einfühlsam und ruhig."
        if avg > 0.5:
            return "Der User ist gut gelaunt. Antworte lebendig und positiv."
        return ""
