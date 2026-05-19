"""Unified API error types."""

from __future__ import annotations

from typing import Any, Optional


class VoxentiaError(Exception):
    """Structured application error surfaced to clients."""

    def __init__(
        self,
        error_code: str,
        message: str,
        *,
        status_code: int = 500,
        details: Optional[dict[str, Any]] = None,
    ) -> None:
        self.error_code = error_code
        self.message = message
        self.status_code = status_code
        self.details = details or {}
        super().__init__(message)

    def to_dict(self) -> dict[str, Any]:
        return {
            "error_code": self.error_code,
            "message": self.message,
            "details": self.details,
        }


class OllamaServiceError(VoxentiaError):
    def __init__(self, message: str = "LLM service unavailable", **details: Any) -> None:
        super().__init__(
            "ollama_error",
            message,
            status_code=503,
            details=details,
        )


class TTSServiceError(VoxentiaError):
    def __init__(self, message: str = "Text-to-speech failed", **details: Any) -> None:
        super().__init__(
            "tts_error",
            message,
            status_code=503,
            details=details,
        )


class WhisperServiceError(VoxentiaError):
    def __init__(self, message: str = "Speech recognition failed", **details: Any) -> None:
        super().__init__(
            "whisper_error",
            message,
            status_code=503,
            details=details,
        )


class PluginError(VoxentiaError):
    def __init__(self, message: str = "Plugin execution failed", **details: Any) -> None:
        super().__init__(
            "plugin_error",
            message,
            status_code=500,
            details=details,
        )
