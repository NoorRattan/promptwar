import pytest
import uuid

pytestmark = pytest.mark.asyncio


async def test_list_upgrades_authenticated(attendee_client):
    """Test listing seat upgrades works for attendees."""
    response = await attendee_client.get(
        f"/api/v1/seats/upgrades?venue_id={uuid.uuid4()}"
    )
    assert response.status_code == 200


async def test_list_upgrades_unauthenticated(async_client):
    """Test listing seat upgrades fails for unauthenticated users."""
    response = await async_client.get(f"/api/v1/seats/upgrades?venue_id={uuid.uuid4()}")
    assert response.status_code == 401


async def test_create_upgrade_admin(admin_client):
    """Test admin creating seat upgrade."""
    response = await admin_client.post(
        "/api/v1/seats/upgrades",
        json={
            "venue_id": str(uuid.uuid4()),
            "from_seat": "A1",
            "to_seat": "A2",
            "price_difference": 10.0,
        },
    )
    assert response.status_code == 200


async def test_create_upgrade_forbidden_attendee(attendee_client):
    """Test attendees cannot create seat upgrades."""
    response = await attendee_client.post(
        "/api/v1/seats/upgrades",
        json={
            "venue_id": str(uuid.uuid4()),
            "from_seat": "A1",
            "to_seat": "A2",
            "price_difference": 10.0,
        },
    )
    assert response.status_code == 403
