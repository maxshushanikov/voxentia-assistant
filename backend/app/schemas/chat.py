from typing import Any, List, Optional

from app.schemas.enums import Language, Personality, Speaker
from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=4096)
    session_id: str = Field("default", max_length=128)
    language: Language = Language.EN
    speaker: Speaker = Speaker.BAYA
    personality: Personality = Personality.PROFESSIONAL
    model: Optional[str] = Field(None, max_length=64)
    temperature: float = Field(0.7, ge=0.0, le=2.0)


class ChatResponse(BaseModel):
    text: str
    audio_url: Optional[str] = None
    session_id: str
    intent: Optional[str] = None
    plugin_data: Optional[Any] = None


class MessageHistory(BaseModel):
    role: str
    content: str
    timestamp: str


class HistoryResponse(BaseModel):
    history: List[MessageHistory]
    total: int = 0
    offset: int = 0
    limit: int = 50


class SessionSummary(BaseModel):
    session_id: str
    title: str
    timestamp: str


class SessionListResponse(BaseModel):
    sessions: List[SessionSummary]
