import re
import httpx
from core.config import settings
from services.tools import TOOL_DESCRIPTIONS

async def prepare_llm_messages(message, history, language="en", personality="professional", rag_context="", image_base64=None, use_tools=True):
    """Prepare messages for Ollama API, including vision description if image is provided."""
    messages = []
    
    # Get system prompt for the specific personality and language
    personality_data = settings.PERSONALITIES.get(personality, settings.PERSONALITIES["professional"])
    system_prompt = personality_data.get(language, personality_data["en"])
    
    # Add tool instructions
    if use_tools:
        system_prompt += f"\n\n{TOOL_DESCRIPTIONS}"
    
    # Generic constraints to keep responses suitable for the avatar
    system_prompt += "\nAlways be concise (max 4 sentences). You MUST finish your sentences and ensure the answer is grammatically complete. You MUST use emotion tags like [happy], [think], [surprise], [sad], [laugh] naturally in your text."
    
    # Explicit language instruction
    lang_map = {"en": "English", "de": "German", "ru": "Russian"}
    lang_name = lang_map.get(language, "English")
    system_prompt += f"\nCRITICAL: You MUST answer EXCLUSIVELY in {lang_name}!"
    
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
    system_message = f"""
[SYSTEM INSTRUCTION]
MISSION: {system_prompt}

RULES:
1. Answer directly and naturally in {lang_name}.
2. Complete every sentence and thought.
3. Keep it brief (max 3 sentences).
4. Use emotion tags like [happy], [think] etc.
"""
    messages.append({"role": "system", "content": system_message.strip()})

    
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

async def get_llm_response(message, history, model=None, temperature=0.7, language="en", personality="professional", rag_context="", image=None, use_tools=True):
    """
    Get response from LLM (Ollama) with language-specific system prompt, personality and optional RAG context.
    """
    messages = await prepare_llm_messages(message, history, language, personality, rag_context, image, use_tools)
    
    payload = {
        "model": model or settings.DEFAULT_MODEL,
        "messages": messages,
        "stream": False,
        "options": {
            "temperature": 0.4,
            "num_predict": 1024,
            "top_k": 40,
            "top_p": 0.9,
            "repeat_penalty": 1.15,
            "stop": ["###", "[CONTEXT]", "[VISION]", "MISSION:", "RULES:", "AVAILABLE TOOLS:", "INSTRUCTIONS:", "[SYSTEM INSTRUCTION]"]
        }
    }
    
    try:
        async with httpx.AsyncClient(timeout=settings.OLLAMA_TIMEOUT) as client:
            # Loop for potential tool calls (max 2 iterations to avoid infinite loops)
            for _ in range(2):
                response = await client.post(
                    f"{settings.OLLAMA_URL}/api/chat",
                    json=payload
                )
                response.raise_for_status()
                response_data = response.json()
                assistant_text = response_data["message"]["content"].strip()
                
                # Check for tool call pattern: [TOOL: name(args)]
                tool_match = re.search(r"\[TOOL:\s*(\w+)\((.*?)\)\]", assistant_text)
                if tool_match:
                    tool_name = tool_match.group(1)
                    tool_args_raw = tool_match.group(2)
                    
                    from services.tools import AVAILABLE_TOOLS
                    if tool_name in AVAILABLE_TOOLS:
                        print(f"🛠️ Executing tool: {tool_name}({tool_args_raw})")
                        # Simple arg parser for mocked tools (key="value")
                        args = {}
                        if "=" in tool_args_raw:
                            parts = tool_args_raw.split(",")
                            for p in parts:
                                k, v = p.split("=")
                                args[k.strip()] = v.strip().replace('"', '').replace("'", "")
                        
                        # Execute tool
                        tool_func = AVAILABLE_TOOLS[tool_name]
                        if args:
                            result = await tool_func(**args)
                        else:
                            result = await tool_func()
                        
                        # Add tool result to conversation and let LLM generate final answer
                        payload["messages"].append({"role": "assistant", "content": assistant_text})
                        payload["messages"].append({"role": "system", "content": f"TOOL RESULT: {result}"})
                        continue # Re-run loop with new history
                
                return assistant_text
            
            return assistant_text
            
    except httpx.RequestError as e:
        raise ConnectionError(f"Cannot connect to Ollama: {str(e)}")
    except httpx.HTTPStatusError as e:
        raise RuntimeError(f"Ollama returned {response.status_code}: {response.text}")

async def stream_llm_response(message, history, model=None, temperature=0.7, language="en", personality="professional", rag_context="", image=None, use_tools=True):
    """
    Stream response from LLM (Ollama).
    """
    messages = await prepare_llm_messages(message, history, language, personality, rag_context, image, use_tools)
    
    payload = {
        "model": model or settings.DEFAULT_MODEL,
        "messages": messages,
        "stream": True,
        "options": {
            "temperature": 0.4,
            "num_predict": 1024,
            "top_k": 40,
            "top_p": 0.9,
            "repeat_penalty": 1.15,
            "stop": ["###", "[CONTEXT]", "[VISION]", "MISSION:", "RULES:", "AVAILABLE TOOLS:", "INSTRUCTIONS:", "[SYSTEM INSTRUCTION]"]
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