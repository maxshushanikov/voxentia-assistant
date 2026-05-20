from app.core.config import settings
from app.core.rate_limit import limiter
from app.services.voice_service import clone_voice_sample
from fastapi import APIRouter, File, HTTPException, Request, UploadFile

router = APIRouter()


@router.get("/clone/status")
@limiter.limit("30/minute")
async def voice_clone_status(request: Request):
    enabled = getattr(settings, "VOICE_CLONE_ENABLED", False)
    url = getattr(settings, "XTTS_URL", None)
    return {
        "enabled": enabled,
        "xtts_url": url,
        "ready": bool(enabled and url),
    }


@router.post("/clone")
@limiter.limit("5/minute")
async def voice_clone_upload(
    request: Request,
    speaker_id: str = "custom",
    audio: UploadFile = File(...),
):
    if not getattr(settings, "VOICE_CLONE_ENABLED", False):
        raise HTTPException(
            status_code=503,
            detail="Voice cloning disabled. Set VOICE_CLONE_ENABLED=true and start xtts-server.",
        )
    content = await audio.read()
    if len(content) > 15 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Sample too large (max 15MB)")

    result = await clone_voice_sample(content, audio.filename or "sample.wav", speaker_id)
    if result.get("error"):
        raise HTTPException(status_code=422, detail=result["error"])
    return result
