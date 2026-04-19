from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.dependencies import get_db, require_admin
from app.core.rate_limit import limiter, RATE_READ
from app.services.analytics_service import (
    get_orders_summary,
    get_queues_summary,
    get_crowd_summary,
    get_upgrades_summary,
    get_incidents_summary,
    get_order_chart_data,
)
from app.services import cache_service
import uuid
import logging
from datetime import datetime

router = APIRouter()
logger = logging.getLogger(__name__)


class AnalyticsSummaryResponse(BaseModel):
    date: str
    venue_id: uuid.UUID
    orders: dict
    queues: dict
    crowd: dict
    upgrades: dict
    incidents: dict


@router.get(
    "/summary",
    response_model=AnalyticsSummaryResponse,
    summary="Get analytics summary",
    description="Aggregates from PostgreSQL using SQL aggregates.",
)
@limiter.limit(RATE_READ)
async def get_analytics_summary(
    request: Request,
    venue_id: uuid.UUID,
    date: str = str(datetime.utcnow().date()),
    db: AsyncSession = Depends(get_db),
    _=Depends(require_admin),
) -> AnalyticsSummaryResponse:
    cache_key = f"crowdiq:{venue_id}:analytics:{date}"
    cached = await cache_service.get_json(cache_key)
    if cached:
        return cached

    date_obj = datetime.strptime(date, "%Y-%m-%d").date()

    orders = await get_orders_summary(db, str(venue_id), date_obj)
    queues = await get_queues_summary(db, str(venue_id))
    crowd = await get_crowd_summary(db, str(venue_id))
    upgrades = await get_upgrades_summary(db, str(venue_id))
    incidents = await get_incidents_summary(db, str(venue_id), date_obj)

    result_dict = AnalyticsSummaryResponse(
        date=date,
        venue_id=venue_id,
        orders=orders,
        queues=queues,
        crowd=crowd,
        upgrades=upgrades,
        incidents=incidents,
    )
    await cache_service.set_json(cache_key, result_dict.model_dump(), ttl_seconds=30)
    return result_dict


@router.get(
    "/orders/chart",
    response_model=dict,
    summary="Get orders chart data",
    description="Returns Google Charts DataTable format.",
)
@limiter.limit(RATE_READ)
async def get_orders_chart(
    request: Request,
    venue_id: uuid.UUID,
    days: int = 7,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_admin),
) -> dict:
    # Stub response
    return await get_order_chart_data(db, str(venue_id), days)
