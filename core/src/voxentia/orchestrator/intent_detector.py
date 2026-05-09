from typing import Dict, Any, Tuple, Optional
from voxentia.services.llm_client import LLMClient

class IntentDetector:
    """Smart Intent-Erkennung mittels LLM."""
    
    def __init__(self, llm_client: LLMClient):
        self.llm = llm_client

    async def detect(self, text: str) -> Tuple[str, Dict[str, Any]]:
        """Nutzt das LLM, um Intent und Parameter aus dem Text zu extrahieren."""
        prompt = f"""
        Analyze the following user message and extract the intent and entities.
        Available intents:
        - get_weather (entities: location)
        - search_web (entities: query)
        - job_search (entities: query, location)
        - generate_quiz (entities: topic)
        - get_events (entities: date)
        - add_event (entities: title, start_time, location)
        - fallback (if no other intent matches)

        Respond ONLY in JSON format:
        {{
            "intent": "intent_name",
            "entities": {{
                "key": "value"
            }}
        }}

        User message: "{text}"
        """
        
        result = await self.llm.generate_json(prompt)
        intent = result.get("intent", "fallback")
        entities = result.get("entities", {})
        
        return intent, entities
