"""FastAPI dependency injection utilities."""

import asyncio
import logging
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import verify_firebase_token
from app.db.session import get_db
from app.db.models.user import User, UserRole

logger = logging.getLogger(__name__)

_security = HTTPBearer(
    scheme_name="Firebase JWT",
    description="Firebase ID token obtained from Firebase Authentication SDK",
    auto_error=False,
)
_security_optional = HTTPBearer(auto_error=False)


async def _get_firebase_uid(
    credentials: HTTPAuthorizationCredentials | None,
) -> str:
    """Verify the Firebase token and return the authenticated UID."""
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    loop = asyncio.get_running_loop()
    claims = await loop.run_in_executor(
        None, verify_firebase_token, credentials.credentials
    )
    return str(claims["uid"])


async def get_authenticated_firebase_uid(
    credentials: HTTPAuthorizationCredentials | None = Depends(_security),
) -> str:
    """
    Verify Firebase ID token and return the authenticated UID.

    Unlike get_current_user, this does not require an existing database row.
    """
    return await _get_firebase_uid(credentials)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_security),
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    Verify Firebase ID token and return the authenticated User from PostgreSQL.

    Flow:
    1. Extract Bearer token from Authorization header (HTTPBearer handles this)
    2. Verify token signature via Firebase Admin SDK (run in thread pool — sync function)
    3. Extract firebase_uid from decoded claims
    4. Look up User record in PostgreSQL by firebase_uid
    5. Return User ORM instance

    Args:
        credentials: Bearer token from Authorization header (None if absent)
        db: Async database session from get_db dependency

    Returns:
        User: Authenticated and verified User ORM model

    Raises:
        HTTPException 401: Token missing, invalid, expired, or user not found in DB
    """
    firebase_uid = await _get_firebase_uid(credentials)
    result = await db.execute(select(User).where(User.firebase_uid == firebase_uid))
    user = result.scalar_one_or_none()

    if user is None:
        logger.warning(
            "Authenticated Firebase UID not found in database: %s", firebase_uid
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account not found. Please register first.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user


async def get_current_user_optional(
    credentials: HTTPAuthorizationCredentials | None = Depends(_security_optional),
    db: AsyncSession = Depends(get_db),
) -> User | None:
    """
    Optional authentication dependency for public endpoints that return
    enriched data when authenticated (e.g., personalised queue suggestions).

    Returns None if no token provided or token is invalid.
    Never raises — always returns User or None.
    """
    if credentials is None:
        return None
    try:
        firebase_uid = await _get_firebase_uid(credentials)
    except HTTPException:
        return None

    result = await db.execute(select(User).where(User.firebase_uid == firebase_uid))
    return result.scalar_one_or_none()


async def require_admin(
    current_user: User = Depends(get_current_user),
) -> User:
    """
    Require ADMIN or STAFF role. Attendees receive 403 Forbidden.
    Used for: queue management, order management, crowd density writes, staff tasks.
    """
    if current_user.role not in (UserRole.ADMIN, UserRole.STAFF):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This action requires staff or admin access.",
        )
    return current_user


async def require_admin_only(
    current_user: User = Depends(get_current_user),
) -> User:
    """
    Require ADMIN role exclusively. Staff cannot access these routes.
    Used for: emergency activation, venue configuration, user management.
    """
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This action requires admin access.",
        )
    return current_user


def get_audit_context(request: Request) -> dict[str, str | None]:
    """
    Extract client context for audit log entries.
    Returns IP address and User-Agent from the request.
    """
    return {
        "ip_address": request.client.host if request.client else None,
        "user_agent": request.headers.get("user-agent", "unknown")[:200],
    }


__all__ = [
    "get_db",
    "get_authenticated_firebase_uid",
    "get_current_user",
    "get_current_user_optional",
    "require_admin",
    "require_admin_only",
    "get_audit_context",
]
