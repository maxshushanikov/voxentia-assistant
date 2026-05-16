from fastapi.testclient import TestClient

from app.core.database import SessionLocal, init_db
from app.main import app
from app.models.chat import ChatMessage

client = TestClient(app, raise_server_exceptions=False)


def test_delete_session_removes_messages():
    init_db()
    session_id = "test-delete-session"
    db = SessionLocal()
    db.add(ChatMessage(session_id=session_id, role="user", content="hello"))
    db.commit()
    db.close()

    response = client.delete(f"/api/v1/sessions/{session_id}")
    assert response.status_code == 200
    assert response.json()["deleted_messages"] >= 1

    history = client.get(f"/api/v1/chat/history?session_id={session_id}")
    assert history.json()["history"] == []


def test_delete_session_not_found():
    response = client.delete("/api/v1/sessions/nonexistent-session-id")
    assert response.status_code == 404
