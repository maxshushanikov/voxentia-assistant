import asyncio
import json
import logging
import time
from typing import Any, List, Optional

from app.core.config import settings
from app.core.database import SessionLocal
from app.core.errors import PluginError, VoxentiaError
from app.core.events import publish_app_event
from app.core.personalities import load_personalities
from app.domain.chat import ChatMessageRecord, ChatSession
from app.domain.processing import ChatResult
from app.models.session import ChatSessionMeta
from app.schemas.chat import ChatRequest
from app.services.emotion_service import EmotionService
from app.services.knowledge_service import KnowledgeService
from app.services.memory_service import MemoryService
from app.services.chat_context_builder import ChatContextBuilder
from app.services.chat_orchestration_service import ChatOrchestrationService
from app.services.chat_persistence_service import ChatPersistenceService
from app.services.chat_stream_service import ChatStreamService
from sqlalchemy.orm import Session
from voxentia.capabilities.registry import CapabilityRegistry
from voxentia.events.bus import create_event_bus
from voxentia.orchestrator.model_router import ModelRouter
from voxentia.orchestrator.router import Orchestrator
from voxentia.plugins.base import PluginContext
from voxentia.plugins.registry import PluginRegistry
from voxentia.services.llm_client import OllamaClient

logger = logging.getLogger("voxentia.api")

