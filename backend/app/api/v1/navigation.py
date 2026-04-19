from fastapi import APIRouter, Depends, Request, HTTPException
from app.core.dependencies import get_current_user
from app.core.rate_limit import limiter, RATE_READ
from app.schemas.venue import RouteResponse
from app.services.maps_service import calculate_route, _find_nearest_exit
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.dependencies import get_db
from app.db.models.zone import Zone, ZoneType
import uuid

router = APIRouter()


@router.get(
    "/route",
    response_model=RouteResponse,
    summary="Get walking route",
    description="Calculate route between two points.",
)
@limiter.limit(RATE_READ)
async def get_route(
    request: Request,
    origin_lat: float,
    origin_lng: float,
    dest_lat: float,
    dest_lng: float,
    venue_id: uuid.UUID,
    _=Depends(get_current_user),
) -> RouteResponse:
    try:
        return await calculate_route(origin_lat, origin_lng, dest_lat, dest_lng)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=503, detail="Navigation service unavailable"
        ) from exc


@router.get(
    "/nearest-exit",
    response_model=dict,
    summary="Get nearest exit",
    description="Finds nearest unblocked exit and calculates route.",
)
@limiter.limit(RATE_READ)
async def get_nearest_exit(
    request: Request,
    lat: float,
    lng: float,
    venue_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
) -> dict:
    try:
        res = await db.execute(
            select(Zone).where(
                Zone.venue_id == venue_id,
                Zone.zone_type == ZoneType.EXIT,
                Zone.is_exit_blocked.is_(False),
            )
        )
        all_exits = res.scalars().all()

        exits = [
            {"id": str(z.id), "name": z.name, "lat": z.lat_center, "lng": z.lng_center}
            for z in all_exits
        ]

        nearest = _find_nearest_exit({"lat_center": lat, "lng_center": lng}, exits)
        if not nearest:
            raise HTTPException(status_code=404, detail="No safe exits found")

        route = await calculate_route(lat, lng, nearest["lat"], nearest["lng"])
        return {
            "exit_zone_id": nearest["id"],
            "exit_name": nearest["name"],
            "route": route.model_dump(),
        }
    except Exception as e:
        if isinstance(e, HTTPException):
            raise
        raise HTTPException(status_code=503, detail="Navigation unavailable")
