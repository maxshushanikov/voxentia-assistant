from app.core.config import settings
from app.core.database import Base
from app.core.field_encryption import EncryptedText
from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.sql import func


def _content_column():
    key = None
    if settings.ENCRYPTION_KEY:
        key = settings.ENCRYPTION_KEY.encode() if isinstance(settings.ENCRYPTION_KEY, str) else settings.ENCRYPTION_KEY
    if settings.ENCRYPTION_ENABLED and key:
        return Column(EncryptedText(key, enabled=True), nullable=False)
    return Column(Text, nullable=False)


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String(128), index=True, nullable=False)
    role = Column(String, nullable=False)  # user | assistant
    content = _content_column()
    model = Column(String, nullable=True)
    parent_id = Column(Integer, ForeignKey("chat_messages.id"), nullable=True, index=True)
    branch_id = Column(String(64), index=True, nullable=False, default="main")
    feedback = Column(String(16), nullable=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())

    def to_dict(self):
        return {
            "id": self.id,
            "session_id": self.session_id,
            "role": self.role,
            "content": self.content,
            "model": self.model,
            "parent_id": self.parent_id,
            "branch_id": self.branch_id,
            "feedback": self.feedback,
            "timestamp": self.timestamp.isoformat(),
        }
