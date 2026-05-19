from unittest.mock import patch

import pytest
from app.services.chat_service import ChatService


@pytest.mark.asyncio
async def test_initialize_handles_missing_plugin_config(tmp_path):
    service = ChatService()
    missing = tmp_path / "missing_plugin_config.json"

    with patch("app.services.chat_service.settings") as mock_settings:
        mock_settings.PLUGIN_CONFIG_PATH = missing
        mock_settings.PLUGINS_DIR = tmp_path
        mock_settings.OLLAMA_URL = "http://localhost:11434"
        mock_settings.DEFAULT_MODEL = "phi3"
        mock_settings.DEFAULT_LANGUAGE = "en"
        mock_settings.PERSONALITIES = {}
        await service.initialize()

    assert service._is_initialized is True


@pytest.mark.asyncio
async def test_initialize_handles_invalid_json(tmp_path):
    bad = tmp_path / "bad.json"
    bad.write_text("{not json", encoding="utf-8")
    service = ChatService()

    with patch("app.services.chat_service.settings") as mock_settings:
        mock_settings.PLUGIN_CONFIG_PATH = bad
        mock_settings.PLUGINS_DIR = tmp_path
        mock_settings.OLLAMA_URL = "http://localhost:11434"
        mock_settings.DEFAULT_MODEL = "phi3"
        mock_settings.DEFAULT_LANGUAGE = "en"
        mock_settings.PERSONALITIES = {}
        await service.initialize()

    assert service._is_initialized is True
