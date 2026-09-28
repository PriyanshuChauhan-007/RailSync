"""Backend tests never use real provider credentials or API calls."""

import pytest


@pytest.fixture(autouse=True)
def disable_live_provider(monkeypatch):
    from google import genai
    def blocked_client(*args, **kwargs):
        raise AssertionError("Automated tests must mock Gemini; live calls are forbidden")
    monkeypatch.setattr(genai, "Client", blocked_client)
    monkeypatch.delenv("GOOGLE_API_KEY", raising=False)
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    monkeypatch.delenv("GEMINI_MODEL", raising=False)
