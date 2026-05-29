from typing import Optional

from app.core.database import get_db
from app.schemas.notes import NoteListResponse, NoteRequest, NoteResponse
from app.services.note_service import NoteService
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

router = APIRouter()
service = NoteService()

@router.get("/", response_model=NoteListResponse)
async def list_notes(
    session_id: Optional[str] = Query(None, max_length=128),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    notes = service.list_notes(db, session_id=session_id, limit=limit, offset=offset)
    return {"notes": [note.to_dict() for note in notes]}

@router.post("/", response_model=NoteResponse)
async def create_note(request: NoteRequest, db: Session = Depends(get_db)):
    note = service.create_note(db, title=request.title, content=request.content, session_id=request.session_id)
    return note.to_dict()

@router.put("/{note_id}", response_model=NoteResponse)
async def update_note(note_id: int, request: NoteRequest, db: Session = Depends(get_db)):
    note = service.update_note(db, note_id=note_id, title=request.title, content=request.content)
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    return note.to_dict()

@router.delete("/{note_id}")
async def delete_note(note_id: int, db: Session = Depends(get_db)):
    deleted = service.delete_note(db, note_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Note not found")
    return {"deleted": True, "note_id": note_id}
