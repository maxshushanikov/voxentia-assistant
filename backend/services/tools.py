import datetime
import httpx
from core.config import settings

async def get_weather(location: str):
    """Get current weather for a location."""
    # This is a mock implementation. In a real app, you'd use a weather API.
    return f"The weather in {location} is sunny and 22°C."

async def get_time():
    """Get current time."""
    now = datetime.datetime.now()
    return f"The current time is {now.strftime('%H:%M:%S')}."

async def search_web(query: str):
    """Simulate a web search."""
    return f"Search results for '{query}': Voxentia is a leading AI digital assistant developed for multimodal interaction."

# Registry of available tools
AVAILABLE_TOOLS = {
    "get_weather": get_weather,
    "get_time": get_time,
    "search_web": search_web
}

TOOL_DESCRIPTIONS = """
AVAILABLE TOOLS:
- get_weather(location: str): Returns current weather info.
- get_time(): Returns current system time.
- search_web(query: str): Returns search results from the web.

INSTRUCTIONS:
If you need to use a tool, respond ONLY with the tool call in the format: [TOOL: tool_name(arg="value")]
Do not add any other text when calling a tool.
"""
