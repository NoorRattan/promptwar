"""Emergency endpoints."""

import asyncio
import logging
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user, get_db, require_admin_only
from app.core.rate_limit import RATE_EMERGENCY, RATE_READ, RATE_WRITE, limiter
from app.db.models.audit_log import AuditLog
from app.db.models.incident import (
    Incident,
    IncidentSeverity,
    IncidentStatus,
    IncidentType,
)
from app.db.models.staff_task import StaffTask, TaskPriority, TaskStatus, TaskType
from app.db.models.zone import Zone, ZoneType
from app.firebase import firestore as firestore_service
from app.schemas.common import SuccessResponse
from app.schemas.emergency import (
    ActivateEmergencyRequest,
    BlockExitRequest,
    DeactivateEmergencyRequest,
    DeactivateResponse,
    EmergencyMessageRequest,
    EmergencyStatusResponse,
    SafeConfirmationRequest,
    SOSReportRequest,
)
from app.services.maps_service import calculate_evacuation_routes
from app.services.notification_service import (
    notify_emergency_activated,
    notify_emergency_deactivated,
)

logger = logging.getLogger(__name__)
router = APIRouter()
EMERGENCY_STATE_TIMEOUT_SECONDS = 2.0


def _request_ip(request: Request) -> str | None:
    return request.client.host if request.client else None


def _response_type(value: str | None) -> str | None:
    return value.upper() if value else None


@router.get(
    "/status", response_model=EmergencyStatusResponse, summary="Get emergency status"
)
@limiter.limit(RATE_READ)
async def get_emergency_status(
    request: Request,
    venue_id: str,
    db: AsyncSession = Depends(get_db),
) -> EmergencyStatusResponse:
    """
    Return the current public emergency status for a venue.
    PUBLIC endpoint — no authentication required (safety critical).
    Accepts any venue_id string; returns is_active=false for invalid/unknown IDs.
    """
    # --- Firestore fast-path ---
    try:
        loop = asyncio.get_running_loop()
        state = await asyncio.wait_for(
            loop.run_in_executor(None, firestore_service.get_emergency_state, venue_id),
            timeout=EMERGENCY_STATE_TIMEOUT_SECONDS,
        )
    except asyncio.TimeoutError:
        logger.warning("Firestore emergency state read timed out venue=%s", venue_id)
        state = None
    except Exception:
        state = None

    if state:
        return EmergencyStatusResponse(
            venue_id=venue_id,
            is_active=bool(state.get("is_active")),
            emergency_type=_response_type(state.get("type")),
            message=state.get("message"),
            affected_zones=state.get("affected_zones") or [],
            activated_at=state.get("activated_at"),
            activated_by_email=state.get("activated_by_email"),
            sos_reports_count=int(state.get("sos_reports_count") or 0),
            evacuation_routes_ready=bool(state.get("evacuation_routes_ready")),
        )

    # --- DB fallback (only works for valid UUIDs) ---
    incident = None
    try:
        parsed_id = uuid.UUID(venue_id)
        result = await db.execute(
            select(Incident)
            .where(
                Incident.venue_id == parsed_id,
                Incident.status == IncidentStatus.ACTIVE,
            )
            .order_by(Incident.created_at.desc())
            .limit(1)
        )
        incident = result.scalar_one_or_none()
    except Exception:
        incident = None

    if incident is None:
        return EmergencyStatusResponse(venue_id=venue_id, is_active=False)
    return EmergencyStatusResponse(
        venue_id=venue_id,
        is_active=True,
        emergency_type=incident.incident_type.value,
        message=incident.description,
        affected_zones=incident.affected_zones or [],
        activated_at=incident.activated_at or incident.created_at,
        activated_by_email=None,
        sos_reports_count=incident.sos_reports_count or 0,
        evacuation_routes_ready=False,
    )


