from pathlib import Path

from app.core.config import settings
from app.main import app
from fastapi.testclient import TestClient


def test_tts_audio_serves_file(tmp_path, monkeypatch):
    # create a temporary audio file in the configured AUDIO_CACHE_DIR
    cache_dir: Path = settings.AUDIO_CACHE_DIR
    cache_dir.mkdir(parents=True, exist_ok=True)
    test_file = cache_dir / "sample.wav"
    test_file.write_bytes(b"RIFFDATA")

    with TestClient(app) as client:
        resp = client.get(f"/api/tts-audio/{test_file.name}")

    assert resp.status_code == 200
    assert resp.content == b"RIFFDATA"


def test_tts_audio_path_traversal_rejected():
    # Call the route handler directly to avoid TestClient path normalization
    import asyncio

    from app.main import serve_audio
    from fastapi import HTTPException

    try:
        asyncio.get_event_loop().run_until_complete(serve_audio("../secret.txt"))
        assert False, "Expected HTTPException"
    except HTTPException as e:
        assert e.status_code == 400
