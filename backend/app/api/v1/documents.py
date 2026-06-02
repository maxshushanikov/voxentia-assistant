import tempfile
from pathlib import Path

from app.core.config import settings
from app.core.rate_limit import limiter
from app.schemas.documents import (
    DocumentAnalysisResponse,
    DocumentListResponse,
    DocumentSearchResponse,
    DocumentSummary,
    DocumentUploadResponse,
)
from app.services import rag_service
from app.services.document_service import DocumentService
from fastapi import APIRouter, File, HTTPException, Request, UploadFile
from pydantic import BaseModel, HttpUrl

analysis_service = DocumentService()

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


@router.get("/{filename}/summary", response_model=DocumentAnalysisResponse)
@limiter.limit("10/minute")
async def summarize_document(request: Request, filename: str):
    filepath = rag_service.find_upload_path(filename)
    if not filepath:
        raise HTTPException(status_code=404, detail="Document not found")
    try:
        result = await analysis_service.summarize_document(filepath, filename)
        return DocumentAnalysisResponse(
            filename=result["filename"],
            summary=result["summary"],
            key_points=result.get("key_points", []),
            metadata={"source": filename},
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to summarize document: {exc}")


@router.post("/analyze", response_model=DocumentAnalysisResponse)
@limiter.limit("10/minute")
async def analyze_document(request: Request, file: UploadFile = File(...)):
    if not file.filename or not file.filename.lower().endswith(SUPPORTED_EXTENSIONS):
        raise HTTPException(
            status_code=400,
            detail={
                "error_code": "invalid_file_type",
                "message": "Only PDF, DOCX, TXT, MD, JSON, and CSV files are supported.",
                "details": {},
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

    with tempfile.NamedTemporaryFile(suffix=Path(original_name).suffix, delete=False) as temp_file:
        temp_file.write(content)
        temp_name = temp_file.name

    try:
        result = await analysis_service.analyze_document(temp_name, original_name)
        return DocumentAnalysisResponse(
            filename=result["filename"],
            summary=result["summary"],
            key_points=result.get("key_points", []),
            document_type=result.get("document_type"),
            tables=result.get("tables"),
            invoice_fields=result.get("invoice_fields"),
            contract_summary=result.get("contract_summary"),
            metadata={"source": "uploaded_document"},
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to analyze document: {exc}")
    finally:
        Path(temp_name).unlink(missing_ok=True)


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


@router.post("/{filename}/reindex", response_model=DocumentUploadResponse)
@limiter.limit("10/minute")
async def reindex_document(request: Request, filename: str):
    result = await rag_service.reindex_document(filename)
    if result.get("error"):
        raise HTTPException(
            status_code=422,
            detail={
                "error_code": "document_reindex_failed",
                "message": result["error"],
                "details": {},
            },
        )
    return DocumentUploadResponse(
        message=result.get("message"),
        chunks=result.get("chunks"),
    )


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
