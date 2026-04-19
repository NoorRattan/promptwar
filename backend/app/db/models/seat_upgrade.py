"""SeatUpgrade model."""

import enum
import uuid
from sqlalchemy import (
    Column,
    String,
    DateTime,
    func,
    ForeignKey,
    Numeric,
    Enum as SAEnum,
)
from sqlalchemy.dialects.postgresql import UUID
from app.db.base import Base


class UpgradeStatus(str, enum.Enum):
    AVAILABLE = "AVAILABLE"
    SENT = "SENT"
    VIEWED = "VIEWED"
    ACCEPTED = "ACCEPTED"
    DECLINED = "DECLINED"
    EXPIRED = "EXPIRED"


class SeatUpgrade(Base):
    """
    SeatUpgrade model for managing seat upgrades targeted or broadcast to users.
    """

    __tablename__ = "seat_upgrades"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    venue_id = Column(
        UUID(as_uuid=True), ForeignKey("venues.id"), nullable=False, index=True
    )
    from_seat = Column(String(20), nullable=False)
    to_seat = Column(String(20), nullable=False)
    from_section = Column(String(50), nullable=True)
    to_section = Column(String(50), nullable=True)
    price_difference = Column(Numeric(10, 2), nullable=False)
    status = Column(SAEnum(UpgradeStatus), default=UpgradeStatus.SENT, nullable=False)
    target_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    accepted_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
