import os
import hashlib
from pathlib import Path

class TTSCache:
    """Verwaltet lokal generierte Audio-Dateien, um doppelte Generierung zu vermeiden."""
    
    def __init__(self, cache_dir: str = "data/tts_cache"):
        self.cache_dir = Path(cache_dir)
        self.cache_dir.mkdir(parents=True, exist_ok=True)

    def get_cache_path(self, text: str, speaker: str, language: str) -> Path:
        """Erzeugt einen eindeutigen Dateinamen basierend auf Inhalt und Stimme."""
        key = f"{text}_{speaker}_{language}".encode('utf-8')
        filename = hashlib.md5(key).hexdigest() + ".wav"
        return self.cache_dir / filename

    def exists(self, text: str, speaker: str, language: str) -> bool:
        return self.get_cache_path(text, speaker, language).exists()

    def save(self, text: str, speaker: str, language: str, audio_data: bytes):
        path = self.get_cache_path(text, speaker, language)
        with open(path, "wb") as f:
            f.write(audio_data)
        return path
