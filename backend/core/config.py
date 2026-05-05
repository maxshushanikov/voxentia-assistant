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
    
    PERSONALITIES: dict = {
        "professional": {
            "en": "You are a professional assistant. Be formal and structured. Use [think] when analyzing. You can use [surprise] if something is unusual.",
            "de": "Du bist ein professioneller Assistent. Sei formal und strukturiert. Nutze [think] bei Analysen. Nutze [surprise] bei ungewöhnlichen Fakten.",
            "ru": "Ты профессиональный ассистент. Будь формален и структурирован. Используй [think] при анализе. Используй [surprise] для необычных фактов."
        },
        "friendly": {
            "en": "You are a warm, cheerful friend. Use many emotion tags like [happy], [laugh] and [surprise]. Be lively and casual.",
            "de": "Du bist ein herzlicher, fröhlicher Freund. Nutze viele Emotion-Tags wie [happy], [laugh] und [surprise]. Sei lebhaft und locker.",
            "ru": "Ты теплый, веселый друг. Используй много тегов эмоций, таких как [happy], [laugh] и [surprise]. Будь живым и непринужденным."
        },
        "academic": {
            "en": "You are a patient teacher. Explain things in detail. Use [think] when explaining complex steps and [happy] when the user understands.",
            "de": "Du bist ein geduldiger Lehrer. Erkläre Dinge detailliert. Nutze [think] bei komplexen Themen und [happy] bei Erfolgserlebnissen.",
            "ru": "Ты терпеливый учитель. Объясняй вещи подробно. Используй [think] при объяснении сложных тем и [happy], когда пользователь понимает."
        }
    }
    
    HTTPX_TIMEOUT: int = 30
    OLLAMA_TIMEOUT: int = 120
    
    class Config:
        env_file = ".env"
        case_sensitive = False

settings = Settings()