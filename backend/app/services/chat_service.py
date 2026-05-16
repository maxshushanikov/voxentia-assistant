import json
import logging
from typing import Any, List, Optional, Tuple

from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.chat import ChatMessage
from app.schemas.chat import ChatRequest
from app.services.rag_service import search_context
from app.services.voice_service import generate_tts_audio
from voxentia.orchestrator.response_formatter import VoxentiaResponse
from voxentia.orchestrator.router import Orchestrator
from voxentia.plugins.base import PluginContext
from voxentia.plugins.registry import PluginRegistry
from voxentia.services.llm_client import LLMClient

logger = logging.getLogger(__name__)


class ChatService:
    def __init__(self):
        self.llm_client = LLMClient(
            base_url=settings.OLLAMA_URL,
            default_model=settings.DEFAULT_MODEL,
        )
        self.registry = PluginRegistry()
        self.orchestrator = Orchestrator(self.registry, self.llm_client)
        self._is_initialized = False

    async def initialize(self) -> None:
        if self._is_initialized:
            return

        config_path = settings.PLUGIN_CONFIG_PATH
        config: dict = {"plugins": {}}

        try:
            with open(config_path, encoding="utf-8") as f:
                config = json.load(f)
        except FileNotFoundError:
            logger.warning("Plugin config not found at %s, using empty config", config_path)
        except json.JSONDecodeError as e:
            logger.error("Invalid plugin config JSON: %s", e)

        try:
            self.registry.discover_plugins(str(settings.PLUGINS_DIR))
            context = PluginContext(settings=settings, llm=self.llm_client)
            await self.registry.initialize_plugins(context, config)
        except Exception as e:
            logger.exception("Plugin initialization failed: %s", e)

        self._is_initialized = True
        logger.info("Chat service initialized with %d active plugin(s)", len(self.registry.plugins))

    def _personality_prompt(self, personality: str, language: str) -> str:
        profiles = settings.PERSONALITIES.get(personality or "professional", {})
        return profiles.get(language, profiles.get(settings.DEFAULT_LANGUAGE, ""))

    async def process_message(
        self, db: Session, request: ChatRequest
    ) -> Tuple[str, Optional[str], Optional[str], Optional[Any]]:
        await self.initialize()

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

        message = request.message
        rag_context = await search_context(request.message)
        if rag_context:
            message = (
                "Use the following document excerpts to answer the user. "
                "If the excerpts are not relevant, answer from general knowledge.\n\n"
                f"{rag_context}\n\nUser question: {request.message}"
            )

        system_prompt = self._personality_prompt(personality, lang)
        model = request.model or settings.DEFAULT_MODEL
        temperature = request.temperature

        try:
            response = await self.orchestrator.route_request(
                message,
                language=lang,
                system_prompt=system_prompt,
                model=model,
                temperature=temperature,
            )
        except Exception as e:
            logger.exception("Orchestrator error: %s", e)
            response = VoxentiaResponse(
                text="I'm sorry, I encountered an error processing your request.",
                intent="error",
            )

        assistant_msg = ChatMessage(
            session_id=request.session_id, role="assistant", content=response.text
        )
        db.add(assistant_msg)
        db.commit()

        audio_url: Optional[str] = None
        if settings.TTS_URL and response.text:
            audio_url = await generate_tts_audio(response.text, speaker, lang)
            if not audio_url:
                logger.warning("TTS produced no audio_url for session %s", request.session_id)

        return response.text, audio_url, response.intent, response.plugin_data

    def get_history(
        self, db: Session, session_id: str, limit: int = 50, offset: int = 0
    ) -> Tuple[List[ChatMessage], int]:
        query = db.query(ChatMessage).filter(ChatMessage.session_id == session_id)
        total = query.count()
        messages = (
            query.order_by(ChatMessage.timestamp.asc()).offset(offset).limit(limit).all()
        )
        return messages, total

    def get_sessions(self, db: Session) -> List[dict]:
        sessions_raw = (
            db.query(ChatMessage.session_id, ChatMessage.timestamp)
            .order_by(ChatMessage.timestamp.desc())
            .all()
        )

        seen: dict = {}
        for row in sessions_raw:
            if row.session_id not in seen:
                seen[row.session_id] = row.timestamp

        result = []
        for session_id, ts in seen.items():
            first_msg = (
                db.query(ChatMessage)
                .filter(
                    ChatMessage.session_id == session_id,
                    ChatMessage.role == "user",
                )
                .order_by(ChatMessage.timestamp.asc())
                .first()
            )

            title = first_msg.content[:60] if first_msg else session_id
            result.append(
                {
                    "session_id": session_id,
                    "title": title,
                    "timestamp": ts.isoformat(),
                }
            )
        return result

    def delete_session(self, db: Session, session_id: str) -> int:
        deleted = (
            db.query(ChatMessage)
            .filter(ChatMessage.session_id == session_id)
            .delete(synchronize_session=False)
        )
        db.commit()
        logger.info("Deleted session %s (%d messages)", session_id, deleted)
        return deleted

    def delete_all_sessions(self, db: Session) -> int:
        deleted = db.query(ChatMessage).delete(synchronize_session=False)
        db.commit()
        logger.info("Deleted all chat history (%d messages)", deleted)
        return deleted


chat_service = ChatService()
