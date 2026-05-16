from pathlib import Path

root = Path(__file__).resolve().parents[1] / "frontend/src"
for path in root.rglob("*.tsx"):
    c = path.read_text(encoding="utf-8")
    nc = c.replace("<motion", "<div").replace("</motion>", "</div>")
    if nc != c:
        path.write_text(nc, encoding="utf-8")
        print("fixed", path)
