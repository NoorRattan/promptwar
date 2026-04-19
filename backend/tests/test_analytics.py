import pytest
import uuid

pytestmark = pytest.mark.asyncio


async def test_get_summary_admin(admin_client):
    """Test getting analytics summary as admin."""
    response = await admin_client.get(
        f"/api/v1/analytics/summary?venue_id={uuid.uuid4()}"
    )
    assert response.status_code == 200


async def test_get_summary_forbidden(attendee_client):
    """Test attendee cannot view analytics summary."""
    response = await attendee_client.get(
        f"/api/v1/analytics/summary?venue_id={uuid.uuid4()}"
    )
    assert response.status_code == 403


async def test_get_chart_admin(admin_client):
    """Test chart data fetch as admin."""
    response = await admin_client.get(
        f"/api/v1/analytics/orders/chart?venue_id={uuid.uuid4()}"
    )
    assert response.status_code == 200


async def test_get_summary_unauthenticated(async_client):
    """Test unauthenticated access forbidden."""
    response = await async_client.get(
        f"/api/v1/analytics/summary?venue_id={uuid.uuid4()}"
    )
    assert response.status_code == 401
