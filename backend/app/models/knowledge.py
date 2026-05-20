from uuid import uuid4

from app.core.database import Base
from sqlalchemy import Column, DateTime, Float, Integer, String
from sqlalchemy.sql import func


class KnowledgeEdge(Base):
    __tablename__ = "knowledge_edges"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid4()))
    session_id = Column(String(128), index=True, nullable=False)
    subject = Column(String(256), index=True, nullable=False)
    relation = Column(String(128), nullable=False)
    obj = Column(String(256), index=True, nullable=False)
    confidence = Column(Float, default=0.8)
    source_msg = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
