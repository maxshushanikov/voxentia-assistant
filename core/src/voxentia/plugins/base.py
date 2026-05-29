from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any, ClassVar, Dict, List, Optional

from pydantic import BaseModel


class PluginMetadata(BaseModel):
    name: str
    display_name: str
    version: str
    description: str
    author: str
    icon: Optional[str] = "extension"
    category: Optional[str] = None
    tags: List[str] = []
    capabilities: List[str] = []
    triggers: List[str] = []
    permissions: List[str] = []
    min_core_version: str = "0.1.0"
    dependencies: List[str] = []
    enabled_by_default: bool = False


class PluginResponse(BaseModel):
    text: str
    data: Optional[Dict[str, Any]] = None


class PluginContext:
    def __init__(
        self,
        settings: Any,
        llm: Any,
        db: Any = None,
        memory: Any = None,
        knowledge: Any = None,
    ):
        self.settings = settings
        self.llm = llm
        self.db = db
        self.memory = memory
        self.knowledge = knowledge


class VoxentiaPlugin(ABC):
    """Base plugin with declared intents and lifecycle hooks."""

    supported_intents: ClassVar[List[str]] = []

    def __init__(self, context: PluginContext):
        self.context = context
        self.metadata: PluginMetadata = self.get_metadata()

    @classmethod
    def get_intents(cls) -> List[str]:
        return list(cls.supported_intents)

    @abstractmethod
    def get_metadata(self) -> PluginMetadata:
        pass

    @abstractmethod
    async def initialize(self) -> None:
        pass

    @abstractmethod
    async def handle_intent(self, intent: str, entities: Dict[str, Any]) -> PluginResponse:
        pass

    @abstractmethod
    async def shutdown(self) -> None:
        pass

    async def on_load(self) -> None:
        await self.initialize()

    async def on_message(self, intent: str, entities: Dict[str, Any]) -> PluginResponse:
        return await self.handle_intent(intent, entities)

    async def on_event(self, event: str, payload: Dict[str, Any]) -> None:
        return None

    async def on_unload(self) -> None:
        await self.shutdown()

    async def pre_llm(self, message: str, entities: Dict[str, Any]) -> Optional[str]:
        """Optional hook before LLM fallback — return extra context or None."""
        return None
