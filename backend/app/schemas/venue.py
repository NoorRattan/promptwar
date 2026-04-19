from pydantic import BaseModel, ConfigDict, Field, field_serializer
import uuid


class ZoneResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    venue_id: uuid.UUID
    name: str
    zone_type: str
    capacity: int
    current_count: int
    current_density: float
    density_level: str
    lat_center: float
    lng_center: float
    polygon: list[dict[str, float]] | None
    is_open: bool
    is_exit_blocked: bool

    @field_serializer("zone_type", "density_level")
    def serialize_enum_fields(self, value: str) -> str:
        return str(value.value if hasattr(value, "value") else value).lower()


class VenueResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    name: str
    address: str
    city: str
    country: str
    capacity: int
    lat_center: float
    lng_center: float
    floor_plan_url: str | None = None
    floor_plan_bounds: dict[str, object] | None = None
    timezone: str
    is_active: bool


class VenueDetailResponse(VenueResponse):
    """Full venue response including all zones. Used for initial app bootstrap."""

    zones: list[ZoneResponse] = Field(default_factory=list)


class RouteStep(BaseModel):
    instruction: str
    distance: str | float
    duration: str | float
    start_lat: str | float
    start_lng: str | float


class RouteResponse(BaseModel):
    """Navigation route from Google Maps Directions API."""

    distance: str
    duration: str
    steps: list[RouteStep]
    polyline: str


class ZoneUpdateRequest(BaseModel):
    """Fields to update on a Zone."""

    is_open: bool | None = None
    is_exit_blocked: bool | None = None
