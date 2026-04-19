"""Queue model."""

import enum
import uuid
from sqlalchemy import (
    Column,
    String,
    Integer,
    Float,
    Boolean,
    DateTime,
    func,
    ForeignKey,
    Index,
    Enum as SAEnum,
)
from sqlalchemy.dialects.postgresql import UUID
from app.db.base import Base


class QueueType(str, enum.Enum):
    FOOD = "FOOD"
    RESTROOM = "RESTROOM"
    ENTRY = "ENTRY"
    MERCHANDISE = "MERCHANDISE"
    MEDICAL = "MEDICAL"
    INFORMATION = "INFORMATION"


class Queue(Base):
    """
    Queue model tracking wait times for services.
    Used for predictive analytics and crowd directing.
    """

    __tablename__ = "queues"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    venue_id = Column(
        UUID(as_uuid=True), ForeignKey("venues.id"), nullable=False, index=True
    )
    zone_id = Column(UUID(as_uuid=True), ForeignKey("zones.id"), nullable=True)
    name = Column(String(255), nullable=False)
    queue_type = Column(SAEnum(QueueType), nullable=False)
    is_open = Column(Boolean, default=True, nullable=False)
    estimated_wait_minutes = Column(Integer, default=0, nullable=False)
    current_length = Column(Integer, default=0, nullable=False)
    throughput_per_minute = Column(Float, default=0.0, nullable=True)
    annotation = Column(String(500), nullable=True)
    last_updated = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
    created_at = Column(DateTime(timezone=True), server_default=func.now())


Index("idx_queues_venue_id", Queue.venue_id)
