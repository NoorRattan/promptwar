"""Incident model."""

import enum
import uuid
from sqlalchemy import (
    Column,
    String,
    Integer,
    JSON,
    DateTime,
    func,
    ForeignKey,
    Enum as SAEnum,
)
from sqlalchemy.dialects.postgresql import UUID
from app.db.base import Base


class IncidentType(str, enum.Enum):
    FIRE = "FIRE"
    MEDICAL = "MEDICAL"
    SECURITY = "SECURITY"
    WEATHER = "WEATHER"
    CROWD = "CROWD"
    GENERAL = "GENERAL"


class IncidentSeverity(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class IncidentStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    RESOLVED = "RESOLVED"
    CLOSED = "CLOSED"


class Incident(Base):
    """
    Incident model tracking emergency and operational events.
    """

    __tablename__ = "incidents"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    venue_id = Column(
        UUID(as_uuid=True), ForeignKey("venues.id"), nullable=False, index=True
    )
    zone_id = Column(UUID(as_uuid=True), ForeignKey("zones.id"), nullable=True)
    incident_type = Column(SAEnum(IncidentType), nullable=False)
    severity = Column(SAEnum(IncidentSeverity), nullable=False)
    status = Column(
        SAEnum(IncidentStatus), default=IncidentStatus.ACTIVE, nullable=False
    )
    title = Column(String(255), nullable=False)
    description = Column(String(2000), nullable=True)
    reported_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    affected_zones = Column(JSON, nullable=True)
    activated_at = Column(DateTime(timezone=True), nullable=True)
    deactivated_at = Column(DateTime(timezone=True), nullable=True)
    attendees_affected = Column(Integer, nullable=True)
    sos_reports_count = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)
