"""Security helpers for Firebase JWT verification and code generation."""

import logging
import random

from fastapi import HTTPException, status

logger = logging.getLogger(__name__)


def _firebase_auth_module() -> object:
    """Import Firebase auth lazily to avoid startup-time SDK loading."""
    from firebase_admin import auth as firebase_auth

    return firebase_auth


def verify_firebase_token(token: str) -> dict[str, object]:
    """
    Verify a Firebase ID token.

    This function is synchronous and must be called behind ``run_in_executor``
    from async FastAPI dependencies and routes.
    """
    firebase_auth = _firebase_auth_module()
    try:
        decoded_token: dict[str, object] = firebase_auth.verify_id_token(
            token,
            check_revoked=False,
        )
        return decoded_token
    except firebase_auth.ExpiredIdTokenError:
        logger.warning("Expired Firebase ID token received")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token has expired. Please log in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except firebase_auth.RevokedIdTokenError:
        logger.warning("Revoked Firebase ID token received")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token has been revoked. Please log in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except firebase_auth.InvalidIdTokenError as exc:
        logger.warning("Invalid Firebase ID token: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except Exception as exc:
        logger.error("Unexpected error during Firebase token verification: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication failed.",
            headers={"WWW-Authenticate": "Bearer"},
        )


def generate_order_code() -> str:
    """Generate a four-character alphanumeric order code."""
    alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"
    return "".join(random.choices(alphabet, k=4))
