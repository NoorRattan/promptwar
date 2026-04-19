import pytest
import uuid

pytestmark = pytest.mark.asyncio


async def test_list_venues_demo_public(async_client):
    """Test demo venue listing is public."""
    response = await async_client.get("/api/v1/venues?demo=true")
    assert response.status_code == 200


async def test_list_venues_requires_auth_without_demo(async_client):
    """Test normal venue listing still requires authentication."""
    response = await async_client.get("/api/v1/venues")
    assert response.status_code == 401


async def test_get_venue_public(async_client):
    """Test venue detail route is public for QR bootstrap."""
    response = await async_client.get(f"/api/v1/venues/{uuid.uuid4()}")
    assert response.status_code == 404


async def test_list_venue_zones_admin(admin_client):
    """Test listing zones for admin."""
    response = await admin_client.get(f"/api/v1/venues/{uuid.uuid4()}/zones")
    assert response.status_code == 200


async def test_update_zone_forbidden(attendee_client):
    """Test attendees cannot block exits."""
    response = await attendee_client.patch(
        f"/api/v1/venues/{uuid.uuid4()}/zones/{uuid.uuid4()}",
        json={"is_exit_blocked": True},
    )
    assert response.status_code == 403
