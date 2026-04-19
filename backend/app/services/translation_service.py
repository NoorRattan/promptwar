"""Google Translate service wrapper used by backend features."""

from __future__ import annotations

import logging
from typing import Any

from google.cloud import translate_v2 as gcloud_translate

logger = logging.getLogger(__name__)

_client: gcloud_translate.Client | None = None


def _get_client() -> gcloud_translate.Client:
    """Lazily initialize and return the Google Translate client."""
    global _client
    if _client is None:
        _client = gcloud_translate.Client()
    return _client


def translate_text(
    text: str, target_language: str, source_language: str | None = None
) -> str:
    """
    Translate text using Google Cloud Translate.

    Returns the translated string, or the original text if translation fails.
    """
    if not text.strip():
        return text

    try:
        response: dict[str, Any] = _get_client().translate(
            text,
            target_language=target_language,
            source_language=source_language,
            format_="text",
        )
        translated = response.get("translatedText")
        return translated if isinstance(translated, str) and translated else text
    except Exception as exc:
        logger.warning(
            "Translation failed target=%s source=%s: %s",
            target_language,
            source_language,
            str(exc),
        )
        return text


def translate(
    text: str, target_language: str, source_language: str | None = None
) -> str:
    """Compatibility wrapper for callers expecting a generic translate() function."""
    return translate_text(text, target_language, source_language)
