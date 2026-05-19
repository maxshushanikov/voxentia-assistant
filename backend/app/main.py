from contextlib import asynccontextmanager

from app.api.v1.chat import router as chat_router
from app.api.v1.documents import router as documents_router
from app.api.v1.models import router as models_router
from app.api.v1.plugins import router as plugin_router
from app.core.auth import require_auth
from app.core.config import settings
from app.core.database import init_db
from app.core.errors import VoxentiaError
from app.core.exceptions import (
    http_exception_handler,
    unhandled_exception_handler,
    validation_exception_handler,
    voxentia_error_handler,
)
from app.core.logging_config import configure_backend_logging
from app.core.middleware import RequestIdMiddleware
from app.core.rate_limit import limiter
from app.services.chat_service import ChatService
from app.services.health_service import full_health
from fastapi import Depends, FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from starlette.exceptions import HTTPException as StarletteHTTPException


@asynccontextmanager
async def lifespan(app: FastAPI):
    service = ChatService()
    await service.initialize()
    app.state.chat_service = service
    yield
    await service.shutdown()


configure_backend_logging(settings.LOG_LEVEL)
init_db()

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Professional Backend for Voxentia AI Assistant",
    lifespan=lifespan,
)

app.state.limiter = limiter
app.add_exception_handler(VoxentiaError, voxentia_error_handler)
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_exception_handler(StarletteHTTPException, http_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(Exception, unhandled_exception_handler)

app.add_middleware(RequestIdMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "X-API-Key", "X-Request-ID"],
)

_auth = [Depends(require_auth)]

app.include_router(chat_router, prefix="/api/v1", tags=["Chat"], dependencies=_auth)
app.include_router(
    documents_router, prefix="/api/v1/documents", tags=["Documents"], dependencies=_auth
)
app.include_router(
    plugin_router, prefix="/api/v1/plugins", tags=["Plugins"], dependencies=_auth
)
app.include_router(models_router, prefix="/api/v1", tags=["Models"], dependencies=_auth)
app.include_router(chat_router, prefix="/api", tags=["Legacy Chat"], dependencies=_auth)
app.include_router(
    documents_router, prefix="/api/documents", tags=["Legacy Documents"], dependencies=_auth
)

app.mount("/api/tts-audio", StaticFiles(directory=str(settings.AUDIO_CACHE_DIR)), name="tts-audio")
assets_path = settings.REPO_ROOT / "assets"
if assets_path.exists():
    app.mount("/assets", StaticFiles(directory=str(assets_path)), name="assets")


@app.get("/health")
@limiter.exempt
async def health_check():
    return await full_health()


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
