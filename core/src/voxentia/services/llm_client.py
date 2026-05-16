import json
from typing import Any, Dict, Optional

import httpx

from voxentia.utils.logging import logger


class LLMClient:
    """Wrapper für die Kommunikation mit dem Ollama LLM."""

    def __init__(self, base_url: str = "http://localhost:11434", default_model: str = "phi3"):
        self.base_url = base_url
        self.default_model = default_model

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
        """Sendet einen Prompt an Ollama und erwartet eine JSON-Antwort."""
        payload = {
            "model": model or self.default_model,
            "prompt": self._build_prompt(prompt, system),
            "format": "json",
            "stream": False,
            "options": {"temperature": temperature},
        }

        try:
            async with httpx.AsyncClient(timeout=30) as client:
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
        """Sendet einen Prompt an Ollama und gibt den Antwort-Text zurück."""
        payload = {
            "model": model or self.default_model,
            "prompt": self._build_prompt(prompt, system),
            "stream": False,
            "options": {"temperature": temperature},
        }

        try:
            async with httpx.AsyncClient(timeout=30) as client:
                response = await client.post(f"{self.base_url}/api/generate", json=payload)
                response.raise_for_status()
                result = response.json()
                return result.get("response", "")
        except Exception as e:
            logger.error("LLM generation failed: %s", e)
            return "Entschuldigung, ich habe gerade technische Schwierigkeiten bei der Antwort-Generierung."
