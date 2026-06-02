from app.core.database import Base
from sqlalchemy import Column, DateTime, Integer, String, Text
from sqlalchemy.sql import func


class PrintJob(Base):
    __tablename__ = "print_jobs"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(256), nullable=False)
    status = Column(String(32), nullable=False, default="pending")
    output_path = Column(String(512), nullable=True)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "status": self.status,
            "output_path": self.output_path,
            "error_message": self.error_message,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
