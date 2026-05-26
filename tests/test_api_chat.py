from unittest.mock import AsyncMock, MagicMock

from app.core.deps import get_chat_service
from app.main import app
from fastapi.testclient import TestClient


def test_chat_endpoint_returns_assistant_reply():
    mock_service = MagicMock()
    mock_service.process_message = AsyncMock(
        return_value=("Hello from test", None, "greeting", None, [], "test-session", 123)
    )
    app.dependency_overrides[get_chat_service] = lambda: mock_service
    try:
        with TestClient(app) as client:
            response = client.post(
                "/api/v1/chat",
                json={
                    "message": "Hi",
                    "session_id": "test-session",
                    "language": "en",
                    "personality": "friendly",
                },
            )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    body = response.json()
    assert body["text"] == "Hello from test"
    assert body["intent"] == "greeting"
    assert body["session_id"] == "test-session"
    assert body["message_id"] == 123


def test_chat_internal_error_returns_generic_message():
    mock_service = MagicMock()
    mock_service.process_message = AsyncMock(side_effect=RuntimeError("database exploded"))
    app.dependency_overrides[get_chat_service] = lambda: mock_service
    try:
        with TestClient(app, raise_server_exceptions=False) as client:
            response = client.post(
                "/api/v1/chat",
                json={"message": "Hi", "session_id": "err-session"},
            )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 500
    body = response.json()
    assert body.get("code") == "internal_error" or body.get("error_code") == "internal_error"
    assert "database" not in str(body)


def test_chat_feedback_endpoint_persists_reaction():
    mock_service = MagicMock()
    mock_service.set_feedback = MagicMock()
    app.dependency_overrides[get_chat_service] = lambda: mock_service
    try:
        with TestClient(app) as client:
            response = client.post(
                "/api/v1/chat/feedback",
                json={"session_id": "test-session", "message_id": 123, "feedback": "like"},
            )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    body = response.json()
    assert body["session_id"] == "test-session"
    assert body["message_id"] == 123
    assert body["feedback"] == "like"
    assert mock_service.set_feedback.call_count == 1
    assert mock_service.set_feedback.call_args[0][1:] == ("test-session", 123, "like")
