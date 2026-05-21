"""Intent-based model routing with fallback chain."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Optional

import httpx

from voxentia.utils.logging import logger


@dataclass
class ModelProfile:
    name: str
    intents: list[str] = field(default_factory=list)
    min_prompt_tokens: int = 0
    max_prompt_tokens: int = 99999
    fallback: Optional[str] = None


DEFAULT_PROFILES: list[ModelProfile] = [
    ModelProfile("phi3-mini", ["greeting", "fallback"], max_prompt_tokens=1000),
    ModelProfile("mistral:7b", ["reasoning", "generate_quiz"], min_prompt_tokens=200),
    ModelProfile("llama3:8b", ["search_web", "job_search"]),
    ModelProfile("phi3", [], fallback=None),
]


class ModelRouter:
    def __init__(
        self,
        profiles: list[ModelProfile] | None = None,
        default: str = "phi3",
        ollama_url: str = "http://localhost:11434",
    ) -> None:
        self.profiles = profiles or DEFAULT_PROFILES
        self.default = default
        self.ollama_url = ollama_url.rstrip("/")
        self._available: set[str] = set()

    def _normalize_name(self, name: str) -> str:
        return name.split(":")[0].lower()

    def _matches_available(self, model: str) -> bool:
        if not self._available:
            return True
        base = self._normalize_name(model)
        for avail in self._available:
            if avail == model or self._normalize_name(avail) == base:
                return True
            if avail.startswith(f"{model}:") or model.startswith(f"{avail}:"):
                return True
        return False

    async def refresh_available(self, timeout: float = 5.0) -> None:
        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                resp = await client.get(f"{self.ollama_url}/api/tags")
                resp.raise_for_status()
                names = [m.get("name", "") for m in resp.json().get("models", []) if m.get("name")]
                self._available = set(names)
        except Exception as e:
            logger.warning("ModelRouter: could not fetch Ollama tags: %s", e)

    def resolve(
        self,
        intent: str,
        prompt_tokens: int,
        requested: str | None = None,
    ) -> str:
        if requested and self._matches_available(requested):
            return requested

        for profile in self.profiles:
            if intent not in profile.intents:
                continue
            if profile.min_prompt_tokens <= prompt_tokens <= profile.max_prompt_tokens:
                if self._matches_available(profile.name):
                    return profile.name
                if profile.fallback and self._matches_available(profile.fallback):
                    return profile.fallback

        if self._matches_available(self.default):
            return self.default
        if self._available:
            return next(iter(self._available))
        return self.default
