"""Central configuration — single source of truth for backend and core."""

from __future__ import annotations

import os
from functools import lru_cache
from pathlib import Path
from typing import Dict, List, Optional

from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

_REPO_ROOT = Path(__file__).resolve().parents[4]


class VoxentiaSettings(BaseSettings):
    """Validated settings shared by backend and voxentia-core."""

    PROJECT_NAME: str = "Voxentia AI"
    VERSION: str = "3.3.0"

    REPO_ROOT: Path = _REPO_ROOT
    PLUGINS_DIR: Path = _REPO_ROOT / "plugins"
    PLUGIN_CONFIG_PATH: Path = (
        _REPO_ROOT / "backend" / "app" / "core" / "config" / "plugin_config.json"
    )
    DATA_DIR: Path = Path(os.getenv("DATA_DIR", str(_REPO_ROOT / "data")))
    AUDIO_CACHE_DIR: Path = Path(os.getenv("AUDIO_CACHE_DIR", str(_REPO_ROOT / "data" / "audio")))
    CHROMA_DIR: Path = Path(os.getenv("CHROMA_DIR", str(_REPO_ROOT / "data" / "chroma")))
    UPLOADS_DIR: Path = Path(os.getenv("UPLOADS_DIR", str(_REPO_ROOT / "data" / "uploads")))

    DB_PATH: str = os.getenv("DB_PATH", "sqlite:///./data/chat.db")

    OLLAMA_URL: str = "http://localhost:11434"
    DEFAULT_MODEL: str = "phi3"
    OLLAMA_TIMEOUT: float = 60.0
    TTS_URL: str = "http://localhost:5002"
    TTS_TIMEOUT: float = 120.0
    WHISPER_URL: str = "http://localhost:5003"
    WHISPER_TIMEOUT: float = 60.0
    EMBEDDING_MODEL: str = "nomic-embed-text"
    ENABLE_RAG: bool = True

    RAG_CHUNK_SIZE: int = 500
    RAG_CHUNK_OVERLAP: int = 50
    RAG_MIN_CONFIDENCE: float = 0.65
    RAG_MAX_CHUNKS: int = 3

    MAX_UPLOAD_BYTES: int = 10 * 1024 * 1024
    ALLOWED_UPLOAD_MIME: str = "application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown,application/json,text/csv"

    DEFAULT_LANGUAGE: str = "en"
    HISTORY_LIMIT: int = 20
    RATE_LIMIT: str = "60/minute"
    ALLOWED_ORIGINS: str = (
        "http://localhost:8000,http://127.0.0.1:8000,http://localhost:5173"
    )

    AUTH_ENABLED: bool = False
    API_KEY: Optional[str] = None
    JWT_SECRET: Optional[str] = None
    JWT_ALGORITHM: str = "HS256"

    PLUGIN_WEBHOOKS: List[str] = Field(default_factory=list)

    LOG_LEVEL: str = "INFO"
    LOG_FORMAT: str = "text"

    PERSONALITIES: Dict[str, Dict[str, str]] = Field(
        default_factory=lambda: {
            "professional": {
                "en": "You are a professional assistant. Be formal and structured.",
                "de": "Du bist ein professioneller Assistent. Sei formal und strukturiert.",
                "ru": "Ты профессиональный ассистент. Будь формален и структурирован.",
            },
            "friendly": {
                "en": "You are a warm, cheerful friend. Use emotion tags like [happy].",
                "de": "Du bist ein herzlicher Freund. Nutze Emotion-Tags wie [happy].",
                "ru": "Ты теплый друг. Используй теги эмоций, таких как [happy].",
            },
            "academic": {
                "en": "You are an academic tutor. Explain concepts clearly with examples.",
                "de": "Du bist ein akademischer Tutor. Erkläre Konzepte klar mit Beispielen.",
                "ru": "Ты академический наставник. Объясняй концепции ясно с примерами.",
            },
        }
    )

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    @model_validator(mode="after")
    def _sync_data_paths(self) -> VoxentiaSettings:
        data = Path(os.getenv("DATA_DIR", str(self.DATA_DIR)))
        self.DATA_DIR = data
        if "AUDIO_CACHE_DIR" not in os.environ:
            self.AUDIO_CACHE_DIR = data / "audio"
        if "CHROMA_DIR" not in os.environ:
            self.CHROMA_DIR = data / "chroma"
        if "UPLOADS_DIR" not in os.environ:
            self.UPLOADS_DIR = data / "uploads"
        return self

    @property
    def ollama_url(self) -> str:
        return self.OLLAMA_URL

    @property
    def llm_model(self) -> str:
        return self.DEFAULT_MODEL

    @property
    def plugin_dir(self) -> str:
        return str(self.PLUGINS_DIR)

    @property
    def data_dir(self) -> str:
        return str(self.DATA_DIR)

    @property
    def log_level(self) -> str:
        return self.LOG_LEVEL

    @property
    def api_key(self) -> Optional[str]:
        return self.API_KEY

    @property
    def BASE_DIR(self) -> Path:
        return self.REPO_ROOT

    @property
    def allowed_origins(self) -> List[str]:
        return [o.strip() for o in self.ALLOWED_ORIGINS.split(",") if o.strip()]

    @property
    def allowed_upload_mimes(self) -> List[str]:
        return [m.strip() for m in self.ALLOWED_UPLOAD_MIME.split(",") if m.strip()]

    @property
    def plugin_webhooks(self) -> List[str]:
        if isinstance(self.PLUGIN_WEBHOOKS, str):
            return [w.strip() for w in self.PLUGIN_WEBHOOKS.split(",") if w.strip()]
        return self.PLUGIN_WEBHOOKS


@lru_cache
def get_settings() -> VoxentiaSettings:
    return VoxentiaSettings()


settings = get_settings()
