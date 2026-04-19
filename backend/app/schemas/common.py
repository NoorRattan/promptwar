from pydantic import BaseModel, ConfigDict, Field
from typing import Generic, TypeVar
import uuid

T = TypeVar("T")


class PaginatedResponse(BaseModel, Generic[T]):
    """Generic paginated response wrapper for list endpoints."""

    model_config = ConfigDict(arbitrary_types_allowed=True)
    items: list[T]
    total: int = Field(description="Total number of matching records in the database")
    page: int = Field(ge=1, description="Current page number (1-indexed)")
    page_size: int = Field(ge=1, le=100, description="Number of items per page")
    has_next: bool = Field(description="Whether a next page exists")
    has_prev: bool = Field(description="Whether a previous page exists")


class ErrorResponse(BaseModel):
    """Standard API error response body."""

    error: str = Field(description="Machine-readable error code (snake_case)")
    message: str = Field(description="Human-readable error description")
    details: dict[str, object] | None = Field(
        default=None, description="Optional structured error details"
    )


class SuccessResponse(BaseModel):
    """Simple success acknowledgement for operations with no meaningful return value."""

    success: bool = Field(default=True)
    message: str = Field(description="Human-readable confirmation message")


class UUIDResponse(BaseModel):
    """Response containing a single created resource UUID."""

    id: uuid.UUID = Field(description="UUID of the created resource")


class PaginationParams(BaseModel):
    """Reusable query parameters for paginated list endpoints."""

    page: int = Field(default=1, ge=1, description="Page number (1-indexed)")
    page_size: int = Field(default=20, ge=1, le=100, description="Items per page")


def paginate_query(total: int, page: int, page_size: int) -> dict[str, int | bool]:
    """
    Calculate pagination metadata for a list response.

    Args:
        total: Total number of records matching the query filters
        page: Current page number (1-indexed)
        page_size: Number of items per page

    Returns:
        dict with keys: total, page, page_size, has_next, has_prev
    """
    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "has_next": (page * page_size) < total,
        "has_prev": page > 1,
    }
