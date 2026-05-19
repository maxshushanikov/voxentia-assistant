"""Domain models — separate from SQLAlchemy ORM."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Optional


@dataclass(frozen=True)
class ChatMessageRecord:
    session_id: str
    role: str
    content: str
    timestamp: datetime
    model: Optional[str] = None


@dataclass(frozen=True)
class ChatSession:
    session_id: str
    title: str
    last_timestamp: datetime
    model: Optional[str] = None
