"""Discover plugin packages under the plugins/ tree without hardcoded PYTHONPATH entries."""

from __future__ import annotations

import importlib
import inspect
import sys
from pathlib import Path
from typing import TYPE_CHECKING

from voxentia.utils.logging import logger

if TYPE_CHECKING:
    from voxentia.plugins.registry import PluginRegistry


def find_plugin_src_paths(plugins_root: Path) -> list[Path]:
    """Return `src` directories (plugins/*/src) plus the root when flat modules exist."""
    if not plugins_root.is_dir():
        return []

    paths: list[Path] = []
    for src_dir in sorted(plugins_root.glob("*/src")):
        if src_dir.is_dir():
            paths.append(src_dir)

    if any(plugins_root.glob("*.py")):
        paths.append(plugins_root)

    return paths


def _register_classes_from_module(registry: PluginRegistry, module) -> None:
    from voxentia.plugins.base import VoxentiaPlugin

    for _, obj in inspect.getmembers(module):
        if inspect.isclass(obj) and issubclass(obj, VoxentiaPlugin) and obj is not VoxentiaPlugin:
            registry.register_plugin_class(obj)


def discover_plugins(registry: PluginRegistry, plugins_root: str | Path) -> None:
    """Load plugins from standard layouts: plugins/*/src/<pkg>/plugin.py and plugins/*.py."""
    root = Path(plugins_root)
    if not root.is_dir():
        logger.warning("Plugins directory not found: %s", root)
        return

    src_paths = find_plugin_src_paths(root)
    for src_path in src_paths:
        path_str = str(src_path.resolve())
        if path_str not in sys.path:
            sys.path.insert(0, path_str)

    for src_path in src_paths:
        if src_path == root:
            continue
        for pkg_dir in sorted(src_path.iterdir()):
            if not pkg_dir.is_dir() or pkg_dir.name.startswith("_"):
                continue
            module_path = pkg_dir / "plugin.py"
            if not module_path.exists():
                continue
            module_name = f"{pkg_dir.name}.plugin"
            try:
                module = importlib.import_module(module_name)
                _register_classes_from_module(registry, module)
            except Exception as e:
                logger.error("Failed to load plugin module %s: %s", module_name, e)

    for py_file in sorted(root.glob("*.py")):
        if py_file.name.startswith("_"):
            continue
        module_name = py_file.stem
        try:
            module = importlib.import_module(module_name)
            _register_classes_from_module(registry, module)
        except Exception as e:
            logger.error("Failed to load plugin module %s: %s", module_name, e)