@router.post(
    "/broadcast", response_model=EmergencyStatusResponse, summary="Activate emergency"
)
@limiter.limit(RATE_EMERGENCY)
async def activate_emergency(
    request: Request,
    body: ActivateEmergencyRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_admin_only),
) -> EmergencyStatusResponse:
    """Activate an emergency, write Firestore inline, then persist the incident."""
    active_result = await db.execute(
        select(Incident).where(
            Incident.venue_id == body.venue_id,
            Incident.status == IncidentStatus.ACTIVE,
        )
    )
    if active_result.scalar_one_or_none() is not None:
        raise HTTPException(status_code=400, detail="Emergency already active")

    zones_result = await db.execute(select(Zone).where(Zone.venue_id == body.venue_id))
    zones = zones_result.scalars().all()
    venue_zones = [
        {
            "id": str(zone.id),
            "name": zone.name,
            "lat_center": zone.lat_center,
            "lng_center": zone.lng_center,
        }
        for zone in zones
    ]
    safe_exits = [
        {
            "id": str(zone.id),
            "name": zone.name,
            "lat": zone.lat_center,
            "lng": zone.lng_center,
        }
        for zone in zones
        if zone.zone_type == ZoneType.EXIT and not zone.is_exit_blocked
    ]
    evacuation_routes = await calculate_evacuation_routes(venue_zones, safe_exits)

    loop = asyncio.get_running_loop()
    await loop.run_in_executor(
        None,
        firestore_service.activate_emergency,
        str(body.venue_id),
        body.emergency_type,
        body.message,
        body.affected_zones,
        current_user.email,
        evacuation_routes,
    )

    incident = Incident(
        id=uuid.uuid4(),
        venue_id=body.venue_id,
        incident_type=IncidentType(body.emergency_type),
        severity=IncidentSeverity.CRITICAL,
        status=IncidentStatus.ACTIVE,
        title=f"{body.emergency_type.title()} emergency",
        description=body.message,
        affected_zones=body.affected_zones,
        reported_by=current_user.id,
        activated_at=datetime.now(timezone.utc),
    )
    db.add(incident)
    db.add(
        AuditLog(
            user_id=current_user.id,
            action="emergency_activated",
            resource_type="incident",
            resource_id=str(incident.id),
            details={
                "emergency_type": body.emergency_type,
                "affected_zones": body.affected_zones,
            },
            ip_address=_request_ip(request),
        )
    )
    await db.commit()
    await db.refresh(incident)

    background_tasks.add_task(
        notify_emergency_activated,
        str(body.venue_id),
        body.emergency_type,
        body.message,
        body.affected_zones,
        current_user.email,
    )

    return EmergencyStatusResponse(
        venue_id=str(body.venue_id),
        is_active=True,
        emergency_type=incident.incident_type.value,
        message=incident.description,
        affected_zones=incident.affected_zones or [],
        activated_at=incident.activated_at,
        activated_by_email=current_user.email,
        sos_reports_count=0,
        evacuation_routes_ready=bool(evacuation_routes),
    )


@router.post(
    "/deactivate", response_model=DeactivateResponse, summary="Deactivate emergency"
)
@limiter.limit(RATE_EMERGENCY)
async def deactivate_emergency(
    request: Request,
    body: DeactivateEmergencyRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_admin_only),
) -> DeactivateResponse:
    """Deactivate an emergency after clearing Firestore inline."""
    active_result = await db.execute(
        select(Incident).where(
            Incident.venue_id == body.venue_id,
            Incident.status == IncidentStatus.ACTIVE,
        )
    )
    incident = active_result.scalar_one_or_none()
    if incident is None:
        raise HTTPException(status_code=400, detail="No active emergency")

    loop = asyncio.get_running_loop()
    await loop.run_in_executor(
        None, firestore_service.deactivate_emergency, str(body.venue_id)
    )

    incident.status = IncidentStatus.RESOLVED
    incident.deactivated_at = datetime.now(timezone.utc)
    db.add(
        AuditLog(
            user_id=current_user.id,
            action="emergency_deactivated",
            resource_type="incident",
            resource_id=str(incident.id),
            ip_address=_request_ip(request),
        )
    )
    await db.commit()
    await db.refresh(incident)

    background_tasks.add_task(notify_emergency_deactivated, str(body.venue_id))

    duration_minutes = 0
    if incident.activated_at and incident.deactivated_at:
        duration_minutes = int(
            (incident.deactivated_at - incident.activated_at).total_seconds() / 60
        )

    return DeactivateResponse(
        success=True,
        message="Emergency deactivated",
        incident_id=incident.id,
        duration_minutes=duration_minutes,
    )


