"""User model."""

import enum
import uuid
from sqlalchemy import String, DateTime, func, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy import Column, Enum as SAEnum
from sqlalchemy.orm import synonym
from app.db.base import Base


class UserRole(str, enum.Enum):
    ATTENDEE = "ATTENDEE"
    STAFF = "STAFF"
    ADMIN = "ADMIN"
    EMERGENCY = "EMERGENCY"


class User(Base):
    """
    User model representing attendees, staff, and admins.
    Links to Firebase authentication via firebase_uid.
    """

    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    firebase_uid = Column(String(128), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False)
    name = Column(String(255), nullable=True)
    full_name = synonym("name")
    role = Column(
        SAEnum(UserRole, name="user_role_enum"),
        default=UserRole.ATTENDEE,
        nullable=False,
    )
    preferred_language = Column(String(10), default="en", nullable=False)
    venue_id = Column(UUID(as_uuid=True), ForeignKey("venues.id"), nullable=True)
    seat_number = Column(String(20), nullable=True)
    fcm_token = Column(String(512), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)
