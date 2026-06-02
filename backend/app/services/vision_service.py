import io
import re
from typing import Any, List

from PIL import Image

try:
    import pytesseract
except ImportError:  # pragma: no cover
    pytesseract = None

try:
    from pdf2image import convert_from_path
except ImportError:  # pragma: no cover
    convert_from_path = None


def extract_image_metadata(image_bytes: bytes) -> dict[str, Any]:
    with Image.open(io.BytesIO(image_bytes)) as image:
        return {
            "format": image.format,
            "mode": image.mode,
            "width": image.width,
            "height": image.height,
        }


def perform_ocr(image_bytes: bytes) -> str:
    if pytesseract is None:
        raise RuntimeError("OCR dependencies not installed")
    with Image.open(io.BytesIO(image_bytes)) as image:
        return pytesseract.image_to_string(image).strip()


def perform_pdf_ocr(filepath: str) -> str:
    if pytesseract is None or convert_from_path is None:
        raise RuntimeError("PDF OCR dependencies not installed")

    pages = convert_from_path(filepath, dpi=300)
    ocr_text = []
    for page in pages:
        ocr_text.append(pytesseract.image_to_string(page).strip())
    return "\n".join([page_text for page_text in ocr_text if page_text])


def extract_tables_from_text(text: str) -> List[List[str]]:
    rows = []
    for line in text.splitlines():
        if "|" in line and re.search(r"\|.*\|", line):
            cells = [cell.strip() for cell in line.split("|") if cell.strip()]
            if len(cells) > 1:
                rows.append(cells)
    return rows


def extract_invoice_fields(text: str) -> dict[str, str]:
    result = {}
    patterns = {
        "invoice_number": r"(?:Rechnungsnummer|Invoice\s*Nr\.?|Rechnung\s*Nr\.|Invoice\s*Number)[:\s]*([A-Za-z0-9\-_/]+)",
        "date": r"(?:Datum|Date|Rechnungsdatum)[:\s]*([0-3]?\d[\.\-/][01]?\d[\.\-/](?:\d{2,4}))",
        "total": r"(?:Gesamtbetrag|Betrag|Total)[:\s]*([0-9]+[\.,]?[0-9]{0,2})",
        "due_date": r"(?:Fällig|Zahlbar bis)[:\s]*([0-3]?\d[\.\-/][01]?\d[\.\-/](?:\d{2,4}))",
    }
    for key, pattern in patterns.items():
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            result[key] = match.group(1).strip()
    return result


def extract_contract_summary(text: str) -> str:
    summary_lines = []
    keywords = ["Vertrag", "Vereinbarung", "Parteien", "Laufzeit", "Kündigung", "Leistung", "Zahlung"]
    for sentence in re.split(r"(?<=[\.!?])\s+", text):
        if any(keyword.lower() in sentence.lower() for keyword in keywords):
            summary_lines.append(sentence.strip())
            if len(summary_lines) >= 4:
                break
    return " ".join(summary_lines).strip()
