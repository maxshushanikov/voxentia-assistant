import re
from typing import Any, Dict, List, Optional, Tuple

from voxentia.services.llm_base import BaseLLMClient
from voxentia.utils.logging import logger


class IntentDetector:
    """Hybride Intent-Erkennung: LLM-basiert mit Keyword-Fallbacks."""

    # Schnelle Muster für kritische Intents
    KEYWORD_PATTERNS: Dict[str, List[str]] = {
        "job_search": [r"job", r"stelle", r"arbeit", r"career"],
        "get_weather": [r"wetter", r"temperatur", r"regen", r"sonne"],
        "get_events": [r"termin", r"kalender", r"plan", r"heute"],
        "generate_quiz": [r"quiz", r"test", r"abfragen", r"lernen"],
    }

    def __init__(self, llm_client: BaseLLMClient, registry=None):
        self.llm = llm_client
        self.registry = registry

    def _detect_via_keywords(self, text: str) -> Optional[str]:
        """Einfache Regex-basierte Erkennung."""
        msg_lower = text.lower()
        for intent, patterns in self.KEYWORD_PATTERNS.items():
            if any(re.search(pattern, msg_lower) for pattern in patterns):
                return intent
        return None

    async def detect(
        self,
        text: str,
        *,
        system: str = "",
        model: str | None = None,
        temperature: float = 0.1,
    ) -> Tuple[str, Dict[str, Any]]:
        """Ermittelt den Intent (Hybrid-Ansatz)."""

        # 1. Schneller Keyword-Check
        keyword_intent = self._detect_via_keywords(text)

        available = list(self.KEYWORD_PATTERNS.keys()) + ["search_web", "add_event"]
        if self.registry:
            available.extend(self.registry.get_all_intents())
        available = list(set(available))

        # 2. LLM-Analyse
        prompt = f"""
        Analyze the following user message and extract the intent and entities.
        Available intents: {available}

        Respond ONLY in JSON format:
        {{
            "intent": "name",
            "entities": {{}},
            "confidence": 0.0
        }}

        User message: "{text}"
        """

        try:
            res = await self.llm.generate_json(
                prompt, system=system or None, model=model, temperature=temperature
            )
            llm_intent = res.get("intent")
            confidence = res.get("confidence", 0.0)
            entities = res.get("entities", {})

            # Wenn LLM unsicher ist, aber Keyword passt -> Nutze Keyword
            if confidence < 0.5 and keyword_intent:
                logger.info(f"Fallback auf Keyword-Intent: {keyword_intent}")
                return keyword_intent, entities

            return llm_intent or "fallback", entities
        except Exception as e:
            logger.error(f"Fehler bei LLM-Intent-Erkennung: {e}")
            return keyword_intent or "fallback", {}
