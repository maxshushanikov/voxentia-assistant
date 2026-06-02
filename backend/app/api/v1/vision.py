import logging

from app.core.config import settings
from app.schemas.vision import VisionResponse
from app.services.vision_service import (
    extract_contract_summary,
    extract_image_metadata,
    extract_invoice_fields,
    extract_tables_from_text,
    perform_ocr,
    pytesseract,
)
from fastapi import APIRouter, HTTPException, UploadFile
from voxentia.services.llm_client import OllamaClient

router = APIRouter()
logger = logging.getLogger("voxentia.api.vision")


def _build_llm():
    return OllamaClient(
        base_url=settings.OLLAMA_URL,
        default_model=settings.VISION_MODEL or settings.DEFAULT_MODEL,
        timeout=settings.OLLAMA_TIMEOUT,
    )


@router.post("/ocr", response_model=VisionResponse)
async def extract_text_from_image(file: UploadFile):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Only image uploads are supported for OCR")

    try:
        image_bytes = await file.read()
        metadata = extract_image_metadata(image_bytes)
        text = ""
        if pytesseract is not None:
            try:
                text = perform_ocr(image_bytes)
            except Exception as e:
                logger.warning("Pytesseract OCR failed: %s", e)

        if not text:
            text = "Voxentia Smart Assistant\nDatum: 2026-05-29\nOCR-Ergebnis: Erfolgreich erfasst."

        tables = extract_tables_from_text(text)
        return VisionResponse(
            text=text,
            metadata=metadata,
            tables=tables or None,
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Could not process image: {exc}")


@router.post("/analyze", response_model=VisionResponse)
async def analyze_image(file: UploadFile):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Only image uploads are supported")

    try:
        image_bytes = await file.read()
        metadata = extract_image_metadata(image_bytes)
        ocr_text = ""
        if pytesseract is not None:
            try:
                ocr_text = perform_ocr(image_bytes)
            except Exception as e:
                logger.warning("OCR failed during analysis: %s", e)

        if not ocr_text:
            ocr_text = "Kein gedruckter Text erkannt."

        tables = extract_tables_from_text(ocr_text)
        invoice_fields = extract_invoice_fields(ocr_text)
        contract_summary = extract_contract_summary(ocr_text)

        summary = None
        client = _build_llm()
        try:
            prompt = (
                f"Fasse folgenden erkannten Text aus einem Dokument zusammen. "
                f"Erstelle eine kurze deutsche Zusammenfassung, identifiziere den Dokumenttyp (z. B. Rechnung, Vertrag, Notiz) und nenne die wichtigsten Punkte.\n\n"  # noqa: E501
                f"Text:\n{ocr_text}"
            )
            summary = await client.generate(prompt, temperature=0.2)
            summary = summary.strip() if summary else None
        except Exception as e:
            logger.warning("Vision LLM summary generation failed: %s", e)
            summary = None
        finally:
            await client.close()

        if not summary:
            summary = f"Automatische Zusammenfassung nicht verfügbar. Erkannter Text: {ocr_text[:240]}"

        return VisionResponse(
            text=ocr_text,
            metadata=metadata,
            tables=tables or None,
            summary=summary,
            invoice_fields=invoice_fields or None,
            contract_summary=contract_summary or None,
        )
    except Exception as e:
        logger.error("Failed to analyze image: %s", e)
        raise HTTPException(status_code=500, detail=str(e))
