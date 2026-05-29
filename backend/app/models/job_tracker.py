from datetime import datetime
from app.core.database import Base
from sqlalchemy import Column, DateTime, Integer, String
from sqlalchemy.sql import func


class JobApplication(Base):
    __tablename__ = "job_applications"

    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(String(128), nullable=False)
    title = Column(String(128), nullable=False)
    company = Column(String(128), nullable=False)
    location = Column(String(128), nullable=False)
    status = Column(String(32), nullable=False, default="applied")  # applied, interviewing, offer, rejected
    matching_score = Column(Integer, nullable=True)
    applied_date = Column(DateTime(timezone=True), server_default=func.now())

    def to_dict(self):
        return {
            "id": self.id,
            "job_id": self.job_id,
            "title": self.title,
            "company": self.company,
            "location": self.location,
            "status": self.status,
            "matching_score": self.matching_score,
            "applied_date": self.applied_date.isoformat() if self.applied_date else None,
        }
