from fastapi import APIRouter, Depends, Request, HTTPException, BackgroundTasks
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.dependencies import get_db, get_current_user, require_admin
from app.core.rate_limit import limiter, RATE_READ, RATE_DENSITY_UPDATE
from app.db.models.audit_log import AuditLog
from app.schemas.crowd import (
    ZoneDensityResponse,
    UpdateDensityRequest,
    VenueDensitySummary,
    CongestionPrediction,
)
from app.firebase.firestore import update_zone_density as _fs_update_density
from app.services import cache_service
from app.ml.congestion_alerter import check_congestion_threshold
from app.ml.crowd_predictor import get_predictor
from sqlalchemy import select as sa_select
from sqlalchemy import and_
from app.db.models.user import User, UserRole
from app.db.models.zone import Zone
import logging
import uuid
from datetime import datetime, timezone

router = APIRouter()
logger = logging.getLogger(__name__)


def _calculate_density_level(density: float) -> str:
    if density <= 0.40:
        return "LOW"
    if density <= 0.65:
        return "MEDIUM"
    if density <= 0.85:
        return "HIGH"
    return "CRITICAL"


def _get_minute_of_event() -> int:
    """
    Estimate minutes since event start based on current time.
    For the competition demo: assume events start at 19:00 local time.
    Returns 0-120, clamped to event duration.
    Production: this would come from a Venue.event_start_time field.
    """
    now = datetime.now(timezone.utc)
    # Assume event starts at 19:00 UTC for demo purposes
    event_start_hour = 19
    minutes_since_7pm = (now.hour - event_start_hour) * 60 + now.minute
    return max(0, min(120, minutes_since_7pm))


@router.get(
    "/density",
    response_model=VenueDensitySummary,
    summary="Get venue density summary",
    description="Returns an aggregated summary of crowd density across all zones for a venue.",
)
@limiter.limit(RATE_READ)
async def get_density(
    request: Request,
    venue_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
) -> VenueDensitySummary:
    """Query param venue_id. Returns VenueDensitySummary."""
    cached = await cache_service.get_json(cache_service.density_key(str(venue_id)))
    if cached:
        return cached

    result = await db.execute(select(Zone).where(Zone.venue_id == venue_id))
    zones = result.scalars().all()

    zone_responses = []
    counts = {"critical": 0, "high": 0, "medium": 0, "low": 0}

    for z in zones:
        level = _calculate_density_level(z.current_density)
        counts[level.lower()] += 1
        zone_responses.append(
            ZoneDensityResponse(
                zone_id=z.id,
                venue_id=z.venue_id,
                zone_name=z.name,
                density=z.current_density,
                level=level,
                count=z.current_count,
                is_open=z.is_open,
                updated_at=z.updated_at,
            )
        )

    overall = "LOW"
    if counts["critical"] > 0:
        overall = "CRITICAL"
    elif counts["high"] > 0:
        overall = "HIGH"
    elif counts["medium"] > 0:
        overall = "MEDIUM"

    summary_dict = VenueDensitySummary(
        venue_id=venue_id,
        total_zones=len(zones),
        critical_zones=counts["critical"],
        high_zones=counts["high"],
        medium_zones=counts["medium"],
        low_zones=counts["low"],
        overall_level=overall,
        zones=zone_responses,
    )
    await cache_service.set_json(
        cache_service.density_key(str(venue_id)),
        summary_dict.model_dump(),
        ttl_seconds=5,
    )
    return summary_dict


@router.get(
    "/density/{zone_id}",
    response_model=ZoneDensityResponse,
    summary="Get single zone density",
    description="Returns current density of a single zone.",
)
@limiter.limit(RATE_READ)
async def get_zone_density(
    request: Request,
    zone_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
) -> ZoneDensityResponse:
    """single zone. Auth: authenticated."""
    result = await db.execute(select(Zone).where(Zone.id == zone_id))
    z = result.scalar_one_or_none()
    if not z:
        raise HTTPException(status_code=404, detail="Zone not found")
    level = _calculate_density_level(z.current_density)
    return ZoneDensityResponse(
        zone_id=z.id,
        venue_id=z.venue_id,
        zone_name=z.name,
        density=z.current_density,
        level=level,
        count=z.current_count,
        is_open=z.is_open,
        updated_at=z.updated_at,
    )


@router.post(
    "/density/{zone_id}",
    response_model=ZoneDensityResponse,
    summary="Update zone density",
    description="Update density and count for a zone. Triggers BackgroundTask for Firestore.",
)
@limiter.limit(RATE_DENSITY_UPDATE)
async def update_density(
    request: Request,
    zone_id: uuid.UUID,
    body: UpdateDensityRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_admin),
) -> ZoneDensityResponse:
    """update density. Admin only."""
    result = await db.execute(
        select(Zone).where(Zone.id == zone_id, Zone.venue_id == body.venue_id)
    )
    z = result.scalar_one_or_none()
    if not z:
        raise HTTPException(status_code=404, detail="Zone not found or venue mismatch")

    z.current_density = body.density
    z.current_count = body.count

    audit = AuditLog(
        user_id=current_user.id,
        action="zone_density_updated",
        resource_type="zone",
        resource_id=str(z.id),
        details={"density": body.density, "count": body.count},
        ip_address=request.client.host if request.client else None,
    )
    db.add(audit)
    await db.commit()
    await db.refresh(z)

    level = _calculate_density_level(z.current_density)
    background_tasks.add_task(
        _fs_update_density,
        str(body.venue_id),
        str(zone_id),
        body.density,
        body.count,
        level,
    )

    staff_result = await db.execute(
        sa_select(User.fcm_token).where(
            and_(
                User.venue_id == body.venue_id,
                User.role == UserRole.STAFF,
                User.fcm_token.is_not(None),
            )
        )
    )
    staff_tokens = [row[0] for row in staff_result.all()]

    background_tasks.add_task(
        check_congestion_threshold,
        zone_id=str(zone_id),
        zone_name=z.name,
        zone_type=z.zone_type,  # zone_type.value if Enum, else zone_type directly
        current_density=body.density,
        current_level=level,
        minute_of_event=_get_minute_of_event(),
        venue_fill_ratio=body.density,
        staff_fcm_tokens=staff_tokens,
    )

    await cache_service.delete(cache_service.density_key(str(body.venue_id)))

    return ZoneDensityResponse(
        zone_id=z.id,
        venue_id=z.venue_id,
        zone_name=z.name,
        density=z.current_density,
        level=level,
        count=z.current_count,
        is_open=z.is_open,
        updated_at=z.updated_at,
    )


@router.get(
    "/predictions",
    response_model=list[CongestionPrediction],
    summary="Get crowd predictions",
    description="Returns predictive crowd density for zones. Admin only.",
)
@limiter.limit(RATE_READ)
async def get_predictions(
    request: Request,
    venue_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_admin),
) -> list[CongestionPrediction]:
    """Admin only. Returns list[CongestionPrediction]."""
    zones_result = await db.execute(sa_select(Zone).where(Zone.venue_id == venue_id))
    zones = zones_result.scalars().all()
    zone_dicts = [
        {
            "id": str(z.id),
            "name": z.name,
            "zone_type": z.zone_type,  # z.zone_type.value if enum else z.zone_type
            "current_density": z.current_density,
            "lat_center": z.lat_center,
            "lng_center": z.lng_center,
        }
        for z in zones
    ]
    predictor = get_predictor()
    predictions = predictor.predict_venue(zone_dicts, _get_minute_of_event())
    return predictions
