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
    """Runtime context injected into every plugin instance.

    Attributes:
        settings:   Application settings object.
        llm:        The active LLM client (BaseLLMClient).
        db:         Optional SQLAlchemy session.
        memory:     Optional MemoryService instance.
        knowledge:  Optional KnowledgeService instance.
        event_bus:  Optional EventBus instance for inter-plugin communication.
        ai_core:    Optional AICore instance — the Unified AI Core layer.
    """

    def __init__(
        self,
        settings: Any,
        llm: Any,
        db: Any = None,
        memory: Any = None,
        knowledge: Any = None,
        event_bus: Any = None,
        ai_core: Any = None,
    ) -> None:
        self.settings = settings
        self.llm = llm
        self.db = db
        self.memory = memory
        self.knowledge = knowledge
        self.event_bus = event_bus
        self.ai_core = ai_core


class VoxentiaPlugin(ABC):
    """Base class for all Voxentia plugins.

    Subclasses must:
    - Declare ``supported_intents`` as a class variable.
    - Implement ``get_metadata()``, ``initialize()``, ``handle_intent()``, and ``shutdown()``.

    Optional overrides:
    - ``on_event()``  — react to events emitted by other plugins or the system.
    - ``pre_llm()``   — inject extra context before the LLM fallback runs.
    """

    supported_intents: ClassVar[List[str]] = []

    def __init__(self, context: PluginContext) -> None:
        self.context = context
        self.metadata: PluginMetadata = self.get_metadata()

    # ------------------------------------------------------------------
    # Class-level helpers
    # ------------------------------------------------------------------

    @classmethod
    def get_intents(cls) -> List[str]:
        """Return the list of intents this plugin handles."""
        return list(cls.supported_intents)

    @classmethod
    def get_capabilities(cls) -> List[str]:
        """Return the list of declared capabilities from metadata.

        Capabilities follow the ``domain:action`` convention, e.g.
        ``calendar:create``, ``jobsearch:query``, ``learn:quiz``.
        """
        # Instantiate metadata without a context to read capabilities.
        try:
            meta: PluginMetadata = cls.get_metadata(cls)  # type: ignore[arg-type]
            return list(meta.capabilities)
        except Exception:
            return []

    # ------------------------------------------------------------------
    # Abstract interface — must be implemented by every plugin
    # ------------------------------------------------------------------

    @abstractmethod
    def get_metadata(self) -> PluginMetadata:
        """Return the static metadata descriptor for this plugin."""

    @abstractmethod
    async def initialize(self) -> None:
        """Called once when the plugin is loaded — set up adapters, connections, etc."""

    @abstractmethod
    async def handle_intent(
        self, intent: str, entities: Dict[str, Any]
    ) -> PluginResponse:
        """Process a resolved intent and return a structured response."""

    @abstractmethod
    async def shutdown(self) -> None:
        """Called once when the plugin is unloaded — release resources."""

    # ------------------------------------------------------------------
    # Lifecycle hooks (can be overridden for custom logic)
    # ------------------------------------------------------------------

    async def on_load(self) -> None:
        """Lifecycle: plugin is being loaded into the registry."""
        await self.initialize()

    async def on_unload(self) -> None:
        """Lifecycle: plugin is being removed from the registry."""
        await self.shutdown()

    async def on_message(
        self, intent: str, entities: Dict[str, Any]
    ) -> PluginResponse:
        """Lifecycle: a matching message/intent has been routed to this plugin."""
        return await self.handle_intent(intent, entities)

    async def on_event(self, event: str, payload: Dict[str, Any]) -> None:
        """Lifecycle: an event was emitted on the shared event bus.

        Override to react to events from other plugins or the system.
        Default implementation is a no-op.
        """

    # ------------------------------------------------------------------
    # Convenience helpers
    # ------------------------------------------------------------------

    async def emit_event(self, event_type: str, payload: Dict[str, Any]) -> None:
        """Publish an event to the shared event bus (if one is configured).

        Usage inside a plugin::

            await self.emit_event("calendar.created", {"title": title, ...})
        """
        bus = getattr(self.context, "event_bus", None)
        if bus is not None:
            await bus.emit(event_type, payload)

    async def pre_llm(
        self, message: str, entities: Dict[str, Any]
    ) -> Optional[str]:
        """Optional hook executed before the LLM fallback.

        Return a non-empty string to prepend extra context to the user
        message, or ``None`` to leave it unchanged.
        """
        return None
