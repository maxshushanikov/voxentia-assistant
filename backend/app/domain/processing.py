from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class ProcessingContext:
    lang: str
    speaker: str
    personality: str
    history: list[dict[str, str]]
    model: str
    rag_context: str
    rag_sources: list[dict[str, Any]]
    system_prompt: str
    is_first_exchange: bool
    effective_session_id: str
    branch_id: str
    temperature: float
    ab_assignment: Any = None


@dataclass(frozen=True)
class ChatResult:
    text: str
    audio_url: str | None
    session_id: str
    intent: str | None
    intent_confidence: float | None
    intent_source: str | None
    plugin_data: Any
    rag_sources: list[dict[str, Any]]
    message_id: int | None
