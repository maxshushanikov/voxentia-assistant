from pathlib import Path

from app.core.database import get_db
from app.schemas.print import PrintJobRequest, PrintJobResponse, PrintRequest
from app.services.print_queue_service import PrintQueueService
from app.services.print_service import render_html_as_pdf
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse, Response
from sqlalchemy.orm import Session

router = APIRouter()
service = PrintQueueService()


@router.post("/html-to-pdf")
async def html_to_pdf(request: PrintRequest):
    try:
        pdf_bytes = render_html_as_pdf(request.html, title=request.title)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to render PDF: {exc}")
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=\"{request.title}.pdf\""},
    )


@router.post("/queue", response_model=PrintJobResponse)
async def create_print_job(request: PrintJobRequest, db: Session = Depends(get_db)):
    try:
        job = service.enqueue(db, request.html, request.title)
        return PrintJobResponse(**job.to_dict())
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to enqueue print job: {exc}")


@router.get("/queue", response_model=list[PrintJobResponse])
async def list_print_jobs(db: Session = Depends(get_db)):
    jobs = service.list_jobs(db)
    return [PrintJobResponse(**job.to_dict()) for job in jobs]


@router.get("/queue/{job_id}", response_model=PrintJobResponse)
async def get_print_job(job_id: int, db: Session = Depends(get_db)):
    job = service.get_job(db, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Print job not found")
    return PrintJobResponse(**job.to_dict())


@router.get("/queue/{job_id}/download")
async def download_print_job(job_id: int, db: Session = Depends(get_db)):
    job = service.get_job(db, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Print job not found")
    if job.status != "completed" or not job.output_path:
        raise HTTPException(status_code=400, detail="Print job is not ready for download")

    output_path = Path(job.output_path)
    if not output_path.exists():
        raise HTTPException(status_code=404, detail="Generated PDF not found")

    return FileResponse(
        path=str(output_path),
        media_type="application/pdf",
        filename=f"{job.title}.pdf",
    )
