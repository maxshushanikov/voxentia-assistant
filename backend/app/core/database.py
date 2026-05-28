import logging

from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import declarative_base, sessionmaker

from .config import settings

logger = logging.getLogger("voxentia.db")

Base = declarative_base()

_SCHEMA_INIT_LOCK_ID = 73458291

connect_args = {}
if settings.DB_PATH.startswith("sqlite"):
    connect_args["check_same_thread"] = False

engine = create_engine(
    settings.DB_PATH,
    connect_args=connect_args,
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


def _is_postgres() -> bool:
    return engine.dialect.name == "postgresql"


def _init_db_postgres() -> None:
    with engine.connect() as conn:
        conn.execute(text("SELECT pg_advisory_lock(:lock_id)"), {"lock_id": _SCHEMA_INIT_LOCK_ID})
        try:
            Base.metadata.create_all(bind=conn)
            conn.commit()
        finally:
            conn.execute(
                text("SELECT pg_advisory_unlock(:lock_id)"),
                {"lock_id": _SCHEMA_INIT_LOCK_ID},
            )
            conn.commit()


def _init_db_sqlite() -> None:
    Base.metadata.create_all(bind=engine)
    with engine.connect() as conn:
        conn.execute(text("PRAGMA journal_mode=WAL"))
        conn.commit()


def init_db():
    from app.models.chat import ChatMessage  # noqa: F401
    from app.models.experiment import ExperimentEvent  # noqa: F401
    from app.models.knowledge import KnowledgeEdge  # noqa: F401
    from app.models.memory import UserMemory  # noqa: F401
    from app.models.sentiment import SentimentRecord  # noqa: F401
    from app.models.session import ChatSessionMeta  # noqa: F401

    if _is_postgres():
        _init_db_postgres()
    else:
        _init_db_sqlite()

    logger.debug("Database schema ready (%s)", engine.dialect.name)
