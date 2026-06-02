from typing import Any, List, Optional

from pydantic import BaseModel, Field


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


class ExamRequest(BaseModel):
    topic: str
    difficulty: Optional[str] = Field("medium", pattern="^(easy|medium|hard)$")


class ExamQuestion(BaseModel):
    question: str
    answer: str
    explanation: Optional[str] = None


class ExamResponse(BaseModel):
    questions: List[ExamQuestion]


class SpeakingExerciseRequest(BaseModel):
    topic: str
    language: Optional[str] = Field("Deutsch", max_length=32)
    level: Optional[str] = Field("intermediate", pattern="^(beginner|intermediate|advanced)$")


class SpeakingExerciseResponse(BaseModel):
    prompt: str
    practice_text: str


class FlashcardItem(BaseModel):
    front: str
    back: str


class FlashcardResponse(BaseModel):
    id: int
    topic: str
    cards: List[FlashcardItem]


class VocabularyItem(BaseModel):
    term: str
    definition: str
    example: Optional[str] = None


class VocabularyResponse(BaseModel):
    topic: str
    words: List[VocabularyItem]


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
