from voxentia.plugins.base import VoxentiaPlugin, PluginMetadata, PluginContext, PluginResponse
from typing import Dict, Any, List
from datetime import datetime, timedelta
import uuid

class CalendarPlugin(VoxentiaPlugin):
    """Plugin zur Verwaltung von Terminen und Kalenderereignissen."""

    def get_metadata(self) -> PluginMetadata:
        return PluginMetadata(
            name="calendar",
            display_name="Kalender",
            version="1.0.0",
            description="Verwalte deine Termine und lass dich an wichtige Ereignisse erinnern.",
            author="Voxentia Team",
            icon="calendar_today",
            permissions=["calendar_read", "calendar_write"]
        )

    async def initialize(self):
        # Mock Daten für den Start
        self.events = [
            {
                "id": str(uuid.uuid4()),
                "title": "Meeting mit Team",
                "start_time": (datetime.now() + timedelta(hours=2)).isoformat(),
                "end_time": (datetime.now() + timedelta(hours=3)).isoformat(),
                "location": "Konferenzraum A"
            },
            {
                "id": str(uuid.uuid4()),
                "title": "Abendessen mit Max",
                "start_time": (datetime.now() + timedelta(hours=5)).isoformat(),
                "end_time": (datetime.now() + timedelta(hours=7)).isoformat(),
                "location": "Restaurant 'Zum Anker'"
            }
        ]
        print("Calendar Plugin initialisiert.")

    async def handle_intent(self, intent: str, entities: Dict[str, Any]) -> PluginResponse:
        if intent == "get_events":
            return await self._list_events()
        elif intent == "add_event":
            title = entities.get("title", "Neuer Termin")
            return await self._add_event(title, entities)
            
        return PluginResponse(text="Intent nicht unterstützt vom Kalender-Plugin.")

    async def _list_events(self) -> PluginResponse:
        if not self.events:
            return PluginResponse(text="Du hast heute keine Termine.")
        
        text = f"Du hast heute {len(self.events)} Termine. Der nächste ist: {self.events[0]['title']}."
        return PluginResponse(text=text, data={"events": self.events})

    async def _add_event(self, title: str, entities: Dict[str, Any]) -> PluginResponse:
        new_event = {
            "id": str(uuid.uuid4()),
            "title": title,
            "start_time": entities.get("start_time", datetime.now().isoformat()),
            "end_time": entities.get("end_time", (datetime.now() + timedelta(hours=1)).isoformat()),
            "location": entities.get("location", "Unbekannt")
        }
        self.events.append(new_event)
        return PluginResponse(text=f"Termin '{title}' wurde hinzugefügt.", data={"new_event": new_event})

    async def shutdown(self):
        pass
