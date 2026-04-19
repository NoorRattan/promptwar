"""Database engine and declarative base."""

import asyncio
import logging

from sqlalchemy.ext.asyncio import AsyncEngine, create_async_engine
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.pool import NullPool

from app.core.config import settings

logger = logging.getLogger(__name__)


class Base(DeclarativeBase):
    """Base declarative class for all ORM models."""


engine: AsyncEngine = create_async_engine(
    settings.DATABASE_URL,
    poolclass=NullPool,
    echo=settings.DEBUG,
)


async def create_tables() -> None:
    """Create tables with a short retry loop for cold-start connectivity."""
    last_error: Exception | None = None
    for attempt in range(1, 4):
        try:
            async with engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)
            return
        except Exception as exc:  # pragma: no cover - exercised in deployment
            last_error = exc
            logger.warning(
                "Database initialization attempt %s failed: %s", attempt, exc
            )
            await asyncio.sleep(attempt)
    if last_error is not None:
        raise last_error
