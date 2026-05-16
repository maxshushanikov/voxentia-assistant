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
