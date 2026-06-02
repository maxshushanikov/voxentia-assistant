from app.main import app
from fastapi.testclient import TestClient

client = TestClient(app)


def test_print_html_to_pdf_endpoint():
    payload = {"html": "<h1>Report</h1><p>Test HTML to PDF</p>", "title": "PdfTest"}
    response = client.post("/api/v1/print/html-to-pdf", json=payload)
    assert response.status_code == 200
    assert response.headers["content-type"] == "application/pdf"
    assert response.content.startswith(b"%PDF")


def test_print_queue_job_lifecycle():
    payload = {"html": "<h1>Report</h1><p>Test Print Queue</p>", "title": "QueueTest"}
    response = client.post("/api/v1/print/queue", json=payload)
    assert response.status_code == 200
    job = response.json()
    assert job["title"] == "QueueTest"
    assert job["status"] in {"completed", "failed"}
    assert "id" in job

    response = client.get("/api/v1/print/queue")
    assert response.status_code == 200
    jobs = response.json()
    assert isinstance(jobs, list)
    assert any(item["id"] == job["id"] for item in jobs)

    response = client.get(f"/api/v1/print/queue/{job['id']}")
    assert response.status_code == 200
    assert response.json()["id"] == job["id"]

    if job["status"] == "completed":
        download_response = client.get(f"/api/v1/print/queue/{job['id']}/download")
        assert download_response.status_code == 200
        assert download_response.headers["content-type"] == "application/pdf"
