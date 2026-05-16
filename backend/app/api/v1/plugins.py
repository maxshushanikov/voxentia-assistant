from fastapi import APIRouter

from app.services.chat_service import chat_service

router = APIRouter()


@router.get("/list")
async def list_plugins():
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
            }
        )

    return {"plugins": plugins}
