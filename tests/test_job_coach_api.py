from app.main import app
from fastapi.testclient import TestClient

client = TestClient(app)


def test_cv_upload_and_analyze():
    response = client.post(
        "/api/v1/jobs/cv/upload",
        files={"file": ("cv.txt", "Ich bin ein erfahrener Entwickler mit Fokus auf KI und NLP.", "text/plain")},
    )
    assert response.status_code == 200

    response = client.post("/api/v1/jobs/cv/analyze", json={})
    assert response.status_code == 200
    data = response.json()
    assert "summary" in data
    assert "strengths" in data
    assert "areas_for_improvement" in data
    assert "advice" in data


def test_interview_simulation():
    payload = {
        "job_title": "Machine Learning Engineer",
        "company": "Voxentia Labs",
        "summary": "Develop AI-driven applications with a focus on embeddings and conversational agents.",
        "rounds": 2,
    }
    response = client.post("/api/v1/jobs/test-job-001/interview-simulation", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["job_id"] == "test-job-001"
    assert isinstance(data["questions"], list)
    assert len(data["questions"]) == 2
    assert all("question" in q and "model_answer" in q for q in data["questions"])


def test_cover_letter_and_matching_endpoints():
    payload = {
        "job_title": "Machine Learning Engineer",
        "company": "Voxentia Labs",
        "summary": "Develop AI-driven applications with a focus on embeddings and conversational agents.",
        "rounds": 2,
    }
    upload_response = client.post(
        "/api/v1/jobs/cv/upload",
        files={"file": ("cv.txt", "Ich bin ein erfahrener Entwickler mit Fokus auf KI und NLP.", "text/plain")},
    )
    assert upload_response.status_code == 200

    matching_response = client.post(
        "/api/v1/jobs/test-job-001/matching",
        params={
            "job_title": payload["job_title"],
            "job_company": payload["company"],
            "job_summary": payload["summary"],
        },
    )
    assert matching_response.status_code == 200
    match_data = matching_response.json()
    assert "matching_score" in match_data
    assert match_data["matching_score"] is None or isinstance(match_data["matching_score"], int)

    cover_response = client.post(
        "/api/v1/jobs/test-job-001/cover-letter",
        params={
            "job_title": payload["job_title"],
            "job_company": payload["company"],
            "job_summary": payload["summary"],
        },
    )
    assert cover_response.status_code == 200
    cover_data = cover_response.json()
    assert "cover_letter" in cover_data
    assert len(cover_data["cover_letter"]) > 50
