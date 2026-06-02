from app.core.deps import get_chat_service
from app.services.chat_service import ChatService
from app.services.marketplace_service import MarketplaceService
from fastapi import APIRouter, Depends, HTTPException

router = APIRouter()
_marketplace = MarketplaceService()


@router.get("/list")
async def list_plugins(chat_service: ChatService = Depends(get_chat_service)):
    await chat_service.initialize()
    plugins = []

    for name, instance in chat_service.registry.plugins.items():
        meta = instance.metadata
        plugins.append(
            {
                "id": meta.name,
                "name": meta.display_name,
                "version": meta.version,
                "description": meta.description,
                "status": "active",
                "enabled": True,
                "capabilities": meta.capabilities,
                "triggers": meta.triggers,
                "permissions": meta.permissions,
                "intents": instance.get_intents(),
            }
        )

    for name, cls in chat_service.registry.plugin_classes.items():
        if name in chat_service.registry.plugins:
            continue
        meta = cls.get_metadata(cls)
        plugins.append(
            {
                "id": meta.name,
                "name": meta.display_name,
                "version": meta.version,
                "description": meta.description,
                "status": "disabled",
                "enabled": bool(chat_service.registry._plugin_config.get(name, {}).get("enabled", False)),
                "capabilities": meta.capabilities,
                "triggers": meta.triggers,
                "permissions": meta.permissions,
                "intents": cls.get_intents(),
            }
        )

    return {"plugins": plugins}


@router.post("/install")
async def install_plugin(request: dict):
    plugin_id = request.get("plugin_id")
    if not plugin_id:
        raise HTTPException(status_code=400, detail="plugin_id is required")
    return _marketplace.install_plugin(plugin_id)


@router.delete("/install/{plugin_id}")
async def uninstall_plugin(plugin_id: str):
    return _marketplace.uninstall_plugin(plugin_id)


@router.get("/health")
async def plugins_health(chat_service: ChatService = Depends(get_chat_service)):
    await chat_service.initialize()
    report = await chat_service.registry.health_report()
    status = "ok" if all(p.get("status") == "ok" for p in report if p.get("status") != "not_loaded") else "degraded"
    return {"status": status, "plugins": report}
