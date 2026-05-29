from app.core.auth import _validate_token
from app.core.config import settings


def test_validate_token_api_key(monkeypatch):
    monkeypatch.setattr(settings, "API_KEY", "supersecret", raising=False)
    assert _validate_token("supersecret") is True
    assert _validate_token("wrong") is False
