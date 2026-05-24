"""Ollama LLM client — first implementation of BaseLLMClient."""

from __future__ import annotations

import json
from typing import Any, AsyncIterator, Dict, List, Optional

import httpx

from voxentia.observability.tracing import trace_span
from voxentia.services.llm_base import BaseLLMClient
from voxentia.utils.logging import logger


def _trace_headers() -> dict[str, str]:
    headers: dict[str, str] = {}
    try:
        from opentelemetry.propagate import inject

        inject(headers)
    except Exception:
        pass
    return headers


class OllamaClient(BaseLLMClient):
    """HTTP client for Ollama /api/generate."""

    def __init__(
        self,
        base_url: str = "http://localhost:11434",
        default_model: str = "phi3",
        timeout: float = 60.0,
    ) -> None:
        self.base_url = base_url.rstrip("/")
        self.default_model = default_model
        self.timeout = timeout
        self._client = httpx.AsyncClient(timeout=self.timeout)

    async def close(self):
        await self._client.aclose()

    def _build_messages(self, prompt: str, system: Optional[str] = None, history: Optional[List[Dict[str, str]]] = None) -> List[Dict[str, str]]:
        msgs = []
        if system:
            msgs.append({"role": "system", "content": system.strip()})
        if history:
            msgs.extend(history)
        if prompt:
            msgs.append({"role": "user", "content": prompt})
        return msgs

    async def generate_json(
        self,
        prompt: str,
        model: Optional[str] = None,
        system: Optional[str] = None,
        temperature: float = 0.1,
        history: Optional[List[Dict[str, str]]] = None,
    ) -> Dict[str, Any]:
        payload = {
            "model": model or self.default_model,
            "messages": self._build_messages(prompt, system, history),
            "format": "json",
            "stream": False,
            "options": {"temperature": temperature, "num_ctx": 2048},
        }
        try:
            with trace_span(
                "ollama.chat.json",
                service="ollama",
                attributes={"llm.model": payload["model"], "llm.stream": False},
            ):
                response = await self._client.post(
                    f"{self.base_url}/api/chat",
                    json=payload,
                    headers=_trace_headers(),
                )
                response.raise_for_status()
                result = response.json()
            content = result.get("message", {}).get("content", "{}")
            return json.loads(content)
        except Exception as e:
            logger.error("LLM JSON generation failed: %s", e)
            return {}

    async def generate(
        self,
        prompt: str,
        model: Optional[str] = None,
        system: Optional[str] = None,
        temperature: float = 0.7,
        history: Optional[List[Dict[str, str]]] = None,
    ) -> str:
        payload = {
            "model": model or self.default_model,
            "messages": self._build_messages(prompt, system, history),
            "stream": False,
            "options": {"temperature": temperature, "num_ctx": 2048},
        }
        try:
            with trace_span(
                "ollama.chat",
                service="ollama",
                attributes={"llm.model": payload["model"], "llm.stream": False},
            ):
                response = await self._client.post(
                    f"{self.base_url}/api/chat",
                    json=payload,
                    headers=_trace_headers(),
                )
                response.raise_for_status()
                return response.json().get("message", {}).get("content", "")
        except Exception as e:
            logger.error("LLM generation failed: %s", e)
            raise

    async def generate_stream(
        self,
        prompt: str,
        model: Optional[str] = None,
        system: Optional[str] = None,
        temperature: float = 0.7,
        history: Optional[List[Dict[str, str]]] = None,
    ) -> AsyncIterator[str]:
        payload = {
            "model": model or self.default_model,
            "messages": self._build_messages(prompt, system, history),
            "stream": True,
            "options": {"temperature": temperature, "num_ctx": 2048},
        }
        with trace_span(
            "ollama.chat.stream",
            service="ollama",
            attributes={"llm.model": payload["model"], "llm.stream": True},
        ):
            async with self._client.stream(
                "POST",
                f"{self.base_url}/api/chat",
                json=payload,
                headers=_trace_headers(),
            ) as response:
                response.raise_for_status()
                async for line in response.aiter_lines():
                    if not line:
                        continue
                    try:
                        chunk = json.loads(line)
                        token = chunk.get("message", {}).get("content", "")
                        if token:
                            yield token
                    except json.JSONDecodeError:
                        continue

    async def chat_with_tools(
        self,
        prompt: str,
        tools: List[Dict[str, Any]],
        model: Optional[str] = None,
        system: Optional[str] = None,
        temperature: float = 0.1,
        history: Optional[List[Dict[str, str]]] = None,
    ) -> Optional[List[Dict[str, Any]]]:
        """Send tools definition to Ollama and return detected tool calls."""
        payload = {
            "model": model or self.default_model,
            "messages": self._build_messages(prompt, system, history),
            "stream": False,
            "tools": tools,
            "options": {"temperature": temperature, "num_ctx": 2048},
        }
        try:
            with trace_span(
                "ollama.chat.tools",
                service="ollama",
                attributes={"llm.model": payload["model"], "llm.tools": len(tools)},
            ):
                response = await self._client.post(
                    f"{self.base_url}/api/chat",
                    json=payload,
                    headers=_trace_headers(),
                )
                response.raise_for_status()
                result = response.json()
            message = result.get("message", {})
            return message.get("tool_calls")
        except Exception as e:
            logger.error("LLM tool chat failed: %s", e)
            return None


# Backward-compatible alias
LLMClient = OllamaClient
