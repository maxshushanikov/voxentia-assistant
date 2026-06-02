from app.main import app
from fastapi.testclient import TestClient

client = TestClient(app)


def test_learning_plan_and_stats_flow():
    response = client.post("/api/v1/learn/plan", json={"topic": "Python Programmierung"})
    assert response.status_code == 200
    plan = response.json()
    assert plan["topic"] == "Python Programmierung"
    assert plan["progress"] == 0
    assert isinstance(plan["modules"], list)

    response = client.get("/api/v1/learn/stats")
    assert response.status_code == 200
    stats = response.json()
    assert "words_learned" in stats
    assert "daily_goals" in stats
    assert isinstance(stats["daily_goals"], list)


def test_quiz_generate_and_verify():
    response = client.post(
        "/api/v1/learn/quiz/generate",
        json={"topic": "Machine Learning", "module_title": "Grundlagen"},
    )
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data["questions"], list)
    assert len(data["questions"]) > 0
    question = data["questions"][0]
    assert "question" in question
    assert "options" in question
    assert "correct_answer" in question

    verify_response = client.post(
        "/api/v1/learn/quiz/verify",
        json={
            "question": question["question"],
            "user_answer": question["correct_answer"],
            "correct_answer": question["correct_answer"],
        },
    )
    assert verify_response.status_code == 200
    verify_data = verify_response.json()
    assert verify_data["correct"] is True
    assert "explanation" in verify_data


def test_exam_and_speaking_exercise():
    exam_response = client.post(
        "/api/v1/learn/exam",
        json={"topic": "Soft Skills", "difficulty": "easy"},
    )
    assert exam_response.status_code == 200
    exam_data = exam_response.json()
    assert isinstance(exam_data["questions"], list)
    assert len(exam_data["questions"]) > 0

    speaking_response = client.post(
        "/api/v1/learn/speaking-exercise",
        json={"topic": "Teamarbeit", "language": "Deutsch", "level": "beginner"},
    )
    assert speaking_response.status_code == 200
    speaking_data = speaking_response.json()
    assert "prompt" in speaking_data
    assert "practice_text" in speaking_data


def test_vocab_trainer_and_goal_management():
    vocab_response = client.post(
        "/api/v1/learn/vocab-trainer",
        params={"topic": "IT", "level": "intermediate"},
    )
    assert vocab_response.status_code == 200
    vocab_data = vocab_response.json()
    assert vocab_data["topic"] == "IT"
    assert isinstance(vocab_data["words"], list)

    goal_response = client.post(
        "/api/v1/learn/goals",
        json={"description": "Lerne neue Vokabeln"},
    )
    assert goal_response.status_code == 200
    goal_data = goal_response.json()
    assert goal_data["description"] == "Lerne neue Vokabeln"
    assert goal_data["completed"] is False

    toggle_response = client.put(f"/api/v1/learn/goals/{goal_data['id']}/toggle")
    assert toggle_response.status_code == 200
    toggle_data = toggle_response.json()
    assert toggle_data["completed"] in (True, False)
