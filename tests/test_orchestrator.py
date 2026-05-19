from unittest.mock import AsyncMock, MagicMock

import pytest
from voxentia.orchestrator.pipeline import OrchestratorPipeline, PipelineContext
from voxentia.plugins.base import PluginContext, PluginMetadata, PluginResponse, VoxentiaPlugin
from voxentia.plugins.registry import PluginRegistry
from voxentia.services.llm_client import OllamaClient


class _GreetingPlugin(VoxentiaPlugin):
    supported_intents = ["custom_intent"]

    def get_metadata(self) -> PluginMetadata:
        return PluginMetadata(
            name="test_plugin",
            display_name="Test",
            version="0.0.1",
            description="test",
            author="test",
        )

    async def initialize(self) -> None:
        pass

    async def handle_intent(self, intent: str, entities: dict) -> PluginResponse:
        return PluginResponse(text="from plugin", data={"ok": True})

    async def shutdown(self) -> None:
        pass


@pytest.mark.asyncio
async def test_pipeline_routes_to_plugin_by_intent():
    registry = PluginRegistry()
    llm = MagicMock(spec=OllamaClient)
    llm.generate = AsyncMock(return_value="llm fallback")

    plugin = _GreetingPlugin(PluginContext(settings=MagicMock(), llm=llm))
    registry.plugins["test_plugin"] = plugin

    pipeline = OrchestratorPipeline(registry, llm)
    ctx = PipelineContext(raw_message="do custom", language="en")
    ctx.intent = "custom_intent"
    ctx.entities = {"language": "en"}

    result = await pipeline.route_plugin(ctx)
    assert result is not None
    assert result.text == "from plugin"
    assert result.intent == "custom_intent"


@pytest.mark.asyncio
async def test_pipeline_greeting_shortcut():
    registry = PluginRegistry()
    llm = MagicMock(spec=OllamaClient)
    pipeline = OrchestratorPipeline(registry, llm)
    ctx = PipelineContext(raw_message="hello", language="en")
    ctx.intent = "greeting"
    result = await pipeline.route_plugin(ctx)
    assert result is not None
    assert "Voxentia" in result.text or "Hello" in result.text
