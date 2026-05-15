import httpx
import hashlib
from app.core.config import settings

async def generate_tts_audio(text: str, speaker: str, language: str) -> str:
    """Proxy to TTS server and cache locally."""
    text_hash = hashlib.md5(f"{language}:{speaker}:{text}".encode()).hexdigest()
    filename = f"{text_hash}.wav"
    filepath = settings.AUDIO_CACHE_DIR / filename
    
    if filepath.exists():
        return f"/api/tts-audio/{filename}"
    
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            # Request audio generation from TTS server
            response = await client.post(
                f"{settings.TTS_URL}/tts",
                json={"text": text, "speaker": speaker, "language": language}
            )
            response.raise_for_status()
            result = response.json()
            
            audio_remote_url = result.get("audio_url")
            if not audio_remote_url:
                return None
            
            # Download the generated audio file
            audio_response = await client.get(f"{settings.TTS_URL}{audio_remote_url}")
            audio_response.raise_for_status()
            
            with open(filepath, "wb") as f:
                f.write(audio_response.content)
            
            return f"/api/tts-audio/{filename}"
    except Exception as e:
        print(f"TTS service error: {e}")
        return None

async def transcribe_audio_file(audio_bytes: bytes, filename: str, content_type: str, language: str = "en") -> str:
    """Proxy to Whisper server."""
    try:
        async with httpx.AsyncClient(timeout=60) as client:
            response = await client.post(
                f"{settings.WHISPER_URL}/transcribe",
                files={"audio": (filename, audio_bytes, content_type)},
                data={"language": language}
            )
            response.raise_for_status()
            return response.json().get("text", "")
    except Exception as e:
        print(f"Transcription error: {e}")
        return ""
