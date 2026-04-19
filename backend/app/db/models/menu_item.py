"""MenuItem model."""

import enum
import uuid
from sqlalchemy import (
    Column,
    String,
    Integer,
    Boolean,
    JSON,
    DateTime,
    func,
    ForeignKey,
    Numeric,
    Enum as SAEnum,
)
from sqlalchemy.dialects.postgresql import UUID
from app.db.base import Base


class MenuCategory(str, enum.Enum):
    HOT_FOOD = "HOT_FOOD"
    SNACKS = "SNACKS"
    BEVERAGES = "BEVERAGES"
    ALCOHOL = "ALCOHOL"
    MERCHANDISE = "MERCHANDISE"


class MenuItem(Base):
    """
    MenuItem model representing F&B items available for order.
    """

    __tablename__ = "menu_items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    venue_id = Column(
        UUID(as_uuid=True), ForeignKey("venues.id"), nullable=False, index=True
    )
    name = Column(String(255), nullable=False)
    description = Column(String(1000), nullable=True)
    price = Column(Numeric(10, 2), nullable=False)
    category = Column(SAEnum(MenuCategory), nullable=False)
    dietary_tags = Column(JSON, default=list)
    image_url = Column(String(1000), nullable=True)
    prep_time_minutes = Column(Integer, default=5, nullable=False)
    is_available = Column(Boolean, default=True, nullable=False)
    is_sold_out = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)
