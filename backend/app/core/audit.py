"""Structured audit logging for compliance and debugging."""

from __future__ import annotations

from datetime import datetime, timezone

import logging

from fastapi import Request

try:
    import structlog

    audit_log = structlog.get_logger("voxentia.audit")
except ImportError:
    audit_log = logging.getLogger("voxentia.audit")


async def log_chat_event(
    request: Request | None,
    session_id: str,
    intent: str | None,
    latency_ms: float,
    model: str,
    rag_chunks_used: int = 0,
) -> None:
    request_id = "-"
    if request is not None:
        request_id = getattr(request.state, "request_id", "-")
    audit_log.info(
        "chat_processed",
        session_id=session_id,
        intent=intent or "unknown",
        model=model,
        latency_ms=round(latency_ms, 1),
        rag_chunks=rag_chunks_used,
        request_id=request_id,
        ts=datetime.now(timezone.utc).isoformat(),
    )
