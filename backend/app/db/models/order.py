"""Order model."""

import enum
import uuid
from sqlalchemy import (
    Column,
    String,
    Boolean,
    JSON,
    DateTime,
    func,
    ForeignKey,
    Index,
    Numeric,
    Enum as SAEnum,
)
from sqlalchemy.dialects.postgresql import UUID
from app.db.base import Base


class OrderStatus(str, enum.Enum):
    RECEIVED = "RECEIVED"
    CONFIRMED = "CONFIRMED"
    PREPARING = "PREPARING"
    READY = "READY"
    COLLECTED = "COLLECTED"
    CANCELLED = "CANCELLED"


class Order(Base):
    """
    Order model tracking F&B purchases from placement to collection.
    """

    __tablename__ = "orders"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    order_code = Column(String(8), unique=True, nullable=False)
    user_id = Column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True
    )
    venue_id = Column(
        UUID(as_uuid=True), ForeignKey("venues.id"), nullable=False, index=True
    )
    items = Column(JSON, nullable=False)
    total_price = Column(Numeric(10, 2), nullable=False)
    status = Column(
        SAEnum(OrderStatus), default=OrderStatus.RECEIVED, nullable=False, index=True
    )
    pickup_zone_id = Column(UUID(as_uuid=True), ForeignKey("zones.id"), nullable=True)
    pickup_slot = Column(DateTime(timezone=True), nullable=True)
    special_instructions = Column(String(500), nullable=True)
    is_demo = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)


Index("idx_orders_user_id", Order.user_id)
Index("idx_orders_status", Order.status)
Index("idx_orders_venue_id", Order.venue_id)
