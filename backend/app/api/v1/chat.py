from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.rate_limit import limiter
from app.schemas.chat import (
    ChatRequest,
    ChatResponse,
    HistoryResponse,
    MessageHistory,
    SessionListResponse,
    SessionSummary,
)
from app.services.chat_service import chat_service
from app.services.voice_service import transcribe_audio_file

router = APIRouter()


@router.post("/chat", response_model=ChatResponse)
@limiter.limit(settings.RATE_LIMIT)
async def chat_endpoint(
    request: Request,
    body: ChatRequest,
    db: Session = Depends(get_db),
):
    text, audio_url, intent, plugin_data = await chat_service.process_message(db, body)
    return {
        "text": text,
        "audio_url": audio_url,
        "session_id": body.session_id,
        "intent": intent,
        "plugin_data": plugin_data,
    }


@router.get("/chat/history", response_model=HistoryResponse)
@limiter.limit(settings.RATE_LIMIT)
async def get_chat_history(
    request: Request,
    session_id: str = "default",
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db),
):
    history, total = chat_service.get_history(db, session_id, limit=limit, offset=offset)
    formatted_history = [
        MessageHistory(role=m.role, content=m.content, timestamp=m.timestamp.isoformat())
        for m in history
    ]
    return {
        "history": formatted_history,
        "total": total,
        "offset": offset,
        "limit": limit,
    }


@router.get("/sessions", response_model=SessionListResponse)
@limiter.limit(settings.RATE_LIMIT)
async def get_sessions(request: Request, db: Session = Depends(get_db)):
    sessions = chat_service.get_sessions(db)
    return {
        "sessions": [
            SessionSummary(
                session_id=s["session_id"],
                title=s["title"],
                timestamp=s["timestamp"],
            )
            for s in sessions
        ]
    }


@router.delete("/sessions/{session_id}")
@limiter.limit("30/minute")
async def delete_session(
    request: Request,
    session_id: str,
    db: Session = Depends(get_db),
):
    deleted = chat_service.delete_session(db, session_id)
    if deleted == 0:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"message": "Session deleted", "session_id": session_id, "deleted_messages": deleted}


@router.delete("/sessions")
@limiter.limit("10/minute")
async def delete_all_sessions(request: Request, db: Session = Depends(get_db)):
    deleted = chat_service.delete_all_sessions(db)
    return {"message": "All sessions deleted", "deleted_messages": deleted}


@router.post("/transcribe")
@limiter.limit("30/minute")
async def transcribe_endpoint(
    request: Request,
    audio: UploadFile = File(...),
    language: str = Form("en"),
):
    audio_bytes = await audio.read()
    text = await transcribe_audio_file(
        audio_bytes, audio.filename, audio.content_type, language
    )
    return {"text": text}
