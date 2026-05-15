import os
from pathlib import Path
from typing import List, Tuple
from sqlalchemy.orm import Session
from app.models.chat import ChatMessage
from app.core.config import settings
from app.services.voice_service import generate_tts_audio

# Core Imports (Voxentia Framework)
from voxentia.plugins.registry import PluginRegistry
from voxentia.plugins.base import PluginContext
from voxentia.orchestrator.router import Orchestrator
from voxentia.services.llm_client import LLMClient

class ChatService:
    def __init__(self):
        # Initialize Voxentia Framework components
        self.llm_client = LLMClient(base_url=settings.OLLAMA_URL)
        self.registry = PluginRegistry()
        self.orchestrator = Orchestrator(self.registry, self.llm_client)
        self._is_initialized = False

    async def initialize(self):
        if self._is_initialized:
            return
            
        # Load Plugin Config
        config_path = settings.BASE_DIR / "backend" / "app" / "core" / "config" / "plugin_config.json"
        # Fallback if not found in new location
        if not config_path.exists():
            config_path = settings.BASE_DIR / "backend" / "src" / "voxentia_app" / "config" / "plugin_config.json"
        
        import json
        with open(config_path, "r") as f:
            config = json.load(f)
        
        # Register Plugins Dynamically
        plugins_root = settings.BASE_DIR.parent / "plugins"
        self.registry.discover_plugins(str(plugins_root))
        
        # Also discover plugins in the source packages if they have been installed
        # This allows discovering plugins from 'voxentia_calendar.plugin' etc.
        # But discovery from folder is safer for local dev

        context = PluginContext(settings=None, llm=self.llm_client)
        await self.registry.initialize_plugins(context, config)
        self._is_initialized = True

    async def process_message(self, db: Session, request: any) -> Tuple[str, str, str, any]:
        await self.initialize()
        
        # 1. Save User Message
        user_msg = ChatMessage(session_id=request.session_id, role="user", content=request.message)
        db.add(user_msg)
        db.commit()

        # 2. Route via Orchestrator
        try:
            response = await self.orchestrator.route_request(request.message, language=request.language)
        except Exception as e:
            print(f"❌ Orchestrator Error: {e}")
            from voxentia.orchestrator.response_formatter import VoxentiaResponse
            response = VoxentiaResponse(text="I'm sorry, I encountered an error processing your request.", intent="error")
        
        # 3. Save Assistant Message
        assistant_msg = ChatMessage(session_id=request.session_id, role="assistant", content=response.text)
        db.add(assistant_msg)
        db.commit()

        # 4. Generate Audio if needed
        audio_url = None
        if settings.TTS_URL:
            audio_url = await generate_tts_audio(response.text, request.speaker, request.language)

        return response.text, audio_url, response.intent, response.plugin_data

    def get_history(self, db: Session, session_id: str, limit: int = 50) -> List[ChatMessage]:
        return db.query(ChatMessage).filter(ChatMessage.session_id == session_id)\
                 .order_by(ChatMessage.timestamp.asc()).limit(limit).all()

    def get_sessions(self, db: Session) -> List[dict]:
        """Get all unique sessions with their first user message as title."""
        from sqlalchemy import distinct
        # Get all distinct session_ids ordered by latest message
        sessions_raw = db.query(
            ChatMessage.session_id,
            ChatMessage.timestamp
        ).order_by(ChatMessage.timestamp.desc()).all()

        seen = {}
        for row in sessions_raw:
            if row.session_id not in seen:
                seen[row.session_id] = row.timestamp

        result = []
        for session_id, ts in seen.items():
            # Get first user message as title
            first_msg = db.query(ChatMessage).filter(
                ChatMessage.session_id == session_id,
                ChatMessage.role == "user"
            ).order_by(ChatMessage.timestamp.asc()).first()

            title = first_msg.content[:60] if first_msg else session_id
            result.append({
                "session_id": session_id,
                "title": title,
                "timestamp": ts.isoformat()
            })
        return result

chat_service = ChatService()
