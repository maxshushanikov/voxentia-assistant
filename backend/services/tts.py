import httpx
import hashlib
from pathlib import Path
from core.config import settings

CACHE_DIR = Path("data/audio")
CACHE_DIR.mkdir(parents=True, exist_ok=True)

async def generate_audio(text: str, speaker: str = "baya", language: str = "en") -> str:
    # Ensure speaker and language are included in hash
    text_hash = hashlib.md5(f"{language}:{speaker}:{text}".encode()).hexdigest()
    filename = f"{text_hash}.wav"
    filepath = CACHE_DIR / filename
    
    if filepath.exists():
        return f"/api/tts-audio/{filename}"
    
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(
                f"{settings.TTS_URL}/tts",
                json={"text": text, "speaker": speaker, "language": language}
            )
            response.raise_for_status()
            result = response.json()
            
            audio_url = result.get("audio_url")
            if not audio_url:
                return None
            
            audio_response = await client.get(f"{settings.TTS_URL}{audio_url}")
            audio_response.raise_for_status()
            
            with open(filepath, "wb") as f:
                f.write(audio_response.content)
            
            return f"/api/tts-audio/{filename}"
    except Exception as e:
        print(f"TTS service error (backend): {e}")
        return None