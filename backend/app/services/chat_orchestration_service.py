from __future__ import annotations

from app.domain.processing import ProcessingContext
from app.schemas.chat import ChatRequest
from app.services.voice_service import generate_tts_audio
from voxentia.orchestrator.response_formatter import VoxentiaResponse
from voxentia.orchestrator.pipeline import PipelineContext


class ChatOrchestrationService:
    def __init__(self, chat_service, settings) -> None:
        self.chat_service = chat_service
        self.settings = settings

    async def route(self, request: ChatRequest, ctx: ProcessingContext) -> VoxentiaResponse:
        return await self.chat_service.orchestrator.pipeline.run(
            PipelineContext(
                raw_message=request.message,
                language=ctx.lang,
                system_prompt=ctx.system_prompt,
                model=ctx.model,
                temperature=ctx.temperature,
                rag_context=ctx.rag_context,
                memory_hint=ctx.memory_hint,
                knowledge_hint=ctx.knowledge_hint,
                session_id=ctx.effective_session_id,
                history=ctx.history,
            )
        )

    async def maybe_tts(self, text: str, speaker: str, lang: str, *, session_id: str) -> str | None:
        if not self.settings.TTS_URL or not text:
            return None
        return await generate_tts_audio(
            text,
            speaker,
            lang,
            event_bus=self.chat_service.event_bus,
            session_id=session_id,
        )
