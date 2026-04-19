"""AuditLog model."""

import uuid
from sqlalchemy import Column, String, JSON, DateTime, func, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from app.db.base import Base


class AuditLog(Base):
    """
    Immutable audit trail of all sensitive admin and staff actions.
    Records are append-only — no updates, no deletes.
    Used for post-incident analysis and compliance review.

    IMMUTABLE: No updates or deletes permitted on audit log records.
    """

    __tablename__ = "audit_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    action = Column(String(100), nullable=False)
    resource_type = Column(String(50), nullable=True)
    resource_id = Column(String(100), nullable=True)
    details = Column(JSON, nullable=True)
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(String(500), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
