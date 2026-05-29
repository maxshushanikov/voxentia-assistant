from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class TaskRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=128)
    description: Optional[str] = None
    status: Optional[str] = Field(None, pattern="^(pending|completed|cancelled|archived)$")
    due_date: Optional[datetime] = None


class TaskResponse(BaseModel):
    id: int
    title: str
    description: Optional[str]
    status: str
    due_date: Optional[datetime]
    created_at: Optional[datetime]
    updated_at: Optional[datetime]


class TaskUpdateRequest(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=128)
    description: Optional[str] = None
    status: Optional[str] = Field(None, pattern="^(pending|completed|cancelled|archived)$")
    due_date: Optional[datetime] = None


class TaskListResponse(BaseModel):
    tasks: list[TaskResponse]
