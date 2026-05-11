from voxentia.plugins.base import VoxentiaPlugin, PluginMetadata, PluginContext, PluginResponse
from voxentia_job_assistant.adapters.mock import MockJobAdapter
from typing import Dict, Any

class JobAssistantPlugin(VoxentiaPlugin):
    """Plugin zur Unterstützung bei der Jobsuche und Karriereplanung."""

    def get_metadata(self) -> PluginMetadata:
        return PluginMetadata(
            name="job_assistant",
            display_name="Job Assistent",
            version="1.0.0",
            description="Hilft bei der Suche nach Jobs und analysiert Stellenanzeigen.",
            author="Voxentia Team",
            icon="work",
            permissions=["web_access", "file_read"]
        )

    async def initialize(self):
        self.adapter = MockJobAdapter()
        print("Job Assistant Plugin initialisiert (Mock Mode).")

    async def handle_intent(self, intent: str, entities: Dict[str, Any]) -> PluginResponse:
        if intent == "job_search":
            query = entities.get("query", "Python")
            location = entities.get("location", "Remote")
            
            lang = entities.get("language", "de")
            
            jobs = await self.adapter.search(query, location)
            
            if not jobs:
                error_msgs = {
                    "de": f"Ich konnte leider keine Stellenangebote für '{query}' in {location} finden.",
                    "en": f"I couldn't find any job offers for '{query}' in {location}.",
                    "ru": f"К сожалению, я не нашел вакансий по запросу '{query}' в {location}."
                }
                return PluginResponse(text=error_msgs.get(lang, error_msgs["en"]))
            
            # Text-Zusammenfassung
            success_msgs = {
                "de": f"Ich habe {len(jobs)} interessante Stellen für '{query}' in {location} gefunden. Schau sie dir im Panel an!",
                "en": f"I found {len(jobs)} interesting positions for '{query}' in {location}. Check them in the panel!",
                "ru": f"Я нашел {len(jobs)} интересных вакансий по запросу '{query}' в {location}. Посмотрите их на панели!"
            }
            text_response = success_msgs.get(lang, success_msgs["en"])
            
            # Strukturierte Daten für die UI
            data = {
                "jobs": [job.dict() for job in jobs],
                "query": query,
                "location": location
            }
            
            return PluginResponse(text=text_response, data=data)
            
        return PluginResponse(text="Intent nicht unterstützt vom Job Assistenten.")

    async def shutdown(self):
        pass
