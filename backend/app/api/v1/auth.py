"""Authentication and profile endpoints."""

import asyncio
import logging
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import (
    get_authenticated_firebase_uid,
    get_current_user,
    get_db,
)
from app.core.rate_limit import RATE_AUTH, RATE_READ, limiter
from app.db.models.audit_log import AuditLog
from app.db.models.user import User, UserRole
from app.firebase.fcm import subscribe_to_venue_topic
from app.schemas.auth import (
    RegisterRequest,
    UpdateFCMTokenRequest,
    UpdateProfileRequest,
    UserResponse,
)
from app.schemas.common import SuccessResponse

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post(
    "/register",
    response_model=UserResponse,
    status_code=201,
    summary="Register user in database",
    description="Sync a Firebase-authenticated user to PostgreSQL.",
)
@limiter.limit(RATE_AUTH)
async def register_user(
    request: Request,
    body: RegisterRequest,
    db: AsyncSession = Depends(get_db),
    firebase_uid: str = Depends(get_authenticated_firebase_uid),
) -> UserResponse:
    """Register or return the authenticated user row."""
    result = await db.execute(select(User).where(User.firebase_uid == firebase_uid))
    existing = result.scalar_one_or_none()
    if existing:
        return UserResponse.model_validate(existing)

    new_user = User(
        id=uuid.uuid4(),
        firebase_uid=firebase_uid,
        email=body.email,
        name=body.full_name,
        preferred_language=body.preferred_language,
        venue_id=body.venue_id,
        seat_number=body.seat_number,
        role=UserRole.ATTENDEE,
    )
    db.add(new_user)
    db.add(
        AuditLog(
            user_id=new_user.id,
            action="user_registered",
            resource_type="user",
            resource_id=str(new_user.id),
            ip_address=request.client.host if request.client else None,
        )
    )
    await db.commit()
    await db.refresh(new_user)
    if new_user.created_at is None:
        new_user.created_at = datetime.now(timezone.utc)
    logger.info("New user registered: %s (role: attendee)", new_user.email)
    return UserResponse.model_validate(new_user)


@router.get(
    "/me",
    response_model=UserResponse,
    summary="Get current user profile",
)
@limiter.limit(RATE_READ)
async def get_me(
    request: Request,
    current_user: User = Depends(get_current_user),
) -> UserResponse:
    """Return the authenticated user's profile."""
    return UserResponse.model_validate(current_user)


@router.patch(
    "/me",
    response_model=UserResponse,
    summary="Update current user profile",
)
@limiter.limit(RATE_AUTH)
async def update_profile(
    request: Request,
    body: UpdateProfileRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> UserResponse:
    """Update profile fields for the current user."""
    update_data = body.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(current_user, key, value)

    if update_data:
        db.add(
            AuditLog(
                user_id=current_user.id,
                action="profile_updated",
                resource_type="user",
                resource_id=str(current_user.id),
                details=update_data,
                ip_address=request.client.host if request.client else None,
            )
        )
        await db.commit()
        await db.refresh(current_user)

    return UserResponse.model_validate(current_user)


@router.post(
    "/me/fcm-token",
    response_model=SuccessResponse,
    summary="Update user FCM token",
)
@limiter.limit(RATE_AUTH)
async def update_fcm_token(
    request: Request,
    body: UpdateFCMTokenRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> SuccessResponse:
    """Persist the device FCM token and subscribe to the venue topic."""
    current_user.fcm_token = body.fcm_token
    await db.commit()

    if current_user.venue_id is not None:
        loop = asyncio.get_running_loop()
        await loop.run_in_executor(
            None,
            subscribe_to_venue_topic,
            body.fcm_token,
            str(current_user.venue_id),
        )

    return SuccessResponse(message="FCM token updated successfully.")
