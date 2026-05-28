from typing import Any, Dict

import httpx
from voxentia.plugins.base import PluginMetadata, PluginResponse, VoxentiaPlugin
from voxentia.utils.logging import logger


class CoreAssistantPlugin(VoxentiaPlugin):
    """Bietet Basis-Funktionen wie Wetter und Websuche."""

    supported_intents = ["get_weather", "search_web"]

    def get_metadata(self) -> PluginMetadata:
        return PluginMetadata(
            name="core_assistant",
            display_name="Basis Assistent",
            version="1.0.0",
            description="Standard-Tools für Wetter, Zeit und Suche.",
            author="Voxentia Team",
            permissions=["web_access"]
        )

    async def initialize(self):
        logger.info("Initializing Core Assistant Plugin")

    async def handle_intent(self, intent: str, entities: Dict[str, Any]) -> PluginResponse:
        if intent == "get_weather":
            location = entities.get("location", "Berlin")
            text = await self._get_weather(location)
            return PluginResponse(text=text)
        elif intent == "search_web":
            query = entities.get("query", "")
            text = await self._search_web(query)
            return PluginResponse(text=text)
        return PluginResponse(text="Unbekannter Intent im Basis-Assistenten.")

    async def _get_weather(self, location: str):
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(f"https://wttr.in/{location}?format=j1", timeout=10)
                response.raise_for_status()
                data = response.json()
                current = data['current_condition'][0]
                return f"In {location} ist es gerade {current['weatherDesc'][0]['value']} bei {current['temp_C']}°C."
        except Exception:
            return f"Wetter für {location} konnte nicht geladen werden."

    async def _search_web(self, query: str):
        # Hier käme die DDGS Logik rein
        return f"Suche nach '{query}' wird im Plugin-System verarbeitet."

    async def shutdown(self):
        pass
