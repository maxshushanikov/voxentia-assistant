from uuid import uuid4

from app.core.database import Base
from sqlalchemy import Column, DateTime, Float, String
from sqlalchemy.sql import func


class SentimentRecord(Base):
    __tablename__ = "sentiment_history"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid4()))
    session_id = Column(String(128), index=True, nullable=False)
    score = Column(Float, nullable=False)
    label = Column(String(16), nullable=False)
    recorded_at = Column(DateTime(timezone=True), server_default=func.now())
