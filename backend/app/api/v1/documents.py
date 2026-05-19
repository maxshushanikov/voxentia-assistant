from pathlib import Path

from app.core.config import settings
from app.core.rate_limit import limiter
from app.schemas.documents import (
    DocumentListResponse,
    DocumentSearchResponse,
    DocumentSummary,
    DocumentUploadResponse,
)
from app.services import rag_service
from fastapi import APIRouter, File, HTTPException, Request, UploadFile
from pydantic import BaseModel, HttpUrl

router = APIRouter()

MAX_BYTES = settings.MAX_UPLOAD_BYTES
ALLOWED_MIMES = settings.allowed_upload_mimes
SUPPORTED_EXTENSIONS = (".pdf", ".docx", ".txt", ".md", ".json", ".csv")


class AddUrlRequest(BaseModel):
    url: HttpUrl


@router.post("/upload", response_model=DocumentUploadResponse)
@limiter.limit("20/minute")
async def upload_document(request: Request, file: UploadFile = File(...)):
    if not file.filename or not file.filename.lower().endswith(SUPPORTED_EXTENSIONS):
        raise HTTPException(
            status_code=400,
            detail={
                "error_code": "invalid_file_type",
                "message": "Only PDF, DOCX, TXT, MD, JSON, and CSV files are supported.",
                "details": {},
            },
        )

    if file.content_type and file.content_type not in ALLOWED_MIMES:
        raise HTTPException(
            status_code=400,
            detail={
                "error_code": "invalid_mime",
                "message": f"MIME type {file.content_type} not allowed.",
                "details": {"allowed": ALLOWED_MIMES},
            },
        )

    content = await file.read()
    if len(content) > MAX_BYTES:
        raise HTTPException(
            status_code=413,
            detail={
                "error_code": "file_too_large",
                "message": f"File exceeds {MAX_BYTES} bytes.",
                "details": {"max_bytes": MAX_BYTES},
            },
        )

    original_name = Path(file.filename).name
    if not original_name or original_name.startswith('.'):
        raise HTTPException(
            status_code=400,
            detail={
                "error_code": "invalid_filename",
                "message": "Invalid filename",
                "details": {},
            },
        )

    import uuid
    safe_name = f"{uuid.uuid4().hex}_{original_name}"
    dest: Path = settings.UPLOADS_DIR / safe_name
    dest.write_bytes(content)

    result = await rag_service.process_document(str(dest), safe_name)
    if result.get("error"):
        raise HTTPException(
            status_code=422,
            detail={
                "error_code": "document_processing_failed",
                "message": result["error"],
                "details": {},
            },
        )

    return DocumentUploadResponse(message=result.get("message"), chunks=result.get("chunks"))


@router.get("", response_model=DocumentListResponse)
@limiter.limit(settings.RATE_LIMIT)
async def list_documents(request: Request):
    docs = rag_service.list_documents()
    return DocumentListResponse(
        documents=[DocumentSummary(filename=d["filename"], chunks=d["chunks"]) for d in docs]
    )


@router.delete("/{filename}")
@limiter.limit("20/minute")
async def delete_document(request: Request, filename: str):
    removed = await rag_service.delete_document(filename)
    if removed == 0:
        raise HTTPException(status_code=404, detail="Document not found")
    return {"message": f"Removed {removed} chunks for {filename}"}


@router.get("/search", response_model=DocumentSearchResponse)
@limiter.limit(settings.RATE_LIMIT)
async def search_documents(request: Request, q: str):
    context = await rag_service.search_context(q)
    return DocumentSearchResponse(context=context)


@router.post("/url")
@limiter.limit("10/minute")
async def add_url(request: Request, body: AddUrlRequest):
    url_str = str(body.url)
    result = await rag_service.process_url(url_str)
    if result.get("error"):
        raise HTTPException(
            status_code=422,
            detail={
                "error_code": "url_processing_failed",
                "message": result["error"],
                "details": {},
            },
        )
    return {"message": result.get("message"), "chunks": result.get("chunks")}
