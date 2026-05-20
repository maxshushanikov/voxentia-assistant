from app.core.database import Base
from sqlalchemy import Column, DateTime, String
from sqlalchemy.sql import func


class ChatSessionMeta(Base):
    __tablename__ = "chat_sessions"

    session_id = Column(String(128), primary_key=True)
    title = Column(String(128), nullable=False, default="")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
