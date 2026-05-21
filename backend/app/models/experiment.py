from uuid import uuid4

from app.core.database import Base
from sqlalchemy import Column, DateTime, Float, String
from sqlalchemy.sql import func


class ExperimentEvent(Base):
    __tablename__ = "experiment_events"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid4()))
    experiment_id = Column(String(64), index=True, nullable=False)
    variant = Column(String(32), nullable=False)
    session_id = Column(String(128), index=True, nullable=False)
    intent = Column(String(64), default="unknown")
    latency_ms = Column(Float, default=0.0)
    recorded_at = Column(DateTime(timezone=True), server_default=func.now())
