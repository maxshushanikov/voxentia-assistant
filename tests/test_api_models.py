from unittest.mock import AsyncMock, MagicMock, patch

from app.main import app
from fastapi.testclient import TestClient


def test_models_endpoint_returns_list():
    mock_response = MagicMock()
    mock_response.raise_for_status = MagicMock()
    mock_response.json.return_value = {
        "models": [{"name": "phi3", "size": 100}],
    }

    with patch("httpx.AsyncClient") as mock_client_cls:
        mock_client = AsyncMock()
        mock_client.__aenter__.return_value = mock_client
        mock_client.__aexit__.return_value = None
        mock_client.get = AsyncMock(return_value=mock_response)
        mock_client_cls.return_value = mock_client

        with TestClient(app) as client:
            res = client.get("/api/v1/models")

    assert res.status_code == 200
    body = res.json()
    assert "models" in body
    assert body["models"][0]["name"] == "phi3"
