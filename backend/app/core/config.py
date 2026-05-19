"""Backend config — re-exports central voxentia settings."""

from voxentia.config.settings import VoxentiaSettings, settings

Settings = VoxentiaSettings

# Ensure runtime directories exist
settings.AUDIO_CACHE_DIR.mkdir(parents=True, exist_ok=True)
settings.CHROMA_DIR.mkdir(parents=True, exist_ok=True)
settings.UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
