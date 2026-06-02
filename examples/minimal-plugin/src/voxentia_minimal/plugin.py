from typing import Any, Dict

from voxentia.plugins.base import PluginMetadata, PluginResponse, VoxentiaPlugin


class MinimalExamplePlugin(VoxentiaPlugin):
    """Ein absolut minimales Plugin zum Lernen."""

    def get_metadata(self) -> PluginMetadata:
        return PluginMetadata(
            name="minimal_example",
            display_name="Minimal Beispiel",
            version="1.0.0",
            description="Ein einfaches Echo-Plugin für Demonstrationszwecke.",
            author="Voxentia Team"
        )

    async def initialize(self):
        print("Minimal Plugin geladen!")

    async def handle_intent(self, intent: str, entities: Dict[str, Any]) -> PluginResponse:
        # Dieses Plugin reagiert einfach auf alles mit einem Echo
        return PluginResponse(text=f"Das Minimal-Plugin hat empfangen: {intent}")

    async def shutdown(self):
        pass
