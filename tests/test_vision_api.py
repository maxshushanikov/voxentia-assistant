import io

from app.main import app
from fastapi.testclient import TestClient
from PIL import Image

client = TestClient(app)


def create_sample_png_bytes() -> bytes:
    buf = io.BytesIO()
    image = Image.new("RGB", (10, 10), color=(255, 255, 255))
    image.save(buf, format="PNG")
    return buf.getvalue()


def test_vision_ocr_endpoint():
    image_bytes = create_sample_png_bytes()
    response = client.post(
        "/api/v1/vision/ocr",
        files={"file": ("sample.png", image_bytes, "image/png")},
    )
    assert response.status_code == 200
    data = response.json()
    assert "text" in data
    assert data["text"]
    assert data["metadata"]["format"] == "PNG"


def test_vision_analyze_endpoint():
    image_bytes = create_sample_png_bytes()
    response = client.post(
        "/api/v1/vision/analyze",
        files={"file": ("sample.png", image_bytes, "image/png")},
    )
    assert response.status_code == 200
    data = response.json()
    assert "text" in data
    assert "summary" in data
    assert data["summary"] is not None
