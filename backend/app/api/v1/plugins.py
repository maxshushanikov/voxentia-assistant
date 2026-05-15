from fastapi import APIRouter
import os
from pathlib import Path
from app.core.config import settings

router = APIRouter()

@router.get("/list")
async def list_plugins():
    plugins_dir = settings.BASE_DIR.parent / "plugins"
    plugin_list = []
    
    if plugins_dir.exists():
        for entry in os.scandir(plugins_dir):
            if entry.is_dir() and not entry.name.startswith("__"):
                plugin_list.append({
                    "id": entry.name,
                    "name": entry.name.replace("_", " ").title(),
                    "status": "active"
                })
    
    return {"plugins": plugin_list}
