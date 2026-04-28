import re
import httpx
from core.config import settings

async def prepare_llm_messages(message, history, language="en", rag_context="", image_base64=None):
    """Prepare messages for Ollama API, including vision description if image is provided."""
    messages = []
    
    # Get system prompt for the specific language
    system_prompt = settings.SYSTEM_PROMPTS.get(language, settings.SYSTEM_PROMPTS["en"])
    
    if image_base64:
        try:
            image_description = await describe_image(image_base64)
            if image_description:
                # Make it sound like the assistant's own vision
                system_prompt += f"\n\n[YOUR VISION] You currently see this through your camera: {image_description}"
        except Exception as e:
            print(f"Vision error: {e}")

    if rag_context:
        system_prompt += f"\n\n[DOCUMENT CONTEXT]\n{rag_context}\n"
        
    # Final Task Instruction
    messages.append({"role": "system", "content": f"### MISSION:\n{system_prompt}\n\n### RULES:\n1. Answer the user directly and naturally.\n2. Use [YOUR VISION] to answer questions about what you see.\n3. Use [DOCUMENT CONTEXT] only if it is relevant to the question.\n4. Be concise (max 3 sentences)."})
    
    # Add conversation history
    for msg in history:
        messages.append({"role": msg["role"], "content": msg["content"]})
    
    # Add current user message
    messages.append({"role": "user", "content": message})
    return messages

async def describe_image(image_base64: str) -> str:
    """Uses llava model to describe the provided image."""
    # Strip metadata prefix if present (data:image/jpeg;base64,...)
    if ',' in image_base64:
        image_base64 = image_base64.split(',')[1]

    payload = {
        "model": "llava",
        "prompt": "Describe this image in one short sentence. What do you see?",
        "images": [image_base64],
        "stream": False,
        "options": {
            "temperature": 0.2,
            "num_predict": 50
        }
    }

    try:
        async with httpx.AsyncClient(timeout=60) as client:
            response = await client.post(
                f"{settings.OLLAMA_URL}/api/generate",
                json=payload
            )
            response.raise_for_status()
            return response.json().get("response", "").strip()
    except Exception as e:
        print(f"Ollama vision (llava) failed: {e}")
        return None

async def get_llm_response(message, history, model=None, temperature=0.7, language="en", rag_context="", image=None):
    """
    Get response from LLM (Ollama) with language-specific system prompt and optional RAG context.
    """
    messages = await prepare_llm_messages(message, history, language, rag_context, image)
    
    payload = {
        "model": model or settings.DEFAULT_MODEL,
        "messages": messages,
        "stream": False,
        "options": {
            "temperature": 0.4,
            "num_predict": 300,
            "top_k": 40,
            "top_p": 0.9,
            "repeat_penalty": 1.1,
            "stop": ["###", "[CONTEXT]", "[VISION]"]
        }
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

async def stream_llm_response(message, history, model=None, temperature=0.7, language="en", rag_context="", image=None):
    """
    Stream response from LLM (Ollama).
    """
    messages = await prepare_llm_messages(message, history, language, rag_context, image)
    
    payload = {
        "model": model or settings.DEFAULT_MODEL,
        "messages": messages,
        "stream": True,
        "options": {
            "temperature": 0.4,
            "num_predict": 300,
            "top_k": 40,
            "top_p": 0.9,
            "repeat_penalty": 1.1,
            "stop": ["###", "[CONTEXT]", "[VISION]"]
        }
    }
    
    try:
        async with httpx.AsyncClient(timeout=settings.OLLAMA_TIMEOUT) as client:
            async with client.stream(
                "POST",
                f"{settings.OLLAMA_URL}/api/chat",
                json=payload
            ) as response:
                response.raise_for_status()
                import json
                async for line in response.aiter_lines():
                    if not line:
                        continue
                    chunk = json.loads(line)
                    if "message" in chunk and "content" in chunk["message"]:
                        yield chunk["message"]["content"]
                    if chunk.get("done"):
                        break
                        
    except httpx.RequestError as e:
        raise ConnectionError(f"Cannot connect to Ollama: {str(e)}")
    except Exception as e:
        raise RuntimeError(f"Streaming error: {str(e)}")