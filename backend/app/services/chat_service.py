import asyncio
import json
import logging
import re
import time
import uuid
from typing import Any, List, Optional, Tuple

from app.core.config import settings
from app.core.database import SessionLocal
from app.core.errors import PluginError, VoxentiaError
from app.core.events import publish_app_event
from app.core.personalities import load_personalities
from app.domain.chat import ChatMessageRecord, ChatSession
from app.models.chat import ChatMessage
from app.models.session import ChatSessionMeta
from app.schemas.chat import ChatRequest
from app.services.emotion_service import EmotionService
from app.services.knowledge_service import KnowledgeService
from app.services.memory_service import MemoryService
from app.services.rag_service import RagSourceHit, search_sources
from app.services.voice_service import generate_tts_audio
from sqlalchemy import func
from sqlalchemy.orm import Session
from voxentia.capabilities.registry import CapabilityRegistry
from voxentia.events.bus import create_event_bus
from voxentia.orchestrator.model_router import ModelRouter
from voxentia.orchestrator.router import Orchestrator
from voxentia.plugins.base import PluginContext
from voxentia.plugins.registry import PluginRegistry
from voxentia.services.llm_client import OllamaClient

logger = logging.getLogger("voxentia.api")

# Explaining Constants for TTS voice generation tuning
MIN_SENTENCE_CHARS_FOR_TTS = 20
MIN_CLEANED_CHARS_FOR_TTS = 10
MIN_TRAILING_CHARS_FOR_TTS = 2
TTS_PARALLEL_WORKERS = 3


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
        self.event_bus = create_event_bus(
            getattr(settings, "REDIS_URL", None),
            getattr(settings, "ENABLE_EVENT_BUS", False),
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
                context = PluginContext(settings=settings, llm=self.llm_client)
                await self.registry.initialize_plugins(context, config)
            except Exception as e:
                logger.exception("Plugin initialization failed: %s", e)

            self._refresh_capabilities()
            if getattr(settings, "ENABLE_EVENT_BUS", False):
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
        if getattr(settings, "ENABLE_SENTIMENT", True):
            tone = self.emotion_service.get_tone_hint(db, session_id)
            if tone:
                base += f"\n\n{tone}"
        if getattr(settings, "ENABLE_MEMORY", True):
            memory_hint = self.memory_service.build_memory_prompt(db, session_id)
            if memory_hint:
                base += f"\n\n{memory_hint}"
        if getattr(settings, "ENABLE_KNOWLEDGE_GRAPH", True):
            graph_hint = self.knowledge_service.build_graph_prompt(db, session_id)
            if graph_hint:
                base += f"\n\n{graph_hint}"
        return base

    def _apply_ab_testing(
        self, session_id: str, system_prompt: str, temperature: float
    ) -> tuple[str, float, Any]:
        if not getattr(settings, "ENABLE_AB_TESTING", False):
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
        if not getattr(settings, "ENABLE_MODEL_ROUTING", True):
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
                if getattr(settings, "ENABLE_SENTIMENT", True):
                    await self.emotion_service.analyze_and_store(db, session_id, message)
                if getattr(settings, "ENABLE_MEMORY", True):
                    await self.memory_service.extract_and_store(db, session_id, message)
                if getattr(settings, "ENABLE_KNOWLEDGE_GRAPH", True):
                    await self.knowledge_service.extract_and_store(db, session_id, message)
            finally:
                db.close()

        asyncio.create_task(_run())

    def _rag_sources_from_hits(self, hits: list[RagSourceHit]) -> list[dict]:
        return [
            {
                "filename": h.filename,
                "page": h.page,
                "chunk_index": h.chunk_index,
                "score": h.score,
            }
            for h in hits
        ]

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

    def fork_session(
        self, db: Session, session_id: str, message_id: int
    ) -> tuple[str, str, int]:
        """Copy conversation up to message_id into a new session (branch)."""
        target = (
            db.query(ChatMessage)
            .filter(ChatMessage.id == message_id, ChatMessage.session_id == session_id)
            .first()
        )
        if not target:
            raise ValueError(f"Message {message_id} not found in session {session_id}")

        id_filter = ChatMessage.id < message_id
        if target.role != "assistant":
            id_filter = ChatMessage.id <= message_id
        prior = (
            db.query(ChatMessage)
            .filter(ChatMessage.session_id == session_id, id_filter)
            .order_by(ChatMessage.id.asc())
            .all()
        )

        new_sid = f"sess_{uuid.uuid4().hex[:12]}"
        branch_id = f"branch_{uuid.uuid4().hex[:8]}"
        for m in prior:
            db.add(
                ChatMessage(
                    session_id=new_sid,
                    role=m.role,
                    content=m.content,
                    model=m.model,
                    parent_id=m.id,
                    branch_id=branch_id,
                )
            )

        meta = db.query(ChatSessionMeta).filter_by(session_id=session_id).first()
        title = f"{meta.title} (Branch)" if meta and meta.title else "Branch"
        db.merge(ChatSessionMeta(session_id=new_sid, title=title[:128]))
        db.commit()
        return new_sid, branch_id, len(prior)

    async def _prepare_context(self, db: Session, request: ChatRequest) -> dict:
        effective_session_id = request.session_id
        if request.fork_from_message_id:
            effective_session_id, _, _ = self.fork_session(
                db, request.session_id, request.fork_from_message_id
            )

        lang = request.language.value if hasattr(request.language, "value") else str(request.language)
        speaker = request.speaker.value if hasattr(request.speaker, "value") else str(request.speaker)
        personality = (
            request.personality.value
            if hasattr(request.personality, "value")
            else str(request.personality)
        )

        branch_id = request.branch_id or "main"
        limit = getattr(settings, "HISTORY_LIMIT", 20)
        previous_messages = (
            db.query(ChatMessage)
            .filter_by(session_id=effective_session_id)
            .order_by(ChatMessage.timestamp.desc())
            .limit(limit)
            .all()
        )
        history = [{"role": m.role, "content": m.content} for m in reversed(previous_messages)]

        model = request.model or settings.DEFAULT_MODEL

        user_msg = ChatMessage(
            session_id=effective_session_id,
            role="user",
            content=request.message,
            model=model,
            branch_id=branch_id,
        )
        db.add(user_msg)
        db.commit()

        rag_hits = await search_sources(request.message)
        rag_context = "\n\n".join(h.text for h in rag_hits if h.text)
        system_prompt = self._build_system_prompt(db, personality, lang, effective_session_id)
        temperature = request.temperature
        ab_assignment = None
        system_prompt, temperature, ab_assignment = self._apply_ab_testing(
            effective_session_id, system_prompt, temperature
        )
        is_first_exchange = len(previous_messages) == 0
        self._schedule_post_processing(effective_session_id, request.message)

        return {
            "lang": lang,
            "speaker": speaker,
            "personality": personality,
            "history": history,
            "model": model,
            "rag_context": rag_context,
            "rag_sources": self._rag_sources_from_hits(rag_hits),
            "system_prompt": system_prompt,
            "is_first_exchange": is_first_exchange,
            "effective_session_id": effective_session_id,
            "branch_id": branch_id,
            "temperature": temperature,
            "ab_assignment": ab_assignment,
        }

    async def process_message(
        self, db: Session, request: ChatRequest, http_request=None
    ) -> Tuple[str, Optional[str], Optional[str], Optional[Any], list[dict], str, Optional[int]]:
        await self.initialize()
        started = time.perf_counter()

        await publish_app_event(
            self.event_bus,
            "chat.message.started",
            {"session_id": request.session_id, "stream": False},
        )

        ctx = await self._prepare_context(db, request)
        lang = ctx["lang"]
        speaker = ctx["speaker"]
        history = ctx["history"]
        model = ctx["model"]
        rag_context = ctx["rag_context"]
        rag_sources = ctx["rag_sources"]
        system_prompt = ctx["system_prompt"]
        is_first_exchange = ctx["is_first_exchange"]
        effective_session_id = ctx["effective_session_id"]
        branch_id = ctx["branch_id"]
        temperature = ctx.get("temperature", request.temperature)
        ab_assignment = ctx.get("ab_assignment")

        try:
            response = await self.orchestrator.route_request(
                request.message,
                language=lang,
                system_prompt=system_prompt,
                model=model,
                temperature=temperature,
                rag_context=rag_context,
                history=history,
            )
            model = await self._resolve_model(request, request.message, response.intent)
        except VoxentiaError:
            raise
        except Exception as e:
            logger.exception("Orchestrator error: %s", e)
            raise PluginError(
                "I could not process your request.",
                reason=str(e),
            ) from e

        assistant_msg = ChatMessage(
            session_id=effective_session_id,
            role="assistant",
            content=response.text,
            model=model,
            branch_id=branch_id,
        )
        db.add(assistant_msg)
        db.commit()

        audio_url: Optional[str] = None
        if settings.TTS_URL and response.text:
            audio_url = await generate_tts_audio(
                response.text,
                speaker,
                lang,
                event_bus=self.event_bus,
                session_id=effective_session_id,
            )

        latency_ms = (time.perf_counter() - started) * 1000

        await publish_app_event(
            self.event_bus,
            "chat.message.completed",
            {
                "session_id": effective_session_id,
                "intent": response.intent,
                "latency_ms": int(latency_ms),
                "model": model,
            },
        )
        await publish_app_event(
            self.event_bus,
            "plugin.intent.routed",
            {"session_id": effective_session_id, "intent": response.intent},
        )
        logger.info(
            "chat completed",
            extra={
                "session_id": request.session_id,
                "plugin": response.intent,
                "latency_ms": int(latency_ms),
            },
        )

        if is_first_exchange:
            await self._maybe_generate_session_title(
                db, effective_session_id, request.message
            )

        if http_request is not None:
            from app.core.audit import log_chat_event

            await log_chat_event(
                http_request,
                effective_session_id,
                response.intent,
                latency_ms,
                model,
                rag_chunks_used=len(rag_sources),
            )

        if ab_assignment is not None:
            from voxentia.orchestrator.ab_testing import record_event_db

            record_event_db(db, effective_session_id, ab_assignment, response.intent, latency_ms)

        return (
            response.text,
            audio_url,
            response.intent,
            response.plugin_data,
            rag_sources,
            effective_session_id,
            assistant_msg.id,
        )

    async def process_message_stream(
        self, db: Session, request: ChatRequest
    ):
        """Yield SSE token events, then a final done event with metadata."""
        await self.initialize()
        ctx = await self._prepare_context(db, request)
        lang = ctx["lang"]
        speaker = ctx["speaker"]
        history = ctx["history"]
        model = ctx["model"]
        rag_context = ctx["rag_context"]
        rag_sources = ctx["rag_sources"]
        system_prompt = ctx["system_prompt"]
        is_first_exchange = ctx["is_first_exchange"]
        effective_session_id = ctx["effective_session_id"]
        branch_id = ctx["branch_id"]
        temperature = ctx.get("temperature", request.temperature)

        await publish_app_event(
            self.event_bus,
            "chat.message.started",
            {"session_id": effective_session_id, "stream": True},
        )

        message = request.message
        if rag_context:
            message = f"{rag_context}\n\n{request.message}"

        stream_intent = "stream"
        try:
            # First run intent detection so the orchestrator can decide whether
            # a plugin should handle this request. If a non-fallback plugin is
            # selected, route the request through the orchestrator so plugins
            # (calendar, weather, etc.) run the same code-path as REST.
            intent, _, _, _ = await self.orchestrator.pipeline.intent_detector.detect(
                message,
                system=system_prompt or None,
                model=model,
                temperature=0.1,
            )
            stream_intent = intent
            model = await self._resolve_model(request, request.message, intent)
        except Exception as e:
            logger.debug("Stream model routing skipped: %s", e)

        full_text = ""
        current_sentence = ""
        current_emotion = "neutral"

        # Setup background parallel TTS workers
        tts_queue = asyncio.Queue()
        audio_queue = asyncio.Queue()

        async def tts_worker():
            while True:
                item = await tts_queue.get()
                if item is None:
                    break
                text_to_speak, spk, lang = item
                try:
                    url = await generate_tts_audio(
                        text_to_speak,
                        spk,
                        lang,
                        event_bus=self.event_bus,
                        session_id=effective_session_id,
                    )
                    if url:
                        await audio_queue.put(url)
                except Exception as e:
                    logger.error("TTS worker failed: %s", e)
                finally:
                    tts_queue.task_done()

        worker_tasks = [asyncio.create_task(tts_worker()) for _ in range(TTS_PARALLEL_WORKERS)]

        # If orchestrator determines a plugin should handle the intent, call
        # route_request first and stream its text result (chunked) instead of
        # calling the raw LLM stream. This keeps REST/Stream/WS behavior in
        # parity for plugin-handled intents. If the intent is 'fallback', we
        # fall back to streaming from the LLM.
        routed_response = None
        try:
            routed_response = await self.orchestrator.route_request(
                request.message,
                language=lang,
                system_prompt=system_prompt,
                model=model,
                temperature=temperature,
                rag_context=rag_context,
                history=history,
            )
        except Exception:
            # If routing fails, we'll fallback to LLM streaming below.
            routed_response = None

        if routed_response and getattr(routed_response, "intent", "fallback") != "fallback":
            # Stream the routed response by chunking the final text so the
            # client appears to stream tokens. This avoids skipping plugin
            # logic for streamed/WS clients.
            resp_text = routed_response.text or ""
            chunk_size = 64
            for i in range(0, len(resp_text), chunk_size):
                token = resp_text[i : i + chunk_size]
                full_text += token
                current_sentence += token
                yield {"event": "token", "data": token}
                # flush any audio generated synchronously by plugin data
                while not audio_queue.empty():
                    try:
                        url = audio_queue.get_nowait()
                        yield {"event": "audio", "data": url}
                    except asyncio.QueueEmpty:
                        break
            # ensure final routed response is reflected in the model variable
            model = await self._resolve_model(request, request.message, routed_response.intent)
        else:
            async for token in self.llm_client.generate_stream(
                message, model=model, system=system_prompt or None, temperature=temperature, history=history
            ):
                full_text += token
                current_sentence += token
                yield {"event": "token", "data": token}

            emotion_match = re.search(r"\[(happy|thinking|neutral|sad|angry|excited)\]", current_sentence)
            if emotion_match:
                emotion = emotion_match.group(1)
                if emotion != current_emotion:
                    current_emotion = emotion
                    yield {"event": "emotion", "data": emotion}

            # If the token contains a sentence-ending punctuation and the sentence is long enough, generate TTS
            if len(current_sentence) > MIN_SENTENCE_CHARS_FOR_TTS and any(char in token for char in [".", "!", "?", "\n"]):
                sentence_to_speak = current_sentence.strip()
                current_sentence = ""

                # Robustly strip any [think]...[/think] or <think>...</think> blocks from TTS speakable text
                sentence_to_speak = re.sub(r"\[think\].*?(\[/think\]|$)", "", sentence_to_speak, flags=re.DOTALL).strip()
                sentence_to_speak = re.sub(r"<think>.*?(</think>|$)", "", sentence_to_speak, flags=re.DOTALL).strip()
                sentence_to_speak = re.sub(r"\[.*?\]|<.*?>", "", sentence_to_speak).strip()

                if sentence_to_speak and len(sentence_to_speak) > MIN_CLEANED_CHARS_FOR_TTS:
                    await tts_queue.put((sentence_to_speak, speaker, lang))

            # Flush any completed audio URLs
            while not audio_queue.empty():
                try:
                    url = audio_queue.get_nowait()
                    yield {"event": "audio", "data": url}
                except asyncio.QueueEmpty:
                    break

        # Handle the remaining trailing sentence if any
        if current_sentence.strip():
            sentence_to_speak = current_sentence.strip()
            sentence_to_speak = re.sub(r"\[think\].*?(\[/think\]|$)", "", sentence_to_speak, flags=re.DOTALL).strip()
            sentence_to_speak = re.sub(r"<think>.*?(</think>|$)", "", sentence_to_speak, flags=re.DOTALL).strip()
            sentence_to_speak = re.sub(r"\[.*?\]|<.*?>", "", sentence_to_speak).strip()
            if sentence_to_speak and len(sentence_to_speak) > MIN_TRAILING_CHARS_FOR_TTS:
                await tts_queue.put((sentence_to_speak, speaker, lang))

        # Stop and join workers
        for _ in worker_tasks:
            await tts_queue.put(None)
        await asyncio.gather(*worker_tasks, return_exceptions=True)

        # Flush any remaining audio files
        while not audio_queue.empty():
            try:
                url = audio_queue.get_nowait()
                yield {"event": "audio", "data": url}
            except asyncio.QueueEmpty:
                break

        assistant_msg = ChatMessage(
            session_id=effective_session_id,
            role="assistant",
            content=full_text,
            model=model,
            branch_id=branch_id,
        )
        db.add(assistant_msg)
        db.commit()

        if is_first_exchange:
            await self._maybe_generate_session_title(
                db, effective_session_id, request.message
            )

        await publish_app_event(
            self.event_bus,
            "chat.stream.completed",
            {
                "session_id": effective_session_id,
                "intent": stream_intent,
                "chars": len(full_text),
            },
        )

        yield {
            "event": "done",
            "data": {
                "text": re.sub(r"\[.*?\]|<.*?>", "", full_text).strip(),
                "audio_url": None,
                "session_id": effective_session_id,
                "intent": stream_intent,
                "emotion": current_emotion,
                "rag_sources": rag_sources,
                "message_id": assistant_msg.id,
            },
        }

    def get_history(
        self, db: Session, session_id: str, limit: int = 50, offset: int = 0
    ) -> Tuple[List[ChatMessageRecord], int]:
        query = db.query(ChatMessage).filter(ChatMessage.session_id == session_id)
        total = query.count()
        rows = (
            query.order_by(ChatMessage.timestamp.asc()).offset(offset).limit(limit).all()
        )
        records = [
            ChatMessageRecord(
                session_id=m.session_id,
                role=m.role,
                content=m.content,
                timestamp=m.timestamp,
                model=m.model,
                id=m.id,
                parent_id=m.parent_id,
                branch_id=m.branch_id or "main",
                feedback=m.feedback,
            )
            for m in rows
        ]
        return records, total

    def set_feedback(self, db: Session, session_id: str, message_id: int, feedback: Optional[str]) -> None:
        if feedback not in (None, "like", "dislike"):
            raise ValueError("Invalid feedback value")

        message = (
            db.query(ChatMessage)
            .filter(ChatMessage.session_id == session_id, ChatMessage.id == message_id)
            .first()
        )
        if not message or message.role != "assistant":
            raise ValueError("Message not found or feedback is only allowed for assistant replies")

        message.feedback = feedback
        db.commit()

    def get_sessions(self, db: Session) -> List[ChatSession]:
        # A clean, high-performance single JOIN query to fetch everything in one query!
        # SQLite supports window functions and subqueries beautifully.
        subq_min = (
            db.query(
                ChatMessage.session_id,
                ChatMessage.content.label("first_content"),
                func.row_number().over(
                    partition_by=ChatMessage.session_id,
                    order_by=ChatMessage.timestamp.asc()
                ).label("rn_min")
            )
            .filter(ChatMessage.role == "user")
            .subquery()
        )

        subq_max = (
            db.query(
                ChatMessage.session_id,
                ChatMessage.model.label("last_model"),
                ChatMessage.timestamp.label("last_ts"),
                func.row_number().over(
                    partition_by=ChatMessage.session_id,
                    order_by=ChatMessage.timestamp.desc()
                ).label("rn_max")
            )
            .subquery()
        )

        rows = (
            db.query(
                subq_max.c.session_id,
                subq_max.c.last_ts,
                subq_max.c.last_model,
                subq_min.c.first_content
            )
            .join(subq_min, (subq_max.c.session_id == subq_min.c.session_id) & (subq_min.c.rn_min == 1), isouter=True)
            .filter(subq_max.c.rn_max == 1)
            .order_by(subq_max.c.last_ts.desc())
            .all()
        )

        session_ids = [r.session_id for r in rows]
        titles_by_id: dict[str, str] = {}
        if session_ids:
            meta_rows = (
                db.query(ChatSessionMeta)
                .filter(ChatSessionMeta.session_id.in_(session_ids))
                .all()
            )
            titles_by_id = {m.session_id: m.title for m in meta_rows if m.title}

        return [
            ChatSession(
                session_id=r.session_id,
                title=(
                    titles_by_id.get(r.session_id)
                    or (r.first_content[:60] if r.first_content else r.session_id)
                ),
                last_timestamp=r.last_ts,
                model=r.last_model,
            )
            for r in rows
        ]

    def delete_session(self, db: Session, session_id: str) -> int:
        deleted = (
            db.query(ChatMessage)
            .filter(ChatMessage.session_id == session_id)
            .delete(synchronize_session=False)
        )
        db.query(ChatSessionMeta).filter(ChatSessionMeta.session_id == session_id).delete(
            synchronize_session=False
        )
        if getattr(settings, "ENABLE_MEMORY", True):
            from app.models.memory import UserMemory

            db.query(UserMemory).filter(UserMemory.session_id == session_id).delete(
                synchronize_session=False
            )
        if getattr(settings, "ENABLE_SENTIMENT", True):
            from app.models.sentiment import SentimentRecord

            db.query(SentimentRecord).filter(SentimentRecord.session_id == session_id).delete(
                synchronize_session=False
            )
        db.commit()
        return deleted

    def delete_all_sessions(self, db: Session) -> int:
        deleted = db.query(ChatMessage).delete(synchronize_session=False)
        # Remove session metadata and auxiliary storage to fully purge user data
        db.query(ChatSessionMeta).delete(synchronize_session=False)
        if getattr(settings, "ENABLE_MEMORY", True):
            from app.models.memory import UserMemory

            db.query(UserMemory).delete(synchronize_session=False)
        if getattr(settings, "ENABLE_SENTIMENT", True):
            from app.models.sentiment import SentimentRecord

            db.query(SentimentRecord).delete(synchronize_session=False)
        db.commit()
        return deleted

    async def shutdown(self) -> None:
        await self.registry.shutdown_plugins()
        await self.event_bus.close()
        self._is_initialized = False
