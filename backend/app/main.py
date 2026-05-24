import asyncio
import collections
import json
import logging
import time
from contextlib import asynccontextmanager

import uvicorn
from app.api.v1.chat import router as chat_router
from app.api.v1.documents import router as documents_router
from app.api.v1.knowledge import router as knowledge_router
from app.api.v1.marketplace import router as marketplace_router
from app.api.v1.models import router as models_router
from app.api.v1.plugins import router as plugin_router
from app.api.v1.voice import router as voice_router
from app.core.auth import _validate_token, require_auth
from app.core.config import settings
from app.core.database import SessionLocal, get_db, init_db
from app.core.errors import VoxentiaError
from app.core.exceptions import (
    http_exception_handler,
    unhandled_exception_handler,
    validation_exception_handler,
    voxentia_error_handler,
)
from app.core.http_client import close_shared_client
from app.core.janitor import DatabaseJanitor
from app.core.logging_config import configure_backend_logging
from app.core.middleware import RequestIdMiddleware
from app.core.events import setup_event_handlers
from app.core.observability import MetricsMiddleware, RequestIdLogFilter, metrics_payload
from app.core.rate_limit import limiter
from app.core.tracing import setup_tracing, shutdown_tracing
from app.schemas.chat import ChatRequest
from app.services.chat_service import ChatService
from app.services.health_service import full_health
from fastapi import Depends, FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, Response
from fastapi.staticfiles import StaticFiles
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from starlette.exceptions import HTTPException as StarletteHTTPException

# Initialize global rate limit tracking for WebSocket sessions
ws_rate_limit_records = collections.defaultdict(list)


async def warmup_models():
    try:
        from app.services.rag_service import get_collection
        get_collection()
    except Exception as e:
        logging.warning(f"Failed to warmup models: {e}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Handles lifecycle startup and shutdown hooks for pooled dependencies."""
    init_db()
    service = ChatService()
    await service.initialize()
    app.state.chat_service = service
    setup_event_handlers(service.event_bus)

    janitor_task = None
    if getattr(settings, "JANITOR_ENABLED", True):
        janitor = DatabaseJanitor(retention_days=settings.JANITOR_RETENTION_DAYS)
        janitor_task = asyncio.create_task(
            janitor.run_forever(SessionLocal, settings.JANITOR_INTERVAL_HOURS)
        )

    # Warm up models in background
    asyncio.create_task(warmup_models())

    yield

    if janitor_task:
        janitor_task.cancel()
        try:
            await janitor_task
        except asyncio.CancelledError:
            pass
    await service.shutdown()
    await close_shared_client()
    shutdown_tracing()


# Configure structured logging (DB schema is created in lifespan)
configure_backend_logging(settings.LOG_LEVEL)
for _log_name in ("voxentia", "voxentia.api", "app"):
    logging.getLogger(_log_name).addFilter(RequestIdLogFilter())

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Professional Backend for Voxentia AI Assistant",
    lifespan=lifespan,
)

setup_tracing(app)

app.state.limiter = limiter

# Exception handler registrations
app.add_exception_handler(VoxentiaError, voxentia_error_handler)
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_exception_handler(StarletteHTTPException, http_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(Exception, unhandled_exception_handler)

# Middleware configuration
app.add_middleware(MetricsMiddleware)
app.add_middleware(RequestIdMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "X-API-Key", "X-Request-ID"],
)

# Authentication dependency
_auth = [Depends(require_auth)]

# Routing setup (v1 and legacy endpoints)
app.include_router(chat_router, prefix="/api/v1", tags=["Chat"], dependencies=_auth)
app.include_router(
    documents_router, prefix="/api/v1/documents", tags=["Documents"], dependencies=_auth
)
app.include_router(
    plugin_router, prefix="/api/v1/plugins", tags=["Plugins"], dependencies=_auth
)
app.include_router(models_router, prefix="/api/v1", tags=["Models"], dependencies=_auth)
app.include_router(
    knowledge_router, prefix="/api/v1/knowledge", tags=["Knowledge"], dependencies=_auth
)
app.include_router(
    marketplace_router, prefix="/api/v1/marketplace", tags=["Marketplace"], dependencies=_auth
)
app.include_router(
    voice_router, prefix="/api/v1/voice", tags=["Voice"], dependencies=_auth
)
app.include_router(chat_router, prefix="/api", tags=["Legacy Chat"], dependencies=_auth)
app.include_router(
    documents_router, prefix="/api/documents", tags=["Legacy Documents"], dependencies=_auth
)


