from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from voxentia.orchestrator.model_router import ModelRouter


def test_model_router_explicit_request_wins():
    router = ModelRouter(default="phi3")
    router._available = {"phi3:latest", "mistral:7b"}
    assert router.resolve("reasoning", 500, "mistral:7b") == "mistral:7b"


def test_model_router_picks_by_intent():
    router = ModelRouter(default="phi3")
    router._available = {"phi3-mini", "mistral:7b", "phi3"}
    assert router.resolve("greeting", 50, None) == "phi3-mini"


@pytest.mark.asyncio
async def test_model_router_refresh_available():
    router = ModelRouter(default="phi3", ollama_url="http://ollama:11434")
    mock_resp = MagicMock()
    mock_resp.raise_for_status = MagicMock()
    mock_resp.json.return_value = {"models": [{"name": "phi3:latest"}]}

    with patch("httpx.AsyncClient") as client_cls:
        client = AsyncMock()
        client.__aenter__.return_value = client
        client.__aexit__.return_value = None
        client.get = AsyncMock(return_value=mock_resp)
        client_cls.return_value = client
        await router.refresh_available()
    assert "phi3:latest" in router._available
