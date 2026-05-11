from typing import Protocol, runtime_checkable, Optional, Any, Dict, List
from pydantic import BaseModel, Field

@runtime_checkable
class LLMClientProtocol(Protocol):
    """Interface für LLM-Clients, die Plugins nutzen können."""
    async def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.7,
        **kwargs
    ) -> str: ...
    
    async def generate_json(
        self,
        prompt: str,
        **kwargs
    ) -> Dict[str, Any]: ...

class PluginContext(BaseModel):
    """Typisierter Kontext, der Plugins übergeben wird."""
    session_id: str
    llm_client: Optional[LLMClientProtocol] = None
    config: Dict[str, Any] = Field(default_factory=dict)
    
    def log(self, level: str, message: str, plugin_name: str):
        """Standardisiertes Logging für Plugins."""
        from voxentia.utils.logging import logger
        extra = {"plugin": plugin_name}
        if level.upper() == "INFO": logger.info(message, extra=extra)
        elif level.upper() == "ERROR": logger.error(message, extra=extra)
        else: logger.debug(message, extra=extra)

    class Config:
        arbitrary_types_allowed = True
