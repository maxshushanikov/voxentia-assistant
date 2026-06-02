from unittest.mock import MagicMock

import pytest
from app.core.database import Base
from app.models.chat import ChatMessage
from app.schemas.chat import ChatRequest
from app.services.chat_service import ChatService
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker


@pytest.fixture
def db_session(tmp_path):
    engine = create_engine(f"sqlite:///{tmp_path / 'fork.db'}")
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    db = Session()
    yield db
    db.close()


def test_fork_session_copies_prior_messages(db_session):
    service = ChatService()
    sid = "sess_test"
    db_session.add(ChatMessage(session_id=sid, role="user", content="Hi", branch_id="main"))
    db_session.add(ChatMessage(session_id=sid, role="assistant", content="Hello", branch_id="main"))
    db_session.add(ChatMessage(session_id=sid, role="user", content="More", branch_id="main"))
    db_session.commit()
    assistant = (
        db_session.query(ChatMessage)
        .filter_by(session_id=sid, role="assistant", content="Hello")
        .first()
    )

    new_sid, branch_id, copied = service.fork_session(db_session, sid, assistant.id)

    assert copied == 1
    assert new_sid != sid
    assert branch_id.startswith("branch_")
    rows = db_session.query(ChatMessage).filter_by(session_id=new_sid).all()
    assert len(rows) == 1
    assert rows[0].role == "user"
    assert rows[0].content == "Hi"


@pytest.mark.asyncio
async def test_prepare_context_fork_creates_new_session(db_session, monkeypatch):
    service = ChatService()
    sid = "sess_orig"
    db_session.add(ChatMessage(session_id=sid, role="user", content="Q", branch_id="main"))
    db_session.commit()
    msg = db_session.query(ChatMessage).first()

    async def noop_sources(*_a, **_k):
        return []

    monkeypatch.setattr("app.services.chat_context_builder.search_sources", noop_sources)

    service.emotion_service = MagicMock(get_tone_hint=MagicMock(return_value=""))
    service.memory_service = MagicMock(build_memory_prompt=MagicMock(return_value=""))
    service.knowledge_service = MagicMock(build_graph_prompt=MagicMock(return_value=""))

    request = ChatRequest(message="Follow up", session_id=sid, fork_from_message_id=msg.id)
    ctx = await service.context_builder.build(db_session, request)
    assert ctx.effective_session_id != sid
    assert ctx.effective_session_id.startswith("sess_")
