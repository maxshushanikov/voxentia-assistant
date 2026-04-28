from pydantic_settings import BaseSettings
from pathlib import Path

class Settings(BaseSettings):
    PROJECT_NAME: str = "Voxentia AI"
    DB_PATH: str = "sqlite:///./data/chat.db"
    OLLAMA_URL: str = "http://ollama:11434"
    TTS_URL: str = "http://tts-server:5002"
    WHISPER_URL: str = "http://whisper-server:5003"
    ALLOWED_ORIGINS: str = "http://localhost:8000,http://127.0.0.1:8000"
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    DEFAULT_MODEL: str = "phi3"
    HISTORY_LIMIT: int = 12
    DEFAULT_LANGUAGE: str = "en"
    
    SYSTEM_PROMPTS: dict = {
        "en": "YOU ARE VOXENTIA, A HELPFUL AI. BE CONCISE (MAX 2-3 SENTENCES). RESPOND LIVELY. YOU CAN USE EMOTION TAGS: [happy], [think], [surprise], [sad], [laugh].",
        "de": "DU BIST VOXENTIA, EINE HILFREICHE KI. FASSE DICH KURZ (MAX. 2-3 SÄTZE). ANTWORTE LEBHAFT. DU KANNST EMOTION-TAGS NUTZEN: [happy], [think], [surprise], [sad], [laugh].",
        "ru": "ТЫ — VOXENTIA, ПОЛЕЗНЫЙ ИИ. БУДЬ КРАТОК (МАКСИМУМ 2-3 ПРЕДЛОЖЕНИЯ). ОТВЕЧАЙ ЖИВО. ТЫ МОЖЕШЬ ИСПОЛЬЗОВАТЬ ТЕГИ ЭМОЦИЙ: [happy], [think], [surprise], [sad], [laugh]."
    }
    
    HTTPX_TIMEOUT: int = 30
    OLLAMA_TIMEOUT: int = 120
    
    class Config:
        env_file = ".env"
        case_sensitive = False

settings = Settings()