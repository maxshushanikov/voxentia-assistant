from __future__ import annotations

from app.core.config import settings
from app.domain.processing import ProcessingContext
from app.schemas.chat import ChatRequest
from app.services.chat_persistence_service import ChatPersistenceService
from app.services.rag_service import RagSourceHit, search_sources
from sqlalchemy.orm import Session


class ChatContextBuilder:
    def __init__(self, persistence: ChatPersistenceService, chat_service) -> None:
        self.persistence = persistence
        self.chat_service = chat_service

    async def build(self, db: Session, request: ChatRequest) -> ProcessingContext:
        effective_session_id = request.session_id
        if request.fork_from_message_id:
            effective_session_id, _, _ = self.persistence.fork_session(
                db, request.session_id, request.fork_from_message_id
            )

        lang = request.language.value if hasattr(request.language, "value") else str(request.language)
        speaker = request.speaker.value if hasattr(request.speaker, "value") else str(request.speaker)
        personality = (
            request.personality.value if hasattr(request.personality, "value") else str(request.personality)
        )
        branch_id = request.branch_id or "main"
        model = request.model or settings.DEFAULT_MODEL

        history = self.persistence.get_recent_history(
            db,
            session_id=effective_session_id,
            limit=settings.HISTORY_LIMIT,
        )
        is_first_exchange = len(history) == 0
        self.persistence.save_user_message(
            db,
            session_id=effective_session_id,
            content=request.message,
            model=model,
            branch_id=branch_id,
        )

        rag_hits = await search_sources(request.message)
        rag_context = "\n\n".join(h.text for h in rag_hits if h.text)
        rag_sources = self._rag_sources_from_hits(rag_hits)
        system_prompt = self.chat_service._build_system_prompt(db, personality, lang, effective_session_id)
        memory_hint = ""
        knowledge_hint = ""
        if settings.ENABLE_MEMORY:
            memory_hint = self.chat_service.memory_service.build_memory_prompt(db, effective_session_id)
        if settings.ENABLE_KNOWLEDGE_GRAPH:
            knowledge_hint = self.chat_service.knowledge_service.build_graph_prompt(db, effective_session_id)
        temperature = request.temperature
        system_prompt, temperature, ab_assignment = self.chat_service._apply_ab_testing(
            effective_session_id, system_prompt, temperature
        )
        self.chat_service._schedule_post_processing(effective_session_id, request.message)

        return ProcessingContext(
            lang=lang,
            speaker=speaker,
            personality=personality,
            history=history,
            model=model,
            rag_context=rag_context,
            rag_sources=rag_sources,
            system_prompt=system_prompt,
            memory_hint=memory_hint,
            knowledge_hint=knowledge_hint,
            is_first_exchange=is_first_exchange,
            effective_session_id=effective_session_id,
            branch_id=branch_id,
            temperature=temperature,
            ab_assignment=ab_assignment,
        )

    @staticmethod
    def _rag_sources_from_hits(hits: list[RagSourceHit]) -> list[dict]:
        return [
            {
                "filename": h.filename,
                "page": h.page,
                "chunk_index": h.chunk_index,
                "score": h.score,
            }
            for h in hits
        ]
