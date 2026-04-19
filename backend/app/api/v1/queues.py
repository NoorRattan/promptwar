from fastapi import APIRouter, Depends, Request, HTTPException, BackgroundTasks
from fastapi.encoders import jsonable_encoder
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.dependencies import get_db, get_current_user, require_admin
from app.core.rate_limit import limiter, RATE_READ, RATE_WRITE
from app.db.models.queue import Queue, QueueType
from app.db.models.audit_log import AuditLog
from app.schemas.queue import (
    CreateQueueRequest,
    QueueResponse,
    QueueListResponse,
    UpdateQueueRequest,
    QueueAlertResponse,
)
from app.services import cache_service
from app.services.queue_sync import enqueue_queue_state_sync
from app.ml.wait_time_forecaster import get_forecaster
from sqlalchemy import select as sa_select
import logging
import uuid
from typing import Optional

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get(
    "",
    response_model=QueueListResponse,
    summary="List queues for venue",
    description="Returns all queues for a venue. Ordered by wait time asc.",
)
@limiter.limit(RATE_READ)
async def list_queues(
    request: Request,
    venue_id: uuid.UUID,
    queue_type: Optional[str] = None,
    open_only: bool = False,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
) -> QueueListResponse:
    """Returns QueueListResponse. Ordered by wait time asc."""
    query = select(Queue).where(Queue.venue_id == venue_id)
    if queue_type:
        query = query.where(Queue.queue_type == queue_type)
    if open_only:
        query = query.where(Queue.is_open.is_(True))

    query = query.order_by(Queue.estimated_wait_minutes.asc())

    result = await db.execute(query)
    queues = result.scalars().all()

    qr = [QueueResponse.model_validate(q) for q in queues]
    return QueueListResponse(
        venue_id=venue_id,
        total_queues=len(queues),
        open_queues=sum(1 for q in queues if q.is_open),
        queues=qr,
    )


@router.get(
    "/alerts",
    response_model=list[QueueAlertResponse],
    summary="Get queue alerts",
    description="Admin only. Returns queue wait predictions.",
)
@limiter.limit(RATE_READ)
async def get_queue_alerts(
    request: Request,
    venue_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_admin),
) -> list[QueueAlertResponse]:
    """Admin only, venue_id param. Returns queue wait predictions."""
    queues_result = await db.execute(sa_select(Queue).where(Queue.venue_id == venue_id))
    queues = queues_result.scalars().all()
    queue_dicts = [
        {
            "id": str(q.id),
            "name": q.name,
            "queue_type": q.queue_type,
            "estimated_wait_minutes": q.estimated_wait_minutes,
            "current_length": q.current_length,
            "is_open": q.is_open,
        }
        for q in queues
    ]
    forecaster = get_forecaster()
    forecasts = forecaster.forecast_venue_queues(queue_dicts)
    return forecasts


@router.get(
    "/{queue_id}",
    response_model=QueueResponse,
    summary="Get single queue",
    description="Returns details for a single queue.",
)
@limiter.limit(RATE_READ)
async def get_queue(
    request: Request,
    queue_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
) -> QueueResponse:
    """Get single queue. Auth: authenticated."""
    result = await db.execute(select(Queue).where(Queue.id == queue_id))
    q = result.scalar_one_or_none()
    if not q:
        raise HTTPException(status_code=404, detail="Queue not found")
    return QueueResponse.model_validate(q)


@router.post(
    "",
    response_model=QueueResponse,
    summary="Create a queue",
    description="Admin create queue and publish its initial Firestore state.",
)
@limiter.limit(RATE_WRITE)
async def create_queue(
    request: Request,
    body: CreateQueueRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_admin),
) -> QueueResponse:
    """Admin create queue."""
    try:
        queue_type = QueueType(body.queue_type)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail="Invalid queue_type") from exc

    queue = Queue(
        id=uuid.uuid4(),
        venue_id=body.venue_id,
        zone_id=body.zone_id,
        name=body.name.strip(),
        queue_type=queue_type,
        is_open=body.is_open,
        estimated_wait_minutes=body.estimated_wait_minutes,
        current_length=body.current_length,
        throughput_per_minute=body.throughput_per_minute,
        annotation=body.annotation,
    )
    db.add(queue)
    db.add(
        AuditLog(
            user_id=current_user.id,
            action="queue_created",
            resource_type="queue",
            resource_id=str(queue.id),
            details={"after": jsonable_encoder(body.model_dump())},
            ip_address=request.client.host if request.client else None,
        )
    )
    await db.commit()
    await db.refresh(queue)

    enqueue_queue_state_sync(background_tasks, queue)
    await cache_service.delete(cache_service.queues_key(str(queue.venue_id)))
    return QueueResponse.model_validate(queue)


@router.patch(
    "/{queue_id}",
    response_model=QueueResponse,
    summary="Update queue state",
    description="Admin update queue state and trigger Firestore write.",
)
@limiter.limit(RATE_WRITE)
async def update_queue(
    request: Request,
    queue_id: uuid.UUID,
    body: UpdateQueueRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_admin),
) -> QueueResponse:
    """Admin update."""
    result = await db.execute(select(Queue).where(Queue.id == queue_id))
    q = result.scalar_one_or_none()
    if not q:
        raise HTTPException(status_code=404, detail="Queue not found")

    update_data = body.model_dump(exclude_unset=True)
    before_state = {k: getattr(q, k) for k in update_data.keys()}

    for key, value in update_data.items():
        setattr(q, key, value)

    audit = AuditLog(
        user_id=current_user.id,
        action="queue_updated",
        resource_type="queue",
        resource_id=str(q.id),
        details={
            "before": jsonable_encoder(before_state),
            "after": jsonable_encoder(update_data),
        },
        ip_address=request.client.host if request.client else None,
    )
    db.add(audit)
    await db.commit()
    await db.refresh(q)

    enqueue_queue_state_sync(background_tasks, q)
    await cache_service.delete(cache_service.queues_key(str(q.venue_id)))
    return QueueResponse.model_validate(q)
