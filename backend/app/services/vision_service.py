import io
from typing import Any

from PIL import Image

try:
    import pytesseract
except ImportError:  # pragma: no cover
    pytesseract = None


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
