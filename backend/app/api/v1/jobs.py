import io
import logging
from typing import Optional

from app.core.database import get_db
from app.models.job_tracker import JobApplication
from app.schemas.jobs import (
    CVAnalyzeResponse,
    InterviewSimulationResponse,
    JobListing,
    JobSearchResponse,
)
from app.services.job_search_service import JobSearchService
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from pydantic import BaseModel, Field
from pypdf import PdfReader
from sqlalchemy.orm import Session

router = APIRouter()
service = JobSearchService()
logger = logging.getLogger("voxentia.api.jobs")

# Thread-safe in-memory storage of the current user's CV text
_USER_CV_CACHE = {"text": ""}


class InterviewRequest(BaseModel):
    job_title: str
    company: str
    summary: str
    rounds: Optional[int] = Field(3, ge=1, le=5)
    cv_text: Optional[str] = None


class CVAnalyzeRequest(BaseModel):
    cv_text: Optional[str] = None


@router.get("/search", response_model=JobSearchResponse)
async def search_jobs(
    query: str = Query(..., min_length=1),
    location: str | None = Query(None, max_length=128),
    portal: str = Query("All", pattern="^(All|Stepstone|LinkedIn|Indeed)$"),
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
):
    _ = db
    results = service.search_jobs(query=query, location=location, portal=portal, limit=limit)

    # If a CV is already uploaded, calculate matching score for each job listing!
    jobs_list = []
    cv_text = _USER_CV_CACHE.get("text", "")
    for job in results:
        job_dict = job.dict()
        if cv_text:
            score = await service.calculate_matching_score(cv_text, job)
            job_dict["matching_score"] = score
        else:
            job_dict["matching_score"] = None
        jobs_list.append(job_dict)

    return {"jobs": jobs_list}


@router.post("/cv/upload")
async def upload_cv(file: UploadFile = File(...)):
    try:
        text = ""
        filename = file.filename.lower()
        if filename.endswith(".pdf"):
            file_bytes = await file.read()
            reader = PdfReader(io.BytesIO(file_bytes))
            for page in reader.pages:
                text += page.extract_text() or ""
        elif filename.endswith(".txt"):
            content = await file.read()
            text = content.decode("utf-8")
        else:
            raise HTTPException(status_code=400, detail="Only PDF and TXT files are supported for CV upload.")

        if len(text.strip()) < 50:
            raise ValueError("CV does not contain enough readable text.")

        _USER_CV_CACHE["text"] = text.strip()
        logger.info("CV uploaded successfully and parsed (%d characters)", len(text))
        return {"message": "Lebenslauf erfolgreich hochgeladen und analysiert!", "characters": len(text)}
    except Exception as e:
        logger.error("Failed to parse CV: %s", e)
        raise HTTPException(status_code=500, detail=f"Failed to process CV: {str(e)}")


@router.post("/cv/analyze", response_model=CVAnalyzeResponse)
async def analyze_cv(request: CVAnalyzeRequest):
    cv_text = request.cv_text or _USER_CV_CACHE.get("text", "")
    if not cv_text or len(cv_text.strip()) < 50:
        raise HTTPException(status_code=400, detail="Bitte lade einen Lebenslauf hoch oder sende den Text im Body.")

    try:
        result = await service.analyze_cv(cv_text)
        return CVAnalyzeResponse(
            summary=result["summary"],
            strengths=result["strengths"],
            areas_for_improvement=result["areas_for_improvement"],
            advice=result["advice"],
        )
    except Exception as e:
        logger.error("Failed to analyze CV: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{job_id}/interview-simulation", response_model=InterviewSimulationResponse)
async def interview_simulation(job_id: str, request: InterviewRequest):
    cv_text = request.cv_text or _USER_CV_CACHE.get("text", "")
    job = JobListing(
        id=job_id,
        title=request.job_title,
        company=request.company,
        location="Unbekannt",
        summary=request.summary,
        url="",
    )
    try:
        questions = await service.simulate_interview(job, cv_text=cv_text, rounds=request.rounds or 3)
        return InterviewSimulationResponse(
            job_id=job.id,
            job_title=job.title,
            company=job.company,
            questions=[
                {
                    "question": q["question"],
                    "model_answer": q["model_answer"],
                    "tips": q.get("tips"),
                }
                for q in questions
            ],
        )
    except Exception as e:
        logger.error("Failed to simulate interview: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{job_id}/matching")
async def get_job_matching_score(job_id: str, job_title: str, job_company: str, job_summary: str):
    cv_text = _USER_CV_CACHE.get("text", "")
    if not cv_text:
        return {"matching_score": None, "message": "Bitte lade zuerst einen Lebenslauf hoch."}

    job = JobListing(id=job_id, title=job_title, company=job_company, location="Simulated", summary=job_summary, url="")
    score = await service.calculate_matching_score(cv_text, job)
    return {"matching_score": score}


@router.post("/{job_id}/cover-letter")
async def generate_job_cover_letter(job_id: str, job_title: str, job_company: str, job_summary: str):
    cv_text = _USER_CV_CACHE.get("text", "")
    if not cv_text:
        raise HTTPException(status_code=400, detail="Bitte lade zuerst deinen Lebenslauf hoch, um ein Anschreiben zu generieren.")

    job = JobListing(id=job_id, title=job_title, company=job_company, location="Simulated", summary=job_summary, url="")
    cover_letter = await service.generate_cover_letter(cv_text, job)
    return {"cover_letter": cover_letter}


@router.get("/applications")
async def get_tracked_applications(db: Session = Depends(get_db)):
    apps = db.query(JobApplication).order_by(JobApplication.applied_date.desc()).all()
    return [app.to_dict() for app in apps]


@router.post("/applications")
async def track_new_application(
    job_id: str,
    title: str,
    company: str,
    location: str,
    status: str = "applied",
    matching_score: Optional[int] = None,
    db: Session = Depends(get_db)
):
    # Check if already tracked
    existing = db.query(JobApplication).filter(JobApplication.job_id == job_id).first()
    if existing:
        existing.status = status
        db.commit()
        db.refresh(existing)
        return existing.to_dict()

    app = JobApplication(
        job_id=job_id,
        title=title,
        company=company,
        location=location,
        status=status,
        matching_score=matching_score,
    )
    db.add(app)
    db.commit()
    db.refresh(app)
    return app.to_dict()


@router.put("/applications/{app_id}/status")
async def update_application_status(app_id: int, status: str, db: Session = Depends(get_db)):
    app = db.query(JobApplication).filter(JobApplication.id == app_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    if status not in ("applied", "interviewing", "offer", "rejected"):
        raise HTTPException(status_code=400, detail="Invalid application status")

    app.status = status
    db.commit()
    db.refresh(app)
    return app.to_dict()
