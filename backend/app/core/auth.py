"""Optional API-key / JWT authentication for /api/v1/* routes."""

from __future__ import annotations

from typing import Optional

from app.core.config import settings
from fastapi import HTTPException, Request, Security
from fastapi.security import APIKeyHeader, HTTPAuthorizationCredentials, HTTPBearer

_api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)
_bearer = HTTPBearer(auto_error=False)


def _validate_token(token: str) -> bool:
    if settings.API_KEY and token == settings.API_KEY:
        return True
    if settings.JWT_SECRET:
        try:
            import jwt

            jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
            return True
        except Exception:
            return False
    return False


async def require_auth(
    request: Request,
    api_key: Optional[str] = Security(_api_key_header),
    bearer: Optional[HTTPAuthorizationCredentials] = Security(_bearer),
) -> None:
    """FastAPI dependency — skipped when AUTH_ENABLED=false."""
    if not settings.AUTH_ENABLED:
        return

    if api_key and _validate_token(api_key):
        return

    if bearer and _validate_token(bearer.credentials):
        return

    raise HTTPException(
        status_code=401,
        detail={
            "error_code": "unauthorized",
            "message": "Valid API key or bearer token required.",
            "details": {},
        },
    )
