from pydantic import (
    BaseModel,
    ConfigDict,
    EmailStr,
    Field,
    field_serializer,
    field_validator,
)
from datetime import datetime
import uuid


class RegisterRequest(BaseModel):
    """New attendee or staff registration. Called after Firebase Auth account creation."""

    email: EmailStr
    full_name: str = Field(min_length=2, max_length=100)
    preferred_language: str = Field(default="en", pattern="^(en|hi|es|fr|ar|pt)$")
    venue_id: uuid.UUID | None = Field(default=None)
    seat_number: str | None = Field(default=None, max_length=20)

    @field_validator("full_name")
    @classmethod
    def sanitize_full_name(cls, v: str) -> str:
        """Strip whitespace and reject HTML characters."""
        import re

        v = v.strip()
        if re.search(r"[<>&\"']", v):
            raise ValueError("Name contains invalid characters.")
        return v


class UpdateProfileRequest(BaseModel):
    """Partial profile update — all fields optional."""

    full_name: str | None = Field(default=None, min_length=2, max_length=100)
    preferred_language: str | None = Field(
        default=None, pattern="^(en|hi|es|fr|ar|pt)$"
    )
    seat_number: str | None = Field(default=None, max_length=20)
    venue_id: uuid.UUID | None = Field(default=None)


class UpdateFCMTokenRequest(BaseModel):
    """Update the FCM device token for push notifications."""

    fcm_token: str = Field(
        min_length=10,
        max_length=512,
        description="Firebase Cloud Messaging device registration token",
    )


class UserResponse(BaseModel):
    """Public user profile response."""

    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    email: str
    full_name: str | None
    role: str
    preferred_language: str
    venue_id: uuid.UUID | None
    seat_number: str | None
    created_at: datetime

    @field_serializer("role")
    def serialize_role(self, value: str) -> str:
        return str(value.value if hasattr(value, "value") else value).lower()


class AuthStatusResponse(BaseModel):
    """Response confirming authentication state."""

    is_authenticated: bool
    user: UserResponse | None
