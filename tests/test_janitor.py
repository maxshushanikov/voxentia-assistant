from datetime import datetime, timedelta, timezone

import pytest
from app.core.database import Base
from app.core.janitor import DatabaseJanitor
from app.models.chat import ChatMessage
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker


@pytest.fixture
def db_factory(tmp_path):
    engine = create_engine(f"sqlite:///{tmp_path / 'janitor.db'}")
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)

    def factory():
        return Session()

    return factory


@pytest.mark.asyncio
async def test_janitor_deletes_old_messages(db_factory):
    db = db_factory()
    old = datetime.now(timezone.utc) - timedelta(days=100)
    db.add(
        ChatMessage(
            session_id="old_sess",
            role="user",
            content="ancient",
            branch_id="main",
        )
    )
    db.commit()
    row = db.query(ChatMessage).first()
    row.timestamp = old
    db.commit()
    db.close()

    janitor = DatabaseJanitor(retention_days=90)
    await janitor.run_once(db_factory)

    db2 = db_factory()
    assert db2.query(ChatMessage).count() == 0
    db2.close()
