from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field


class NoteRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=128)
    content: str = Field(..., min_length=1)
    session_id: Optional[str] = Field(None, max_length=128)
    tags: Optional[List[str]] = None


class NoteSummaryResponse(BaseModel):
    id: int
    summary: str


class NoteTaskCreateRequest(BaseModel):
    priority: Optional[str] = Field("medium", pattern="^(low|medium|high|critical)$")
    tags: Optional[List[str]] = None


class NoteResponse(BaseModel):
    id: int
    title: str
    content: str
    session_id: Optional[str]
    tags: Optional[List[str]] = None
    summary: Optional[str] = None
    created_at: Optional[datetime]
    updated_at: Optional[datetime]


class NoteListResponse(BaseModel):
    notes: list[NoteResponse]