@app.get("/api/tts-audio/{filename}", dependencies=_auth)
async def serve_audio(filename: str):
    """Serves cached speech files generated by the TTS backend."""
    path = settings.AUDIO_CACHE_DIR / filename
    if not path.exists():
        raise HTTPException(status_code=404, detail="Audio not found")
    return FileResponse(path)


# Mount static assets if the folder is initialized
assets_path = settings.REPO_ROOT / "assets"
if assets_path.exists():
    app.mount("/assets", StaticFiles(directory=str(assets_path)), name="assets")


@app.get("/health")
@limiter.exempt
async def health_check():
    """Liveness probe returning platform orchestration metrics."""
    caps = None
    bus_info = None
    if hasattr(app.state, "chat_service") and app.state.chat_service:
        svc = app.state.chat_service
        caps = svc.capabilities_snapshot()
        bus_info = {
            "enabled": getattr(settings, "ENABLE_EVENT_BUS", False),
            "redis": svc.event_bus.is_enabled(),
            "connected": await svc.event_bus.ensure_connected()
            if getattr(settings, "ENABLE_EVENT_BUS", False)
            else False,
        }
    trace_info = {
        "tracing_enabled": getattr(settings, "ENABLE_TRACING", True),
        "otlp_endpoint": getattr(settings, "OTEL_EXPORTER_OTLP_ENDPOINT", None) or None,
    }
    return await full_health(capabilities=caps, event_bus=bus_info, tracing=trace_info)


@app.get("/api/v1/health")
@limiter.exempt
async def health_check_v1():
    """Liveness probe alias for v1 api."""
    caps = None
    bus_info = None
    if hasattr(app.state, "chat_service") and app.state.chat_service:
        svc = app.state.chat_service
        caps = svc.capabilities_snapshot()
        bus_info = {
            "enabled": getattr(settings, "ENABLE_EVENT_BUS", False),
            "redis": svc.event_bus.is_enabled(),
            "connected": await svc.event_bus.ensure_connected()
            if getattr(settings, "ENABLE_EVENT_BUS", False)
            else False,
        }
    trace_info = {
        "tracing_enabled": getattr(settings, "ENABLE_TRACING", True),
        "otlp_endpoint": getattr(settings, "OTEL_EXPORTER_OTLP_ENDPOINT", None) or None,
    }
    return await full_health(capabilities=caps, event_bus=bus_info, tracing=trace_info)


@app.get("/metrics")
@limiter.exempt
async def prometheus_metrics():
    """Prometheus scrape endpoint (when prometheus_client is installed)."""
    result = metrics_payload()
    if result is None:
        raise HTTPException(status_code=404, detail="Metrics disabled or unavailable")
    body, content_type = result
    return Response(content=body, media_type=content_type)


def check_ws_rate_limit(client_ip: str, max_requests: int = 20, period_seconds: int = 60) -> bool:
    """Sliding-window IP address rate-limiter for high-volume WebSocket clients."""
    now = time.time()
    timestamps = ws_rate_limit_records[client_ip]
    timestamps = [t for t in timestamps if now - t < period_seconds]
    ws_rate_limit_records[client_ip] = timestamps
    if len(timestamps) >= max_requests:
        return False
    ws_rate_limit_records[client_ip].append(now)
    return True


@app.websocket("/api/v1/chat/ws")
async def websocket_chat_endpoint(websocket: WebSocket):
    """Establishes real-time speech and emotion streaming websocket with rate limiting."""
    db_gen = get_db()
    db = next(db_gen)

    try:
        if settings.AUTH_ENABLED:
            token = websocket.query_params.get("token") or websocket.query_params.get("api_key")
            if not token or not _validate_token(token):
                await websocket.close(code=4001, reason="Unauthorized")
                return

        await websocket.accept()
        chat_service = app.state.chat_service

        while True:
            data = await websocket.receive_text()

            client_ip = websocket.client.host if websocket.client else "unknown"
            if not check_ws_rate_limit(client_ip, max_requests=20, period_seconds=60):
                await websocket.send_json({
                    "event": "error",
                    "data": "Rate limit exceeded. You are limited to 20 messages per minute."
                })
                continue

            try:
                body_dict = json.loads(data)
                body = ChatRequest(**body_dict)
            except Exception as e:
                await websocket.send_json({"event": "error", "data": f"Invalid request: {str(e)}"})
                continue

            try:
                async for item in chat_service.process_message_stream(db, body):
                    await websocket.send_json(item)
            except Exception as e:
                await websocket.send_json({"event": "error", "data": f"Generation error: {str(e)}"})
    except WebSocketDisconnect:
        pass
    except Exception as e:
        logging.error(f"WebSocket error: {e}")
    finally:
        try:
            next(db_gen)
        except StopIteration:
            pass


if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
