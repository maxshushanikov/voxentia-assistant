import re
import httpx
from core.config import settings

async def get_llm_response(message, history, model=None, temperature=0.7, language="en", rag_context=""):
    """
    Get response from LLM (Ollama) with language-specific system prompt and optional RAG context.
    """
    messages = []
    
    # Get system prompt for the specific language
    system_prompt = settings.SYSTEM_PROMPTS.get(language, settings.SYSTEM_PROMPTS["en"])
    
    if rag_context:
        system_prompt += f"\n\nHere is some context that might help answer the user:\n---\n{rag_context}\n---\nUse this context if relevant, otherwise use your general knowledge."
        
    messages.append({"role": "system", "content": system_prompt})
    
    # Add conversation history
    for msg in history:
        messages.append({"role": msg["role"], "content": msg["content"]})
    
    # Add current user message
    messages.append({"role": "user", "content": message})
    
    payload = {
        "model": model or settings.DEFAULT_MODEL,
        "messages": messages,
        "options": {"temperature": temperature},
        "stream": False
    }
    
    try:
        async with httpx.AsyncClient(timeout=settings.OLLAMA_TIMEOUT) as client:
            response = await client.post(
                f"{settings.OLLAMA_URL}/api/chat",
                json=payload
            )
            response.raise_for_status()
            response_data = response.json()
            assistant_text = response_data["message"]["content"].strip()
            
            return assistant_text
            
    except httpx.RequestError as e:
        raise ConnectionError(f"Cannot connect to Ollama: {str(e)}")
    except httpx.HTTPStatusError as e:
        raise RuntimeError(f"Ollama returned {response.status_code}: {response.text}")