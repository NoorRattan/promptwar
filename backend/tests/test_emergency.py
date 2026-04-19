import pytest
import uuid

pytestmark = pytest.mark.asyncio


async def test_get_emergency_status_no_auth(async_client):
    """Test public access to emergency status."""
    response = await async_client.get(
        f"/api/v1/emergency/status?venue_id={uuid.uuid4()}"
    )
    assert response.status_code == 200


async def test_activate_requires_admin_only_not_staff(staff_client):
    """Test staff cannot activate emergency."""
    response = await staff_client.post(
        "/api/v1/emergency/broadcast",
        json={
            "venue_id": str(uuid.uuid4()),
            "emergency_type": "FIRE",
            "message": "Please evacuate via the nearest exit.",
            "confirmed": True,
        },
    )
    assert response.status_code == 403


async def test_activate_requires_auth(async_client):
    """Test authentication required for broadcast."""
    response = await async_client.post("/api/v1/emergency/broadcast", json={})
    assert response.status_code == 401


async def test_activate_success(admin_client):
    """Test admin can activate emergency."""
    response = await admin_client.post(
        "/api/v1/emergency/broadcast",
        json={
            "venue_id": str(uuid.uuid4()),
            "emergency_type": "FIRE",
            "message": "Please evacuate via the nearest exit.",
            "affected_zones": [],
            "confirmed": True,
        },
    )
    assert response.status_code == 200


async def test_activate_invalid_type(admin_client):
    """Test activation fails if type is not recognized."""
    response = await admin_client.post(
        "/api/v1/emergency/broadcast",
        json={
            "venue_id": str(uuid.uuid4()),
            "emergency_type": "TORNADO",
            "message": "Evacuate",
            "confirmed": True,
        },
    )
    assert response.status_code == 422


async def test_activate_not_confirmed(admin_client):
    """Test activation bounded by confirmed bool flag."""
    response = await admin_client.post(
        "/api/v1/emergency/broadcast",
        json={
            "venue_id": str(uuid.uuid4()),
            "emergency_type": "FIRE",
            "message": "Fire reported.",
            "confirmed": False,
        },
    )
    assert response.status_code == 422


async def test_deactivate_staff_forbidden(staff_client):
    """Test staff cannot deactivate emergency."""
    response = await staff_client.post(
        "/api/v1/emergency/deactivate",
        json={"venue_id": str(uuid.uuid4()), "confirmed": True},
    )
    assert response.status_code == 403


async def test_sos_requires_auth(async_client):
    """Test SOS requires authentication."""
    response = await async_client.post(
        "/api/v1/emergency/sos", json={"venue_id": str(uuid.uuid4())}
    )
    assert response.status_code == 401


async def test_sos_success(attendee_client):
    """Test SOS succeeds for attendee."""
    response = await attendee_client.post(
        "/api/v1/emergency/sos",
        json={
            "venue_id": str(uuid.uuid4()),
            "lat": 1.23,
            "lng": 4.56,
            "message": "Help",
        },
    )
    assert response.status_code == 200


async def test_block_exit_attendee_forbidden(attendee_client):
    """Test exit blocking forbidden for attendees."""
    response = await attendee_client.patch(
        f"/api/v1/emergency/exits/{uuid.uuid4()}",
        json={"zone_id": str(uuid.uuid4()), "is_blocked": True},
    )
    assert response.status_code == 403
