import hashlib
import logging
import re

import httpx
from app.core.config import settings
from app.core.http_client import shared_client

logger = logging.getLogger(__name__)

TTS_TIMEOUT = float(getattr(settings, "TTS_TIMEOUT", 120))
MAX_TTS_CHARS = 2000


def sanitize_for_tts(text: str) -> str:
    """Strip markup/emotion tags so Silero receives speakable plain text."""
    if not text:
        return ""
    text = re.sub(r"\[.*?\]", "", text)
    text = re.sub(r"\(.*?\)", "", text)
    text = re.sub(r"[*_~`#]", "", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text[:MAX_TTS_CHARS]


async def generate_tts_audio(text: str, speaker: str, language: str) -> str | None:
    """Proxy to TTS server and cache locally."""
    clean_text = sanitize_for_tts(text)
    if not clean_text:
        logger.info("Skipping TTS: no speakable text after sanitization")
        return None

    text_hash = hashlib.md5(f"{language}:{speaker}:{clean_text}".encode()).hexdigest()
    filename = f"{text_hash}.wav"
    filepath = settings.AUDIO_CACHE_DIR / filename

    if filepath.exists():
        return f"/api/tts-audio/{filename}"

    try:
        response = await shared_client.post(
            f"{settings.TTS_URL}/tts",
            json={"text": clean_text, "speaker": speaker, "language": language},
            timeout=TTS_TIMEOUT,
        )
        response.raise_for_status()
        result = response.json()

        audio_remote_url = result.get("audio_url")
        if not audio_remote_url:
            logger.warning("TTS server returned no audio_url: %s", result)
            return None

        audio_response = await shared_client.get(
            f"{settings.TTS_URL}{audio_remote_url}",
            timeout=TTS_TIMEOUT,
        )
        audio_response.raise_for_status()

        filepath.parent.mkdir(parents=True, exist_ok=True)
        filepath.write_bytes(audio_response.content)
        logger.info("TTS cached: %s (%d bytes)", filename, len(audio_response.content))
        return f"/api/tts-audio/{filename}"
    except httpx.HTTPStatusError as e:
        logger.warning(
            "TTS HTTP error %s: %s",
            e.response.status_code,
            e.response.text[:200] if e.response.text else "",
        )
    except Exception as e:
        logger.warning("TTS service error: %s", e)
    return None


async def transcribe_audio_file(
    audio_bytes: bytes, filename: str, content_type: str, language: str = "en"
) -> str:
    try:
        response = await shared_client.post(
            f"{settings.WHISPER_URL}/transcribe",
            files={"audio": (filename, audio_bytes, content_type)},
            data={"language": language},
            timeout=60.0,
        )
        response.raise_for_status()
        return response.json().get("text", "")
    except Exception as e:
        logger.warning("Transcription error: %s", e)
        return ""


async def clone_voice_sample(
    audio_bytes: bytes, filename: str, speaker_id: str = "custom"
) -> dict:
    """Register a voice sample with the XTTS sidecar."""
    xtts_url = getattr(settings, "XTTS_URL", None)
    if not xtts_url:
        return {"error": "XTTS_URL not configured"}

    try:
        response = await shared_client.post(
            f"{xtts_url.rstrip('/')}/register",
            files={"audio": (filename, audio_bytes, "audio/wav")},
            data={"speaker_id": speaker_id},
            timeout=float(getattr(settings, "XTTS_TIMEOUT", 180)),
        )
        response.raise_for_status()
        return response.json()
    except Exception as e:
        logger.warning("Voice clone registration failed: %s", e)
        return {"error": str(e)}
