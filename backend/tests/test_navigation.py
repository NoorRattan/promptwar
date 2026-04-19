import pytest
import uuid

pytestmark = pytest.mark.asyncio


async def test_get_route_authenticated(attendee_client):
    """Test calculating route works."""
    response = await attendee_client.get(
        f"/api/v1/navigation/route?origin_lat=0&origin_lng=0&dest_lat=1&dest_lng=1&venue_id={uuid.uuid4()}"
    )
    assert response.status_code == 200


async def test_get_route_unauthenticated(async_client):
    """Test unauthenticated gets 401."""
    response = await async_client.get(
        f"/api/v1/navigation/route?origin_lat=0&origin_lng=0&dest_lat=1&dest_lng=1&venue_id={uuid.uuid4()}"
    )
    assert response.status_code == 401


async def test_get_nearest_exit_authenticated(attendee_client):
    """Test nearest exit works."""
    response = await attendee_client.get(
        f"/api/v1/navigation/nearest-exit?lat=0&lng=0&venue_id={uuid.uuid4()}"
    )
    assert response.status_code == 200


async def test_get_route_missing_params(attendee_client):
    """Test missing lat/lng yields 422."""
    response = await attendee_client.get("/api/v1/navigation/route")
    assert response.status_code == 422
