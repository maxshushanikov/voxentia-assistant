from abc import ABC, abstractmethod
from pydantic import BaseModel
from typing import Any, Dict, List, Optional

class PluginMetadata(BaseModel):
    """Metadaten eines Plugins für Registrierung und UI-Anzeige."""
    name: str
    display_name: str
    version: str
    description: str
    author: str
    icon: Optional[str] = "extension"
    permissions: List[str] = []

class PluginResponse(BaseModel):
    """Strukturierte Antwort eines Plugins."""
    text: str
    data: Optional[Dict[str, Any]] = None

class PluginContext:
    """Kontext-Objekt, das Plugins Zugriff auf Core-Ressourcen gibt."""
    def __init__(self, settings: Any, llm: Any, db: Any = None):
        self.settings = settings
        self.llm = llm
        self.db = db

class VoxentiaPlugin(ABC):
    """Abstrakte Basisklasse für alle Voxentia Plugins."""
    
    def __init__(self, context: PluginContext):
        self.context = context
        self.metadata: PluginMetadata = self.get_metadata()

    @abstractmethod
    def get_metadata(self) -> PluginMetadata:
        """Muss Metadaten des Plugins zurückgeben."""
        pass

    @abstractmethod
    async def initialize(self):
        """Initialisierungs-Logik des Plugins."""
        pass

    @abstractmethod
    async def handle_intent(self, intent: str, entities: Dict[str, Any]) -> PluginResponse:
        """Hauptverarbeitung von Benutzeranfragen."""
        pass

    @abstractmethod
    async def shutdown(self):
        """Cleanup beim Entladen des Plugins."""
        pass
