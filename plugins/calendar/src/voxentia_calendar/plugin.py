from voxentia.plugins.base import VoxentiaPlugin, PluginMetadata, PluginContext, PluginResponse
from typing import Dict, Any, List
from datetime import datetime, timedelta
import uuid

class CalendarPlugin(VoxentiaPlugin):
    """Plugin zur Verwaltung von Terminen und Kalenderereignissen."""

    supported_intents = ["get_events", "add_event"]

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
        from voxentia_calendar.adapters.sqlite import SQLiteCalendarAdapter
        self.adapter = SQLiteCalendarAdapter()
        print("Calendar Plugin initialisiert.")

    async def handle_intent(self, intent: str, entities: Dict[str, Any]) -> PluginResponse:
        if intent == "get_events":
            return await self._list_events()
        elif intent == "add_event":
            title = entities.get("title", "Neuer Termin")
            return await self._add_event(title, entities)
            
        return PluginResponse(text="Intent nicht unterstützt vom Kalender-Plugin.")

    async def _list_events(self) -> PluginResponse:
        events = self.adapter.get_events()
        if not events:
            return PluginResponse(text="Du hast heute keine Termine.")
        
        text = f"Du hast heute {len(events)} Termine. Der nächste ist: {events[0]['title']}."
        return PluginResponse(text=text, data={"events": events})

    async def _add_event(self, title: str, entities: Dict[str, Any]) -> PluginResponse:
        new_event = {
            "id": str(uuid.uuid4()),
            "title": title,
            "start_time": entities.get("start_time", datetime.now().isoformat()),
            "end_time": entities.get("end_time", (datetime.now() + timedelta(hours=1)).isoformat()),
            "location": entities.get("location", "Unbekannt")
        }
        self.adapter.add_event(new_event)
        return PluginResponse(text=f"Termin '{title}' wurde hinzugefügt.", data={"new_event": new_event})

    async def shutdown(self):
        pass
