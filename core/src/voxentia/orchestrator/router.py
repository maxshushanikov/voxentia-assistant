"""Orchestrator — delegates to the five-stage pipeline."""

from __future__ import annotations

from typing import Dict, List, Optional

from voxentia.orchestrator.pipeline import OrchestratorPipeline, PipelineContext
from voxentia.orchestrator.response_formatter import VoxentiaResponse
from voxentia.plugins.registry import PluginRegistry
from voxentia.services.llm_base import BaseLLMClient


class Orchestrator:
    def __init__(self, registry: PluginRegistry, llm_client: BaseLLMClient) -> None:
        self.pipeline = OrchestratorPipeline(registry, llm_client)

    async def route_request(
        self,
        message: str,
        language: str = "de",
        *,
        system_prompt: str = "",
        model: Optional[str] = None,
        temperature: float = 0.7,
        rag_context: str = "",
        history: Optional[List[Dict[str, str]]] = None,
    ) -> VoxentiaResponse:
        ctx = PipelineContext(
            raw_message=message,
            language=language,
            system_prompt=system_prompt,
            model=model,
            temperature=temperature,
            rag_context=rag_context,
            history=history,
        )
        return await self.pipeline.run(ctx)
