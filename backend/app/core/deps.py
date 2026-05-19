"""FastAPI dependencies — ChatService via app state (no module singleton)."""

from __future__ import annotations

from app.services.chat_service import ChatService
from fastapi import Request


def get_chat_service(request: Request) -> ChatService:
    service = getattr(request.app.state, "chat_service", None)
    if service is None:
        raise RuntimeError("ChatService not initialized — check application lifespan")
    return service
