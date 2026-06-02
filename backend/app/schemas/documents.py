from typing import Any, List, Optional

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


class DocumentAnalysisResponse(BaseModel):
    filename: str
    summary: str
    key_points: List[str]
    document_type: Optional[str] = None
    tables: Optional[List[List[str]]] = None
    invoice_fields: Optional[dict[str, str]] = None
    contract_summary: Optional[str] = None
    metadata: Optional[dict[str, Any]] = None
