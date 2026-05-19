from typing import List, Optional

from pydantic import BaseModel


class DocumentSummary(BaseModel):
    filename: str
    chunks: int


class DocumentListResponse(BaseModel):
    documents: List[DocumentSummary]


class DocumentUploadResponse(BaseModel):
    message: Optional[str] = None
    chunks: Optional[int] = None
    error: Optional[str] = None


class DocumentSearchResponse(BaseModel):
    context: str
