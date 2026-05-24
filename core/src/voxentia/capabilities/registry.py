"""Central capability registry: services, plugins, and model routing hints."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass
class ServiceCapability:
    name: str
    url: str
    healthy: bool = False
    detail: str = ""


@dataclass
class PluginCapability:
    name: str
    version: str
    intents: list[str]
    enabled: bool
    loaded: bool


@dataclass
class ModelCapability:
    name: str
    tasks: list[str] = field(default_factory=list)
    available: bool = True


class CapabilityRegistry:
    """Aggregates runtime capabilities for health dashboards and routing."""

    def __init__(self) -> None:
        self.services: dict[str, ServiceCapability] = {}
        self.plugins: dict[str, PluginCapability] = {}
        self.models: dict[str, ModelCapability] = {}

    def register_service(self, name: str, url: str, healthy: bool, detail: str = "") -> None:
        self.services[name] = ServiceCapability(name, url, healthy, detail)

    def register_plugin(
        self,
        name: str,
        version: str,
        intents: list[str],
        *,
        enabled: bool,
        loaded: bool,
    ) -> None:
        self.plugins[name] = PluginCapability(name, version, intents, enabled, loaded)

    def register_model(self, name: str, tasks: list[str] | None = None, available: bool = True) -> None:
        self.models[name] = ModelCapability(name, tasks or ["chat"], available)

    def snapshot(self) -> dict[str, Any]:
        return {
            "services": {k: v.__dict__ for k, v in self.services.items()},
            "plugins": {k: v.__dict__ for k, v in self.plugins.items()},
            "models": {k: v.__dict__ for k, v in self.models.items()},
        }

    def best_model_for_task(self, task: str) -> str | None:
        for model in self.models.values():
            if model.available and task in model.tasks:
                return model.name
        return None
