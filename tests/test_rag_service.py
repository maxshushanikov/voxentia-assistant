from app.services import rag_service


def test_split_text_produces_chunks():
    text = "a" * 1200
    chunks = rag_service.split_text(text, chunk_size=500, overlap=50)
    assert len(chunks) >= 2
    assert all(len(c) <= 500 for c in chunks)


def test_extract_text_from_empty_pdf(tmp_path):
    # Non-PDF file should not crash
    path = tmp_path / "empty.txt"
    path.write_text("hello", encoding="utf-8")
    result = rag_service.extract_text_from_pdf(str(path))
    assert result == ""
