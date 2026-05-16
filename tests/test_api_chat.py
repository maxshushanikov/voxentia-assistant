from unittest.mock import AsyncMock, patch

from app.main import app
from fastapi.testclient import TestClient


def test_chat_endpoint_returns_assistant_reply():
    with patch(
        "app.services.chat_service.chat_service.process_message",
        new=AsyncMock(return_value=("Hello from test", None, "greeting", None)),
    ):
        client = TestClient(app)
        response = client.post(
            "/api/v1/chat",
            json={
                "message": "Hi",
                "session_id": "test-session",
                "language": "en",
                "personality": "friendly",
            },
        )

    assert response.status_code == 200
    body = response.json()
    assert body["text"] == "Hello from test"
    assert body["intent"] == "greeting"
    assert body["session_id"] == "test-session"


def test_chat_internal_error_returns_generic_message():
    with patch(
        "app.services.chat_service.chat_service.process_message",
        new=AsyncMock(side_effect=RuntimeError("database exploded")),
    ):
        client = TestClient(app, raise_server_exceptions=False)
        response = client.post(
            "/api/v1/chat",
            json={"message": "Hi", "session_id": "err-session"},
        )

    assert response.status_code == 500
    assert response.json()["code"] == "internal_error"
    assert "database" not in response.json()["detail"]
