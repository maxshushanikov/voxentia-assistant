import httpx
from app.core.config import settings
from app.core.rate_limit import limiter
from fastapi import APIRouter, Request

router = APIRouter()


@router.get("/models")
@limiter.limit("30/minute")
async def list_ollama_models(request: Request):
    """Proxy Ollama /api/tags for frontend model picker."""
    try:
        async with httpx.AsyncClient(timeout=min(settings.OLLAMA_TIMEOUT, 10.0)) as client:
            response = await client.get(f"{settings.OLLAMA_URL.rstrip('/')}/api/tags")
            response.raise_for_status()
            data = response.json()
    except Exception:
        return {"models": [], "default": settings.DEFAULT_MODEL}

    models = [
        {
            "name": m.get("name", ""),
            "size": m.get("size"),
            "modified_at": m.get("modified_at"),
        }
        for m in data.get("models", [])
        if m.get("name")
    ]

    default = settings.DEFAULT_MODEL
    # Try to resolve default model name robustly (e.g., match 'phi3' with 'phi3:latest')
    matching = [
        m.get("name") 
        for m in data.get("models", []) 
        if m.get("name") and (
            m.get("name").lower() == default.lower() or 
            m.get("name").lower() == f"{default.lower()}:latest"
        )
    ]
    if matching:
        default = matching[0]

    return {"models": models, "default": default}
