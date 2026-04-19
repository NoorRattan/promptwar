from pydantic import BaseModel, ConfigDict, Field, computed_field
from datetime import datetime, timezone
import uuid


class SeatUpgradeResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    venue_id: uuid.UUID
    from_seat: str
    to_seat: str
    from_section: str | None = None
    to_section: str | None = None
    price_difference: float
    status: str
    expires_at: datetime

    @computed_field
    def seconds_until_expiry(self) -> int:
        return max(
            0, int((self.expires_at - datetime.now(timezone.utc)).total_seconds())
        )


class CreateUpgradeRequest(BaseModel):
    venue_id: uuid.UUID
    from_seat: str
    to_seat: str
    from_section: str | None = None
    to_section: str | None = None
    price_difference: float = Field(ge=0)
    target_user_id: uuid.UUID | None = None
    expires_in_minutes: int = Field(default=30, ge=5, le=180)


class AcceptUpgradeRequest(BaseModel):
    upgrade_id: uuid.UUID
