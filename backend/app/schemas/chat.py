from pydantic import BaseModel
from typing import Optional, List, Any

class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = "default"
    language: Optional[str] = "en"
    speaker: Optional[str] = "baya"
    personality: Optional[str] = "professional"
    model: Optional[str] = None
    temperature: Optional[float] = 0.7

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

class SessionSummary(BaseModel):
    session_id: str
    title: str
    timestamp: str

class SessionListResponse(BaseModel):
    sessions: List[SessionSummary]
