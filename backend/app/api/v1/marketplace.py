from app.core.config import settings
from app.core.deps import get_chat_service
from app.core.rate_limit import limiter
from app.services.chat_service import ChatService
from app.services.marketplace_service import MarketplaceService
from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel
from app.core.database import get_db
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.models.experiment import ExperimentEvent

router = APIRouter()
_marketplace = MarketplaceService()


class InstallRequest(BaseModel):
    plugin_id: str


@router.get("/catalog")
@limiter.limit(settings.RATE_LIMIT)
async def list_catalog(
    request: Request,
    chat_service: ChatService = Depends(get_chat_service),
):
    await chat_service.initialize()
    installed = set(chat_service.registry.plugins.keys())
    return {"plugins": _marketplace.list_catalog(installed)}


@router.post("/install")
@limiter.limit("10/minute")
async def install_plugin(request: Request, body: InstallRequest):
    result = _marketplace.install_plugin(body.plugin_id)
    if result.get("error"):
        return result
    return result


@router.delete("/install/{plugin_id}")
@limiter.limit("10/minute")
async def uninstall_plugin(request: Request, plugin_id: str):
    return _marketplace.uninstall_plugin(plugin_id)


@router.get("/experiments/stats")
@limiter.limit(settings.RATE_LIMIT)
async def experiment_stats(
    request: Request,
    experiment_id: str = "response_style_v1",
    db: Session = Depends(get_db),
):
    rows = (
        db.query(
            ExperimentEvent.variant,
            func.count(ExperimentEvent.id),
            func.avg(ExperimentEvent.latency_ms),
        )
        .filter(ExperimentEvent.experiment_id == experiment_id)
        .group_by(ExperimentEvent.variant)
        .all()
    )
    return {
        "experiment_id": experiment_id,
        "variants": [
            {
                "variant": r[0],
                "count": r[1],
                "avg_latency_ms": round(float(r[2] or 0), 1),
            }
            for r in rows
        ],
    }
