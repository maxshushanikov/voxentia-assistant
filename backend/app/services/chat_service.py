import asyncio
import json
import logging
import re
import time
from typing import Any, List, Optional, Tuple

# Explaining Constants for TTS voice generation tuning
MIN_SENTENCE_CHARS_FOR_TTS = 20
MIN_CLEANED_CHARS_FOR_TTS = 10
MIN_TRAILING_CHARS_FOR_TTS = 2
TTS_PARALLEL_WORKERS = 3

from app.core.config import settings
from app.core.errors import PluginError, VoxentiaError
from app.core.personalities import load_personalities
from app.domain.chat import ChatMessageRecord, ChatSession
from app.models.chat import ChatMessage
from app.schemas.chat import ChatRequest
from app.services.rag_service import search_context
from app.services.voice_service import generate_tts_audio
from sqlalchemy import func
from sqlalchemy.orm import Session
from voxentia.orchestrator.router import Orchestrator
from voxentia.plugins.base import PluginContext
from voxentia.plugins.registry import PluginRegistry
from voxentia.services.llm_client import OllamaClient

logger = logging.getLogger("voxentia.api")


class ChatService:
    def __init__(self) -> None:
        self.llm_client = OllamaClient(
            base_url=settings.OLLAMA_URL,
            default_model=settings.DEFAULT_MODEL,
            timeout=settings.OLLAMA_TIMEOUT,
        )
        self.registry = PluginRegistry()
        self.orchestrator = Orchestrator(self.registry, self.llm_client)
        self._init_lock = asyncio.Lock()
        self._is_initialized = False

    async def initialize(self) -> None:
        if self._is_initialized:
            return
        async with self._init_lock:
            if self._is_initialized:
                return

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

            self._is_initialized = True
            logger.info("Chat service initialized with %d plugin(s)", len(self.registry.plugins))

    def _personality_prompt(self, personality: str, language: str) -> str:
        profiles = load_personalities().get(personality or "professional", {})
        return profiles.get(language, profiles.get(settings.DEFAULT_LANGUAGE, ""))

    async def _prepare_context(self, db: Session, request: ChatRequest) -> dict:
        lang = request.language.value if hasattr(request.language, "value") else str(request.language)
        speaker = request.speaker.value if hasattr(request.speaker, "value") else str(request.speaker)
        personality = (
            request.personality.value
            if hasattr(request.personality, "value")
            else str(request.personality)
        )

        limit = getattr(settings, "HISTORY_LIMIT", 20)
        previous_messages = (
            db.query(ChatMessage)
            .filter_by(session_id=request.session_id)
            .order_by(ChatMessage.timestamp.desc())
            .limit(limit)
            .all()
        )
        history = [{"role": m.role, "content": m.content} for m in reversed(previous_messages)]

        model = request.model or settings.DEFAULT_MODEL

        user_msg = ChatMessage(
            session_id=request.session_id, role="user", content=request.message, model=model
        )
        db.add(user_msg)
        db.commit()

        rag_context = await search_context(request.message)
        system_prompt = self._personality_prompt(personality, lang)

        return {
            "lang": lang,
            "speaker": speaker,
            "personality": personality,
            "history": history,
            "model": model,
            "rag_context": rag_context,
            "system_prompt": system_prompt,
        }

    async def process_message(
        self, db: Session, request: ChatRequest
    ) -> Tuple[str, Optional[str], Optional[str], Optional[Any]]:
        await self.initialize()
        started = time.perf_counter()

        ctx = await self._prepare_context(db, request)
        lang = ctx["lang"]
        speaker = ctx["speaker"]
        history = ctx["history"]
        model = ctx["model"]
        rag_context = ctx["rag_context"]
        system_prompt = ctx["system_prompt"]

        try:
            response = await self.orchestrator.route_request(
                request.message,
                language=lang,
                system_prompt=system_prompt,
                model=model,
                temperature=request.temperature,
                rag_context=rag_context,
                history=history,
            )
        except VoxentiaError:
            raise
        except Exception as e:
            logger.exception("Orchestrator error: %s", e)
            raise PluginError(
                "I could not process your request.",
                reason=str(e),
            ) from e

        assistant_msg = ChatMessage(
            session_id=request.session_id, role="assistant", content=response.text, model=model
        )
        db.add(assistant_msg)
        db.commit()

        audio_url: Optional[str] = None
        if settings.TTS_URL and response.text:
            audio_url = await generate_tts_audio(response.text, speaker, lang)

        latency_ms = int((time.perf_counter() - started) * 1000)
        logger.info(
            "chat completed",
            extra={
                "session_id": request.session_id,
                "plugin": response.intent,
                "latency_ms": latency_ms,
            },
        )

        return response.text, audio_url, response.intent, response.plugin_data

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
        system_prompt = ctx["system_prompt"]

        message = request.message
        if rag_context:
            message = f"{rag_context}\n\n{request.message}"

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
                text_to_speak, spk, l = item
                try:
                    url = await generate_tts_audio(text_to_speak, spk, l)
                    if url:
                        await audio_queue.put(url)
                except Exception as e:
                    logger.error("TTS worker failed: %s", e)
                finally:
                    tts_queue.task_done()

        worker_tasks = [asyncio.create_task(tts_worker()) for _ in range(TTS_PARALLEL_WORKERS)]

        async for token in self.llm_client.generate_stream(
            message, model=model, system=system_prompt or None, temperature=request.temperature, history=history
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
            session_id=request.session_id, role="assistant", content=full_text, model=model
        )
        db.add(assistant_msg)
        db.commit()

        yield {
            "event": "done",
            "data": {
                "text": re.sub(r"\[.*?\]|<.*?>", "", full_text).strip(),
                "audio_url": None,
                "session_id": request.session_id,
                "intent": "stream",
                "emotion": current_emotion,
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
            )
            for m in rows
        ]
        return records, total

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

        return [
            ChatSession(
                session_id=r.session_id,
                title=(r.first_content[:60] if r.first_content else r.session_id),
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
        db.commit()
        return deleted

    def delete_all_sessions(self, db: Session) -> int:
        deleted = db.query(ChatMessage).delete(synchronize_session=False)
        db.commit()
        return deleted

    async def shutdown(self) -> None:
        await self.registry.shutdown_plugins()
        self._is_initialized = False
