import sys
import os
from pathlib import Path

# Pfade für Core und Plugins hinzufügen
current_dir = Path(__file__).parent
root_dir = current_dir.parent.parent.parent
sys.path.insert(0, str(root_dir / "core" / "src"))
sys.path.insert(0, str(root_dir)) # Für plugins/
sys.path.insert(0, str(root_dir / "plugins" / "job_assistant" / "src")) # Für voxentia_job_assistant
sys.path.insert(0, str(root_dir / "plugins" / "teacher_assistant" / "src")) # Für voxentia_teacher_assistant
sys.path.insert(0, str(root_dir / "plugins" / "calendar" / "src")) # Für voxentia_calendar

from fastapi import FastAPI
from voxentia.plugins.registry import PluginRegistry
from voxentia.plugins.base import PluginContext
from voxentia.orchestrator.router import Orchestrator
from voxentia.services.llm_client import LLMClient

# Core-Komponenten initialisieren
llm_client = LLMClient(base_url=os.getenv("OLLAMA_URL", "http://localhost:11434"))
registry = PluginRegistry()
orchestrator = Orchestrator(registry, llm_client)

# Manuelle Registrierung der Plugins
from plugins.core_assistant import CoreAssistantPlugin
from voxentia_job_assistant.plugin import JobAssistantPlugin
from voxentia_teacher_assistant.plugin import TeacherAssistantPlugin
from voxentia_calendar.plugin import CalendarPlugin

registry.register_plugin_class(CoreAssistantPlugin)
registry.register_plugin_class(JobAssistantPlugin)
registry.register_plugin_class(TeacherAssistantPlugin)
registry.register_plugin_class(CalendarPlugin)

app = FastAPI(title="Voxentia Modern App")

@app.on_event("startup")
async def startup_event():
    # Konfiguration laden
    config_path = Path(__file__).parent / "config" / "plugin_config.json"
    import json
    with open(config_path, "r") as f:
        config = json.load(f)
    
    # Kontext für Plugins erstellen
    context = PluginContext(settings=None, llm=llm_client)
    await registry.initialize_plugins(context, config)

@app.post("/chat")
async def chat(request: dict):
    message = request.get("message", "")
    response = await orchestrator.route_request(message)
    return {
        "text": response.text, 
        "plugin_data": response.plugin_data, 
        "intent": response.intent
    }

@app.get("/api/chat/history")
async def get_history(session_id: str):
    # Dummy-History oder echte DB-Anbindung
    return {"history": []}

@app.post("/api/chat/clear")
async def clear_chat():
    return {"status": "success"}

@app.post("/api/tts/generate")
async def generate_tts(request: dict):
    import httpx
    tts_url = os.getenv("TTS_URL", "http://tts-server:5002")
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(f"{tts_url}/tts", json=request, timeout=30.0)
            if response.status_code != 200:
                return {"error": f"TTS server error: {response.text}"}, response.status_code
            return response.json()
        except Exception as e:
            return {"error": f"TTS proxy failed: {str(e)}"}, 500

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
