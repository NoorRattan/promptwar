"""StaffTask model."""

import enum
import uuid
from sqlalchemy import Column, String, DateTime, func, ForeignKey, Index, Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID
from app.db.base import Base


class TaskType(str, enum.Enum):
    CROWD_CONTROL = "CROWD_CONTROL"
    MEDICAL_ASSIST = "MEDICAL_ASSIST"
    QUEUE_MANAGEMENT = "QUEUE_MANAGEMENT"
    INCIDENT_RESPONSE = "INCIDENT_RESPONSE"
    GENERAL = "GENERAL"


class TaskPriority(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class TaskStatus(str, enum.Enum):
    PENDING = "PENDING"
    ACKNOWLEDGED = "ACKNOWLEDGED"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    ESCALATED = "ESCALATED"


class StaffTask(Base):
    """
    StaffTask model for tracking assignments given to staff members.
    """

    __tablename__ = "staff_tasks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    venue_id = Column(
        UUID(as_uuid=True), ForeignKey("venues.id"), nullable=False, index=True
    )
    assigned_to = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    zone_id = Column(UUID(as_uuid=True), ForeignKey("zones.id"), nullable=True)
    task_type = Column(SAEnum(TaskType), nullable=False)
    priority = Column(SAEnum(TaskPriority), nullable=False)
    status = Column(SAEnum(TaskStatus), default=TaskStatus.PENDING, nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(String(1000), nullable=True)
    incident_id = Column(UUID(as_uuid=True), ForeignKey("incidents.id"), nullable=True)
    due_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)


Index("idx_staff_tasks_assigned_to", StaffTask.assigned_to)
