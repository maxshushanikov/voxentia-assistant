import asyncio
import json
import logging
from contextlib import asynccontextmanager

import uvicorn
from app.api.v1.chat import router as chat_router
from app.api.v1.documents import router as documents_router
from app.api.v1.jobs import router as jobs_router
from app.api.v1.knowledge import router as knowledge_router
from app.api.v1.learn import router as learn_router
from app.api.v1.marketplace import router as marketplace_router
from app.api.v1.models import router as models_router
from app.api.v1.notes import router as notes_router
from app.api.v1.plugins import router as plugin_router
from app.api.v1.print import router as print_router
from app.api.v1.tasks import router as tasks_router
from app.api.v1.vision import router as vision_router
from app.api.v1.voice import router as voice_router
from app.core.auth import _validate_token, require_auth
from app.core.config import settings
from app.core.database import SessionLocal, get_db, init_db
from app.core.errors import VoxentiaError
from app.core.events import setup_event_handlers
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
from app.core.observability import MetricsMiddleware, RequestIdLogFilter, metrics_payload
from app.core.rate_limit import limiter
from app.core.tracing import setup_tracing, shutdown_tracing
from app.schemas.chat import ChatRequest
from app.services.chat_service import ChatService
from app.services.health_service import full_health
from app.services.ws_rate_limiter import InMemoryWSRateLimiter
from fastapi import Depends, FastAPI, HTTPException, Request, WebSocket, WebSocketDisconnect
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, Response
from fastapi.staticfiles import StaticFiles
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from starlette.exceptions import HTTPException as StarletteHTTPException

ws_rate_limiter = InMemoryWSRateLimiter()


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
    if settings.JANITOR_ENABLED:
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
    notes_router, prefix="/api/v1/notes", tags=["Notes"], dependencies=_auth
)
app.include_router(
    tasks_router, prefix="/api/v1/tasks", tags=["Tasks"], dependencies=_auth
)
app.include_router(
    jobs_router, prefix="/api/v1/jobs", tags=["Jobs"], dependencies=_auth
)
app.include_router(
    learn_router, prefix="/api/v1/learn", tags=["Learn"], dependencies=_auth
)
app.include_router(
    print_router, prefix="/api/v1/print", tags=["Print"], dependencies=_auth
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
    # Only allow a basename (no path separators) and ensure resolved
    # path is inside the configured AUDIO_CACHE_DIR to prevent
    # path traversal (e.g. filename='../../etc/passwd').
    from pathlib import Path

    # Disallow path separators in the filename
    if Path(filename).name != filename:
        raise HTTPException(status_code=400, detail="Invalid filename")

    path = (settings.AUDIO_CACHE_DIR or Path("/tmp")) / filename
    try:
        resolved = path.resolve(strict=False)
        cache_dir_resolved = settings.AUDIO_CACHE_DIR.resolve()
    except Exception:
        raise HTTPException(status_code=500, detail="Server configuration error")

    # Ensure the resolved path is inside the audio cache dir
    if not resolved.is_relative_to(cache_dir_resolved):
        raise HTTPException(status_code=400, detail="Invalid filename")

    if not resolved.exists() or not resolved.is_file():
        raise HTTPException(status_code=404, detail="Audio not found")

    return FileResponse(resolved)


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
            "enabled": settings.ENABLE_EVENT_BUS,
            "redis": svc.event_bus.is_enabled(),
            "connected": await svc.event_bus.ensure_connected()
            if settings.ENABLE_EVENT_BUS
            else False,
        }
    trace_info = {
        "tracing_enabled": settings.ENABLE_TRACING,
        "otlp_endpoint": settings.OTEL_EXPORTER_OTLP_ENDPOINT or None,
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
            "enabled": settings.ENABLE_EVENT_BUS,
            "redis": svc.event_bus.is_enabled(),
            "connected": await svc.event_bus.ensure_connected()
            if settings.ENABLE_EVENT_BUS
            else False,
        }
    trace_info = {
        "tracing_enabled": settings.ENABLE_TRACING,
        "otlp_endpoint": settings.OTEL_EXPORTER_OTLP_ENDPOINT or None,
    }
    return await full_health(capabilities=caps, event_bus=bus_info, tracing=trace_info)


@app.get("/metrics")
@limiter.exempt
async def prometheus_metrics(request: Request):
    """Prometheus scrape endpoint (when prometheus_client is installed)."""
    # Optionally require an API key / token to access metrics to avoid
    # exposing internal telemetry to unauthenticated callers.
    if settings.METRICS_AUTH_REQUIRED:
        token = None
        auth_hdr = request.headers.get("authorization")
        if auth_hdr:
            parts = auth_hdr.split()
            token = parts[1] if len(parts) > 1 else parts[0]
        if not token or not _validate_token(token):
            raise HTTPException(status_code=401, detail={"error_code": "unauthorized"})

    result = metrics_payload()
    if result is None:
        raise HTTPException(status_code=404, detail="Metrics disabled or unavailable")
    body, content_type = result
    return Response(content=body, media_type=content_type)


@app.websocket("/api/v1/chat/ws")
async def websocket_chat_endpoint(websocket: WebSocket):
    """Establishes real-time speech and emotion streaming websocket with rate limiting.

    Security improvements:
    - Require token via header (`Authorization` or `X-API-Key`) instead of query string.
    - Create a short-lived DB session per incoming message to avoid stale long-lived sessions.
    - Return generic error messages to the client (no internal stack traces).
    """
    try:
        # Reject credentials in query-string to avoid accidental leaks
        if settings.AUTH_ENABLED and (websocket.query_params.get("token") or websocket.query_params.get("api_key")):
            await websocket.close(code=4002, reason="Do not send credentials in query string; use Authorization header")
            return

        # Prefer Authorization header (Bearer token) or X-API-Key
        token = None
        auth_hdr = websocket.headers.get("authorization")
        if auth_hdr:
            # support 'Bearer <token>' or bare token
            parts = auth_hdr.split()
            token = parts[1] if len(parts) > 1 else parts[0]
        if not token:
            token = websocket.headers.get("x-api-key")

        if settings.AUTH_ENABLED and (not token or not _validate_token(token)):
            await websocket.close(code=4001, reason="Unauthorized")
            return

        await websocket.accept()
        chat_service = app.state.chat_service

        while True:
            data = await websocket.receive_text()

            client_ip = websocket.client.host if websocket.client else "unknown"
            if not ws_rate_limiter.allow(client_ip, max_requests=20, period_seconds=60):
                await websocket.send_json({"event": "error", "data": "Rate limit exceeded"})
                continue

            try:
                body_dict = json.loads(data)
                body = ChatRequest(**body_dict)
            except Exception:
                await websocket.send_json({"event": "error", "data": "Invalid request"})
                continue

            # Create a fresh DB session for each incoming message to avoid long-lived
            # transactions and stale connections during a persistent WS lifecycle.
            db_gen = get_db()
            db = next(db_gen)
            try:
                try:
                    async for item in chat_service.process_message_stream(db, body):
                        await websocket.send_json(item)
                except Exception:
                    await websocket.send_json({"event": "error", "data": "Internal server error"})
            finally:
                try:
                    next(db_gen)
                except StopIteration:
                    pass
    except WebSocketDisconnect:
        pass
    except Exception as e:
        logging.error(f"WebSocket error: {e}")
    finally:
        # nothing to cleanup here; per-message DB generators are closed above
        pass


if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
