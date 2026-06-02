from app.services.print_service import render_html_as_pdf


def test_render_html_as_pdf_returns_pdf_bytes():
    html = "<h1>Hallo Welt</h1><p>Dies ist ein Test.</p>"
    pdf_bytes = render_html_as_pdf(html, title="TestDokument")

    assert isinstance(pdf_bytes, (bytes, bytearray))
    assert pdf_bytes.startswith(b"%PDF-1.4")
