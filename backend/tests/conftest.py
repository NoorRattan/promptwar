"""Pytest fixtures for backend API tests."""

from datetime import datetime, timezone
import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import (
    get_authenticated_firebase_uid,
    get_current_user,
    get_current_user_optional,
    get_db,
    require_admin,
    require_admin_only,
)
from app.db.models.user import User, UserRole
from app.main import app
from app.schemas.venue import RouteResponse, RouteStep


def make_user(role: UserRole = UserRole.ATTENDEE, **overrides: object) -> User:
    """Return a lightweight in-memory user object."""
    user = User()
    user.id = overrides.get("id", uuid.uuid4())
    user.firebase_uid = overrides.get("firebase_uid", f"uid-{role.value.lower()}")
    user.email = overrides.get("email", f"{role.value.lower()}@test.crowdiq.app")
    user.name = overrides.get("full_name", f"Test {role.value.title()}")
    user.role = role
    user.preferred_language = overrides.get("preferred_language", "en")
    user.venue_id = overrides.get("venue_id", None)
    user.seat_number = overrides.get("seat_number", None)
    user.fcm_token = overrides.get("fcm_token", "test-fcm-token")
    user.created_at = overrides.get("created_at", datetime.now(timezone.utc))
    return user


@pytest.fixture(autouse=True)
def mock_firebase_init():
    """Keep Firebase Admin initialization from touching real credentials."""
    with patch("app.firebase.admin.initialize_firebase", return_value=True), patch(
        "app.firebase.admin.firebase_admin._apps",
        {"[DEFAULT]": MagicMock()},
    ):
        yield


@pytest.fixture
def mock_db():
    """Provide a mocked async SQLAlchemy session."""
    session = MagicMock(spec=AsyncSession)

    result = MagicMock()
    result.scalar_one_or_none.return_value = None
    result.scalar.return_value = None
    result.one.return_value = MagicMock(total=0, revenue=0, open_count=0, avg_wait=0)
    result.all.return_value = []
    scalar_values = MagicMock()
    scalar_values.all.return_value = []
    result.scalars.return_value = scalar_values

    session.execute = AsyncMock(return_value=result)
    session.commit = AsyncMock()
    session.refresh = AsyncMock()
    session.rollback = AsyncMock()
    session.close = AsyncMock()
    session.add = MagicMock()
    app.dependency_overrides[get_db] = lambda: session
    yield session
    app.dependency_overrides.pop(get_db, None)


@pytest.fixture(autouse=True)
def mock_firestore():
    """Patch Firestore writes and reads across route aliases."""
    with patch("app.firebase.firestore.update_zone_density"), patch(
        "app.api.v1.crowd._fs_update_density"
    ), patch("app.firebase.firestore.update_queue_state"), patch(
        "app.services.queue_sync.update_queue_state"
    ), patch(
        "app.firebase.firestore.activate_emergency"
    ), patch(
        "app.firebase.firestore.deactivate_emergency"
    ), patch(
        "app.firebase.firestore.get_emergency_state", return_value=None
    ), patch(
        "app.firebase.firestore.write_order_state"
    ), patch(
        "app.api.v1.orders.write_order_state"
    ):
        yield


@pytest.fixture(autouse=True)
def mock_fcm():
    """Patch FCM sends across shared modules and route aliases."""
    with patch("app.firebase.fcm.send_emergency_broadcast"), patch(
        "app.firebase.fcm.send_all_clear_broadcast"
    ), patch("app.firebase.fcm.send_order_ready"), patch(
        "app.api.v1.orders.send_order_ready"
    ), patch(
        "app.firebase.fcm.send_seat_upgrade_offer"
    ), patch(
        "app.firebase.fcm.send_congestion_alert"
    ):
        yield


