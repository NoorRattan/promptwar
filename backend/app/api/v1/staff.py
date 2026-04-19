from fastapi import APIRouter, Depends, Request, HTTPException, BackgroundTasks
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.dependencies import get_db, get_current_user, require_admin
from app.core.rate_limit import limiter, RATE_READ, RATE_WRITE
from app.db.models.staff_task import StaffTask
from app.db.models.audit_log import AuditLog
import uuid
import logging
from typing import Optional
from datetime import datetime

router = APIRouter()
logger = logging.getLogger(__name__)


async def _send_fcm_task(user_id, message): ...


class TaskResponse(BaseModel):
    id: uuid.UUID
    venue_id: uuid.UUID
    assigned_to: uuid.UUID | None
    zone_id: uuid.UUID | None
    task_type: str
    priority: str
    status: str
    title: str
    description: str | None
    due_at: datetime | None

    class Config:
        from_attributes = True


class CreateTaskRequest(BaseModel):
    venue_id: uuid.UUID
    assigned_to: uuid.UUID | None = None
    zone_id: uuid.UUID | None = None
    task_type: str
    priority: str
    title: str
    description: str | None = None
    due_at: datetime | None = None


class UpdateTaskStatusRequest(BaseModel):
    status: str = Field(pattern="^(acknowledged|in_progress|completed|escalated)$")


@router.get(
    "/tasks",
    response_model=list[TaskResponse],
    summary="List staff tasks",
    description="List tasks for venue. Staff only saw own, Admin sees all.",
)
@limiter.limit(RATE_READ)
async def list_tasks(
    request: Request,
    venue_id: uuid.UUID,
    assigned_to: Optional[uuid.UUID] = None,
    status: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(
        get_current_user
    ),  # Wait, prompt says `Auth: require_admin. Staff see only own...` Wait, require_admin means only admin can access. But staff need it?
    # I'll let staff access if it says "Staff see only own tasks". get_current_user handles authenticating any user role. We check role inside.
) -> list[TaskResponse]:
    # Ensure only authorized people access
    if current_user.role not in ["staff", "admin"]:
        raise HTTPException(status_code=403, detail="Not authorized")

    query = select(StaffTask).where(StaffTask.venue_id == venue_id)

    if current_user.role == "staff":
        query = query.where(StaffTask.assigned_to == current_user.id)
    elif assigned_to:
        query = query.where(StaffTask.assigned_to == assigned_to)

    if status:
        query = query.where(StaffTask.status == status)

    # Ordered: CRITICAL first, then due_at asc -> We will do order_by roughly
    from sqlalchemy import case

    priority_order = case(
        (StaffTask.priority == "CRITICAL", 1),
        (StaffTask.priority == "HIGH", 2),
        (StaffTask.priority == "MEDIUM", 3),
        (StaffTask.priority == "LOW", 4),
        else_=5,
    )
    query = query.order_by(priority_order, StaffTask.due_at.asc())

    # We must be careful: StaffTask due_at might be nullable.
    # We handle sorting fine in Postgres.
    result = await db.execute(query)
    return [TaskResponse.model_validate(t) for t in result.scalars().all()]


@router.post(
    "/tasks",
    response_model=TaskResponse,
    summary="Create staff task",
    description="Admin create task.",
)
@limiter.limit(RATE_WRITE)
async def create_task(
    request: Request,
    body: CreateTaskRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_admin),
) -> TaskResponse:
    task = StaffTask(
        id=uuid.uuid4(),
        venue_id=body.venue_id,
        assigned_to=body.assigned_to,
        zone_id=body.zone_id,
        task_type=body.task_type,
        priority=body.priority,
        status="PENDING",
        title=body.title,
        description=body.description,
        due_at=body.due_at,
        created_by_id=current_user.id,
    )
    db.add(task)

    audit = AuditLog(
        user_id=current_user.id,
        action="task_created",
        resource_type="staff_task",
        resource_id=str(task.id),
        ip_address=request.client.host if request.client else None,
    )
    db.add(audit)
    await db.commit()
    await db.refresh(task)

    if body.assigned_to:
        background_tasks.add_task(_send_fcm_task, body.assigned_to, "New task assigned")

    return TaskResponse.model_validate(task)


@router.patch(
    "/tasks/{task_id}/status",
    response_model=TaskResponse,
    summary="Update task status",
    description="Update status.",
)
@limiter.limit(RATE_WRITE)
async def update_task_status(
    request: Request,
    task_id: uuid.UUID,
    body: UpdateTaskStatusRequest,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
) -> TaskResponse:
    if current_user.role not in ["staff", "admin"]:
        raise HTTPException(status_code=403, detail="Not authorized")

    res = await db.execute(select(StaffTask).where(StaffTask.id == task_id))
    task = res.scalar_one_or_none()

    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    if current_user.role == "staff" and task.assigned_to != current_user.id:
        raise HTTPException(status_code=403, detail="Can only update own task")

    task.status = body.status

    audit = AuditLog(
        user_id=current_user.id,
        action="task_status_updated",
        resource_type="staff_task",
        resource_id=str(task.id),
        details={"new_status": body.status},
        ip_address=request.client.host if request.client else None,
    )
    db.add(audit)
    await db.commit()
    await db.refresh(task)

    return TaskResponse.model_validate(task)