@router.patch(
    "/exits/{zone_id}", response_model=SuccessResponse, summary="Block or unblock exit"
)
@limiter.limit(RATE_WRITE)
async def toggle_exit(
    request: Request,
    zone_id: uuid.UUID,
    body: BlockExitRequest,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_admin_only),
) -> SuccessResponse:
    """Block or unblock an exit zone."""
    result = await db.execute(select(Zone).where(Zone.id == zone_id))
    zone = result.scalar_one_or_none()
    if zone is None:
        raise HTTPException(status_code=404, detail="Zone not found")

    zone.is_exit_blocked = body.is_blocked
    db.add(
        AuditLog(
            user_id=current_user.id,
            action="exit_blocked" if body.is_blocked else "exit_unblocked",
            resource_type="zone",
            resource_id=str(zone.id),
            ip_address=_request_ip(request),
        )
    )
    await db.commit()
    return SuccessResponse(message="Exit status updated")


@router.post("/sos", response_model=SuccessResponse, summary="Send SOS")
@limiter.limit(RATE_WRITE)
async def report_sos(
    request: Request,
    body: SOSReportRequest,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
) -> SuccessResponse:
    """Submit an SOS report for the active incident."""
    active_result = await db.execute(
        select(Incident).where(
            Incident.venue_id == body.venue_id,
            Incident.status == IncidentStatus.ACTIVE,
        )
    )
    incident = active_result.scalar_one_or_none()
    if incident is not None:
        incident.sos_reports_count = (incident.sos_reports_count or 0) + 1

    task = StaffTask(
        id=uuid.uuid4(),
        venue_id=body.venue_id,
        task_type=TaskType.INCIDENT_RESPONSE,
        priority=TaskPriority.CRITICAL,
        status=TaskStatus.PENDING,
        title=f"SOS from {current_user.email}",
        description=body.message or "No message provided",
        assigned_to=current_user.id,
    )
    db.add(task)
    await db.commit()
    return SuccessResponse(message="SOS sent")


@router.post(
    "/message",
    response_model=SuccessResponse,
    summary="Send follow-up emergency message",
)
@limiter.limit(RATE_EMERGENCY)
async def emergency_message(
    request: Request,
    venue_id: uuid.UUID,
    body: EmergencyMessageRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_admin_only),
) -> SuccessResponse:
    """Send a follow-up emergency message over FCM."""
    background_tasks.add_task(
        notify_emergency_activated,
        str(venue_id),
        "GENERAL",
        body.message,
        [],
        current_user.email,
    )
    return SuccessResponse(message="Broadcast queued")


@router.post(
    "/safe-confirmation",
    response_model=dict[str, bool],
    summary="Confirm attendee is safe",
)
@limiter.limit(RATE_WRITE)
async def confirm_safe(
    request: Request,
    body: SafeConfirmationRequest,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
) -> dict[str, bool]:
    """Record that an attendee has confirmed they are safe."""
    db.add(
        AuditLog(
            user_id=current_user.id,
            action="emergency_safe_confirmed",
            resource_type="incident",
            resource_id=str(body.venue_id),
            details={"lat": body.lat, "lng": body.lng},
            ip_address=_request_ip(request),
        )
    )
    await db.commit()
    return {"confirmed": True}
