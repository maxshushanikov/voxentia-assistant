import shutil
from pathlib import Path

from fastapi import APIRouter, File, HTTPException, Request, UploadFile

from app.core.config import settings
from app.core.rate_limit import limiter
from app.schemas.documents import (
    DocumentListResponse,
    DocumentSearchResponse,
    DocumentSummary,
    DocumentUploadResponse,
)
from app.services import rag_service

router = APIRouter()


@router.post("/upload", response_model=DocumentUploadResponse)
@limiter.limit("20/minute")
async def upload_document(request: Request, file: UploadFile = File(...)):
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")

    dest: Path = settings.UPLOADS_DIR / file.filename
    with dest.open("wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    result = await rag_service.process_document(str(dest), file.filename)
    if result.get("error"):
        raise HTTPException(status_code=422, detail=result["error"])

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
