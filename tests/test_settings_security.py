import pytest
from voxentia.config.settings import VoxentiaSettings


def test_production_rejects_localhost_origins():
    with pytest.raises(ValueError):
        VoxentiaSettings(
            APP_ENV="production",
            ALLOWED_ORIGINS="https://app.example.com,http://localhost:5173",
        )


def test_development_allows_localhost_origins():
    settings = VoxentiaSettings(
        APP_ENV="development",
        ALLOWED_ORIGINS="http://localhost:5173,http://127.0.0.1:8000",
    )
    assert "http://localhost:5173" in settings.allowed_origins
