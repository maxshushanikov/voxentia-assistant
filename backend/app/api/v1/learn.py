import io
import json
import logging
from typing import List
from app.core.database import get_db
from app.models.learn import DailyGoal, FlashcardDeck, LearningHistory, LearningPlan
from app.schemas.learn import (
    DailyGoalCreate,
    DailyGoalResponse,
    FlashcardResponse,
    LearnStatsResponse,
    LearningPlanCreate,
    LearningPlanResponse,
    ModuleProgressUpdate,
    QuizRequest,
    QuizResponse,
    QuizVerifyRequest,
    QuizVerifyResponse,
)
from app.services.learn_service import LearnService
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from pypdf import PdfReader
from sqlalchemy.orm import Session

router = APIRouter()
service = LearnService()
logger = logging.getLogger("voxentia.api.learn")


@router.post("/plan", response_model=LearningPlanResponse)
async def create_learning_plan(request: LearningPlanCreate, db: Session = Depends(get_db)):
    try:
        modules = await service.generate_learning_plan(request.topic)
        plan = LearningPlan(
            topic=request.topic,
            modules=json.dumps(modules),
            progress=0,
        )
        db.add(plan)
        
        # Log to history
        history = LearningHistory(
            action_type="plan_created",
            topic=request.topic,
            score_details="Lernplan erfolgreich generiert",
        )
        db.add(history)
        
        db.commit()
        db.refresh(plan)
        return plan.to_dict()
    except Exception as e:
        db.rollback()
        logger.error("Failed to create learning plan: %s", e)
        raise HTTPException(status_code=500, detail=f"Failed to generate learning plan: {e}")


@router.get("/plans", response_model=List[LearningPlanResponse])
async def list_learning_plans(db: Session = Depends(get_db)):
    plans = db.query(LearningPlan).order_by(LearningPlan.created_at.desc()).all()
    return [plan.to_dict() for plan in plans]


