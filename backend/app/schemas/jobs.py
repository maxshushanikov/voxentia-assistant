from typing import List, Optional

from pydantic import BaseModel


class JobListing(BaseModel):
    id: str
    title: str
    company: str
    location: str
    summary: str
    url: str
    matching_score: Optional[int] = None


class JobSearchResponse(BaseModel):
    jobs: List[JobListing]


class CVAnalyzeResponse(BaseModel):
    summary: str
    strengths: List[str]
    areas_for_improvement: List[str]
    advice: str


class InterviewQuestion(BaseModel):
    question: str
    model_answer: str
    tips: Optional[str] = None


class InterviewSimulationResponse(BaseModel):
    job_id: str
    job_title: str
    company: str
    questions: List[InterviewQuestion]
