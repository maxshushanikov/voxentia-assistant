import time

from app.core.auth import require_auth
from app.core.config import settings
from fastapi import Depends, FastAPI
from fastapi.testclient import TestClient


def _make_app():
    app = FastAPI()

    @app.get("/protected", dependencies=[Depends(require_auth)])
    def protected():
        return {"ok": True}

    return app


def test_api_key_header_allows_access(monkeypatch):
    monkeypatch.setattr(settings, "AUTH_ENABLED", True, raising=False)
    monkeypatch.setattr(settings, "API_KEY", "supersecret", raising=False)

    app = _make_app()
    with TestClient(app) as client:
        r = client.get("/protected", headers={"X-API-Key": "supersecret"})
        assert r.status_code == 200
        assert r.json().get("ok") is True

        r2 = client.get("/protected", headers={"X-API-Key": "wrong"})
        assert r2.status_code == 401


def test_jwt_bearer_with_exp_and_aud_issuer(monkeypatch):
    monkeypatch.setattr(settings, "AUTH_ENABLED", True, raising=False)
    monkeypatch.setattr(settings, "JWT_SECRET", "jwt-secret", raising=False)
    monkeypatch.setattr(settings, "JWT_ALGORITHM", "HS256", raising=False)

    # Provide a fake jwt module so tests run without PyJWT installed.
    import types

    valid_token = "valid.jwt.token"
    bad_token = "bad.jwt.token"

    def fake_decode(tok, *args, **kwargs):
        # emulate PyJWT behavior: if "options" require "exp", enforce it
        if tok == valid_token:
            payload = {"sub": "user1", "exp": int(time.time()) + 60, "aud": "myaud", "iss": "me"}
        elif tok == bad_token:
            payload = {"sub": "u2"}
        else:
            raise Exception("invalid")

        opts = kwargs.get("options") or {}
        req = opts.get("require") if isinstance(opts, dict) else None
        if req and "exp" in req and "exp" not in payload:
            raise Exception("Missing required claim: exp")
        return payload

    fake_jwt = types.SimpleNamespace(decode=fake_decode, encode=lambda p, k, algorithm=None: valid_token)
    monkeypatch.setitem(__import__("sys").modules, "jwt", fake_jwt)

    token = valid_token

    app = _make_app()
    with TestClient(app) as client:
        r = client.get("/protected", headers={"Authorization": f"Bearer {token}"})
        assert r.status_code == 200

        # token without exp should be rejected
        r2 = client.get("/protected", headers={"Authorization": f"Bearer {bad_token}"})
        assert r2.status_code == 401
