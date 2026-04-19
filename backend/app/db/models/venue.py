"""Venue model."""

import uuid
from sqlalchemy import Column, String, Integer, Float, Boolean, JSON, DateTime, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.db.base import Base


class Venue(Base):
    """
    Venue model representing a stadium or event location.
    Stores physical attributes, location, and metadata.
    """

    __tablename__ = "venues"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    address = Column(String(500), nullable=False)
    city = Column(String(100), nullable=False)
    country = Column(String(100), nullable=False)
    capacity = Column(Integer, nullable=False)
    lat_center = Column(Float, nullable=False)
    lng_center = Column(Float, nullable=False)
    floor_plan_url = Column(String(1000), nullable=True)
    floor_plan_bounds = Column(JSON, nullable=True)
    timezone = Column(String(50), default="UTC", nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    zones = relationship("Zone", lazy="selectin")
