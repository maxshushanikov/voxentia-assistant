from pathlib import Path

from voxentia.plugins.discovery import find_plugin_src_paths


def test_find_plugin_src_paths_includes_packaged_plugins():
    plugins_root = Path(__file__).resolve().parents[2] / "plugins"
    paths = find_plugin_src_paths(plugins_root)

    path_names = {p.name for p in paths}
    assert "src" in path_names
    assert len(paths) >= 3
