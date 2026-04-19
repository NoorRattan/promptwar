"""FastAPI application entry point."""

import logging
import threading
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.core.config import settings
from app.core.exceptions import register_exception_handlers
from app.core.middleware import RequestLoggingMiddleware, SecurityHeadersMiddleware
from app.core.rate_limit import limiter
from app.db.base import create_tables
from app.firebase.admin import initialize_firebase
from app.api.v1.router import api_router

logger = logging.getLogger(__name__)


def _prewarm_ml_models() -> None:
    """Warm ML singletons without blocking server startup."""
    try:
        from app.ml.crowd_predictor import get_predictor
        from app.ml.wait_time_forecaster import get_forecaster

        get_predictor()
        get_forecaster()
    except Exception as exc:  # pragma: no cover - startup integration
        logger.warning("ML prewarm failed: %s", exc)


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    """Initialize Firebase and database schema, then warm ML models."""
    initialize_firebase()
    await create_tables()
    threading.Thread(target=_prewarm_ml_models, daemon=True).start()
    yield
    from app.services.cache_service import close as close_cache

    await close_cache()


app = FastAPI(
    title="CrowdIQ API",
    version=settings.APP_VERSION,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)  # type: ignore[arg-type]
register_exception_handlers(app)

app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(RequestLoggingMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=[
        "Authorization",
        "Content-Type",
        "Accept",
        "Origin",
        "X-Requested-With",
    ],
    expose_headers=["*"],
    max_age=600,
)
app.include_router(api_router, prefix="/api/v1")


@app.get("/health", tags=["health"])
async def health_check() -> dict[str, str]:
    """Cloud Run health endpoint."""
    return {"status": "healthy", "service": "crowdiq-api"}


@app.get("/", include_in_schema=False)
async def root() -> dict[str, str]:
    """Small root payload for local smoke tests."""
    return {"message": "CrowdIQ API is running. Visit /docs for API documentation."}
