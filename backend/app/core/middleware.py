"""Middleware for security headers and structured request logging."""

import json
import logging
import time
from collections.abc import Awaitable, Callable

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger(__name__)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Attach security headers to every API response."""

    async def dispatch(
        self,
        request: Request,
        call_next: Callable[[Request], Awaitable[Response]],
    ) -> Response:
        response = await call_next(request)
        csp = (
            "default-src 'self'; "
            "connect-src 'self' https://firestore.googleapis.com https://fcm.googleapis.com "
            "https://firebasestorage.googleapis.com https://maps.googleapis.com "
            "https://maps.gstatic.com https://www.gstatic.com https://www.googletagmanager.com "
            "https://www.google-analytics.com https://*.upstash.io; "
            "img-src 'self' data: blob: https://firebasestorage.googleapis.com https://maps.gstatic.com; "
            "script-src 'self'; "
            "style-src 'self' 'unsafe-inline'; "
            "frame-ancestors 'none'; "
            "base-uri 'self';"
        )
        headers = {
            "X-Content-Type-Options": "nosniff",
            "X-Frame-Options": "DENY",
            "X-XSS-Protection": "1; mode=block",
            "Referrer-Policy": "strict-origin-when-cross-origin",
            "Permissions-Policy": "camera=(), microphone=(), geolocation=(self)",
            "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
            "Content-Security-Policy": csp,
        }
        for key, value in headers.items():
            response.headers.setdefault(key, value)
        return response


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Emit structured JSON logs for Cloud Run request tracing."""

    async def dispatch(
        self,
        request: Request,
        call_next: Callable[[Request], Awaitable[Response]],
    ) -> Response:
        if request.url.path == "/health":
            return await call_next(request)

        start_time = time.perf_counter()
        response = await call_next(request)
        duration_ms = round((time.perf_counter() - start_time) * 1000, 2)
        payload = {
            "severity": "INFO",
            "message": "http_request",
            "method": request.method,
            "path": request.url.path,
            "query": request.url.query,
            "status_code": response.status_code,
            "duration_ms": duration_ms,
            "client_ip": request.client.host if request.client else None,
            "user_agent": request.headers.get("user-agent", "unknown")[:200],
        }
        logger.info(json.dumps(payload, separators=(",", ":")))
        return response
