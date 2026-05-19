from app.core.database import SessionLocal, init_db
from app.models.chat import ChatMessage
from app.services.chat_service import ChatService


def test_get_sessions_single_query_for_titles():
    init_db()
    db = SessionLocal()
    service = ChatService()
    try:
        db.query(ChatMessage).delete()
        db.add(
            ChatMessage(session_id="s1", role="user", content="First session question here")
        )
        db.add(ChatMessage(session_id="s1", role="assistant", content="Answer"))
        db.add(ChatMessage(session_id="s2", role="user", content="Second session start"))
        db.commit()

        sessions = service.get_sessions(db)
        assert len(sessions) == 2
        titles = {s.session_id: s.title for s in sessions}
        assert titles["s1"].startswith("First session")
        assert titles["s2"].startswith("Second session")
    finally:
        db.close()
