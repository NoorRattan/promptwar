from pydantic import BaseModel, ConfigDict, Field
from datetime import datetime
import uuid


class ZoneDensityResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    zone_id: uuid.UUID
    venue_id: uuid.UUID
    zone_name: str
    density: float = Field(ge=0.0, le=1.0)
    level: str  # LOW|MEDIUM|HIGH|CRITICAL
    count: int
    is_open: bool
    updated_at: datetime | None


class UpdateDensityRequest(BaseModel):
    density: float = Field(ge=0.0, le=1.0)
    count: int = Field(ge=0)
    venue_id: uuid.UUID


class VenueDensitySummary(BaseModel):
    venue_id: uuid.UUID
    total_zones: int
    critical_zones: int
    high_zones: int
    medium_zones: int
    low_zones: int
    overall_level: str
    zones: list[ZoneDensityResponse]


class CongestionPrediction(BaseModel):
    zone_id: uuid.UUID
    zone_name: str
    predicted_level_15min: str
    predicted_level_30min: str
    confidence: float = Field(ge=0.0, le=1.0)
    alert: bool
    alert_message: str | None = None
