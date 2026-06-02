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

    registry.register_plugin_class(_GreetingPlugin)
    registry._plugin_config = {"test_plugin": {"enabled": True}}
    registry._context = PluginContext(settings=MagicMock(), llm=llm)
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
async def test_pipeline_passes_message_to_intent_resolution():
    registry = PluginRegistry()
    llm = MagicMock(spec=OllamaClient)

    class TriggerOnlyPlugin(_GreetingPlugin):
        supported_intents = []

        def get_metadata(self) -> PluginMetadata:
            return PluginMetadata(
                name="hello_assistant",
                display_name="Hello Assistant",
                version="0.0.1",
                description="Hello by trigger",
                author="test",
                triggers=["hello"],
            )

    registry.register_plugin_class(TriggerOnlyPlugin)
    registry._plugin_config = {"hello_assistant": {"enabled": True}}
    registry._context = PluginContext(settings=MagicMock(), llm=llm)
    registry.plugins["hello_assistant"] = TriggerOnlyPlugin(PluginContext(settings=MagicMock(), llm=llm))

    pipeline = OrchestratorPipeline(registry, llm)
    ctx = PipelineContext(raw_message="hello there", language="en")
    ctx.intent = "fallback"
    ctx.entities = {"language": "en"}

    result = await pipeline.route_plugin(ctx)
    assert result is not None
    assert result.text == "from plugin"
    assert result.intent == "fallback"


@pytest.mark.asyncio
async def test_pipeline_routes_by_trigger_keyword():
    registry = PluginRegistry()
    llm = MagicMock(spec=OllamaClient)
    plugin = _GreetingPlugin(PluginContext(settings=MagicMock(), llm=llm))

    registry.register_plugin_class(_GreetingPlugin)
    registry._plugin_config = {"test_plugin": {"enabled": True}}
    registry.plugins["test_plugin"] = plugin

    pipeline = OrchestratorPipeline(registry, llm)
    ctx = PipelineContext(raw_message="hello custom_intent", language="en")
    ctx.intent = "custom_intent"
    ctx.entities = {"language": "en"}

    result = await pipeline.route_plugin(ctx)
    assert result is not None
    assert result.text == "from plugin"
    assert result.intent == "custom_intent"


def test_pipeline_enriches_system_prompt_with_memory_and_knowledge():
    llm = MagicMock(spec=OllamaClient)
    registry = PluginRegistry()
    pipeline = OrchestratorPipeline(registry, llm)

    ctx = PipelineContext(
        raw_message="Hi",
        system_prompt="Base prompt",
        memory_hint="Remember that the user likes coffee.",
        knowledge_hint="Use the product catalog information.",
    )

    enriched = pipeline.enrich_memory(ctx)
    assert "Remember that the user likes coffee." in enriched.system_prompt
    assert "Use the product catalog information." in enriched.system_prompt


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


@pytest.mark.asyncio
async def test_intent_detector_matches_plugin_triggers():
    from voxentia.orchestrator.intent_detector import IntentDetector
    from voxentia.plugins.base import PluginMetadata, VoxentiaPlugin

    class TriggerPlugin(VoxentiaPlugin):
        supported_intents = ["custom_intent"]

        def get_metadata(self) -> PluginMetadata:
            return PluginMetadata(
                name="trigger_assistant",
                display_name="Trigger Assistant",
                version="0.0.1",
                description="Help with custom trigger detection",
                author="test",
                triggers=["assistant", "helper"],
            )

        async def initialize(self) -> None:
            pass

        async def handle_intent(self, intent: str, entities: dict) -> PluginResponse:
            return PluginResponse(text="trigger matched")

        async def shutdown(self) -> None:
            pass

    registry = PluginRegistry()
    registry.register_plugin_class(TriggerPlugin)
    registry._plugin_config = {"trigger_assistant": {"enabled": True}}
    detector = IntentDetector(MagicMock(spec=OllamaClient), registry)

    intent, entities, confidence, source = await detector.detect("Please ask the assistant for help", system="", model=None)
    assert intent == "custom_intent"
    assert source in {"trigger", "llm", "keyword"}
    assert confidence >= 0.8
