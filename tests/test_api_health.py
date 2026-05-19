from unittest.mock import AsyncMock, patch

from app.main import app
from fastapi.testclient import TestClient


def test_health_endpoint_reports_services():
    mock_health = {
        "status": "healthy",
        "version": "3.3.0",
        "services": {
            "ollama": {"status": "up"},
            "tts": {"status": "up"},
            "whisper": {"status": "disabled"},
        },
    }
    with patch("app.main.full_health", new=AsyncMock(return_value=mock_health)):
        client = TestClient(app)
        response = client.get("/health")

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "healthy"
    assert "services" in body
    assert "ollama" in body["services"]
