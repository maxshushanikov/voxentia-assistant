import logging
from typing import Any

from app.core.config import settings
from app.services.rag_service import (
    extract_text_from_docx,
    extract_text_from_pdf,
    extract_text_from_plain,
)
from app.services.vision_service import (
    extract_contract_summary,
    extract_invoice_fields,
    extract_tables_from_text,
    perform_pdf_ocr,
)
from voxentia.services.llm_client import OllamaClient

logger = logging.getLogger(__name__)


class DocumentService:
    def __init__(self, llm_client: OllamaClient | None = None) -> None:
        self.llm = llm_client or OllamaClient(
            base_url=settings.OLLAMA_URL,
            default_model=settings.DEFAULT_MODEL,
            timeout=settings.OLLAMA_TIMEOUT,
        )

    def _extract_document_text(self, filepath: str, filename: str) -> str:
        ext = filename.lower()
        if ext.endswith(".pdf"):
            text = extract_text_from_pdf(filepath)
            if not text or len(text.strip()) < 50:
                try:
                    text = perform_pdf_ocr(filepath)
                except RuntimeError:
                    pass
        elif ext.endswith(".docx"):
            text = extract_text_from_docx(filepath)
        else:
            text = extract_text_from_plain(filepath)

        return text.strip() if text else ""

    def _detect_document_type(self, text: str) -> str:
        lowered = text.lower()
        if "rechnung" in lowered or "invoice" in lowered:
            return "invoice"
        if "vertrag" in lowered or "vereinbarung" in lowered:
            return "contract"
        if "bericht" in lowered or "report" in lowered:
            return "report"
        if "notiz" in lowered or "memo" in lowered or "note" in lowered:
            return "note"
        return "document"

    async def analyze_document(self, filepath: str, filename: str) -> dict[str, Any]:
        text = self._extract_document_text(filepath, filename)
        if not text or len(text.strip()) < 50:
            raise RuntimeError("Could not extract sufficient text from the document.")

        document_type = self._detect_document_type(text)
        summary_prompt = (
            "Erstelle eine prägnante deutsche Zusammenfassung des folgenden Dokuments. "
            "Benenne den Dokumenttyp (z. B. Rechnung, Vertrag, Bericht) und liste die wichtigsten Erkenntnisse "
            "als kurze Stichpunkte auf.\n\nText:\n" + text[:5000]
        )
        keypoints_prompt = (
            "Extrahiere aus dem folgenden Text bis zu 5 zentrale Stichpunkte als JSON-Liste unter dem Schlüssel "
            "\"key_points\". Gib nur gültiges JSON ohne Erklärung zurück.\n\nText:\n" + text[:5000]
        )

        summary = None
        key_points = []
        tables = []
        invoice_fields = {}
        contract_summary = ""

        try:
            summary = await self.llm.generate(summary_prompt, temperature=0.2)
        except Exception as exc:
            logger.warning("Document summary generation failed: %s", exc)

        try:
            response = await self.llm.generate_json(keypoints_prompt, temperature=0.1)
            if isinstance(response, dict) and isinstance(response.get("key_points"), list):
                key_points = [str(item).strip() for item in response["key_points"] if str(item).strip()]
        except Exception as exc:
            logger.warning("Document key point extraction failed: %s", exc)

        try:
            tables = extract_tables_from_text(text)
            invoice_fields = extract_invoice_fields(text)
            contract_summary = extract_contract_summary(text)
        except Exception as exc:
            logger.warning("Document structure extraction failed: %s", exc)

        return {
            "filename": filename,
            "summary": summary.strip() if summary else text.strip()[:300],
            "key_points": key_points,
            "document_type": document_type,
            "tables": tables or None,
            "invoice_fields": invoice_fields or None,
            "contract_summary": contract_summary or None,
        }

    async def summarize_document(self, filepath: str, filename: str) -> dict[str, Any]:
        result = await self.analyze_document(filepath, filename)
        return {
            "filename": result["filename"],
            "summary": result["summary"],
            "key_points": result.get("key_points", []),
        }
