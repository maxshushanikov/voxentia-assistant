from app.core.database import Base
from sqlalchemy import Column, DateTime, Integer, String, Text
from sqlalchemy.sql import func


class Note(Base):
    __tablename__ = "notes"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String(128), index=True, nullable=True)
    title = Column(String(128), nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    def to_dict(self):
        return {
            "id": self.id,
            "session_id": self.session_id,
            "title": self.title,
            "content": self.content,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
