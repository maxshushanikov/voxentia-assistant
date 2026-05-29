from app.schemas.print import PrintRequest
from app.services.print_service import render_html_as_pdf
from fastapi import APIRouter, HTTPException
from fastapi.responses import Response

router = APIRouter()

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
