import os
import sys
import tempfile
from pathlib import Path

_test_root = Path(tempfile.mkdtemp(prefix="voxentia_pytest_"))
os.environ.setdefault("DATA_DIR", str(_test_root))
os.environ.setdefault("AUTH_ENABLED", "false")
os.environ.setdefault("RATE_LIMIT", "1000/minute")
os.environ.setdefault("CHROMA_DIR", str(_test_root / "chroma"))
os.environ.setdefault("DB_PATH", f"sqlite:///{_test_root / 'test.db'}")

ROOT = Path(__file__).resolve().parents[1]

for path in (
    ROOT / "core" / "src",
    ROOT / "backend",
    ROOT / "plugins" / "job_assistant" / "src",
    ROOT / "plugins" / "teacher_assistant" / "src",
    ROOT / "plugins" / "calendar" / "src",
):
    path_str = str(path)
    if path_str not in sys.path:
        sys.path.insert(0, path_str)
