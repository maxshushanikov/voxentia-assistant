"""SSE chat stream endpoint tests."""

from unittest.mock import MagicMock

from app.core.deps import get_chat_service
from app.main import app
from fastapi.testclient import TestClient


async def _fake_stream(*_args, **_kwargs):
    yield {"event": "token", "data": "Hi"}
    yield {"event": "token", "data": " there"}
    yield {
        "event": "done",
        "data": {
            "text": "Hi there",
            "audio_url": None,
            "session_id": "stream-test",
            "intent": "stream",
        },
    }


def test_chat_stream_returns_sse_tokens():
    mock_service = MagicMock()
    mock_service.process_message_stream = _fake_stream

    app.dependency_overrides[get_chat_service] = lambda: mock_service
    try:
        with TestClient(app) as client:
            response = client.post(
                "/api/v1/chat/stream",
                json={"message": "Hello", "session_id": "stream-test"},
            )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    assert "text/event-stream" in response.headers.get("content-type", "")
    body = response.text
    assert '"token":"Hi"' in body or '"token": "Hi"' in body
    assert "Hi there" in body