class ChatService:
    def __init__(self) -> None:
        self.llm_client: OllamaClient | None = None
        self.registry = PluginRegistry()
        self.orchestrator: Orchestrator | None = None
        self.memory_service: MemoryService | None = None
        self.emotion_service: EmotionService | None = None
        self.knowledge_service: KnowledgeService | None = None
        self.model_router: ModelRouter | None = None
        self.capabilities = CapabilityRegistry()
        self.persistence = ChatPersistenceService()
        self.context_builder = ChatContextBuilder(self.persistence, self)
        self.orchestration_service = ChatOrchestrationService(self, settings)
        self.stream_service = ChatStreamService(self)
        self.event_bus = create_event_bus(
            settings.REDIS_URL,
            settings.ENABLE_EVENT_BUS,
        )
        self._init_lock = asyncio.Lock()
        self._is_initialized = False
        self._router_refreshed = False

    async def initialize(self) -> None:
        if self._is_initialized:
            return
        async with self._init_lock:
            if self._is_initialized:
                return

            self.llm_client = OllamaClient(
                base_url=settings.OLLAMA_URL,
                default_model=settings.DEFAULT_MODEL,
                timeout=settings.OLLAMA_TIMEOUT,
            )
            self.memory_service = MemoryService(self.llm_client)
            self.emotion_service = EmotionService(self.llm_client)
            self.knowledge_service = KnowledgeService(self.llm_client)
            self.model_router = ModelRouter(
                default=settings.DEFAULT_MODEL,
                ollama_url=settings.OLLAMA_URL,
            )
            self.orchestrator = Orchestrator(self.registry, self.llm_client)

            config_path = settings.PLUGIN_CONFIG_PATH
            config: dict = {"plugins": {}}
            try:
                with open(config_path, encoding="utf-8") as f:
                    config = json.load(f)
            except FileNotFoundError:
                logger.warning("Plugin config not found at %s", config_path)
            except json.JSONDecodeError as e:
                logger.error("Invalid plugin config JSON: %s", e)

            try:
                self.registry.discover_plugins(str(settings.PLUGINS_DIR))
                context = PluginContext(
                    settings=settings,
                    llm=self.llm_client,
                    memory=self.memory_service,
                    knowledge=self.knowledge_service,
                )
                await self.registry.initialize_plugins(context, config)
            except Exception as e:
                logger.exception("Plugin initialization failed: %s", e)

            self._refresh_capabilities()
            if settings.ENABLE_EVENT_BUS:
                if await self.event_bus.ensure_connected():
                    logger.info("Event bus connected (Redis Streams)")
                else:
                    logger.info("Event bus active (in-process handlers only)")

            self._is_initialized = True
            logger.info("Chat service initialized with %d plugin(s)", len(self.registry.plugins))

    def _refresh_capabilities(self) -> None:
        self.capabilities.register_service(
            "ollama",
            settings.OLLAMA_URL,
            healthy=True,
        )
        self.capabilities.register_service("tts", settings.TTS_URL, healthy=True)
        self.capabilities.register_service("whisper", settings.WHISPER_URL, healthy=True)
        self.capabilities.register_model(settings.DEFAULT_MODEL, ["chat", "intent", "memory"])
        self.capabilities.register_model(settings.EMBEDDING_MODEL, ["embedding"])
        for name, cls in self.registry.plugin_classes.items():
            meta = cls.get_metadata(cls)
            enabled = bool(self.registry._plugin_config.get(name, {}).get("enabled", False))
            self.capabilities.register_plugin(
                name,
                meta.version,
                cls.get_intents(),
                enabled=enabled,
                loaded=name in self.registry.plugins,
            )

    def capabilities_snapshot(self) -> dict:
        return self.capabilities.snapshot()

    def _personality_prompt(self, personality: str, language: str) -> str:
        profiles = load_personalities().get(personality or "professional", {})
        return profiles.get(language, profiles.get(settings.DEFAULT_LANGUAGE, ""))

    def _build_system_prompt(
        self, db: Session, personality: str, language: str, session_id: str
    ) -> str:
        base = self._personality_prompt(personality, language)
        if settings.ENABLE_SENTIMENT:
            tone = self.emotion_service.get_tone_hint(db, session_id)
            if tone:
                base += f"\n\n{tone}"
        if settings.ENABLE_MEMORY:
            memory_hint = self.memory_service.build_memory_prompt(db, session_id)
            if memory_hint:
                base += f"\n\n{memory_hint}"
        if settings.ENABLE_KNOWLEDGE_GRAPH:
            graph_hint = self.knowledge_service.build_graph_prompt(db, session_id)
            if graph_hint:
                base += f"\n\n{graph_hint}"
        return base

    def _apply_ab_testing(
        self, session_id: str, system_prompt: str, temperature: float
    ) -> tuple[str, float, Any]:
        if not settings.ENABLE_AB_TESTING:
            return system_prompt, temperature, None
        from voxentia.orchestrator.ab_testing import apply_ab_to_context, assign_variant
        from voxentia.orchestrator.pipeline import PipelineContext

        assignment = assign_variant(session_id, settings.AB_EXPERIMENT_ID)
        ctx = PipelineContext(raw_message="", system_prompt=system_prompt, temperature=temperature)
        apply_ab_to_context(ctx, assignment)
        return ctx.system_prompt, ctx.temperature, assignment

    async def _resolve_model(
        self, request: ChatRequest, message: str, explicit_intent: str | None = None
    ) -> str:
        requested = request.model or settings.DEFAULT_MODEL
        if not settings.ENABLE_MODEL_ROUTING:
            return requested
        if not self._router_refreshed:
            await self.model_router.refresh_available(settings.OLLAMA_TIMEOUT)
            self._router_refreshed = True
        intent = explicit_intent or "fallback"
        tokens = max(1, len(message.split()))
        return self.model_router.resolve(intent, tokens, requested)

    def _schedule_post_processing(self, session_id: str, message: str) -> None:
        async def _run() -> None:
            db = SessionLocal()
            try:
                if settings.ENABLE_SENTIMENT:
                    await self.emotion_service.analyze_and_store(db, session_id, message)
                if settings.ENABLE_MEMORY:
                    await self.memory_service.extract_and_store(db, session_id, message)
                if settings.ENABLE_KNOWLEDGE_GRAPH:
                    await self.knowledge_service.extract_and_store(db, session_id, message)
            finally:
                db.close()

        asyncio.create_task(_run())

    async def _maybe_generate_session_title(
        self, db: Session, session_id: str, first_message: str
    ) -> None:
        existing = db.query(ChatSessionMeta).filter_by(session_id=session_id).first()
        if existing and existing.title:
            return
        try:
            title = await self.llm_client.generate(
                f"Generiere einen kurzen Titel (max 5 Wörter) für dieses Gespräch: '{first_message[:200]}'",
                temperature=0.3,
            )
            title = (title or "").strip()[:60] or first_message[:60]
        except Exception as e:
            logger.warning("Session title generation failed: %s", e)
            title = first_message[:60]

        if existing:
            existing.title = title
        else:
            db.add(ChatSessionMeta(session_id=session_id, title=title))
        db.commit()

    def fork_session(self, db: Session, session_id: str, message_id: int) -> tuple[str, str, int]:
        return self.persistence.fork_session(db, session_id, message_id)

    async def process_message(
        self, db: Session, request: ChatRequest, http_request=None
    ) -> ChatResult:
        await self.initialize()
        started = time.perf_counter()

        await publish_app_event(
            self.event_bus,
            "chat.message.started",
            {"session_id": request.session_id, "stream": False},
        )

        ctx = await self.context_builder.build(db, request)
        model = ctx.model

        try:
            response = await self.orchestration_service.route(request, ctx)
            model = await self._resolve_model(request, request.message, response.intent)
        except VoxentiaError:
            raise
        except Exception as e:
            logger.exception("Orchestrator error: %s", e)
            raise PluginError(
                "I could not process your request.",
                reason=str(e),
            ) from e

        message_id = self.persistence.save_assistant_message(
            db,
            session_id=ctx.effective_session_id,
            content=response.text,
            model=model,
            branch_id=ctx.branch_id,
        )
        audio_url = await self.orchestration_service.maybe_tts(
            response.text,
            ctx.speaker,
            ctx.lang,
            session_id=ctx.effective_session_id,
        )

        latency_ms = (time.perf_counter() - started) * 1000

        await publish_app_event(
            self.event_bus,
            "chat.message.completed",
            {
                "session_id": ctx.effective_session_id,
                "intent": response.intent,
                "latency_ms": int(latency_ms),
                "model": model,
            },
        )
        await publish_app_event(
            self.event_bus,
            "plugin.intent.routed",
            {"session_id": ctx.effective_session_id, "intent": response.intent},
        )
        logger.info(
            "chat completed",
            extra={
                "session_id": request.session_id,
                "plugin": response.intent,
                "latency_ms": int(latency_ms),
            },
        )

        if ctx.is_first_exchange:
            await self._maybe_generate_session_title(db, ctx.effective_session_id, request.message)

        if http_request is not None:
            from app.core.audit import log_chat_event

            await log_chat_event(
                http_request,
                ctx.effective_session_id,
                response.intent,
                latency_ms,
                model,
                rag_chunks_used=len(ctx.rag_sources),
            )

        if ctx.ab_assignment is not None:
            from voxentia.orchestrator.ab_testing import record_event_db

            record_event_db(
                db,
                ctx.effective_session_id,
                ctx.ab_assignment,
                response.intent,
                latency_ms,
            )

        intent_confidence = None
        intent_source = None
        if isinstance(response.plugin_data, dict):
            intent_confidence = response.plugin_data.get("intent_confidence")
            intent_source = response.plugin_data.get("intent_source")
        return ChatResult(
            text=response.text,
            audio_url=audio_url,
            session_id=ctx.effective_session_id,
            intent=response.intent,
            intent_confidence=intent_confidence,
            intent_source=intent_source,
            plugin_data=response.plugin_data,
            rag_sources=ctx.rag_sources,
            message_id=message_id,
        )

    async def process_message_stream(
        self, db: Session, request: ChatRequest
    ):
        await self.initialize()
        ctx = await self.context_builder.build(db, request)
        async for item in self.stream_service.stream(db, request, ctx):
            yield item

    def get_history(
        self, db: Session, session_id: str, limit: int = 50, offset: int = 0
    ) -> tuple[List[ChatMessageRecord], int]:
        return self.persistence.get_history(db, session_id, limit=limit, offset=offset)

    def set_feedback(self, db: Session, session_id: str, message_id: int, feedback: Optional[str]) -> None:
        self.persistence.set_feedback(db, session_id, message_id, feedback)

    def get_sessions(self, db: Session) -> List[ChatSession]:
        return self.persistence.get_sessions(db)

    def delete_session(self, db: Session, session_id: str) -> int:
        return self.persistence.delete_session(
            db,
            session_id,
            include_memory=settings.ENABLE_MEMORY,
            include_sentiment=settings.ENABLE_SENTIMENT,
        )

    def delete_all_sessions(self, db: Session) -> int:
        return self.persistence.delete_all_sessions(
            db,
            include_memory=settings.ENABLE_MEMORY,
            include_sentiment=settings.ENABLE_SENTIMENT,
        )

    async def shutdown(self) -> None:
        await self.registry.shutdown_plugins()
        await self.event_bus.close()
        self._is_initialized = False
