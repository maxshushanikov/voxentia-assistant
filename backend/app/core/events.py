"""Event bus wiring — Redis Streams + structured logging handlers."""

from __future__ import annotations

import logging
from typing import Any

from app.core.config import settings
from app.core.middleware import get_request_id
from voxentia.events.bus import EventBus
from voxentia.observability.tracing import get_trace_id

logger = logging.getLogger("voxentia.events")


async def _log_event_handler(payload: dict[str, Any]) -> None:
    logger.info(
        "event %s",
        payload.get("event_type", "unknown"),
        extra={
            "request_id": payload.get("request_id"),
            "trace_id": payload.get("trace_id"),
            "session_id": payload.get("session_id"),
            "intent": payload.get("intent"),
        },
    )


def setup_event_handlers(bus: EventBus) -> None:
    """Register default in-process subscribers."""
    for event_type in (
        "chat.message.started",
        "chat.message.completed",
        "chat.stream.completed",
        "plugin.intent.routed",
        "voice.tts.requested",
        "voice.tts.completed",
        "voice.stt.completed",
        "rag.embedding.requested",
    ):
        bus.subscribe(event_type, _log_event_handler)


async def publish_app_event(
    bus: EventBus,
    event_type: str,
    payload: dict[str, Any] | None = None,
) -> None:
    if not getattr(settings, "ENABLE_EVENT_BUS", False):
        return
    body = dict(payload or {})
    body["event_type"] = event_type
    body["request_id"] = get_request_id()
    trace_id = get_trace_id()
    if trace_id:
        body["trace_id"] = trace_id
    await bus.publish(event_type, body)
