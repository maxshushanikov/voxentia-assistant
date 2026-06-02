"""Light E2E-style test with mocked Ollama/TTS."""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from app.core.config import settings
from app.core.deps import get_chat_service
from app.domain.processing import ChatResult
from app.main import app
from app.schemas.chat import ChatRequest
from app.services.chat_service import ChatService
from fastapi.testclient import TestClient
from voxentia.orchestrator.response_formatter import VoxentiaResponse


@pytest.mark.asyncio
async def test_chat_service_full_flow_with_mocked_orchestrator():
    service = ChatService()
    service.initialize = AsyncMock(return_value=None)
    service.orchestration_service.route = AsyncMock(
        return_value=VoxentiaResponse(text="Mocked reply", intent="greeting")
    )
    service._build_system_prompt = MagicMock(return_value="")
    service._schedule_post_processing = MagicMock()
    service._resolve_model = AsyncMock(return_value=settings.DEFAULT_MODEL)
    service.memory_service = MagicMock(build_memory_prompt=MagicMock(return_value=""))
    service.knowledge_service = MagicMock(build_graph_prompt=MagicMock(return_value=""))

    with patch("app.services.chat_context_builder.search_sources", new=AsyncMock(return_value=[])):
        with patch(
            "app.services.chat_orchestration_service.generate_tts_audio",
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
                result = await service.process_message(db, request)
            finally:
                db.close()

    assert result.text == "Mocked reply"
    assert result.intent == "greeting"
    assert result.audio_url is None


def test_chat_http_with_dependency_override():
    mock_service = MagicMock(spec=ChatService)
    mock_service.process_message = AsyncMock(
        return_value=ChatResult(
            text="HTTP mock",
            audio_url="/api/tts-audio/x.wav",
            session_id="s1",
            intent="fallback",
            intent_confidence=None,
            intent_source=None,
            plugin_data=None,
            rag_sources=[],
            message_id=None,
        )
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
