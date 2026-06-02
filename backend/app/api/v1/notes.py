from typing import Optional

from app.core.database import get_db
from app.schemas.notes import (
    NoteListResponse,
    NoteRequest,
    NoteResponse,
    NoteSummaryResponse,
    NoteTaskCreateRequest,
)
from app.schemas.tasks import TaskListResponse
from app.services.note_service import NoteService
from app.services.task_service import TaskService
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

router = APIRouter()
service = NoteService()
task_service = TaskService()

@router.get("/", response_model=NoteListResponse)
async def list_notes(
    session_id: Optional[str] = Query(None, max_length=128),
    tag: Optional[str] = Query(None, max_length=64),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    notes = service.list_notes(db, session_id=session_id, tag=tag, limit=limit, offset=offset)
    return {"notes": [note.to_dict() for note in notes]}

@router.post("/", response_model=NoteResponse)
async def create_note(request: NoteRequest, db: Session = Depends(get_db)):
    note = service.create_note(
        db,
        title=request.title,
        content=request.content,
        session_id=request.session_id,
        tags=request.tags,
    )
    return note.to_dict()

@router.put("/{note_id}", response_model=NoteResponse)
async def update_note(note_id: int, request: NoteRequest, db: Session = Depends(get_db)):
    note = service.update_note(
        db,
        note_id=note_id,
        title=request.title,
        content=request.content,
        tags=request.tags,
    )
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    return note.to_dict()

@router.post("/{note_id}/summary", response_model=NoteSummaryResponse)
async def summarize_note(note_id: int, db: Session = Depends(get_db)):
    summary = await service.generate_summary(db, note_id)
    if summary is None:
        raise HTTPException(status_code=404, detail="Note not found")
    return {"id": note_id, "summary": summary}

@router.post("/{note_id}/tasks", response_model=TaskListResponse)
async def create_tasks_from_note(
    note_id: int,
    request: NoteTaskCreateRequest,
    db: Session = Depends(get_db),
):
    tasks = await service.create_tasks_from_note(
        db,
        note_id=note_id,
        priority=request.priority,
        tags=request.tags,
    )
    return {"tasks": [task.to_dict() for task in tasks]}

@router.delete("/{note_id}")
async def delete_note(note_id: int, db: Session = Depends(get_db)):
    deleted = service.delete_note(db, note_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Note not found")
    return {"deleted": True, "note_id": note_id}
