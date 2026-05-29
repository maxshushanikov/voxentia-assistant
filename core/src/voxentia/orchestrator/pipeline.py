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
    intent_confidence: float = 0.0
    intent_source: str = "unknown"  # keyword | tool_call | llm | fallback
    entities: Dict[str, Any] = field(default_factory=dict)
    plugin_data: Optional[Dict[str, Any]] = None
    memory_hint: str = ""
    knowledge_hint: str = ""
    session_id: str = ""
    history: Optional[List[Dict[str, str]]] = None


class OrchestratorPipeline:
    def __init__(self, registry: PluginRegistry, llm: BaseLLMClient) -> None:
        self.registry = registry
        self.llm = llm
        self.intent_detector = IntentDetector(llm, registry)
        self._pre_hooks: list = []
        self._post_hooks: list = []

    def add_pre_hook(self, hook) -> None:
        self._pre_hooks.append(hook)

    def add_post_hook(self, hook) -> None:
        self._post_hooks.append(hook)

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
        ctx.intent, ctx.entities, ctx.intent_confidence, ctx.intent_source = (
            await self.intent_detector.detect(
                ctx.message,
                system=ctx.system_prompt,
                model=ctx.model,
                temperature=0.1,
            )
        )
        ctx.entities["language"] = ctx.language
        logger.info(
            "Intent: %s (%.2f via %s) entities=%s",
            ctx.intent,
            ctx.intent_confidence,
            ctx.intent_source,
            ctx.entities,
        )
        return ctx

    async def resolve_model(self, ctx: PipelineContext) -> PipelineContext:
        from voxentia.config.settings import settings

        if not settings.ENABLE_MODEL_ROUTING:
            return ctx
        from voxentia.orchestrator.model_router import ModelRouter

        router = ModelRouter(
            default=settings.DEFAULT_MODEL,
            ollama_url=settings.OLLAMA_URL,
        )
        await router.refresh_available(settings.OLLAMA_TIMEOUT)
        tokens = max(1, len(ctx.message.split()))
        ctx.model = router.resolve(ctx.intent, tokens, ctx.model)
        return ctx

    def enrich_memory(self, ctx: PipelineContext) -> PipelineContext:
        if ctx.memory_hint:
            ctx.system_prompt = f"{ctx.system_prompt}\n\n{ctx.memory_hint}"
        if ctx.knowledge_hint:
            ctx.system_prompt = f"{ctx.system_prompt}\n\n{ctx.knowledge_hint}"
        return ctx

    async def plugin_pre_llm(self, ctx: PipelineContext) -> PipelineContext:
        for plugin in self.registry.plugins.values():
            extra = await plugin.pre_llm(ctx.message, ctx.entities)
            if extra:
                ctx.message = f"{extra}\n\n{ctx.message}"

        # Trigger external HTTP pre_llm webhooks
        from voxentia.config.settings import settings
        webhooks = settings.plugin_webhooks
        if settings.PROCESSING_MODE == "local_only" and webhooks:
            logger.warning("Webhooks skipped in local_only processing mode")
            webhooks = []
        if webhooks:
            import ipaddress
            import socket
            from urllib.parse import urlparse

            import httpx

            def _is_safe_url(u: str) -> bool:
                try:
                    parsed = urlparse(u)
                    if parsed.scheme not in ("http", "https"):
                        return False
                    host = parsed.hostname
                    if not host:
                        return False
                    addr_info = socket.getaddrinfo(host, parsed.port or (80 if parsed.scheme == "http" else 443))
                    ips = [info[4][0] for info in addr_info]
                    for ip in ips:
                        ip_obj = ipaddress.ip_address(ip)
                        if ip_obj.is_private or ip_obj.is_loopback or ip_obj.is_link_local or ip_obj.is_multicast or ip_obj.is_reserved:
                            return False
                    return True
                except Exception:
                    return False

            async with httpx.AsyncClient() as client:
                for url in webhooks:
                    if not _is_safe_url(url):
                        logger.warning("Skipping webhook with unsafe or unresolvable URL: %s", url)
                        continue
                    try:
                        resp = await client.post(
                            url,
                            json={
                                "message": ctx.message,
                                "entities": ctx.entities,
                                "intent": ctx.intent,
                                "language": ctx.language,
                            },
                            timeout=5.0,
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

        message = ctx.message or ctx.raw_message
        plugin = await self.registry.get_plugin_for_intent(ctx.intent, message)
        if plugin:
            try:
                from voxentia.config.settings import settings

                timeout_sec = settings.PLUGIN_TIMEOUT
                # Use the registry's timeout wrapper to run plugin code with
                # an enforced timeout and isolated error handling.
                async with self.registry._execute_with_timeout(plugin.__class__.__name__, plugin.on_message(ctx.intent, ctx.entities), timeout_sec=timeout_sec) as res:
                    plugin_data = dict(res.data or {})
                    plugin_data["intent_confidence"] = ctx.intent_confidence
                    plugin_data["intent_source"] = ctx.intent_source
                    return VoxentiaResponse(
                        text=res.text,
                        plugin_data=plugin_data,
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
        return VoxentiaResponse(
            text=text,
            intent="fallback",
            plugin_data={
                "intent_confidence": ctx.intent_confidence,
                "intent_source": ctx.intent_source,
            },
        )

    async def run(self, ctx: PipelineContext) -> VoxentiaResponse:
        for hook in self._pre_hooks:
            ctx = await hook(ctx)
        ctx = self.normalize_input(ctx)
        ctx = self.enrich_rag(ctx)
        ctx = await self.detect_intent(ctx)
        ctx = await self.resolve_model(ctx)
        ctx = self.enrich_memory(ctx)
        ctx = await self.plugin_pre_llm(ctx)

        plugin_response = await self.route_plugin(ctx)
        if plugin_response:
            response = plugin_response
        else:
            response = await self.llm_fallback(ctx)

        for hook in self._post_hooks:
            ctx = await hook(ctx)
        return response
