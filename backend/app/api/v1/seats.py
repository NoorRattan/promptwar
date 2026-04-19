from fastapi import APIRouter, Depends, Request, HTTPException, BackgroundTasks
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.dependencies import get_db, get_current_user, require_admin
from app.core.rate_limit import limiter, RATE_READ, RATE_WRITE
from app.db.models.seat_upgrade import SeatUpgrade
from app.db.models.user import UserRole
from app.db.models.audit_log import AuditLog
from app.schemas.seat import SeatUpgradeResponse, CreateUpgradeRequest
import uuid
import logging
from datetime import datetime, timezone, timedelta

router = APIRouter()
logger = logging.getLogger(__name__)


async def _send_fcm_offer(target_user_id, message): ...


@router.get(
    "/upgrades",
    response_model=list[SeatUpgradeResponse],
    summary="List seat upgrades",
    description="Attendees see targeted/untargeted offers. Admin sees all.",
)
@limiter.limit(RATE_READ)
async def list_upgrades(
    request: Request,
    venue_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
) -> list[SeatUpgradeResponse]:
    query = select(SeatUpgrade).where(SeatUpgrade.venue_id == venue_id)
    if current_user.role != UserRole.ADMIN:
        now = datetime.now(timezone.utc)
        query = query.where(SeatUpgrade.status.in_(["AVAILABLE", "SENT"]))
        query = query.where(SeatUpgrade.expires_at > now)
        query = query.where(
            (SeatUpgrade.target_user_id == current_user.id)
            | (SeatUpgrade.target_user_id.is_(None))
        )

    result = await db.execute(query)
    return [SeatUpgradeResponse.model_validate(u) for u in result.scalars().all()]


@router.post(
    "/upgrades",
    response_model=SeatUpgradeResponse,
    summary="Create upgrade offer",
    description="Admin create offer.",
)
@limiter.limit(RATE_WRITE)
async def create_upgrade(
    request: Request,
    body: CreateUpgradeRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_admin),
) -> SeatUpgradeResponse:
    new_offer = SeatUpgrade(
        id=uuid.uuid4(),
        venue_id=body.venue_id,
        from_seat=body.from_seat,
        to_seat=body.to_seat,
        from_section=body.from_section,
        to_section=body.to_section,
        price_difference=body.price_difference,
        target_user_id=body.target_user_id,
        status="SENT" if body.target_user_id else "AVAILABLE",
        expires_at=datetime.now(timezone.utc)
        + timedelta(minutes=body.expires_in_minutes),
    )
    db.add(new_offer)

    audit = AuditLog(
        user_id=current_user.id,
        action="seat_upgrade_created",
        resource_type="seat_upgrade",
        resource_id=str(new_offer.id),
        ip_address=request.client.host if request.client else None,
    )
    db.add(audit)
    await db.commit()
    await db.refresh(new_offer)

    if body.target_user_id:
        background_tasks.add_task(
            _send_fcm_offer, body.target_user_id, "New seat upgrade available!"
        )

    return SeatUpgradeResponse.model_validate(new_offer)


@router.post(
    "/upgrades/{upgrade_id}/accept",
    response_model=SeatUpgradeResponse,
    summary="Accept upgrade",
    description="Attendee accept offer.",
)
@limiter.limit(RATE_WRITE)
async def accept_upgrade(
    request: Request,
    upgrade_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
) -> SeatUpgradeResponse:
    res = await db.execute(select(SeatUpgrade).where(SeatUpgrade.id == upgrade_id))
    offer = res.scalar_one_or_none()

    if not offer:
        raise HTTPException(status_code=404, detail="Upgrade not found")

    if offer.status not in ["AVAILABLE", "SENT"]:
        raise HTTPException(status_code=400, detail="Offer not available")

    if offer.expires_at.astimezone(timezone.utc) < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Offer expired")

    if offer.target_user_id and offer.target_user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not targeted to this user")

    offer.status = "ACCEPTED"
    offer.accepted_at = datetime.now(timezone.utc)
    current_user.seat_number = offer.to_seat

    audit = AuditLog(
        user_id=current_user.id,
        action="seat_upgrade_accepted",
        resource_type="seat_upgrade",
        resource_id=str(offer.id),
        ip_address=request.client.host if request.client else None,
    )
    db.add(audit)
    await db.commit()
    await db.refresh(offer)

    return SeatUpgradeResponse.model_validate(offer)


@router.post(
    "/upgrades/{upgrade_id}/decline",
    response_model=SeatUpgradeResponse,
    summary="Decline upgrade",
    description="Attendee decline offer.",
)
@limiter.limit(RATE_WRITE)
async def decline_upgrade(
    request: Request,
    upgrade_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
) -> SeatUpgradeResponse:
    res = await db.execute(select(SeatUpgrade).where(SeatUpgrade.id == upgrade_id))
    offer = res.scalar_one_or_none()

    if not offer:
        raise HTTPException(status_code=404, detail="Upgrade not found")

    if offer.target_user_id and offer.target_user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    offer.status = "DECLINED"

    await db.commit()
    await db.refresh(offer)

    return SeatUpgradeResponse.model_validate(offer)
