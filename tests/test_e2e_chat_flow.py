"""Light E2E-style test with mocked Ollama/TTS."""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from app.core.deps import get_chat_service
from app.main import app
from app.schemas.chat import ChatRequest
from app.services.chat_service import ChatService
from fastapi.testclient import TestClient
from voxentia.orchestrator.response_formatter import VoxentiaResponse


@pytest.mark.asyncio
async def test_chat_service_full_flow_with_mocked_orchestrator():
    service = ChatService()
    service.orchestrator.route_request = AsyncMock(
        return_value=VoxentiaResponse(text="Mocked reply", intent="greeting")
    )

    with patch("app.services.chat_service.search_context", new=AsyncMock(return_value="")):
        with patch(
            "app.services.chat_service.generate_tts_audio",
            new=AsyncMock(return_value=None),
        ):
            from app.core.database import SessionLocal, init_db

            init_db()
            db = SessionLocal()
            try:
                request = ChatRequest(
                    message="Hello",
                    session_id="e2e-test",
                    language="en",
                    personality="friendly",
                )
                text, audio, intent, _ = await service.process_message(db, request)
            finally:
                db.close()

    assert text == "Mocked reply"
    assert intent == "greeting"
    assert audio is None


def test_chat_http_with_dependency_override():
    mock_service = MagicMock(spec=ChatService)
    mock_service.process_message = AsyncMock(
        return_value=("HTTP mock", "/api/tts-audio/x.wav", "fallback", None)
    )
    app.dependency_overrides[get_chat_service] = lambda: mock_service
    try:
        with TestClient(app) as client:
            res = client.post(
                "/api/v1/chat",
                json={"message": "test", "session_id": "s1"},
            )
    finally:
        app.dependency_overrides.clear()

    assert res.status_code == 200
    assert res.json()["text"] == "HTTP mock"
