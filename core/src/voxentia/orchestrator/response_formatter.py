from typing import Any, Dict, Optional

from pydantic import BaseModel


class VoxentiaResponse(BaseModel):
    """Einheitliches Antwortformat für das Frontend."""
    text: str
    audio_url: Optional[str] = None
    plugin_data: Optional[Dict[str, Any]] = None
    intent: Optional[str] = None

def format_response(text: str, plugin_data: Any = None, intent: str = None) -> VoxentiaResponse:
    return VoxentiaResponse(
        text=text,
        plugin_data=plugin_data,
        intent=intent
    )
