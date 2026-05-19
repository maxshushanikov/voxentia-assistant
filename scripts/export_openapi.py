#!/usr/bin/env python3
"""Export OpenAPI schema for frontend type generation."""

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "core" / "src"))
sys.path.insert(0, str(ROOT / "backend"))

from app.main import app  # noqa: E402

OUT = ROOT / "frontend" / "src" / "api" / "openapi.json"
OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(json.dumps(app.openapi(), indent=2), encoding="utf-8")
print(f"Wrote {OUT}")
