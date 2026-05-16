from app.main import app
from fastapi.testclient import TestClient


def test_list_documents_empty():
    client = TestClient(app)
    response = client.get("/api/v1/documents")
    assert response.status_code == 200
    assert response.json()["documents"] == []
