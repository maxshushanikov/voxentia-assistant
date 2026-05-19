"""Ollama LLM client — first implementation of BaseLLMClient."""

from __future__ import annotations

import json
from typing import Any, AsyncIterator, Dict, Optional

import httpx

from voxentia.services.llm_base import BaseLLMClient
from voxentia.utils.logging import logger


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

    def _build_prompt(self, prompt: str, system: Optional[str] = None) -> str:
        if system:
            return f"{system.strip()}\n\n{prompt}"
        return prompt

    async def generate_json(
        self,
        prompt: str,
        model: Optional[str] = None,
        system: Optional[str] = None,
        temperature: float = 0.1,
    ) -> Dict[str, Any]:
        payload = {
            "model": model or self.default_model,
            "prompt": self._build_prompt(prompt, system),
            "format": "json",
            "stream": False,
            "options": {"temperature": temperature, "num_ctx": 2048},
        }
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(f"{self.base_url}/api/generate", json=payload)
                response.raise_for_status()
                result = response.json()
                return json.loads(result.get("response", "{}"))
        except Exception as e:
            logger.error("LLM JSON generation failed: %s", e)
            return {}

    async def generate(
        self,
        prompt: str,
        model: Optional[str] = None,
        system: Optional[str] = None,
        temperature: float = 0.7,
    ) -> str:
        payload = {
            "model": model or self.default_model,
            "prompt": self._build_prompt(prompt, system),
            "stream": False,
            "options": {"temperature": temperature, "num_ctx": 2048},
        }
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(f"{self.base_url}/api/generate", json=payload)
                response.raise_for_status()
                return response.json().get("response", "")
        except Exception as e:
            logger.error("LLM generation failed: %s", e)
            raise

    async def generate_stream(
        self,
        prompt: str,
        model: Optional[str] = None,
        system: Optional[str] = None,
        temperature: float = 0.7,
    ) -> AsyncIterator[str]:
        payload = {
            "model": model or self.default_model,
            "prompt": self._build_prompt(prompt, system),
            "stream": True,
            "options": {"temperature": temperature, "num_ctx": 2048},
        }
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            async with client.stream(
                "POST", f"{self.base_url}/api/generate", json=payload
            ) as response:
                response.raise_for_status()
                async for line in response.aiter_lines():
                    if not line:
                        continue
                    try:
                        chunk = json.loads(line)
                        token = chunk.get("response", "")
                        if token:
                            yield token
                    except json.JSONDecodeError:
                        continue


# Backward-compatible alias
LLMClient = OllamaClient
