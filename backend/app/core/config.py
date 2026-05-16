import os
from pathlib import Path
from typing import Dict, List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "Voxentia AI"
    VERSION: str = "3.2.0"

    # Paths (override DATA_DIR / CHROMA_DIR in tests via environment)
    REPO_ROOT: Path = Path(__file__).resolve().parents[3]
    BASE_DIR: Path = REPO_ROOT  # alias for backwards compatibility
    PLUGINS_DIR: Path = REPO_ROOT / "plugins"
    PLUGIN_CONFIG_PATH: Path = (
        Path(__file__).resolve().parent / "config" / "plugin_config.json"
    )
    DATA_DIR: Path = Path(os.getenv("DATA_DIR", str(REPO_ROOT / "data")))
    AUDIO_CACHE_DIR: Path = Path(os.getenv("AUDIO_CACHE_DIR", str(DATA_DIR / "audio")))
    CHROMA_DIR: Path = Path(os.getenv("CHROMA_DIR", str(DATA_DIR / "chroma")))
    UPLOADS_DIR: Path = Path(os.getenv("UPLOADS_DIR", str(DATA_DIR / "uploads")))

    # Database
    DB_PATH: str = os.getenv("DB_PATH", "sqlite:///./data/chat.db")

    # Service URLs
    OLLAMA_URL: str = os.getenv("OLLAMA_URL", "http://ollama:11434")
    TTS_URL: str = os.getenv("TTS_URL", "http://tts-server:5002")
    WHISPER_URL: str = os.getenv("WHISPER_URL", "http://whisper-server:5003")
    TTS_TIMEOUT: float = float(os.getenv("TTS_TIMEOUT", "120"))

    # Defaults
    DEFAULT_MODEL: str = os.getenv("DEFAULT_MODEL", "phi3")
    DEFAULT_LANGUAGE: str = os.getenv("DEFAULT_LANGUAGE", "en")
    HISTORY_LIMIT: int = 20
    OLLAMA_TIMEOUT: float = float(os.getenv("OLLAMA_TIMEOUT", "60"))
    RATE_LIMIT: str = os.getenv("RATE_LIMIT", "60/minute")
    EMBEDDING_MODEL: str = os.getenv("EMBEDDING_MODEL", "nomic-embed-text")
    RAG_CHUNK_SIZE: int = int(os.getenv("RAG_CHUNK_SIZE", "500"))
    RAG_CHUNK_OVERLAP: int = int(os.getenv("RAG_CHUNK_OVERLAP", "50"))

    # CORS (comma-separated in .env)
    ALLOWED_ORIGINS: str = "http://localhost:8000,http://127.0.0.1:8000,http://localhost:5173"

    @property
    def allowed_origins(self) -> List[str]:
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",") if origin.strip()]

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

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=False, extra="ignore")

settings = Settings()

# Ensure directories exist
settings.AUDIO_CACHE_DIR.mkdir(parents=True, exist_ok=True)
settings.CHROMA_DIR.mkdir(parents=True, exist_ok=True)
settings.UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
