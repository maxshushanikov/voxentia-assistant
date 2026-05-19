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

    Base.metadata.create_all(bind=engine)
    with engine.connect() as conn:
        if settings.DB_PATH.startswith("sqlite"):
            conn.execute(text("PRAGMA journal_mode=WAL"))
        try:
            conn.execute(text("ALTER TABLE chat_messages ADD COLUMN model VARCHAR"))
        except Exception:
            pass
        conn.commit()
