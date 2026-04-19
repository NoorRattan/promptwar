"""Custom exceptions and exception handlers."""

import logging
from collections.abc import Mapping

from fastapi import FastAPI, HTTPException, Request
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.status import (
    HTTP_422_UNPROCESSABLE_ENTITY,
    HTTP_500_INTERNAL_SERVER_ERROR,
)

logger = logging.getLogger(__name__)


def error_response(
    error: str,
    message: str,
    details: Mapping[str, object] | None = None,
) -> dict[str, object]:
    """Build the standard API error response payload."""
    response: dict[str, object] = {"error": error, "message": message}
    if details:
        response["details"] = details
    return response


class NotFoundError(HTTPException):
    """Resource not found."""

    def __init__(self, resource: str, resource_id: str | None = None) -> None:
        detail = f"{resource} not found."
        if resource_id:
            detail = f"{resource} with id '{resource_id}' not found."
        super().__init__(status_code=404, detail=detail)


class UnauthorizedError(HTTPException):
    """Missing or invalid authentication."""

    def __init__(self, message: str = "Authentication required.") -> None:
        super().__init__(status_code=401, detail=message)


class ForbiddenError(HTTPException):
    """Insufficient permissions."""

    def __init__(self, message: str = "Insufficient permissions.") -> None:
        super().__init__(status_code=403, detail=message)


class ConflictError(HTTPException):
    """Resource conflict."""

    def __init__(self, message: str) -> None:
        super().__init__(status_code=409, detail=message)


class ValidationError(HTTPException):
    """Business logic validation failure."""

    def __init__(self, message: str, field: str | None = None) -> None:
        detail = {"message": message}
        if field:
            detail["field"] = field
        super().__init__(status_code=400, detail=detail)


class ServiceUnavailableError(HTTPException):
    """External service unavailable."""

    def __init__(self, service: str) -> None:
        super().__init__(
            status_code=503,
            detail=f"{service} is temporarily unavailable. Please try again shortly.",
        )


def register_exception_handlers(app: FastAPI) -> None:
    """Register all application-wide exception handlers."""

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(
        request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        details = {"fields": jsonable_encoder(exc.errors())}
        return JSONResponse(
            status_code=HTTP_422_UNPROCESSABLE_ENTITY,
            content=error_response(
                "validation_error",
                "Request validation failed.",
                details,
            ),
        )

    @app.exception_handler(HTTPException)
    async def http_exception_handler(
        request: Request, exc: HTTPException
    ) -> JSONResponse:
        detail = exc.detail
        if isinstance(detail, Mapping):
            raw_message = detail.get("message")
            message = raw_message if isinstance(raw_message, str) else str(detail)
        else:
            message = str(detail)

        return JSONResponse(
            status_code=exc.status_code,
            content=error_response("http_error", message),
        )

    @app.exception_handler(Exception)
    async def global_exception_handler(
        request: Request, exc: Exception
    ) -> JSONResponse:
        logger.exception("Unhandled exception")
        return JSONResponse(
            status_code=HTTP_500_INTERNAL_SERVER_ERROR,
            content=error_response(
                "internal_server_error",
                "An unexpected error occurred.",
            ),
        )