@pytest.fixture(autouse=True)
def mock_maps():
    """Patch navigation helpers to avoid live Google Maps calls."""
    with patch(
        "app.services.maps_service.calculate_route",
        new_callable=AsyncMock,
    ) as route_mock, patch(
        "app.api.v1.navigation.calculate_route",
        new_callable=AsyncMock,
    ) as route_alias_mock, patch(
        "app.services.maps_service.calculate_evacuation_routes",
        new_callable=AsyncMock,
        return_value={},
    ), patch(
        "app.api.v1.navigation._find_nearest_exit",
        return_value={
            "id": str(uuid.uuid4()),
            "name": "Exit A",
            "lat": 1.0,
            "lng": 2.0,
        },
    ):
        route_result = RouteResponse(
            distance="250 m",
            duration="3 mins",
            steps=[
                RouteStep(
                    instruction="Head north",
                    distance="250 m",
                    duration="3 mins",
                    start_lat=1.0,
                    start_lng=2.0,
                )
            ],
            polyline="encodedpolyline",
        )
        route_mock.return_value = route_result
        route_alias_mock.return_value = route_result
        yield


@pytest.fixture(autouse=True)
def mock_cache():
    """Patch cache helpers to safe no-op implementations."""
    with patch(
        "app.services.cache_service.get",
        new_callable=AsyncMock,
        return_value=None,
    ), patch(
        "app.services.cache_service.set",
        new_callable=AsyncMock,
        return_value=False,
    ), patch(
        "app.services.cache_service.get_json",
        new_callable=AsyncMock,
        return_value=None,
    ), patch(
        "app.services.cache_service.set_json",
        new_callable=AsyncMock,
        return_value=False,
    ), patch(
        "app.services.cache_service.delete",
        new_callable=AsyncMock,
        return_value=True,
    ):
        yield


@pytest.fixture
async def async_client(mock_db):
    """Anonymous async client for public and unauthenticated requests."""
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
        headers={"Content-Type": "application/json"},
    ) as client:
        yield client


@pytest.fixture
async def attendee_client(mock_db):
    """Authenticated attendee client."""
    attendee = make_user(UserRole.ATTENDEE)
    app.dependency_overrides[get_current_user] = lambda: attendee
    app.dependency_overrides[get_current_user_optional] = lambda: attendee
    app.dependency_overrides[get_authenticated_firebase_uid] = (
        lambda: attendee.firebase_uid
    )
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
        headers={"Content-Type": "application/json"},
    ) as client:
        yield client
    app.dependency_overrides.pop(get_current_user, None)
    app.dependency_overrides.pop(get_current_user_optional, None)
    app.dependency_overrides.pop(get_authenticated_firebase_uid, None)


@pytest.fixture
async def admin_client(mock_db):
    """Authenticated admin client."""
    admin = make_user(UserRole.ADMIN)
    app.dependency_overrides[get_current_user] = lambda: admin
    app.dependency_overrides[get_current_user_optional] = lambda: admin
    app.dependency_overrides[get_authenticated_firebase_uid] = (
        lambda: admin.firebase_uid
    )
    app.dependency_overrides[require_admin] = lambda: admin
    app.dependency_overrides[require_admin_only] = lambda: admin
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
        headers={"Content-Type": "application/json"},
    ) as client:
        yield client
    app.dependency_overrides.pop(get_current_user, None)
    app.dependency_overrides.pop(get_current_user_optional, None)
    app.dependency_overrides.pop(get_authenticated_firebase_uid, None)
    app.dependency_overrides.pop(require_admin, None)
    app.dependency_overrides.pop(require_admin_only, None)


@pytest.fixture
async def staff_client(mock_db):
    """Authenticated staff client."""
    staff = make_user(UserRole.STAFF)
    app.dependency_overrides[get_current_user] = lambda: staff
    app.dependency_overrides[get_current_user_optional] = lambda: staff
    app.dependency_overrides[get_authenticated_firebase_uid] = (
        lambda: staff.firebase_uid
    )
    app.dependency_overrides[require_admin] = lambda: staff
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
        headers={"Content-Type": "application/json"},
    ) as client:
        yield client
    app.dependency_overrides.pop(get_current_user, None)
    app.dependency_overrides.pop(get_current_user_optional, None)
    app.dependency_overrides.pop(get_authenticated_firebase_uid, None)
    app.dependency_overrides.pop(require_admin, None)
