from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.schemas.chat import ChatRequest, ChatResponse, HistoryResponse, MessageHistory, SessionListResponse, SessionSummary
from app.services.chat_service import chat_service
from app.services.voice_service import transcribe_audio_file

router = APIRouter()

@router.post("/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest, db: Session = Depends(get_db)):
    try:
        text, audio_url, intent, plugin_data = await chat_service.process_message(db, request)
        return {
            "text": text,
            "audio_url": audio_url,
            "session_id": request.session_id,
            "intent": intent,
            "plugin_data": plugin_data
        }
    except Exception as e:
        import traceback
        print(f"❌ Error in /chat: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/chat/history", response_model=HistoryResponse)
async def get_chat_history(session_id: str = "default", db: Session = Depends(get_db)):
    history = chat_service.get_history(db, session_id)
    formatted_history = [
        MessageHistory(role=m.role, content=m.content, timestamp=m.timestamp.isoformat())
        for m in history
    ]
    return {"history": formatted_history}

@router.get("/sessions", response_model=SessionListResponse)
async def get_sessions(db: Session = Depends(get_db)):
    """Returns all chat sessions ordered by most recent activity."""
    sessions = chat_service.get_sessions(db)
    return {
        "sessions": [
            SessionSummary(
                session_id=s["session_id"],
                title=s["title"],
                timestamp=s["timestamp"]
            )
            for s in sessions
        ]
    }

@router.post("/transcribe")
async def transcribe_endpoint(
    audio: UploadFile = File(...),
    language: str = Form("en")
):
    audio_bytes = await audio.read()
    text = await transcribe_audio_file(audio_bytes, audio.filename, audio.content_type, language)
    return {"text": text}
