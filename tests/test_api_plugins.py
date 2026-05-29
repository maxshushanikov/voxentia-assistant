from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api.v1 import plugins as plugins_router_module

app = FastAPI()
app.include_router(plugins_router_module.router, prefix="/api/v1/plugins")


def test_plugin_install_alias_requires_plugin_id():
    with TestClient(app) as client:
        response = client.post("/api/v1/plugins/install", json={})
        assert response.status_code == 400
        assert response.json()["detail"] == "plugin_id is required"


def test_plugin_uninstall_alias_returns_error_for_missing_plugin():
    with TestClient(app) as client:
        response = client.delete("/api/v1/plugins/install/nonexistent-plugin")
        assert response.status_code == 200
        assert response.json()["error"] == "Plugin not installed"
