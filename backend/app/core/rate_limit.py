from app.core.config import settings
from slowapi import Limiter
from starlette.requests import Request


def get_client_id(request: Request) -> str:
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "127.0.0.1"


def _build_limiter() -> Limiter:
    redis_url = getattr(settings, "REDIS_URL", None) or ""
    if redis_url.strip():
        return Limiter(
            key_func=get_client_id,
            storage_uri=redis_url.strip(),
            strategy="moving-window",
        )
    return Limiter(key_func=get_client_id)


limiter = _build_limiter()
