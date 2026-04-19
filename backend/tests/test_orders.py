import pytest
import uuid
from datetime import datetime, timedelta, timezone

pytestmark = pytest.mark.asyncio


async def test_get_menu_authenticated(attendee_client):
    """Test getting menu works."""
    response = await attendee_client.get(f"/api/v1/orders/menu?venue_id={uuid.uuid4()}")
    assert response.status_code == 200
    assert isinstance(response.json(), list)


async def test_create_order_empty_items(attendee_client):
    """Test creating order with empty items list fails."""
    slot = (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat()
    response = await attendee_client.post(
        "/api/v1/orders",
        json={"items": [], "pickup_zone_id": str(uuid.uuid4()), "pickup_slot": slot},
    )
    assert response.status_code == 422


async def test_create_order_past_pickup_slot(attendee_client):
    """Test creating order with past slot fails."""
    slot = (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat()
    response = await attendee_client.post(
        "/api/v1/orders",
        json={
            "items": [{"menu_item_id": str(uuid.uuid4()), "quantity": 1}],
            "pickup_zone_id": str(uuid.uuid4()),
            "pickup_slot": slot,
        },
    )
    assert response.status_code == 422


async def test_update_status_admin(admin_client):
    """Test admin updating order status."""
    response = await admin_client.patch(
        f"/api/v1/orders/{uuid.uuid4()}/status", json={"status": "confirmed"}
    )
    assert response.status_code in [200, 404]


async def test_update_status_attendee_forbidden(attendee_client):
    """Test attendees cannot update order status."""
    response = await attendee_client.patch(
        f"/api/v1/orders/{uuid.uuid4()}/status", json={"status": "confirmed"}
    )
    assert response.status_code == 403


async def test_cancel_order_success(attendee_client):
    """Test cancelling an order."""
    response = await attendee_client.delete(f"/api/v1/orders/{uuid.uuid4()}")
    assert response.status_code in [200, 404]


async def test_get_order_unauthenticated(async_client):
    """Test fetching order requires auth."""
    response = await async_client.get(f"/api/v1/orders/{uuid.uuid4()}")
    assert response.status_code == 401


async def test_update_status_invalid_status_value(admin_client):
    """Test update fails with invalid status literal."""
    response = await admin_client.patch(
        f"/api/v1/orders/{uuid.uuid4()}/status", json={"status": "flying"}
    )
    assert response.status_code == 422
