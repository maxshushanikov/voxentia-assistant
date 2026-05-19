"""Five-stage orchestration pipeline — each stage is independently testable."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

from voxentia.orchestrator.intent_detector import IntentDetector
from voxentia.orchestrator.response_formatter import VoxentiaResponse
from voxentia.plugins.registry import PluginRegistry
from voxentia.services.llm_base import BaseLLMClient
from voxentia.utils.logging import logger


@dataclass
class PipelineContext:
    raw_message: str
    language: str = "de"
    system_prompt: str = ""
    model: Optional[str] = None
    temperature: float = 0.7
    rag_context: str = ""
    message: str = ""
    intent: str = "fallback"
    entities: Dict[str, Any] = field(default_factory=dict)
    plugin_data: Optional[Dict[str, Any]] = None
    history: Optional[List[Dict[str, str]]] = None


class OrchestratorPipeline:
    def __init__(self, registry: PluginRegistry, llm: BaseLLMClient) -> None:
        self.registry = registry
        self.llm = llm
        self.intent_detector = IntentDetector(llm, registry)

    def normalize_input(self, ctx: PipelineContext) -> PipelineContext:
        ctx.message = " ".join(ctx.raw_message.split()).strip()
        return ctx

    def enrich_rag(self, ctx: PipelineContext) -> PipelineContext:
        if ctx.rag_context:
            ctx.message = (
                "Use the following document excerpts to answer. "
                "If irrelevant, use general knowledge.\n\n"
                f"{ctx.rag_context}\n\nUser: {ctx.message}"
            )
        return ctx

    async def detect_intent(self, ctx: PipelineContext) -> PipelineContext:
        ctx.intent, ctx.entities = await self.intent_detector.detect(
            ctx.message,
            system=ctx.system_prompt,
            model=ctx.model,
            temperature=0.1,
        )
        ctx.entities["language"] = ctx.language
        logger.info("Intent: %s entities=%s", ctx.intent, ctx.entities)
        return ctx

    async def plugin_pre_llm(self, ctx: PipelineContext) -> PipelineContext:
        for plugin in self.registry.plugins.values():
            extra = await plugin.pre_llm(ctx.message, ctx.entities)
            if extra:
                ctx.message = f"{extra}\n\n{ctx.message}"

        # Trigger external HTTP pre_llm webhooks
        from voxentia.config.settings import settings
        webhooks = settings.plugin_webhooks
        if webhooks:
            import httpx
            async with httpx.AsyncClient() as client:
                for url in webhooks:
                    try:
                        resp = await client.post(
                            url,
                            json={
                                "message": ctx.message,
                                "entities": ctx.entities,
                                "intent": ctx.intent,
                                "language": ctx.language
                            },
                            timeout=5.0
                        )
                        if resp.status_code == 200:
                            data = resp.json()
                            extra = data.get("extra_context")
                            if extra:
                                ctx.message = f"{extra}\n\n{ctx.message}"
                            new_msg = data.get("message")
                            if new_msg:
                                ctx.message = new_msg
                    except Exception as e:
                        logger.error("Error executing pre_llm webhook to %s: %s", url, e)
        return ctx

    async def route_plugin(self, ctx: PipelineContext) -> Optional[VoxentiaResponse]:
        if ctx.intent == "greeting" or ctx.message.lower() in ("hello", "hi", "hallo", "hey"):
            greetings = {
                "de": "Hallo! Ich bin Voxentia. Wie kann ich dir heute behilflich sein?",
                "en": "Hello! I am Voxentia. How can I help you today?",
                "ru": "Привет! Я Воксентия. Чем я могу вам помочь сегодня?",
            }
            return VoxentiaResponse(
                text=greetings.get(ctx.language, greetings["en"]),
                intent="greeting",
            )

        plugin = self.registry.get_plugin_for_intent(ctx.intent)
        if plugin:
            try:
                res = await plugin.on_message(ctx.intent, ctx.entities)
                return VoxentiaResponse(
                    text=res.text,
                    plugin_data=res.data,
                    intent=ctx.intent,
                )
            except Exception as e:
                logger.exception("Plugin error for intent %s: %s", ctx.intent, e)
                return await self.llm_fallback(ctx)
        return None

    async def llm_fallback(self, ctx: PipelineContext) -> VoxentiaResponse:
        try:
            text = await self.llm.generate(
                ctx.message,
                model=ctx.model,
                system=ctx.system_prompt or None,
                temperature=ctx.temperature,
                history=ctx.history,
            )
        except Exception as e:
            logger.error("LLM fallback failed: %s", e)
            text = "I'm sorry, I could not reach the language model right now."
        return VoxentiaResponse(text=text, intent="fallback")

    async def run(self, ctx: PipelineContext) -> VoxentiaResponse:
        ctx = self.normalize_input(ctx)
        ctx = self.enrich_rag(ctx)
        ctx = await self.detect_intent(ctx)
        ctx = await self.plugin_pre_llm(ctx)

        plugin_response = await self.route_plugin(ctx)
        if plugin_response:
            return plugin_response
        return await self.llm_fallback(ctx)
