from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.dependencies import (
    get_db,
    get_current_user_optional,
    require_admin,
)
from app.core.rate_limit import limiter, RATE_READ, RATE_WRITE
from app.db.models.user import User
from app.db.models.venue import Venue
from app.db.models.zone import Zone
from app.db.models.audit_log import AuditLog
from app.schemas.venue import (
    VenueResponse,
    VenueDetailResponse,
    ZoneResponse,
    ZoneUpdateRequest,
)
import uuid

router = APIRouter()


@router.get(
    "",
    response_model=list[VenueResponse],
    summary="List all active venues",
    description="Returns a list of all active venues in the system.",
)
@limiter.limit(RATE_READ)
async def list_venues(
    request: Request,
    demo: bool = False,
    db: AsyncSession = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
) -> list[VenueResponse]:
    """
    List all active venues.
    PUBLIC when demo=true — allows unauthenticated access for competition demo.
    Requires auth for normal access.
    """
    if not demo and current_user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    result = await db.execute(
        select(Venue).where(Venue.is_active.is_(True)).order_by(Venue.name)
    )
    return [VenueResponse.model_validate(v) for v in result.scalars().all()]


@router.get(
    "/{venue_id}",
    response_model=VenueDetailResponse,
    summary="Get venue details with zones",
    description="Returns full venue details including all zones. Used for app bootstrap and QR code scan.",
)
@limiter.limit(RATE_READ)
async def get_venue(
    request: Request,
    venue_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
) -> VenueDetailResponse:
    """Get venue by ID including zones. Public — used on QR code scan before login."""
    result = await db.execute(
        select(Venue)
        .options(selectinload(Venue.zones))
        .where(Venue.id == venue_id, Venue.is_active.is_(True))
    )
    venue = result.scalar_one_or_none()
    if not venue:
        raise HTTPException(status_code=404, detail="Venue not found or inactive")
    return VenueDetailResponse.model_validate(venue)


@router.get(
    "/{venue_id}/zones",
    response_model=list[ZoneResponse],
    summary="List zones for a venue",
    description="Returns all zones for a specific venue.",
)
@limiter.limit(RATE_READ)
async def list_venue_zones(
    request: Request,
    venue_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_admin),
) -> list[ZoneResponse]:
    """Get all zones for a specific venue."""
    result = await db.execute(select(Zone).where(Zone.venue_id == venue_id))
    return [ZoneResponse.model_validate(z) for z in result.scalars().all()]


@router.patch(
    "/{venue_id}/zones/{zone_id}",
    response_model=ZoneResponse,
    summary="Update a zone",
    description="Update open/closed or blocked status for a zone.",
)
@limiter.limit(RATE_WRITE)
async def update_zone(
    request: Request,
    venue_id: uuid.UUID,
    zone_id: uuid.UUID,
    body: ZoneUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_admin),
) -> ZoneResponse:
    """Toggle is_open or is_exit_blocked for a zone."""
    result = await db.execute(
        select(Zone).where(Zone.id == zone_id, Zone.venue_id == venue_id)
    )
    zone = result.scalar_one_or_none()
    if not zone:
        raise HTTPException(status_code=404, detail="Zone not found")

    update_data = body.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(zone, key, value)

    audit = AuditLog(
        user_id=current_user.id,
        action="zone_updated",
        resource_type="zone",
        resource_id=str(zone.id),
        details=update_data,
        ip_address=request.client.host if request.client else None,
    )
    db.add(audit)
    await db.commit()
    await db.refresh(zone)
    return ZoneResponse.model_validate(zone)
