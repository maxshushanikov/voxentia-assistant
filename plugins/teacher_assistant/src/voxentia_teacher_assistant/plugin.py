from voxentia.plugins.base import VoxentiaPlugin, PluginMetadata, PluginContext, PluginResponse
from typing import Dict, Any

class TeacherAssistantPlugin(VoxentiaPlugin):
    """Plugin für edukative Unterstützung und Quiz-Generierung."""

    def get_metadata(self) -> PluginMetadata:
        return PluginMetadata(
            name="teacher_assistant",
            display_name="Lehrer Assistent",
            version="1.0.0",
            description="Erstellt Lernquizze und erklärt komplexe Themen.",
            author="Voxentia Team",
            icon="school",
            permissions=["llm_generate"]
        )

    async def initialize(self):
        print("Teacher Assistant Plugin geladen.")

    async def handle_intent(self, intent: str, entities: Dict[str, Any]) -> PluginResponse:
        if intent == "generate_quiz":
            topic = entities.get("topic", "Allgemeinwissen")
            text = await self._generate_quiz(topic)
            return PluginResponse(text=text)
        
        return PluginResponse(text="Thema konnte nicht verarbeitet werden.")

    async def _generate_quiz(self, topic: str) -> str:
        # Hier nutzen wir das LLM über den Kontext
        prompt = f"Erstelle ein kurzes Quiz mit 3 Fragen zum Thema {topic}. Gib nur die Fragen und Antwortmöglichkeiten aus."
        
        # In einer echten Implementierung würden wir self.context.llm nutzen
        # Da wir noch im Aufbau sind, geben wir eine strukturierte Antwort zurück
        return f"Hier ist dein Quiz zu {topic}:\n\n1. Was ist das Hauptmerkmal von {topic}?\n2. Nenne ein wichtiges Gesetz in Bezug auf {topic}.\n3. Wer gilt als Pionier im Bereich {topic}?"

    async def shutdown(self):
        pass
