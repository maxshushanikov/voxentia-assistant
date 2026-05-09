from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

class VoxentiaSettings(BaseSettings):
    """Zentrale Konfiguration für den Voxentia Core."""
    
    # LLM Konfiguration
    ollama_url: str = "http://localhost:11434"
    llm_model: str = "phi3"
    
    # System Pfade
    plugin_dir: str = "plugins"
    data_dir: str = "data"
    
    # API Sicherheit (optional für später)
    api_key: Optional[str] = None
    
    # Logging
    log_level: str = "INFO"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

# Singleton Instanz
settings = VoxentiaSettings()
