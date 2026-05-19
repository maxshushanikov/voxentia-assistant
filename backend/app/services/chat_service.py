import asyncio
import json
import logging
import time
from typing import Any, List, Optional, Tuple

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

    async def process_message(
        self, db: Session, request: ChatRequest
    ) -> Tuple[str, Optional[str], Optional[str], Optional[Any]]:
        await self.initialize()
        started = time.perf_counter()

        lang = request.language.value if hasattr(request.language, "value") else str(request.language)
        speaker = request.speaker.value if hasattr(request.speaker, "value") else str(request.speaker)
        personality = (
            request.personality.value
            if hasattr(request.personality, "value")
            else str(request.personality)
        )

        user_msg = ChatMessage(
            session_id=request.session_id, role="user", content=request.message
        )
        db.add(user_msg)
        db.commit()

        rag_context = await search_context(request.message)
        system_prompt = self._personality_prompt(personality, lang)
        model = request.model or settings.DEFAULT_MODEL

        try:
            response = await self.orchestrator.route_request(
                request.message,
                language=lang,
                system_prompt=system_prompt,
                model=model,
                temperature=request.temperature,
                rag_context=rag_context,
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
            session_id=request.session_id, role="assistant", content=response.text
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

        user_msg = ChatMessage(session_id=request.session_id, role="user", content=request.message)
        db.add(user_msg)
        db.commit()

        rag_context = await search_context(request.message)
        message = request.message
        if rag_context:
            message = f"{rag_context}\n\n{request.message}"

        system_prompt = self._personality_prompt(personality, lang)
        model = request.model or settings.DEFAULT_MODEL

        import re
        full_text = ""
        current_sentence = ""
        current_emotion = "neutral"
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
            if len(current_sentence) > 20 and any(char in token for char in [".", "!", "?", "\n"]):
                sentence_to_speak = current_sentence.strip()
                current_sentence = ""

                # Robustly strip any [think]...[/think] or <think>...</think> blocks from TTS speakable text
                sentence_to_speak = re.sub(r"\[think\].*?(\[/think\]|$)", "", sentence_to_speak, flags=re.DOTALL).strip()
                sentence_to_speak = re.sub(r"<think>.*?(</think>|$)", "", sentence_to_speak, flags=re.DOTALL).strip()
                sentence_to_speak = re.sub(r"\[.*?\]|<.*?>", "", sentence_to_speak).strip()

                if sentence_to_speak and len(sentence_to_speak) > 10:
                    audio_url = await generate_tts_audio(sentence_to_speak, speaker, lang)
                    if audio_url:
                        yield {"event": "audio", "data": audio_url}

        # Handle the remaining trailing sentence if any
        if current_sentence.strip():
            sentence_to_speak = current_sentence.strip()
            sentence_to_speak = re.sub(r"\[think\].*?(\[/think\]|$)", "", sentence_to_speak, flags=re.DOTALL).strip()
            sentence_to_speak = re.sub(r"<think>.*?(</think>|$)", "", sentence_to_speak, flags=re.DOTALL).strip()
            sentence_to_speak = re.sub(r"\[.*?\]|<.*?>", "", sentence_to_speak).strip()
            if sentence_to_speak and len(sentence_to_speak) > 2:
                audio_url = await generate_tts_audio(sentence_to_speak, speaker, lang)
                if audio_url:
                    yield {"event": "audio", "data": audio_url}

        assistant_msg = ChatMessage(
            session_id=request.session_id, role="assistant", content=full_text
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
            )
            for m in rows
        ]
        return records, total

    def get_sessions(self, db: Session) -> List[ChatSession]:
        session_rows = (
            db.query(
                ChatMessage.session_id,
                func.max(ChatMessage.timestamp).label("last_ts"),
            )
            .group_by(ChatMessage.session_id)
            .order_by(func.max(ChatMessage.timestamp).desc())
            .all()
        )
        if not session_rows:
            return []

        session_ids = [r.session_id for r in session_rows]
        min_ts_subq = (
            db.query(
                ChatMessage.session_id,
                func.min(ChatMessage.timestamp).label("min_ts"),
            )
            .filter(ChatMessage.session_id.in_(session_ids), ChatMessage.role == "user")
            .group_by(ChatMessage.session_id)
            .subquery()
        )
        first_messages = {
            m.session_id: m
            for m in db.query(ChatMessage)
            .join(
                min_ts_subq,
                (ChatMessage.session_id == min_ts_subq.c.session_id)
                & (ChatMessage.timestamp == min_ts_subq.c.min_ts),
            )
            .filter(ChatMessage.role == "user")
            .all()
        }

        return [
            ChatSession(
                session_id=row.session_id,
                title=(first_messages[row.session_id].content[:60] if row.session_id in first_messages else row.session_id),
                last_timestamp=row.last_ts,
            )
            for row in session_rows
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
