import os
from pydantic_settings import BaseSettings
from pathlib import Path
from typing import Dict, List

class Settings(BaseSettings):
    PROJECT_NAME: str = "Voxentia AI"
    VERSION: str = "3.2.0"
    
    # Paths
    BASE_DIR: Path = Path(__file__).parent.parent.parent.parent
    DATA_DIR: Path = BASE_DIR / "data"
    AUDIO_CACHE_DIR: Path = DATA_DIR / "audio"
    
    # Database
    DB_PATH: str = os.getenv("DB_PATH", "sqlite:///./data/chat.db")
    
    # Service URLs
    OLLAMA_URL: str = os.getenv("OLLAMA_URL", "http://ollama:11434")
    TTS_URL: str = os.getenv("TTS_URL", "http://tts-server:5002")
    WHISPER_URL: str = os.getenv("WHISPER_URL", "http://whisper-server:5003")
    
    # Defaults
    DEFAULT_MODEL: str = os.getenv("DEFAULT_MODEL", "phi3")
    DEFAULT_LANGUAGE: str = os.getenv("DEFAULT_LANGUAGE", "en")
    HISTORY_LIMIT: int = 20
    
    # CORS
    ALLOWED_ORIGINS: List[str] = ["http://localhost:8000", "http://127.0.0.1:8000", "http://localhost:5173"]

    # Personalities
    PERSONALITIES: Dict = {
        "professional": {
            "en": "You are a professional assistant. Be formal and structured. Use [think] when analyzing.",
            "de": "Du bist ein professioneller Assistent. Sei formal und strukturiert. Nutze [think] bei Analysen.",
            "ru": "Ты профессиональный ассистент. Будь формален и структурирован. Используй [think] при анализе."
        },
        "friendly": {
            "en": "You are a warm, cheerful friend. Use emotion tags like [happy], [laugh].",
            "de": "Du bist ein herzlicher, fröhlicher Freund. Nutze viele Emotion-Tags wie [happy], [laugh].",
            "ru": "Ты теплый, веселый друг. Используй много тегов эмоций, таких как [happy], [laugh]."
        }
    }

    class Config:
        env_file = ".env"
        case_sensitive = False

settings = Settings()

# Ensure directories exist
settings.AUDIO_CACHE_DIR.mkdir(parents=True, exist_ok=True)
