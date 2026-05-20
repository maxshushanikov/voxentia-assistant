"""
XTTS voice-cloning sidecar (skeleton).

Full Coqui XTTS requires GPU + large model download. This service provides:
- Health endpoint for orchestration
- Sample registration (saved to disk for future synthesis)
- Stub synthesis that documents how to enable real XTTS

Set ENABLE_XTTS_SYNTHESIS=true after installing: pip install TTS torch
"""

from __future__ import annotations

import os
import uuid
from pathlib import Path

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.responses import JSONResponse

app = FastAPI(title="Voxentia XTTS Sidecar", version="0.1.0")

VOICES_DIR = Path(os.getenv("VOICES_DIR", "/app/voices"))
VOICES_DIR.mkdir(parents=True, exist_ok=True)
ENABLE_SYNTHESIS = os.getenv("ENABLE_XTTS_SYNTHESIS", "false").lower() == "true"


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "synthesis_enabled": ENABLE_SYNTHESIS,
        "voices_registered": len(list(VOICES_DIR.glob("*.wav"))),
    }


@app.post("/register")
async def register_voice(
    speaker_id: str = Form("custom"),
    audio: UploadFile = File(...),
):
    content = await audio.read()
    if len(content) < 1000:
        raise HTTPException(status_code=400, detail="Audio sample too short")
    safe_id = "".join(c for c in speaker_id if c.isalnum() or c in "-_")[:64] or "custom"
    path = VOICES_DIR / f"{safe_id}.wav"
    path.write_bytes(content)
    return {"speaker_id": safe_id, "path": str(path), "bytes": len(content)}


@app.post("/synthesize")
async def synthesize(text: str = Form(...), speaker_id: str = Form("custom")):
    if not ENABLE_SYNTHESIS:
        return JSONResponse(
            status_code=501,
            content={
                "error": "XTTS synthesis not enabled",
                "hint": "Install TTS package and set ENABLE_XTTS_SYNTHESIS=true",
            },
        )
    voice = VOICES_DIR / f"{speaker_id}.wav"
    if not voice.exists():
        raise HTTPException(status_code=404, detail=f"No voice sample for {speaker_id}")

    try:
        from TTS.api import TTS  # type: ignore

        tts = TTS("tts_models/multilingual/multi-dataset/xtts_v2")
        out = VOICES_DIR / f"out_{uuid.uuid4().hex[:8]}.wav"
        tts.tts_to_file(text=text[:500], speaker_wav=str(voice), language="en", file_path=str(out))
        return {"audio_path": str(out), "text_length": len(text)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", "5004")))
