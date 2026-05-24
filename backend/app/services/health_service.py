"""Dependency health probes for Ollama, TTS, and Whisper."""

from __future__ import annotations

import httpx
from app.core.config import settings


async def _probe(url: str, path: str = "", timeout: float = 3.0) -> dict:
    target = f"{url.rstrip('/')}{path}"
    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.get(target)
            ok = response.status_code < 500
            return {"status": "up" if ok else "degraded", "url": target, "code": response.status_code}
    except Exception as exc:
        return {"status": "down", "url": target, "error": str(exc)}


async def check_ollama() -> dict:
    return await _probe(settings.OLLAMA_URL, "/api/tags", settings.OLLAMA_TIMEOUT)


async def check_tts() -> dict:
    if not settings.TTS_URL:
        return {"status": "disabled", "url": None}
    return await _probe(settings.TTS_URL, timeout=min(settings.TTS_TIMEOUT, 5.0))


async def check_whisper() -> dict:
    if not settings.WHISPER_URL:
        return {"status": "disabled", "url": None}
    return await _probe(settings.WHISPER_URL, timeout=min(settings.WHISPER_TIMEOUT, 5.0))


async def check_xtts() -> dict:
    url = getattr(settings, "XTTS_URL", None)
    if not url or not getattr(settings, "VOICE_CLONE_ENABLED", False):
        return {"status": "disabled", "url": url}
    return await _probe(url, "/health", min(settings.XTTS_TIMEOUT, 5.0))


async def full_health(
    capabilities: dict | None = None,
    *,
    event_bus: dict | None = None,
    tracing: dict | None = None,
) -> dict:
    ollama, tts, whisper, xtts = (
        await check_ollama(),
        await check_tts(),
        await check_whisper(),
        await check_xtts(),
    )
    services = {"ollama": ollama, "tts": tts, "whisper": whisper, "xtts": xtts}
    any_down = any(s.get("status") == "down" for s in services.values())
    payload: dict = {
        "status": "degraded" if any_down else "healthy",
        "version": settings.VERSION,
        "services": services,
    }
    if capabilities is not None:
        payload["capabilities"] = capabilities
    if event_bus is not None:
        payload["event_bus"] = event_bus
    if tracing is not None:
        payload["observability"] = tracing
    return payload
