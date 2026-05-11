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

    async def route_request(self, message: str, language: str = "de") -> VoxentiaResponse:
        """Ermittelt den Intent und delegiert an das passende Plugin."""
        intent, entities = await self.intent_detector.detect(message)
        entities["language"] = language
        logger.info(f"🎯 Intent erkannt: {intent} mit {entities} (Sprache: {language})")

        # Begrüßung / Smalltalk
        if intent == "greeting" or message.lower() in ["hello", "hi", "hallo", "hey"]:
            greetings = {
                "de": "Hallo! Ich bin Voxentia. Wie kann ich dir heute behilflich sein?",
                "en": "Hello! I am Voxentia. How can I help you today?",
                "ru": "Привет! Я Воксентия. Чем я могу вам помочь сегодня?"
            }
            return VoxentiaResponse(
                text=greetings.get(language, greetings["en"]),
                intent="greeting"
            )

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
        
        # 4. Fallback: LLM
        res_text = await self.intent_detector.llm.generate(message)
        return VoxentiaResponse(text=res_text, intent="fallback")
