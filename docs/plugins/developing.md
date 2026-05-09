# 🛠️ Handbuch für Plugin-Entwickler

Dieses Handbuch bietet eine tiefgehende Anleitung zur Erstellung robuster Erweiterungen für Voxentia.

## 1. Die Anatomie eines Plugins

Ein Plugin besteht aus drei Teilen:
1.  **Metadaten**: Wer bist du und was darfst du?
2.  **Logik**: Wie verarbeitest du Anfragen?
3.  **UI (Optional)**: Wie stellst du Ergebnisse grafisch dar?

### Beispiel: Ein "Einkaufslisten" Plugin

#### Backend-Logik (`plugin.py`)
```python
from voxentia.plugins.base import VoxentiaPlugin, PluginMetadata, PluginResponse
from typing import Dict, Any

class ShoppingListPlugin(VoxentiaPlugin):
    def get_metadata(self) -> PluginMetadata:
        return PluginMetadata(
            name="shopping_list",
            display_name="Einkaufsliste",
            version="1.1.0",
            description="Verwalte deine Einkäufe.",
            author="Developer",
            icon="shopping_cart"
        )

    async def initialize(self):
        # Lade Liste aus DB oder Datei
        self.items = []

    async def handle_intent(self, intent: str, entities: Dict[str, Any]) -> PluginResponse:
        if intent == "add_item":
            item = entities.get("item", "Unbekannt")
            self.items.append(item)
            return PluginResponse(
                text=f"{item} wurde zur Liste hinzugefügt.",
                data={"items": self.items}
            )
        return PluginResponse(text="Befehl nicht erkannt.")
```

## 2. Intent-Definition
Damit Voxentia dein Plugin aufruft, muss das LLM wissen, wann es zuständig ist. Erweitere den Prompt im `IntentDetector`:

```python
# In core/src/voxentia/orchestrator/intent_detector.py
- add_item (entities: item)
```

## 3. Konfiguration und Aktivierung
Plugins werden nicht mehr "hart" im Code aktiviert. Nutze die `plugin_config.json`:

```json
"shopping_list": {
    "enabled": true,
    "config": {
        "max_items": 50
    }
}
```

## 4. Best Practices
- **Asynchronität**: Nutze immer `async/await` für I/O Operationen (API-Calls, Datenbanken).
- **Fehlerbehandlung**: Fange Exceptions innerhalb von `handle_intent` ab und gib eine freundliche `PluginResponse(text="Fehler...")` zurück.
- **Strukturierte Daten**: Nutze das `data`-Feld in der Antwort, um dem Frontend die Arbeit zu erleichtern.
