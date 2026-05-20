import json
import uuid

from app.core.config import settings
from app.core.database import get_db
from app.core.deps import get_chat_service
from app.core.rate_limit import limiter
from app.schemas.chat import (
    ChatRequest,
    ChatResponse,
    ForkSessionRequest,
    ForkSessionResponse,
    HistoryResponse,
    MessageHistory,
    SessionListResponse,
    SessionSummary,
)
from app.services.chat_service import ChatService
from app.services.voice_service import transcribe_audio_file
from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy.orm import Session

router = APIRouter()


@router.post("/chat", response_model=ChatResponse)
@limiter.limit(settings.RATE_LIMIT)
async def chat_endpoint(
    request: Request,
    body: ChatRequest,
    db: Session = Depends(get_db),
    chat_service: ChatService = Depends(get_chat_service),
):
    text, audio_url, intent, plugin_data, rag_sources, effective_session_id = (
        await chat_service.process_message(db, body, http_request=request)
    )
    intent_confidence = None
    intent_source = None
    if isinstance(plugin_data, dict):
        intent_confidence = plugin_data.get("intent_confidence")
        intent_source = plugin_data.get("intent_source")

    return {
        "text": text,
        "audio_url": audio_url,
        "session_id": effective_session_id,
        "intent": intent,
        "intent_confidence": intent_confidence,
        "intent_source": intent_source,
        "plugin_data": plugin_data,
        "rag_sources": rag_sources,
    }


@router.post("/chat/stream")
@limiter.limit(settings.RATE_LIMIT)
async def chat_stream_endpoint(
    request: Request,
    body: ChatRequest,
    db: Session = Depends(get_db),
    chat_service: ChatService = Depends(get_chat_service),
):
    async def event_generator():
        async for item in chat_service.process_message_stream(db, body):
            if item["event"] == "token":
                yield f"data: {json.dumps({'token': item['data']})}\n\n"
            elif item["event"] == "audio":
                yield f"data: {json.dumps({'audio': item['data']})}\n\n"
            else:
                yield f"data: {json.dumps({'done': item['data']})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@router.get("/chat/history", response_model=HistoryResponse)
@limiter.limit(settings.RATE_LIMIT)
async def get_chat_history(
    request: Request,
    session_id: str = "default",
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db),
    chat_service: ChatService = Depends(get_chat_service),
):
    history, total = chat_service.get_history(db, session_id, limit=limit, offset=offset)
    formatted_history = [
        MessageHistory(
            id=m.id,
            role=m.role,
            content=m.content,
            timestamp=m.timestamp.isoformat(),
            model=m.model,
            parent_id=m.parent_id,
            branch_id=m.branch_id,
        )
        for m in history
    ]
    return {"history": formatted_history, "total": total, "offset": offset, "limit": limit}


@router.get("/sessions", response_model=SessionListResponse)
@limiter.limit(settings.RATE_LIMIT)
async def get_sessions(
    request: Request,
    db: Session = Depends(get_db),
    chat_service: ChatService = Depends(get_chat_service),
):
    sessions = chat_service.get_sessions(db)
    return {
        "sessions": [
            SessionSummary(
                session_id=s.session_id,
                title=s.title,
                timestamp=s.last_timestamp.isoformat(),
                model=s.model,
            )
            for s in sessions
        ]
    }


@router.post("/sessions/new")
@limiter.limit("20/minute")
async def new_session(request: Request):
    return {"session_id": f"sess_{uuid.uuid4().hex[:12]}"}


@router.post("/sessions/fork", response_model=ForkSessionResponse)
@limiter.limit("20/minute")
async def fork_session(
    request: Request,
    body: ForkSessionRequest,
    db: Session = Depends(get_db),
    chat_service: ChatService = Depends(get_chat_service),
):
    try:
        new_sid, branch_id, copied = chat_service.fork_session(
            db, body.session_id, body.message_id
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e
    return ForkSessionResponse(
        session_id=new_sid,
        branch_id=branch_id,
        copied_messages=copied,
        parent_message_id=body.message_id,
    )


@router.post("/avatar/custom")
@limiter.limit("5/minute")
async def upload_custom_avatar(
    request: Request,
    file: UploadFile = File(...)
):
    if not file.filename or not file.filename.lower().endswith(".glb"):
        raise HTTPException(status_code=400, detail="Only GLB files are supported.")

    content = await file.read()
    if len(content) > 30 * 1024 * 1024:  # max 30MB
        raise HTTPException(status_code=413, detail="File too large (max 30MB).")

    # Check for valid GLB magic bytes: 0x676C5446 ("glTF")
    if not content.startswith(b"glTF"):
        raise HTTPException(
            status_code=400,
            detail="Invalid GLB file content (failed magic bytes check)."
        )

    avatar_path = settings.DATA_DIR / "custom_avatar.glb"
    avatar_path.parent.mkdir(parents=True, exist_ok=True)
    avatar_path.write_bytes(content)
    return {"message": "Custom avatar uploaded successfully"}


@router.get("/avatar/custom")
async def get_custom_avatar():
    avatar_path = settings.DATA_DIR / "custom_avatar.glb"
    if not avatar_path.exists():
        raise HTTPException(status_code=404, detail="Custom avatar not found.")
    return FileResponse(avatar_path)


@router.delete("/sessions/{session_id}")
@limiter.limit("30/minute")
async def delete_session(
    request: Request,
    session_id: str,
    db: Session = Depends(get_db),
    chat_service: ChatService = Depends(get_chat_service),
):
    deleted = chat_service.delete_session(db, session_id)
    if deleted == 0:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"message": "Session deleted", "session_id": session_id, "deleted_messages": deleted}


@router.delete("/sessions")
@limiter.limit("10/minute")
async def delete_all_sessions(
    request: Request,
    db: Session = Depends(get_db),
    chat_service: ChatService = Depends(get_chat_service),
):
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
    if audio.content_type not in ("audio/webm", "audio/wav", "audio/ogg", "audio/mp4", "audio/mp3", "audio/mpeg"):
        raise HTTPException(415, "Unsupported audio format")
    if len(audio_bytes) > settings.MAX_UPLOAD_BYTES:
        raise HTTPException(413, "Audio file too large")

    text = await transcribe_audio_file(
        audio_bytes, audio.filename, audio.content_type, language
    )
    return {"text": text}
