import pytest

from voxentia.plugins.registry import PluginRegistry


def test_registry_initialization():
    registry = PluginRegistry()
    assert len(registry.plugins) == 0
    assert len(registry.plugin_classes) == 0

def test_manual_registration():
    from voxentia.plugins.base import PluginMetadata, VoxentiaPlugin

    class MockPlugin(VoxentiaPlugin):
        def get_metadata(self):
            return PluginMetadata(name="test", display_name="Test", version="1.0", description="Test", author="Test")
        async def initialize(self): pass
        async def handle_intent(self, i, e): return "ok"
        async def shutdown(self): pass

    registry = PluginRegistry()
    registry.register_plugin_class(MockPlugin)
    assert "test" in registry.plugin_classes


def test_intent_declared_without_load():
    from voxentia.plugins.base import PluginMetadata, PluginResponse, VoxentiaPlugin

    class IntentPlugin(VoxentiaPlugin):
        supported_intents = ["demo_intent"]

        def get_metadata(self):
            return PluginMetadata(
                name="demo",
                display_name="Demo",
                version="1.0",
                description="",
                author="test",
            )

        async def initialize(self):
            pass

        async def handle_intent(self, intent, entities):
            return PluginResponse(text="ok")

        async def shutdown(self):
            pass

    registry = PluginRegistry()
    registry.register_plugin_class(IntentPlugin)
    assert registry.intent_declared("demo_intent")
    assert registry.plugin_name_for_intent("demo_intent") == "demo"


@pytest.mark.asyncio
async def test_triggered_intent_resolves_plugin():
    from voxentia.plugins.base import PluginMetadata, PluginResponse, VoxentiaPlugin

    class TriggerPlugin(VoxentiaPlugin):
        supported_intents = ["job_search"]

        def get_metadata(self):
            return PluginMetadata(
                name="job_assistant",
                display_name="Job Assistant",
                version="1.0",
                description="Job search helper",
                author="test",
                triggers=["job", "career"],
            )

        async def initialize(self):
            pass

        async def handle_intent(self, intent, entities):
            return PluginResponse(text="matching job")

        async def shutdown(self):
            pass

    registry = PluginRegistry()
    registry.register_plugin_class(TriggerPlugin)
    registry._plugin_config = {"job_assistant": {"enabled": True}}

    assert registry.primary_intent_for_trigger("I'm looking for a job") == "job_search"
    plugin = await registry.get_plugin_for_intent("job_search")
    assert plugin is not None
    response = await plugin.on_message("job_search", {})
    assert response.text == "matching job"


@pytest.mark.asyncio
async def test_disabled_plugin_trigger_is_ignored():
    from voxentia.plugins.base import PluginMetadata, PluginResponse, VoxentiaPlugin

    class DisabledTriggerPlugin(VoxentiaPlugin):
        supported_intents = ["calendar_query"]

        def get_metadata(self):
            return PluginMetadata(
                name="calendar_assistant",
                display_name="Calendar Assistant",
                version="1.0",
                description="Calendar helper",
                author="test",
                triggers=["calendar", "schedule"],
            )

        async def initialize(self):
            pass

        async def handle_intent(self, intent, entities):
            return PluginResponse(text="should not match")

        async def shutdown(self):
            pass

    registry = PluginRegistry()
    registry.register_plugin_class(DisabledTriggerPlugin)
    registry._plugin_config = {"calendar_assistant": {"enabled": False}}

    assert registry.plugin_name_for_trigger("check my calendar") is None
    assert registry.primary_intent_for_trigger("schedule a meeting") is None
    plugin = await registry.get_plugin_for_intent("calendar_query", "schedule a meeting")
    assert plugin is None
