import hashlib
import logging
import re
from typing import Protocol

import httpx
from app.core.config import settings
from app.core.events import publish_app_event
from app.core.http_client import traced_get, traced_post

logger = logging.getLogger(__name__)

TTS_TIMEOUT = float(settings.TTS_TIMEOUT)
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


class AudioBackend(Protocol):
    async def synthesize(self, text: str, speaker: str, language: str) -> bytes: ...

    async def transcribe(
        self,
        audio_bytes: bytes,
        filename: str,
        content_type: str,
        language: str = "en",
    ) -> str: ...


class CoquiBackend:
    async def synthesize(self, text: str, speaker: str, language: str) -> bytes:
        response = await traced_post(
            "tts",
            f"{settings.TTS_URL}/tts",
            json={"text": text, "speaker": speaker, "language": language},
            timeout=TTS_TIMEOUT,
            operation="synthesize",
        )
        result = response.json()
        audio_remote_url = result.get("audio_url")
        if not audio_remote_url:
            raise RuntimeError(f"TTS server returned no audio_url: {result}")
        audio_response = await traced_get(
            "tts",
            f"{settings.TTS_URL}{audio_remote_url}",
            timeout=TTS_TIMEOUT,
            operation="fetch_audio",
        )
        return audio_response.content

    async def transcribe(
        self, audio_bytes: bytes, filename: str, content_type: str, language: str = "en"
    ) -> str:
        raise NotImplementedError("Coqui backend does not support transcription")


class WhisperBackend:
    async def synthesize(self, text: str, speaker: str, language: str) -> bytes:
        raise NotImplementedError("Whisper backend does not support synthesis")

    async def transcribe(
        self, audio_bytes: bytes, filename: str, content_type: str, language: str = "en"
    ) -> str:
        response = await traced_post(
            "whisper",
            f"{settings.WHISPER_URL}/transcribe",
            files={"audio": (filename, audio_bytes, content_type)},
            data={"language": language},
            timeout=settings.WHISPER_TIMEOUT,
            operation="transcribe",
        )
        return response.json().get("text", "")


class XTTSBackend:
    async def synthesize(self, text: str, speaker: str, language: str) -> bytes:
        base = (settings.XTTS_URL or "").rstrip("/")
        if not base:
            raise RuntimeError("XTTS_URL not configured")
        response = await traced_post(
            "xtts",
            f"{base}/tts",
            json={"text": text, "speaker": speaker, "language": language},
            timeout=settings.XTTS_TIMEOUT,
            operation="synthesize",
        )
        result = response.json()
        audio_remote_url = result.get("audio_url")
        if not audio_remote_url:
            raise RuntimeError(f"XTTS server returned no audio_url: {result}")
        audio_response = await traced_get(
            "xtts",
            f"{base}{audio_remote_url}",
            timeout=settings.XTTS_TIMEOUT,
            operation="fetch_audio",
        )
        return audio_response.content

    async def transcribe(
        self, audio_bytes: bytes, filename: str, content_type: str, language: str = "en"
    ) -> str:
        raise NotImplementedError("XTTS backend does not support transcription")


def _tts_backend() -> AudioBackend:
    if settings.XTTS_URL and settings.VOICE_CLONE_ENABLED:
        return XTTSBackend()
    return CoquiBackend()


def _stt_backend() -> AudioBackend:
    return WhisperBackend()


async def generate_tts_audio(
    text: str,
    speaker: str,
    language: str,
    *,
    event_bus=None,
    session_id: str | None = None,
) -> str | None:
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
        if event_bus is not None:
            await publish_app_event(
                event_bus,
                "voice.tts.requested",
                {"session_id": session_id, "speaker": speaker, "language": language},
            )

        audio_content = await _tts_backend().synthesize(clean_text, speaker, language)
        filepath.parent.mkdir(parents=True, exist_ok=True)
        filepath.write_bytes(audio_content)
        logger.info("TTS cached: %s (%d bytes)", filename, len(audio_content))

        if event_bus is not None:
            await publish_app_event(
                event_bus,
                "voice.tts.completed",
                {"session_id": session_id, "cached": filename},
            )
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
    audio_bytes: bytes,
    filename: str,
    content_type: str,
    language: str = "en",
    *,
    event_bus=None,
) -> str:
    try:
        text = await _stt_backend().transcribe(audio_bytes, filename, content_type, language)
        if event_bus is not None:
            await publish_app_event(
                event_bus,
                "voice.stt.completed",
                {"language": language, "chars": len(text)},
            )
        return text
    except Exception as e:
        logger.warning("Transcription error: %s", e)
        return ""


async def clone_voice_sample(
    audio_bytes: bytes, filename: str, speaker_id: str = "custom"
) -> dict:
    """Register a voice sample with the XTTS sidecar."""
    xtts_url = settings.XTTS_URL
    if not xtts_url:
        return {"error": "XTTS_URL not configured"}

    try:
        from app.core.http_client import traced_post as _traced_post

        response = await _traced_post(
            "xtts",
            f"{xtts_url.rstrip('/')}/register",
            files={"audio": (filename, audio_bytes, "audio/wav")},
            data={"speaker_id": speaker_id},
            timeout=float(settings.XTTS_TIMEOUT),
        )
        response.raise_for_status()
        return response.json()
    except Exception as e:
        logger.warning("Voice clone registration failed: %s", e)
        return {"error": str(e)}