@router.put("/plan/{plan_id}/progress", response_model=LearningPlanResponse)
async def update_module_progress(
    plan_id: int, request: ModuleProgressUpdate, db: Session = Depends(get_db)
):
    plan = db.query(LearningPlan).filter(LearningPlan.id == plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Learning plan not found")
    
    try:
        modules = request.modules
        completed_count = sum(1 for m in modules if m.get("completed", False))
        total_count = len(modules)
        progress = int((completed_count / total_count) * 100) if total_count > 0 else 0
        
        plan.modules = json.dumps(modules)
        plan.progress = progress
        db.commit()
        db.refresh(plan)
        return plan.to_dict()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/quiz/generate", response_model=QuizResponse)
async def generate_quiz(request: QuizRequest):
    questions = await service.generate_quiz(request.topic, request.module_title)
    return {"questions": questions}


@router.post("/quiz/verify", response_model=QuizVerifyResponse)
async def verify_quiz_answer(request: QuizVerifyRequest, db: Session = Depends(get_db)):
    is_correct = request.user_answer.strip().lower() == request.correct_answer.strip().lower()
    
    # Optional feedback generation prompt
    explanation = f"Das ist korrekt!" if is_correct else f"Leider nicht ganz. Die richtige Antwort ist: {request.correct_answer}."
    
    # Log to history
    try:
        history = LearningHistory(
            action_type="quiz_taken",
            topic=request.question[:128],
            score_details="Richtig" if is_correct else "Falsch",
        )
        db.add(history)
        db.commit()
    except Exception as e:
        db.rollback()
        logger.warning("Could not log quiz to history: %s", e)

    return {"correct": is_correct, "explanation": explanation}


@router.post("/flashcards/pdf", response_model=FlashcardResponse)
async def generate_flashcards_from_pdf(file: UploadFile = File(...), db: Session = Depends(get_db)):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF file uploads are supported.")
    
    try:
        file_bytes = await file.read()
        reader = PdfReader(io.BytesIO(file_bytes))
        text = ""
        for page in reader.pages[:10]:  # Limit to first 10 pages for speed/safety
            text += page.extract_text() or ""
            
        if len(text.strip()) < 50:
            raise ValueError("No extractable text found in PDF.")

        cards = await service.generate_flashcards_from_text(text)
        
        deck = FlashcardDeck(
            topic=file.filename[:64],
            cards=json.dumps(cards),
        )
        db.add(deck)
        
        # Log to history
        history = LearningHistory(
            action_type="deck_created",
            topic=file.filename[:64],
            score_details=f"{len(cards)} Karteikarten aus PDF extrahiert",
        )
        db.add(history)
        
        db.commit()
        db.refresh(deck)
        return deck.to_dict()
    except Exception as e:
        db.rollback()
        logger.error("Failed to extract cards from PDF: %s", e)
        raise HTTPException(status_code=500, detail=f"PDF extraction failed: {str(e)}")


@router.post("/flashcards/generate", response_model=FlashcardResponse)
async def generate_flashcards_by_topic(topic: str, db: Session = Depends(get_db)):
    try:
        cards = await service.generate_flashcards(topic)
        deck = FlashcardDeck(
            topic=topic,
            cards=json.dumps(cards),
        )
        db.add(deck)
        
        # Log to history
        history = LearningHistory(
            action_type="deck_created",
            topic=topic,
            score_details=f"{len(cards)} Karteikarten generiert",
        )
        db.add(history)
        
        db.commit()
        db.refresh(deck)
        return deck.to_dict()
    except Exception as e:
        db.rollback()
        logger.error("Failed to generate cards: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/flashcards", response_model=List[FlashcardResponse])
async def list_flashcard_decks(db: Session = Depends(get_db)):
    decks = db.query(FlashcardDeck).order_by(FlashcardDeck.created_at.desc()).all()
    return [deck.to_dict() for deck in decks]


@router.get("/stats", response_model=LearnStatsResponse)
async def get_learning_stats(db: Session = Depends(get_db)):
    goals = db.query(DailyGoal).all()
    history = db.query(LearningHistory).order_by(LearningHistory.timestamp.desc()).limit(15).all()
    
    # Calculate simple stats
    completed_plans = db.query(LearningPlan).filter(LearningPlan.progress == 100).count()
    total_quizzes = db.query(LearningHistory).filter(LearningHistory.action_type == "quiz_taken").count()
    correct_quizzes = db.query(LearningHistory).filter(
        LearningHistory.action_type == "quiz_taken",
        LearningHistory.score_details == "Richtig"
    ).count()
    
    accuracy = "100%"
    if total_quizzes > 0:
        accuracy = f"{int((correct_quizzes / total_quizzes) * 100)}%"

    # Words learned simulation (words = number of modules completed * 150)
    total_completed_modules = 0
    plans = db.query(LearningPlan).all()
    for p in plans:
        try:
            mods = json.loads(p.modules)
            total_completed_modules += sum(1 for m in mods if m.get("completed", False))
        except Exception:
            pass
            
    words_learned = 250 + (total_completed_modules * 120)
    simulations = total_quizzes + completed_plans
    
    # Initialize some default goals if empty
    if len(goals) == 0:
        default_goals = [
            DailyGoal(description="Erstelle einen neuen Lernplan", completed=False),
            DailyGoal(description="Löse ein Quiz fehlerfrei", completed=False),
            DailyGoal(description="Lerne 5 neue Karteikarten", completed=False),
        ]
        db.add_all(default_goals)
        db.commit()
        goals = db.query(DailyGoal).all()

    return {
        "words_learned": words_learned,
        "simulations": simulations,
        "accuracy": accuracy,
        "streak": "5 Tage" if total_quizzes > 0 else "0 Tage",
        "daily_goals": [g.to_dict() for g in goals],
        "history": [h.to_dict() for h in history],
    }


@router.post("/goals", response_model=DailyGoalResponse)
async def create_daily_goal(request: DailyGoalCreate, db: Session = Depends(get_db)):
    goal = DailyGoal(description=request.description, completed=False)
    db.add(goal)
    db.commit()
    db.refresh(goal)
    return goal.to_dict()


@router.put("/goals/{goal_id}/toggle", response_model=DailyGoalResponse)
async def toggle_daily_goal(goal_id: int, db: Session = Depends(get_db)):
    goal = db.query(DailyGoal).filter(DailyGoal.id == goal_id).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Daily goal not found")
    goal.completed = not goal.completed
    db.commit()
    db.refresh(goal)
    return goal.to_dict()
