import pytest

from app.core.config import DEFAULT_ALLOWED_ORIGINS, Settings


def test_allowed_origins_accepts_comma_separated_env(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setenv(
        "ALLOWED_ORIGINS",
        "https://promptwar-db092.web.app,http://localhost:5173",
    )

    settings = Settings(_env_file=None)

    assert settings.ALLOWED_ORIGINS == [
        "https://promptwar-db092.web.app",
        "http://localhost:5173",
        "https://promptwar-db092.firebaseapp.com",
        "http://localhost:4173",
    ]


def test_allowed_origins_accepts_json_env(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setenv(
        "ALLOWED_ORIGINS",
        '["https://promptwar-db092.web.app","https://promptwar-db092.firebaseapp.com"]',
    )

    settings = Settings(_env_file=None)

    assert settings.ALLOWED_ORIGINS == [
        "https://promptwar-db092.web.app",
        "https://promptwar-db092.firebaseapp.com",
        "http://localhost:5173",
        "http://localhost:4173",
    ]


def test_allowed_origins_blank_env_uses_defaults(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setenv("ALLOWED_ORIGINS", "")

    settings = Settings(_env_file=None)

    assert settings.ALLOWED_ORIGINS == DEFAULT_ALLOWED_ORIGINS


def test_allowed_origins_invalid_json_uses_defaults(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setenv("ALLOWED_ORIGINS", "[not-json")

    settings = Settings(_env_file=None)

    assert settings.ALLOWED_ORIGINS == DEFAULT_ALLOWED_ORIGINS
