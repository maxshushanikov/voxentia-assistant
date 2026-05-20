import re
from typing import Any, Dict, List, Optional, Tuple

from voxentia.services.llm_base import BaseLLMClient
from voxentia.utils.logging import logger

TOOLS_METADATA = [
    {
        "type": "function",
        "function": {
            "name": "get_weather",
            "description": "Get the current weather and temperature for a given city or location.",
            "parameters": {
                "type": "object",
                "properties": {
                    "location": {
                        "type": "string",
                        "description": "The city and/or country, e.g. Munich, Germany or Berlin"
                    }
                },
                "required": ["location"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "search_web",
            "description": "Search the web for real-time information or answers to general knowledge queries.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "The web search query string"
                    }
                },
                "required": ["query"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_events",
            "description": "List upcoming events, meetings, or calendar items for the user.",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "add_event",
            "description": "Add a new event, meeting, or appointment to the user's calendar.",
            "parameters": {
                "type": "object",
                "properties": {
                    "title": {
                        "type": "string",
                        "description": "The title or subject of the event"
                    },
                    "date": {
                        "type": "string",
                        "description": "The date of the event, e.g. YYYY-MM-DD"
                    },
                    "time": {
                        "type": "string",
                        "description": "The time of the event, e.g. HH:MM"
                    }
                },
                "required": ["title", "date"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "generate_quiz",
            "description": "Create a practice quiz or multiple-choice test on a specified academic topic for study purposes.",
            "parameters": {
                "type": "object",
                "properties": {
                    "topic": {
                        "type": "string",
                        "description": "The educational subject or topic, e.g. Chemistry, European History"
                    }
                },
                "required": ["topic"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "job_search",
            "description": "Search for open job listings, career postings, or employment opportunities.",
            "parameters": {
                "type": "object",
                "properties": {
                    "title": {
                        "type": "string",
                        "description": "The job title or keywords, e.g. Frontend Engineer"
                    },
                    "location": {
                        "type": "string",
                        "description": "The location to search in, e.g. Munich or Remote"
                    }
                },
                "required": ["title"]
            }
        }
    }
]


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
    ) -> Tuple[str, Dict[str, Any], float, str]:
        """Ermittelt den Intent (Hybrid-Ansatz) inkl. Konfidenz und Quelle."""

        # 1. Schneller Keyword-Check
        keyword_intent = self._detect_via_keywords(text)
        if keyword_intent:
            logger.info("Fast keyword intent matched: %s", keyword_intent)
            entities = {}
            if keyword_intent == "job_search":
                match = re.search(r"(?:in|nach)\s+([a-zA-Z\s\u00c0-\u017f]+)", text, re.IGNORECASE)
                if match:
                    entities["location"] = match.group(1).strip()
                title_match = re.search(r"als\s+([a-zA-Z\s\u00c0-\u017f]+)", text, re.IGNORECASE)
                if title_match:
                    entities["title"] = title_match.group(1).strip()
            return keyword_intent, entities, 0.85, "keyword"

        available = list(self.KEYWORD_PATTERNS.keys()) + ["search_web", "add_event"]
        if self.registry:
            available.extend(self.registry.all_intents())
        available = list(set(available))

        # 2. Native Ollama Tool calling
        tools = [tool for tool in TOOLS_METADATA if tool["function"]["name"] in available]
        if tools:
            try:
                tool_calls = await self.llm.chat_with_tools(
                    text,
                    tools=tools,
                    system=system or None,
                    model=model,
                    temperature=temperature,
                )
                if tool_calls:
                    call = tool_calls[0]
                    func = call.get("function", {})
                    intent = func.get("name")
                    entities = func.get("arguments", {})
                    if intent in available:
                        logger.info("Native Ollama tool call detected: %s with args %s", intent, entities)
                        return intent, entities, 0.95, "tool_call"
            except Exception as e:
                logger.error("Native tool call failed: %s", e)

        # 3. LLM-Analyse Fallback (JSON prompt)
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
                logger.info("Fallback auf Keyword-Intent: %s", keyword_intent)
                return keyword_intent, entities, 0.85, "keyword"

            resolved = llm_intent or "fallback"
            if resolved != "fallback" and self.registry and not self.registry.get_plugin_for_intent(resolved):
                logger.info("LLM intent %s has no plugin — fallback", resolved)
                return "fallback", entities, float(confidence), "llm"
            return resolved, entities, float(confidence), "llm"
        except Exception as e:
            logger.error("Fehler bei LLM-Intent-Erkennung: %s", e)
            return keyword_intent or "fallback", {}, 0.0, "fallback"
