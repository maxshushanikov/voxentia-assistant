import logging

from sqlalchemy import create_engine, event, inspect, text
from sqlalchemy.orm import declarative_base, sessionmaker

from .config import settings

logger = logging.getLogger("voxentia.db")

Base = declarative_base()

_SCHEMA_INIT_LOCK_ID = 73458291

_CHAT_MESSAGE_COLUMNS: tuple[tuple[str, str], ...] = (
    ("model", "VARCHAR"),
    ("parent_id", "INTEGER"),
    ("branch_id", "VARCHAR(64) DEFAULT 'main'"),
    ("feedback", "VARCHAR(16)"),
)

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


def _column_exists(conn, table: str, column: str) -> bool:
    if _is_postgres():
        row = conn.execute(
            text(
                "SELECT 1 FROM information_schema.columns "
                "WHERE table_schema = 'public' AND table_name = :table "
                "AND column_name = :column"
            ),
            {"table": table, "column": column},
        ).fetchone()
        return row is not None

    insp = inspect(conn)
    return column in {col["name"] for col in insp.get_columns(table)}


def _apply_chat_message_migrations(conn) -> None:
    table = "chat_messages"
    for column, col_type in _CHAT_MESSAGE_COLUMNS:
        if _column_exists(conn, table, column):
            continue
        conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} {col_type}"))

    if not _column_exists(conn, "user_memory", "user_id"):
        conn.execute(text("ALTER TABLE user_memory ADD COLUMN user_id VARCHAR(128)"))
        if _is_postgres():
            conn.execute(
                text(
                    "CREATE INDEX IF NOT EXISTS ix_user_memory_user_id "
                    "ON user_memory (user_id)"
                )
            )


def _init_db_postgres() -> None:
    with engine.connect() as conn:
        conn.execute(text("SELECT pg_advisory_lock(:lock_id)"), {"lock_id": _SCHEMA_INIT_LOCK_ID})
        try:
            Base.metadata.create_all(bind=conn)
            _apply_chat_message_migrations(conn)
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
        _apply_chat_message_migrations(conn)
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
