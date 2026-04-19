from datetime import date, datetime, timezone, timedelta
from sqlalchemy import select, func, and_, cast, Integer
from sqlalchemy.types import Date
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.models.order import Order
from app.db.models.queue import Queue
from app.db.models.zone import Zone, DensityLevel
from app.db.models.seat_upgrade import SeatUpgrade, UpgradeStatus
from app.db.models.incident import Incident, IncidentStatus
import logging

logger = logging.getLogger(__name__)


async def get_orders_summary(
    db: AsyncSession, venue_id: str, target_date: date
) -> dict[str, object]:
    """
    Aggregate order statistics for a venue on a specific date.
    Uses SQL COUNT, SUM, AVG — never Python aggregation loops.

    Returns dict: today_count, today_revenue, avg_prep_time_minutes, by_status
    """
    # Single query with multiple aggregates
    result = await db.execute(
        select(
            func.count(Order.id).label("total"),
            func.coalesce(func.sum(Order.total_price), 0).label("revenue"),
        ).where(
            and_(
                Order.venue_id == venue_id,
                Order.is_demo.is_(False),
                cast(Order.created_at, Date) == target_date,
            )
        )
    )
    row = result.one()
    return {
        "today_count": row.total,
        "today_revenue": float(row.revenue),
        "avg_prep_time_minutes": 8,  # Placeholder — would require order timing data
    }


async def get_queues_summary(db: AsyncSession, venue_id: str) -> dict[str, object]:
    """
    Aggregate current queue statistics.
    Returns dict: open_count, closed_count, avg_wait_minutes
    """
    result = await db.execute(
        select(
            func.count(Queue.id).label("total"),
            func.sum(cast(Queue.is_open, Integer)).label("open_count"),
            func.coalesce(
                func.avg(Queue.estimated_wait_minutes).filter(Queue.is_open.is_(True)),
                0,
            ).label("avg_wait"),
        ).where(Queue.venue_id == venue_id)
    )
    row = result.one()
    open_c = int(row.open_count or 0)
    total_c = int(row.total or 0)
    return {
        "open_count": open_c,
        "closed_count": total_c - open_c,
        "avg_wait_minutes": round(float(row.avg_wait or 0), 1),
    }


async def get_crowd_summary(db: AsyncSession, venue_id: str) -> dict[str, object]:
    """
    Count zones by current density level.
    Returns dict: low_count, medium_count, high_count, critical_count
    """
    result = await db.execute(
        select(
            Zone.density_level,
            func.count(Zone.id).label("zone_count"),
        )
        .where(Zone.venue_id == venue_id)
        .group_by(Zone.density_level)
    )
    rows = result.all()
    counts = {row.density_level: row.zone_count for row in rows}
    return {
        "low_count": counts.get(DensityLevel.LOW, 0),
        "medium_count": counts.get(DensityLevel.MEDIUM, 0),
        "high_count": counts.get(DensityLevel.HIGH, 0),
        "critical_count": counts.get(DensityLevel.CRITICAL, 0),
    }


async def get_upgrades_summary(db: AsyncSession, venue_id: str) -> dict[str, object]:
    """Aggregate seat upgrade statistics."""
    result = await db.execute(
        select(
            SeatUpgrade.status,
            func.count(SeatUpgrade.id).label("count"),
            func.coalesce(func.sum(SeatUpgrade.price_difference), 0).label("revenue"),
        )
        .where(SeatUpgrade.venue_id == venue_id)
        .group_by(SeatUpgrade.status)
    )
    rows = result.all()
    data = {
        row.status: {"count": row.count, "revenue": float(row.revenue)} for row in rows
    }
    return {
        "sent_count": data.get(UpgradeStatus.SENT, {}).get("count", 0),
        "accepted_count": data.get(UpgradeStatus.ACCEPTED, {}).get("count", 0),
        "declined_count": data.get(UpgradeStatus.DECLINED, {}).get("count", 0),
        "revenue": data.get(UpgradeStatus.ACCEPTED, {}).get("revenue", 0.0),
    }


async def get_incidents_summary(
    db: AsyncSession, venue_id: str, target_date: date
) -> dict[str, object]:
    """Count active and today-resolved incidents."""
    active_result = await db.execute(
        select(func.count(Incident.id)).where(
            and_(
                Incident.venue_id == venue_id, Incident.status == IncidentStatus.ACTIVE
            )
        )
    )
    resolved_result = await db.execute(
        select(func.count(Incident.id)).where(
            and_(
                Incident.venue_id == venue_id,
                Incident.status == IncidentStatus.RESOLVED,
                cast(Incident.updated_at, Date) == target_date,
            )
        )
    )
    return {
        "active_count": active_result.scalar() or 0,
        "resolved_today": resolved_result.scalar() or 0,
    }


async def get_order_chart_data(
    db: AsyncSession, venue_id: str, days: int = 7
) -> dict[str, object]:
    """
    Return order volume by day for Google Charts DataTable format.
    Groups orders by day over the last N days.
    """
    start_date = datetime.now(timezone.utc) - timedelta(days=days)
    result = await db.execute(
        select(
            cast(Order.created_at, Date).label("order_date"),
            func.count(Order.id).label("order_count"),
        )
        .where(
            and_(
                Order.venue_id == venue_id,
                Order.is_demo.is_(False),
                Order.created_at >= start_date,
            )
        )
        .group_by("order_date")
        .order_by("order_date")
    )
    rows = result.all()
    return {
        "cols": [
            {"label": "Date", "type": "string"},
            {"label": "Orders", "type": "number"},
        ],
        "rows": [
            {"c": [{"v": str(row.order_date)}, {"v": row.order_count}]} for row in rows
        ],
    }
