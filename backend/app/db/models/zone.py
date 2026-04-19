"""Zone model."""

import enum
import uuid
from sqlalchemy import (
    Column,
    String,
    Integer,
    Float,
    Boolean,
    JSON,
    DateTime,
    func,
    ForeignKey,
    Index,
    Enum as SAEnum,
)
from sqlalchemy.dialects.postgresql import UUID
from app.db.base import Base


class ZoneType(str, enum.Enum):
    ENTRY = "ENTRY"
    CONCOURSE = "CONCOURSE"
    SEATING = "SEATING"
    FOOD = "FOOD"
    RESTROOM = "RESTROOM"
    MEDICAL = "MEDICAL"
    EXIT = "EXIT"
    STAFF = "STAFF"


class DensityLevel(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class Zone(Base):
    """
    Zone model representing distinct areas within a venue.
    Monitors crowd density and capacity levels.
    """

    __tablename__ = "zones"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    venue_id = Column(
        UUID(as_uuid=True), ForeignKey("venues.id"), nullable=False, index=True
    )
    name = Column(String(255), nullable=False)
    zone_type = Column(SAEnum(ZoneType), nullable=False)
    capacity = Column(Integer, nullable=False)
    current_count = Column(Integer, default=0, nullable=False)
    current_density = Column(Float, default=0.0, nullable=False)
    density_level = Column(
        SAEnum(DensityLevel), default=DensityLevel.LOW, nullable=False
    )
    lat_center = Column(Float, nullable=False)
    lng_center = Column(Float, nullable=False)
    polygon = Column(JSON, nullable=True)
    is_open = Column(Boolean, default=True, nullable=False)
    is_exit_blocked = Column(Boolean, default=False, nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


Index("idx_zones_venue_id", Zone.venue_id)
