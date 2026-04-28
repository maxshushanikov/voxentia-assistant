import httpx
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from core.config import settings

router = APIRouter()

@router.post("/transcribe")
async def transcribe_audio(
    audio: UploadFile = File(...),
    language: str = Form("en")
):
    """Proxy audio file to local Whisper server for transcription."""
    audio_bytes = await audio.read()

    try:
        async with httpx.AsyncClient(timeout=60) as client:
            response = await client.post(
                f"{settings.WHISPER_URL}/transcribe",
                files={"audio": (audio.filename, audio_bytes, audio.content_type)},
                data={"language": language}
            )
            response.raise_for_status()
            result = response.json()
            return result
    except httpx.ConnectError:
        raise HTTPException(status_code=503, detail="Whisper service unavailable")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
