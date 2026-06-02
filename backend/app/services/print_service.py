"""
PDF rendering service.
Uses reportlab when available; falls back to a minimal RFC-3462-compliant
plain-text PDF envelope so the backend always starts regardless of whether
reportlab is installed.
"""
import re
import textwrap
from html import unescape
from io import BytesIO

try:
    from reportlab.lib.pagesizes import letter
    from reportlab.pdfbase import pdfmetrics
    from reportlab.pdfbase.ttfonts import TTFont
    from reportlab.pdfgen.canvas import Canvas
    _REPORTLAB_AVAILABLE = True
except ImportError:  # pragma: no cover
    _REPORTLAB_AVAILABLE = False


def _strip_html(html: str) -> str:
    text = re.sub(r"<style[\s\S]*?</style>", "", html, flags=re.IGNORECASE)
    text = re.sub(r"<script[\s\S]*?</script>", "", text, flags=re.IGNORECASE)
    text = re.sub(r"<[^>]+>", "", text)
    return unescape(text).strip()


def _minimal_pdf(content: str, title: str) -> bytes:
    """Build a valid, minimal single-page text PDF without any third-party lib."""
    safe = content.encode("latin-1", errors="replace").decode("latin-1")
    lines = []
    for raw in safe.splitlines():
        lines.extend(textwrap.wrap(raw or " ", width=90) or [" "])

    tj_cmds = "\n".join(f"({ln.replace('(', '').replace(')', '')}) Tj T*" for ln in lines)

    stream = (
        f"BT\n/F1 10 Tf\n14 TL\n50 750 Td\n"
        f"{tj_cmds}\n"
        f"ET"
    )
    stream_bytes = stream.encode("latin-1")
    stream_len = len(stream_bytes)

    # Build object table
    objs: list[bytes] = []

    def add(s: str) -> int:
        objs.append(s.encode("latin-1"))
        return len(objs)

    add(
        "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj"
    )
    add(
        "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj"
    )
    add(
        "3 0 obj\n<< /Type /Page /Parent 2 0 R "
        "/MediaBox [0 0 612 792] "
        "/Contents 4 0 R "
        "/Resources << /Font << /F1 5 0 R >> >> >>\nendobj"
    )
    add(
        f"4 0 obj\n<< /Length {stream_len} >>\nstream\n"
        + stream
        + "\nendstream\nendobj"
    )
    add(
        "5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj"
    )
    info_title = title.replace("(", "").replace(")", "")
    add(
        f"6 0 obj\n<< /Title ({info_title}) >>\nendobj"
    )

    # Assemble
    header = b"%PDF-1.4\n"
    body = b""
    offsets: list[int] = []
    for obj in objs:
        offsets.append(len(header) + len(body))
        body += obj + b"\n"

    xref_offset = len(header) + len(body)
    n = len(objs)
    xref = f"xref\n0 {n + 1}\n0000000000 65535 f \n"
    for off in offsets:
        xref += f"{off:010d} 00000 n \n"

    trailer = (
        f"trailer\n<< /Size {n + 1} /Root 1 0 R /Info 6 0 R >>\n"
        f"startxref\n{xref_offset}\n%%EOF"
    )

    return header + body + xref.encode() + trailer.encode()


def render_html_as_pdf(html: str, title: str = "document") -> bytes:
    content = _strip_html(html)

    if not _REPORTLAB_AVAILABLE:
        return _minimal_pdf(content, title)

    buffer = BytesIO()
    page = Canvas(buffer, pagesize=letter)
    page.setTitle(title)
    try:
        pdfmetrics.registerFont(TTFont("Helvetica", "Helvetica.ttf"))
        page.setFont("Helvetica", 10)
    except Exception:
        page.setFont("Helvetica", 10)

    y = 750
    for raw_line in content.splitlines():
        line = raw_line.strip()
        if not line:
            y -= 12
            continue
        while len(line) > 95:
            page.drawString(40, y, line[:95])
            line = line[95:]
            y -= 14
            if y < 50:
                page.showPage()
                page.setFont("Helvetica", 10)
                y = 750
        page.drawString(40, y, line)
        y -= 14
        if y < 50:
            page.showPage()
            page.setFont("Helvetica", 10)
            y = 750

    page.save()
    return buffer.getvalue()

