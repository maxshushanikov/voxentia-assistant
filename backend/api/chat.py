from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from services.llm import get_llm_response, stream_llm_response
from services.chat_history import save_message, get_history, clear_history
from services.tts import generate_audio
from services.rag import search_context
from core.config import settings

router = APIRouter()

@router.post("/chat")
async def chat_endpoint(request: dict):
    session_id = request.get("session_id", "default")
    user_message = request.get("message", "").strip()
    
    if not user_message:
        raise HTTPException(status_code=400, detail="Message cannot be empty")
    
    try:
        save_message(session_id, "user", user_message)
        
        history = get_history(session_id, settings.HISTORY_LIMIT)
        language = request.get("language", settings.DEFAULT_LANGUAGE)
        
        # Search for context only if the message is long enough to be a query
        rag_context = ""
        if len(user_message.split()) > 2:
            rag_context = await search_context(user_message)
        
        assistant_text = await get_llm_response(
            user_message, 
            history,
            request.get("model"),
            request.get("temperature", 0.7),
            language=language,
            rag_context=rag_context,
            image=request.get("image")
        )
        
        speaker = request.get("speaker", "baya")
        
        save_message(session_id, "assistant", assistant_text)
        
        audio_url = None
        if settings.TTS_URL:
            audio_url = await generate_audio(assistant_text, speaker, language)
        
        return {
            "text": assistant_text,
            "audio_url": audio_url,
            "session_id": session_id
        }
        
    except ConnectionError as e:
        raise HTTPException(status_code=503, detail="LLM service unavailable")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/chat/stream")
async def chat_stream_endpoint(request: dict):
    session_id = request.get("session_id", "default")
    user_message = request.get("message", "").strip()
    
    if not user_message:
        raise HTTPException(status_code=400, detail="Message cannot be empty")
        
    save_message(session_id, "user", user_message)
    history = get_history(session_id, settings.HISTORY_LIMIT)
    language = request.get("language", settings.DEFAULT_LANGUAGE)
    
    rag_context = ""
    if len(user_message.split()) > 2:
        rag_context = await search_context(user_message)

    async def event_generator():
        full_response = ""
        try:
            async for chunk in stream_llm_response(
                user_message,
                history,
                request.get("model"),
                request.get("temperature", 0.7),
                language=language,
                rag_context=rag_context,
                image=request.get("image")
            ):
                full_response += chunk
                yield chunk
            
            # After streaming is done, save to history
            save_message(session_id, "assistant", full_response)
            
        except Exception as e:
            yield f"\n[Error: {str(e)}]"

    return StreamingResponse(event_generator(), media_type="text/plain")

@router.post("/chat/clear")
async def clear_chat_endpoint(request: dict):
    session_id = request.get("session_id", "default")
    clear_history(session_id)
    return {"status": "history cleared"}

@router.post("/tts/generate")
async def tts_endpoint(request: dict):
    text = request.get("text", "")
    speaker = request.get("speaker", "baya")
    language = request.get("language", "en")
    if not text:
        return {"audio_url": None}
    audio_url = await generate_audio(text, speaker, language)
    return {"audio_url": audio_url}