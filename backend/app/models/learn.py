from datetime import datetime
import json
from app.core.database import Base
from sqlalchemy import Column, DateTime, Integer, String, Text, Boolean
from sqlalchemy.sql import func


class LearningPlan(Base):
    __tablename__ = "learning_plans"

    id = Column(Integer, primary_key=True, index=True)
    topic = Column(String(256), nullable=False)
    modules = Column(Text, nullable=False, default="[]")  # JSON serialized list of modules
    progress = Column(Integer, nullable=False, default=0)  # Completion percentage (0-100)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    def to_dict(self):
        try:
            modules_list = json.loads(self.modules)
        except Exception:
            modules_list = []
        return {
            "id": self.id,
            "topic": self.topic,
            "modules": modules_list,
            "progress": self.progress,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class FlashcardDeck(Base):
    __tablename__ = "flashcard_decks"

    id = Column(Integer, primary_key=True, index=True)
    topic = Column(String(256), nullable=False)
    cards = Column(Text, nullable=False, default="[]")  # JSON serialized list of cards (front, back)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    def to_dict(self):
        try:
            cards_list = json.loads(self.cards)
        except Exception:
            cards_list = []
        return {
            "id": self.id,
            "topic": self.topic,
            "cards": cards_list,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class DailyGoal(Base):
    __tablename__ = "daily_goals"

    id = Column(Integer, primary_key=True, index=True)
    description = Column(String(256), nullable=False)
    completed = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    def to_dict(self):
        return {
            "id": self.id,
            "description": self.description,
            "completed": self.completed,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class LearningHistory(Base):
    __tablename__ = "learning_history"

    id = Column(Integer, primary_key=True, index=True)
    action_type = Column(String(64), nullable=False)  # e.g., "plan_created", "quiz_taken", "deck_studied"
    topic = Column(String(256), nullable=False)
    score_details = Column(String(256), nullable=True)  # e.g., "Passed Quiz 4/5" or "Generated Plan"
    timestamp = Column(DateTime(timezone=True), server_default=func.now())

    def to_dict(self):
        return {
            "id": self.id,
            "action_type": self.action_type,
            "topic": self.topic,
            "score_details": self.score_details,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
        }
