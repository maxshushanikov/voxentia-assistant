from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import declarative_base, sessionmaker

from .config import settings

Base = declarative_base()
engine = create_engine(
    settings.DB_PATH,
    connect_args={"check_same_thread": False},
    pool_pre_ping=True,
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@event.listens_for(engine, "connect")
def _set_sqlite_pragma(dbapi_connection, connection_record):
    if settings.DB_PATH.startswith("sqlite"):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.close()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    from app.models.chat import ChatMessage  # noqa: F401
    from app.models.memory import UserMemory  # noqa: F401
    from app.models.sentiment import SentimentRecord  # noqa: F401
    from app.models.session import ChatSessionMeta  # noqa: F401
    from app.models.knowledge import KnowledgeEdge  # noqa: F401
    from app.models.experiment import ExperimentEvent  # noqa: F401

    Base.metadata.create_all(bind=engine)
    with engine.connect() as conn:
        if settings.DB_PATH.startswith("sqlite"):
            conn.execute(text("PRAGMA journal_mode=WAL"))
        for ddl in (
            "ALTER TABLE chat_messages ADD COLUMN model VARCHAR",
            "ALTER TABLE chat_messages ADD COLUMN parent_id INTEGER",
            "ALTER TABLE chat_messages ADD COLUMN branch_id VARCHAR(64) DEFAULT 'main'",
        ):
            try:
                conn.execute(text(ddl))
            except Exception:
                pass
        conn.commit()
