from app.core.database import Base
from sqlalchemy import Column, DateTime, String, Text
from sqlalchemy.sql import func


class UserMemory(Base):
    __tablename__ = "user_memory"

    id = Column(String(36), primary_key=True)
    session_id = Column(String(128), index=True, nullable=False)
    fact_key = Column(String(256), nullable=False)
    fact_value = Column(Text, nullable=False)
    source = Column(String(64), default="extracted")
    confidence = Column(String(8), default="medium")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True), nullable=True)
