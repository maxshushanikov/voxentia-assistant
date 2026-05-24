import asyncio
from contextlib import asynccontextmanager
from typing import Any, Dict, Optional, Type

from voxentia.plugins.base import PluginResponse, VoxentiaPlugin
from voxentia.utils.logging import logger


class PluginRegistry:
    """Verwaltet die Registrierung und Instanziierung von Plugins."""

    def __init__(self):
        self.plugins: Dict[str, VoxentiaPlugin] = {}
        self.plugin_classes: Dict[str, Type[VoxentiaPlugin]] = {}
        self._context = None
        self._plugin_config = {}

    def discover_plugins(self, package_path: str):
        """Durchsucht ein Verzeichnis nach Plugins und registriert sie."""
        from voxentia.plugins.discovery import discover_plugins

        discover_plugins(self, package_path)

    def register_plugin_class(self, plugin_class: Type[VoxentiaPlugin]):
        """Registriert eine Plugin-Klasse manuell."""
        metadata = plugin_class.get_metadata(plugin_class)
        self.plugin_classes[metadata.name] = plugin_class
        logger.info(f"Plugin Klasse registriert: {metadata.display_name} (v{metadata.version})")

    @asynccontextmanager
    async def _execute_with_timeout(self, plugin_name: str, coro, timeout_sec: int = 15):
        """Führt Plugin-Code mit Timeout und Fehler-Isolation aus."""
        try:
            yield await asyncio.wait_for(coro, timeout=timeout_sec)
        except asyncio.TimeoutError:
            logger.error(f"Plugin '{plugin_name}' Zeitüberschreitung nach {timeout_sec}s")
            yield PluginResponse(text="Dieses Plugin braucht zu lange für eine Antwort.")
        except Exception as e:
            logger.exception(f"Plugin '{plugin_name}' verursachte einen Fehler: {e}")
            yield PluginResponse(text="In diesem Plugin ist ein Fehler aufgetreten.")

    async def initialize_plugins(self, context, config: Dict[str, Any]):
        """Speichert Konfiguration für Lazy-Loading."""
        self._context = context
        self._plugin_config = config.get("plugins", {})
        logger.info(f"{len(self.plugin_classes)} Plugin-Klassen für Lazy-Loading registriert.")

    async def shutdown_plugins(self):
        """Beendet alle Plugins sauber."""
        for name, instance in self.plugins.items():
            try:
                await instance.shutdown()
                logger.info(f"Plugin heruntergefahren: {name}")
            except Exception as e:
                logger.error(f"Fehler beim Beenden von {name}: {e}")
        self.plugins.clear()

    async def get_plugin(self, name: str) -> Optional[VoxentiaPlugin]:
        if name in self.plugins:
            return self.plugins[name]
        cls = self.plugin_classes.get(name)
        if not cls:
            return None
        if not self._plugin_config.get(name, {}).get("enabled", False):
            return None
        try:
            instance = cls(self._context)
            await instance.initialize()
            self.plugins[name] = instance
            logger.info(f"Lazy loaded plugin: {name}")
            return instance
        except Exception as e:
            logger.error(f"Fehler beim Lazy Loading von {name}: {e}")
            return None

    def intent_declared(self, intent: str) -> bool:
        """True if any registered plugin class declares this intent (enabled or not)."""
        return any(intent in cls.get_intents() for cls in self.plugin_classes.values())

    def plugin_name_for_intent(self, intent: str) -> Optional[str]:
        for name, cls in self.plugin_classes.items():
            if intent in cls.get_intents():
                return name
        return None

    async def get_plugin_for_intent(self, intent: str) -> Optional[VoxentiaPlugin]:
        """Resolve plugin by declared intents; lazy-load from plugin_classes when enabled."""
        name = self.plugin_name_for_intent(intent)
        if name:
            loaded = await self.get_plugin(name)
            if loaded:
                return loaded
        for plugin in self.plugins.values():
            if intent in type(plugin).get_intents():
                return plugin
        return None

    def all_intents(self) -> list[str]:
        intents: list[str] = []
        for name, cls in self.plugin_classes.items():
            if self._plugin_config.get(name, {}).get("enabled", False):
                intents.extend(cls.get_intents())
        return sorted(set(intents))

    def get_all_intents(self) -> list[str]:
        """Alias for backward compatibility."""
        return self.all_intents()

    async def get_plugin_healthy(self, name: str) -> dict:
        plugin = await self.get_plugin(name)
        if not plugin:
            return {"name": name, "status": "not_loaded"}
        try:
            if hasattr(plugin, "health"):
                ok = await asyncio.wait_for(plugin.health(), timeout=2.0)
                return {
                    "name": name,
                    "status": "ok" if ok else "degraded",
                }
            return {"name": name, "status": "ok"}
        except Exception as e:
            return {"name": name, "status": "error", "detail": str(e)}

    async def health_report(self) -> list[dict]:
        names = sorted(set(self.plugins.keys()) | set(self.plugin_classes.keys()))
        return [await self.get_plugin_healthy(n) for n in names]
