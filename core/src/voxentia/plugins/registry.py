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
        """Initialisiert nur die in der Konfiguration aktivierten Plugins."""
        plugin_config = config.get("plugins", {})

        for name, cls in self.plugin_classes.items():
            settings = plugin_config.get(name, {})
            if not settings.get("enabled", False):
                logger.debug(f"Plugin deaktiviert (via Config): {name}")
                continue

            try:
                instance = cls(context)
                # Hier könnten wir auch einen Timeout für die Initialisierung setzen
                await instance.initialize()
                self.plugins[name] = instance
                logger.info(f"Plugin geladen & aktiviert: {name}")
            except Exception as e:
                logger.error(f"Fehler bei Initialisierung von {name}: {e}")

    async def shutdown_plugins(self):
        """Beendet alle Plugins sauber."""
        for name, instance in self.plugins.items():
            try:
                await instance.shutdown()
                logger.info(f"Plugin heruntergefahren: {name}")
            except Exception as e:
                logger.error(f"Fehler beim Beenden von {name}: {e}")
        self.plugins.clear()

    def get_plugin(self, name: str) -> Optional[VoxentiaPlugin]:
        return self.plugins.get(name)

    def get_plugin_for_intent(self, intent: str) -> Optional[VoxentiaPlugin]:
        """Resolve plugin by declared supported_intents (no hardcoded routing)."""
        for plugin in self.plugins.values():
            if intent in plugin.get_intents():
                return plugin
        return None

    def all_intents(self) -> list[str]:
        intents: list[str] = []
        for plugin in self.plugins.values():
            intents.extend(plugin.get_intents())
        return sorted(set(intents))
