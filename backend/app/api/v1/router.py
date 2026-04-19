"""
CrowdIQ API v1 Router

Base path: /api/v1 (prefix set in main.py include_router call)

Route groups:
/api/v1/auth/*         — Authentication: register, login, profile
/api/v1/venues/*       — Venues & Zones: configuration, zones
/api/v1/crowd/*        — Crowd Density: read and update zone densities
/api/v1/queues/*       — Queue Management: list, update, toggle open/closed
/api/v1/orders/*       — F&B Orders: menu, create, status, cancel
/api/v1/emergency/*    — Emergency System: activate, deactivate, SOS
/api/v1/navigation/*   — Navigation: walking route calculation
/api/v1/seats/*        — Seat Upgrades: list offers, accept, decline
/api/v1/staff/*        — Staff Coordination: tasks, locations
/api/v1/analytics/*    — Analytics: dashboard summary, charts
"""

from fastapi import APIRouter
from app.api.v1 import (
    auth,
    venues,
    crowd,
    queues,
    orders,
    emergency,
    navigation,
    seats,
    staff,
    analytics,
)

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(venues.router, prefix="/venues", tags=["Venues & Zones"])
api_router.include_router(crowd.router, prefix="/crowd", tags=["Crowd Density"])
api_router.include_router(queues.router, prefix="/queues", tags=["Queue Management"])
api_router.include_router(orders.router, prefix="/orders", tags=["F&B Orders"])
api_router.include_router(
    emergency.router, prefix="/emergency", tags=["Emergency System"]
)
api_router.include_router(navigation.router, prefix="/navigation", tags=["Navigation"])
api_router.include_router(seats.router, prefix="/seats", tags=["Seat Upgrades"])
api_router.include_router(staff.router, prefix="/staff", tags=["Staff Coordination"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["Analytics"])
