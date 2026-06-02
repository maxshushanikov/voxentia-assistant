from __future__ import annotations

import json

from app.core.database import Base
from sqlalchemy import Column, DateTime, Integer, String, Text
from sqlalchemy.sql import func


class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(128), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String(32), nullable=False, default="pending")
    priority = Column(String(16), nullable=False, default="medium")
    tags = Column(String(512), nullable=True)
    due_date = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "status": self.status,
            "priority": self.priority,
            "tags": self._deserialize_tags(self.tags),
            "due_date": self.due_date.isoformat() if self.due_date else None,
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
