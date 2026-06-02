from app.main import app
from fastapi.testclient import TestClient

client = TestClient(app)


def test_document_analyze_with_text_file():
    content = (
        "Dies ist ein Testdokument. Es beschreibt ein Beispiel für eine Dokumentanalyse. "
        "Der Text enthält genug Inhalt, um die Extraktion zu ermöglichen und eine Zusammenfassung zu liefern."
    )
    response = client.post(
        "/api/v1/documents/analyze",
        files={"file": ("example.txt", content.encode("utf-8"), "text/plain")},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["filename"] == "example.txt"
    assert "summary" in data
    assert data["summary"]
    assert data["document_type"] == "document"
