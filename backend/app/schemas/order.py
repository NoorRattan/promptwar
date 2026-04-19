from pydantic import BaseModel, ConfigDict, Field, field_serializer, field_validator
from datetime import datetime
import uuid


class MenuItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    venue_id: uuid.UUID
    name: str
    description: str | None = None
    price: float
    category: str
    dietary_tags: list[str] = Field(default_factory=list)
    image_url: str | None = None
    prep_time_minutes: int
    is_available: bool
    is_sold_out: bool

    @field_serializer("category")
    def serialize_category(self, value: str) -> str:
        return str(value.value if hasattr(value, "value") else value).lower()


class OrderItemRequest(BaseModel):
    menu_item_id: uuid.UUID
    quantity: int = Field(ge=1, le=20)
    special_instructions: str | None = Field(default=None, max_length=200)


class CreateOrderRequest(BaseModel):
    items: list[OrderItemRequest] = Field(min_length=1, max_length=20)
    pickup_zone_id: uuid.UUID
    pickup_slot: datetime
    special_instructions: str | None = Field(default=None, max_length=500)
    is_demo: bool = Field(default=False)

    @field_validator("pickup_slot")
    @classmethod
    def validate_future_slot(cls, v: datetime) -> datetime:
        from datetime import timezone

        if v.astimezone(timezone.utc) < datetime.now(timezone.utc):
            raise ValueError("Pickup slot must be in the future")
        return v


class OrderResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    order_code: str
    user_id: uuid.UUID
    venue_id: uuid.UUID
    items: list[dict[str, object]]
    total_price: float
    status: str
    pickup_zone_id: uuid.UUID | None = None
    pickup_slot: datetime | None = None
    special_instructions: str | None = None
    is_demo: bool
    created_at: datetime
    updated_at: datetime | None = None

    @field_serializer("status")
    def serialize_status(self, value: str) -> str:
        return str(value.value if hasattr(value, "value") else value).lower()


class UpdateOrderStatusRequest(BaseModel):
    status: str

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: str) -> str:
        normalized = v.strip().lower()
        valid = ["confirmed", "preparing", "ready", "collected", "cancelled"]
        if normalized not in valid:
            raise ValueError(f"Status must be one of {valid}")
        return normalized.upper()


class MenuAvailabilityRequest(BaseModel):
    is_sold_out: bool
    is_available: bool | None = None
