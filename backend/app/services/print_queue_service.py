import logging
from typing import Optional

from app.core.config import settings
from app.models.print_job import PrintJob
from app.services.print_service import render_html_as_pdf

logger = logging.getLogger(__name__)


class PrintQueueService:
    def __init__(self) -> None:
        self.output_dir = settings.UPLOADS_DIR / "print_jobs"
        self.output_dir.mkdir(parents=True, exist_ok=True)

    def _safe_filename(self, title: str) -> str:
        safe_title = "".join(c if c.isalnum() or c in ("-", "_") else "_" for c in title)
        return safe_title[:128] or "print_job"

    def enqueue(self, db, html: str, title: str) -> PrintJob:
        job = PrintJob(title=title[:256], status="pending")
        db.add(job)
        db.commit()
        db.refresh(job)

        filename = f"{job.id}_{self._safe_filename(title)}.pdf"
        output_path = self.output_dir / filename

        try:
            pdf_bytes = render_html_as_pdf(html, title=title)
            output_path.write_bytes(pdf_bytes)
            job.status = "completed"
            job.output_path = str(output_path)
            job.error_message = None
        except Exception as e:
            logger.error("Failed to render print job %s: %s", title, e)
            job.status = "failed"
            job.error_message = str(e)
        finally:
            db.add(job)
            db.commit()
            db.refresh(job)

        return job

    def get_job(self, db, job_id: int) -> Optional[PrintJob]:
        return db.query(PrintJob).filter(PrintJob.id == job_id).first()

    def list_jobs(self, db):
        return db.query(PrintJob).order_by(PrintJob.created_at.desc()).all()
