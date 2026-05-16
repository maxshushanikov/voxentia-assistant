from fastapi.testclient import TestClient

from app.main import app


def test_health_returns_request_id_header():
    client = TestClient(app, raise_server_exceptions=False)
    response = client.get("/health")
    assert response.status_code == 200
    assert response.headers.get("X-Request-ID")


def test_client_request_id_is_echoed():
    client = TestClient(app, raise_server_exceptions=False)
    response = client.get("/health", headers={"X-Request-ID": "custom-id-42"})
    assert response.headers.get("X-Request-ID") == "custom-id-42"
