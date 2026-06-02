from __future__ import annotations

import json

from app.core.database import Base
from sqlalchemy import Column, DateTime, Integer, String, Text
from sqlalchemy.sql import func


class Note(Base):
    __tablename__ = "notes"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String(128), index=True, nullable=True)
    title = Column(String(128), nullable=False)
    content = Column(Text, nullable=False)
    tags = Column(String(512), nullable=True)
    summary = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    def to_dict(self):
        return {
            "id": self.id,
            "session_id": self.session_id,
            "title": self.title,
            "content": self.content,
            "tags": self._deserialize_tags(self.tags),
            "summary": self.summary,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }

    @staticmethod
    def _deserialize_tags(tags: str | None) -> list[str]:
        if not tags:
            return []
        try:
            return json.loads(tags) if tags.startswith("[") else [t.strip() for t in tags.split(",") if t.strip()]
        except Exception:
            return [t.strip() for t in tags.split(",") if t.strip()]

    @staticmethod
    def serialize_tags(tags: list[str] | None) -> str | None:
        if not tags:
            return None
        cleaned = [t.strip() for t in tags if t and t.strip()]
        return json.dumps(cleaned) if cleaned else None
