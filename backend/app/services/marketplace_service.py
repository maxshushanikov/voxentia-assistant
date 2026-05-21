"""Plugin marketplace — catalog listing and install into plugin config."""

from __future__ import annotations

import json
import logging
import shutil
from pathlib import Path

from app.core.config import settings

logger = logging.getLogger(__name__)


class MarketplaceService:
    def __init__(self) -> None:
        self.catalog_path = settings.MARKETPLACE_CATALOG_PATH
        self.install_dir = Path(settings.MARKETPLACE_PLUGINS_DIR)
        self.install_dir.mkdir(parents=True, exist_ok=True)
        self.config_path = settings.PLUGIN_CONFIG_PATH

    def _load_catalog(self) -> list[dict]:
        if not self.catalog_path.exists():
            return []
        with open(self.catalog_path, encoding="utf-8") as f:
            data = json.load(f)
        return data.get("plugins", [])

    def _load_plugin_config(self) -> dict:
        try:
            with open(self.config_path, encoding="utf-8") as f:
                return json.load(f)
        except FileNotFoundError:
            return {"plugins": {}}

    def _save_plugin_config(self, config: dict) -> None:
        self.config_path.parent.mkdir(parents=True, exist_ok=True)
        with open(self.config_path, "w", encoding="utf-8") as f:
            json.dump(config, f, indent=2)

    def list_catalog(self, installed_ids: set[str]) -> list[dict]:
        items = []
        for p in self._load_catalog():
            pid = p.get("id", "")
            items.append(
                {
                    **p,
                    "installed": pid in installed_ids or p.get("builtin", False),
                    "installable": bool(p.get("package_path")),
                }
            )
        return items

    def install_plugin(self, plugin_id: str) -> dict:
        catalog = {p["id"]: p for p in self._load_catalog()}
        entry = catalog.get(plugin_id)
        if not entry:
            return {"error": f"Plugin {plugin_id} not in catalog"}

        if entry.get("builtin"):
            config = self._load_plugin_config()
            config.setdefault("plugins", {})[plugin_id] = {"enabled": True}
            self._save_plugin_config(config)
            return {"message": f"Enabled builtin plugin {plugin_id}", "restart_required": True}

        src = Path(entry.get("package_path", ""))
        if not src.is_absolute():
            src = settings.REPO_ROOT / src
        if not src.exists():
            return {"error": f"Package path not found: {src}"}

        dest = self.install_dir / plugin_id
        if dest.exists():
            shutil.rmtree(dest)
        shutil.copytree(src, dest)

        config = self._load_plugin_config()
        config.setdefault("plugins", {})[plugin_id] = {
            "enabled": True,
            "path": str(dest),
        }
        self._save_plugin_config(config)
        return {
            "message": f"Installed {plugin_id}",
            "path": str(dest),
            "restart_required": True,
        }

    def uninstall_plugin(self, plugin_id: str) -> dict:
        config = self._load_plugin_config()
        plugins = config.get("plugins", {})
        if plugin_id not in plugins:
            return {"error": "Plugin not installed"}

        entry = plugins.pop(plugin_id)
        self._save_plugin_config(config)

        path = entry.get("path")
        if path:
            p = Path(path)
            if p.exists() and settings.MARKETPLACE_PLUGINS_DIR in p.parents:
                shutil.rmtree(p, ignore_errors=True)

        return {"message": f"Disabled {plugin_id}", "restart_required": True}
