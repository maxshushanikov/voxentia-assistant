import datetime
import httpx
from core.config import settings

async def get_weather(location: str):
    """Get real-time weather for a location using wttr.in."""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"https://wttr.in/{location}?format=j1", timeout=10)
            response.raise_for_status()
            data = response.json()
            
            current = data['current_condition'][0]
            temp = current['temp_C']
            desc = current['weatherDesc'][0]['value']
            humidity = current['humidity']
            
            return f"The weather in {location} is currently {desc} at {temp}°C with {humidity}% humidity."
    except Exception as e:
        print(f"Weather error: {e}")
        return f"I couldn't fetch the weather for {location} right now. Please try again later."

async def get_time():
    """Get current system time."""
    now = datetime.datetime.now()
    return f"The current time is {now.strftime('%H:%M:%S')}."

async def search_web(query: str):
    """Perform a real web search using DuckDuckGo."""
    try:
        from duckduckgo_search import DDGS
        
        results_text = []
        with DDGS() as ddgs:
            # Fetch top 3 results for brevity
            results = ddgs.text(query, max_results=3)
            for r in results:
                results_text.append(f"- {r['title']}: {r['body']} (Source: {r['href']})")
        
        if not results_text:
            return "I couldn't find any relevant results for that search."
            
        return "Search Results:\n" + "\n".join(results_text)
    except Exception as e:
        print(f"Search error: {e}")
        return "I encountered an error while searching the web. Please try again later."

# Registry of available tools
AVAILABLE_TOOLS = {
    "get_weather": get_weather,
    "get_time": get_time,
    "search_web": search_web
}

TOOL_DESCRIPTIONS = """
AVAILABLE TOOLS:
- get_weather(location: str): Returns real-time weather information for a given city or region.
- get_time(): Returns the current system time.
- search_web(query: str): Searches the internet for information, news, or general knowledge.

INSTRUCTIONS:
If you need to use a tool, respond ONLY with the tool call in the format: [TOOL: tool_name(arg="value")]
Example: [TOOL: get_weather(location="Berlin")]
Do not add any other text when calling a tool.
"""
