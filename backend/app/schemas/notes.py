from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class NoteRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=128)
    content: str = Field(..., min_length=1)
    session_id: Optional[str] = Field(None, max_length=128)


class NoteResponse(BaseModel):
    id: int
    title: str
    content: str
    session_id: Optional[str]
    created_at: Optional[datetime]
    updated_at: Optional[datetime]


class NoteListResponse(BaseModel):
    notes: list[NoteResponse]
