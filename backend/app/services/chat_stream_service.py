from __future__ import annotations

import asyncio
import logging
import re

from app.core.events import publish_app_event
from app.domain.processing import ProcessingContext
from app.schemas.chat import ChatRequest
from app.services.voice_service import generate_tts_audio
from sqlalchemy.orm import Session

logger = logging.getLogger("voxentia.api")

MIN_SENTENCE_CHARS_FOR_TTS = 20
MIN_CLEANED_CHARS_FOR_TTS = 10
MIN_TRAILING_CHARS_FOR_TTS = 2
TTS_PARALLEL_WORKERS = 3


class ChatStreamService:
    def __init__(self, chat_service) -> None:
        self.chat_service = chat_service

    async def stream(self, db: Session, request: ChatRequest, ctx: ProcessingContext):
        effective_session_id = ctx.effective_session_id
        stream_intent = "stream"
        full_text = ""
        current_sentence = ""
        current_emotion = "neutral"
        model = ctx.model

        await publish_app_event(
            self.chat_service.event_bus,
            "chat.message.started",
            {"session_id": effective_session_id, "stream": True},
        )

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
                        event_bus=self.chat_service.event_bus,
                        session_id=effective_session_id,
                    )
                    if url:
                        await audio_queue.put(url)
                except Exception as e:
                    logger.error("TTS worker failed: %s", e)
                finally:
                    tts_queue.task_done()

        worker_tasks = [asyncio.create_task(tts_worker()) for _ in range(TTS_PARALLEL_WORKERS)]

        routed_response = None
        try:
            routed_response = await self.chat_service.orchestration_service.route(request, ctx)
        except Exception:
            routed_response = None

        if routed_response and getattr(routed_response, "intent", "fallback") != "fallback":
            stream_intent = routed_response.intent
            resp_text = routed_response.text or ""
            chunk_size = 64
            for i in range(0, len(resp_text), chunk_size):
                token = resp_text[i : i + chunk_size]
                full_text += token
                current_sentence += token
                yield {"event": "token", "data": token}
                while not audio_queue.empty():
                    try:
                        url = audio_queue.get_nowait()
                        yield {"event": "audio", "data": url}
                    except asyncio.QueueEmpty:
                        break
            model = await self.chat_service._resolve_model(request, request.message, routed_response.intent)
        else:
            async for token in self.chat_service.llm_client.generate_stream(
                request.message,
                model=model,
                system=ctx.system_prompt or None,
                temperature=ctx.temperature,
                history=ctx.history,
            ):
                full_text += token
                current_sentence += token
                yield {"event": "token", "data": token}

                if len(current_sentence) > MIN_SENTENCE_CHARS_FOR_TTS and any(
                    char in token for char in [".", "!", "?", "\n"]
                ):
                    sentence_to_speak = current_sentence.strip()
                    current_sentence = ""
                    sentence_to_speak = re.sub(
                        r"\[think\].*?(\[/think\]|$)", "", sentence_to_speak, flags=re.DOTALL
                    ).strip()
                    sentence_to_speak = re.sub(
                        r"<think>.*?(</think>|$)", "", sentence_to_speak, flags=re.DOTALL
                    ).strip()
                    sentence_to_speak = re.sub(r"\[.*?\]|<.*?>", "", sentence_to_speak).strip()

                    if sentence_to_speak and len(sentence_to_speak) > MIN_CLEANED_CHARS_FOR_TTS:
                        await tts_queue.put((sentence_to_speak, ctx.speaker, ctx.lang))

            emotion_match = re.search(r"\[(happy|thinking|neutral|sad|angry|excited)\]", current_sentence)
            if emotion_match:
                emotion = emotion_match.group(1)
                if emotion != current_emotion:
                    current_emotion = emotion
                    yield {"event": "emotion", "data": emotion}

            while not audio_queue.empty():
                try:
                    url = audio_queue.get_nowait()
                    yield {"event": "audio", "data": url}
                except asyncio.QueueEmpty:
                    break

        if current_sentence.strip():
            sentence_to_speak = current_sentence.strip()
            sentence_to_speak = re.sub(r"\[think\].*?(\[/think\]|$)", "", sentence_to_speak, flags=re.DOTALL).strip()
            sentence_to_speak = re.sub(r"<think>.*?(</think>|$)", "", sentence_to_speak, flags=re.DOTALL).strip()
            sentence_to_speak = re.sub(r"\[.*?\]|<.*?>", "", sentence_to_speak).strip()
            if sentence_to_speak and len(sentence_to_speak) > MIN_TRAILING_CHARS_FOR_TTS:
                await tts_queue.put((sentence_to_speak, ctx.speaker, ctx.lang))

        for _ in worker_tasks:
            await tts_queue.put(None)
        await asyncio.gather(*worker_tasks, return_exceptions=True)

        while not audio_queue.empty():
            try:
                url = audio_queue.get_nowait()
                yield {"event": "audio", "data": url}
            except asyncio.QueueEmpty:
                break

        message_id = self.chat_service.persistence.save_assistant_message(
            db,
            session_id=effective_session_id,
            content=full_text,
            model=model,
            branch_id=ctx.branch_id,
        )

        if ctx.is_first_exchange:
            await self.chat_service._maybe_generate_session_title(db, effective_session_id, request.message)

        await publish_app_event(
            self.chat_service.event_bus,
            "chat.stream.completed",
            {"session_id": effective_session_id, "intent": stream_intent, "chars": len(full_text)},
        )

        yield {
            "event": "done",
            "data": {
                "text": re.sub(r"\[.*?\]|<.*?>", "", full_text).strip(),
                "audio_url": None,
                "session_id": effective_session_id,
                "intent": stream_intent,
                "emotion": current_emotion,
                "rag_sources": ctx.rag_sources,
                "message_id": message_id,
            },
        }
