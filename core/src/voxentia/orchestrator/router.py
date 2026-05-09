from voxentia.plugins.registry import PluginRegistry
from voxentia.orchestrator.intent_detector import IntentDetector
from voxentia.services.llm_client import LLMClient
from voxentia.orchestrator.response_formatter import VoxentiaResponse
from voxentia.utils.logging import logger

class Orchestrator:
    """Der zentrale Dispatcher, der Anfragen an Plugins routet."""
    
    def __init__(self, registry: PluginRegistry, llm_client: LLMClient):
        self.registry = registry
        self.intent_detector = IntentDetector(llm_client)

    async def route_request(self, message: str) -> VoxentiaResponse:
        """Ermittelt den Intent und delegiert an das passende Plugin."""
        intent, entities = self.intent_detector.detect(message)
        logger.info(f"🎯 Intent erkannt: {intent} mit {entities}")

        # Spezialfall: Wetter & Suche im CoreAssistantPlugin
        if intent in ["get_weather", "search_web"]:
            plugin = self.registry.get_plugin("core_assistant")
            if plugin:
                res = await plugin.handle_intent(intent, entities)
                return VoxentiaResponse(text=res.text, plugin_data=res.data, intent=intent)

        # Job Suche
        if intent == "job_search":
            plugin = self.registry.get_plugin("job_assistant")
            if plugin:
                res = await plugin.handle_intent(intent, entities)
                return VoxentiaResponse(text=res.text, plugin_data=res.data, intent=intent)

        # Lehrer / Quiz
        if intent == "generate_quiz":
            plugin = self.registry.get_plugin("teacher_assistant")
            if plugin:
                res = await plugin.handle_intent(intent, entities)
                return VoxentiaResponse(text=res.text, plugin_data=res.data, intent=intent)

        # Kalender
        if intent in ["get_events", "add_event"]:
            plugin = self.registry.get_plugin("calendar")
            if plugin:
                res = await plugin.handle_intent(intent, entities)
                return VoxentiaResponse(text=res.text, plugin_data=res.data, intent=intent)

        # TODO: Dynamisches Routing basierend auf Plugin-Capabilities
        
        return VoxentiaResponse(
            text=f"Kein Plugin für den Intent '{intent}' gefunden. Ich antworte im Standard-Modus.",
            intent="fallback"
        )
