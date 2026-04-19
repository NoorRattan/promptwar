from pydantic import BaseModel, ConfigDict, Field, field_validator
from datetime import datetime
import uuid


class QueueResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    venue_id: uuid.UUID
    zone_id: uuid.UUID | None
    name: str
    queue_type: str
    is_open: bool
    estimated_wait_minutes: int
    current_length: int
    throughput_per_minute: float | None
    annotation: str | None
    last_updated: datetime | None


class QueueListResponse(BaseModel):
    venue_id: uuid.UUID
    total_queues: int
    open_queues: int
    queues: list[QueueResponse]


class CreateQueueRequest(BaseModel):
    venue_id: uuid.UUID
    zone_id: uuid.UUID | None = None
    name: str = Field(min_length=1, max_length=255)
    queue_type: str
    is_open: bool = True
    estimated_wait_minutes: int = Field(default=0, ge=0, le=240)
    current_length: int = Field(default=0, ge=0)
    throughput_per_minute: float | None = Field(default=None, ge=0)
    annotation: str | None = Field(default=None, max_length=500)

    @field_validator("queue_type")
    @classmethod
    def normalize_queue_type(cls, value: str) -> str:
        return value.strip().upper()


class UpdateQueueRequest(BaseModel):
    is_open: bool | None = None
    estimated_wait_minutes: int | None = Field(default=None, ge=0, le=240)
    current_length: int | None = Field(default=None, ge=0)
    throughput_per_minute: float | None = Field(default=None, ge=0)
    annotation: str | None = Field(default=None, max_length=500)


class QueueAlertResponse(BaseModel):
    queue_id: uuid.UUID
    queue_name: str
    current_wait: int
    predicted_wait_15min: int
    alert: bool
    recommendation: str | None
