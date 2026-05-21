from app.core.deps import get_chat_service
from app.services.chat_service import ChatService
from fastapi import APIRouter, Depends

router = APIRouter()


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
                "intents": cls.get_intents(),
            }
        )

    return {"plugins": plugins}


@router.get("/health")
async def plugins_health(chat_service: ChatService = Depends(get_chat_service)):
    await chat_service.initialize()
    report = await chat_service.registry.health_report()
    status = "ok" if all(p.get("status") == "ok" for p in report if p.get("status") != "not_loaded") else "degraded"
    return {"status": status, "plugins": report}
