"""Firebase Admin SDK initialization."""

import logging
import os
from types import SimpleNamespace

from app.core.config import settings

logger = logging.getLogger(__name__)
firebase_admin = SimpleNamespace(_apps={})


def _firebase_modules() -> tuple[object, object]:
    """Import Firebase Admin modules lazily."""
    import firebase_admin
    from firebase_admin import credentials

    return firebase_admin, credentials


def initialize_firebase() -> bool:
    """
    Initialize the Firebase Admin SDK application.

    Must be called at most once at application startup inside the FastAPI lifespan.
    Returns False when configuration is incomplete so local/test startup can continue.
    """
    admin_module, credentials = _firebase_modules()
    if admin_module._apps:
        logger.debug("Firebase Admin SDK already initialized - skipping")
        return True

    service_account_path = settings.FIREBASE_SERVICE_ACCOUNT_PATH
    if not settings.FIREBASE_PROJECT_ID or not settings.FIREBASE_STORAGE_BUCKET:
        logger.warning(
            "Firebase initialization skipped: FIREBASE_PROJECT_ID or "
            "FIREBASE_STORAGE_BUCKET is not configured"
        )
        return False

    if not os.path.exists(service_account_path):
        logger.warning(
            "Firebase initialization skipped: service account file not found at %s",
            service_account_path,
        )
        return False

    cred = credentials.Certificate(service_account_path)
    admin_module.initialize_app(
        cred,
        {
            "storageBucket": settings.FIREBASE_STORAGE_BUCKET,
            "projectId": settings.FIREBASE_PROJECT_ID,
        },
    )
    logger.info(
        "Firebase Admin SDK initialized for project: %s",
        settings.FIREBASE_PROJECT_ID,
    )
    return True


def get_firebase_app() -> object:
    """Return the initialized default Firebase app."""
    admin_module, _ = _firebase_modules()
    if not admin_module._apps:
        raise RuntimeError(
            "Firebase Admin SDK has not been initialized. "
            "Ensure initialize_firebase() is called in the FastAPI lifespan."
        )
    return admin_module.get_app()
