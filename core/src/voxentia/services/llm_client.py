import httpx
import json
from typing import Optional, Dict, Any

class LLMClient:
    """Wrapper für die Kommunikation mit dem Ollama LLM."""
    
    def __init__(self, base_url: str = "http://localhost:11434", default_model: str = "llama3"):
        self.base_url = base_url
        self.default_model = default_model

    async def generate_json(self, prompt: str, model: Optional[str] = None) -> Dict[str, Any]:
        """Sendet einen Prompt an Ollama und erwartet eine JSON-Antwort."""
        payload = {
            "model": model or self.default_model,
            "prompt": prompt,
            "format": "json",
            "stream": False,
            "options": {
                "temperature": 0.1 # Niedrige Temperatur für präzise Extraktion
            }
        }
        
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                response = await client.post(f"{self.base_url}/api/generate", json=payload)
                response.raise_for_status()
                result = response.json()
                return json.loads(result.get("response", "{}"))
        except Exception as e:
            print(f"❌ LLM Error: {e}")
            return {}
