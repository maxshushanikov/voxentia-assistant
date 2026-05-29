from typing import Any, List, Optional
from pydantic import BaseModel


class LearningPlanCreate(BaseModel):
    topic: str


class LearningPlanResponse(BaseModel):
    id: int
    topic: str
    modules: List[Any]
    progress: int

    class Config:
        from_attributes = True


class ModuleProgressUpdate(BaseModel):
    modules: List[Any]  # updated list of modules with completed states


class QuizQuestion(BaseModel):
    question: str
    options: List[str]
    correct_answer: str
    explanation: Optional[str] = None


class QuizRequest(BaseModel):
    topic: str
    module_title: str


class QuizResponse(BaseModel):
    questions: List[QuizQuestion]


class QuizVerifyRequest(BaseModel):
    question: str
    user_answer: str
    correct_answer: str


class QuizVerifyResponse(BaseModel):
    correct: bool
    explanation: str


class FlashcardItem(BaseModel):
    front: str
    back: str


class FlashcardResponse(BaseModel):
    id: int
    topic: str
    cards: List[FlashcardItem]


class DailyGoalCreate(BaseModel):
    description: str


class DailyGoalResponse(BaseModel):
    id: int
    description: str
    completed: bool


class DailyGoalUpdate(BaseModel):
    completed: bool


class LearningHistoryResponse(BaseModel):
    id: int
    action_type: str
    topic: str
    score_details: Optional[str]
    timestamp: str


class LearnStatsResponse(BaseModel):
    words_learned: int
    simulations: int
    accuracy: str
    streak: str
    daily_goals: List[DailyGoalResponse]
    history: List[LearningHistoryResponse]
