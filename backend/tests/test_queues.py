import pytest
import uuid
from unittest.mock import MagicMock, patch

from app.db.models.queue import Queue, QueueType

pytestmark = pytest.mark.asyncio


async def test_get_queues_authenticated(attendee_client):
    """Test fetching queues as authenticated attendee."""
    vid = uuid.uuid4()
    response = await attendee_client.get(f"/api/v1/queues?venue_id={vid}")
    assert response.status_code == 200


async def test_get_queues_unauthenticated(async_client):
    """Test fetching queues returns 401 without auth."""
    vid = uuid.uuid4()
    response = await async_client.get(f"/api/v1/queues?venue_id={vid}")
    assert response.status_code == 401


async def test_update_queue_admin(admin_client):
    """Test updating queue returns 200 or 404 (due to mock)."""
    response = await admin_client.patch(
        f"/api/v1/queues/{uuid.uuid4()}", json={"is_open": False}
    )
    assert response.status_code in [200, 404]


async def test_update_queue_attendee_forbidden(attendee_client):
    """Test attendees cannot update queues."""
    response = await attendee_client.patch(
        f"/api/v1/queues/{uuid.uuid4()}", json={"is_open": False}
    )
    assert response.status_code == 403


async def test_update_queue_invalid_wait(admin_client):
    """Test updating wait time fails validation rule."""
    response = await admin_client.patch(
        f"/api/v1/queues/{uuid.uuid4()}", json={"estimated_wait_minutes": 999}
    )
    assert response.status_code == 422


async def test_get_queue_alerts_admin_only(attendee_client):
    """Test fetching queue alerts is forbidden for attendees."""
    response = await attendee_client.get(
        f"/api/v1/queues/alerts?venue_id={uuid.uuid4()}"
    )
    assert response.status_code == 403


async def test_create_queue_admin_publishes_firestore(admin_client):
    """Test creating a queue writes the full attendee-facing Firestore payload."""
    venue_id = uuid.uuid4()
    zone_id = uuid.uuid4()

    with patch("app.services.queue_sync.update_queue_state") as sync_mock:
        response = await admin_client.post(
            "/api/v1/queues",
            json={
                "venue_id": str(venue_id),
                "zone_id": str(zone_id),
                "name": "Gate A Food Court",
                "queue_type": "food",
                "is_open": True,
                "estimated_wait_minutes": 8,
                "current_length": 15,
                "throughput_per_minute": 2.5,
                "annotation": "Serving quickly",
            },
        )

    assert response.status_code == 200
    payload = response.json()
    assert payload["venue_id"] == str(venue_id)
    assert payload["zone_id"] == str(zone_id)
    assert payload["name"] == "Gate A Food Court"
    assert payload["estimated_wait_minutes"] == 8
    sync_mock.assert_called_once()
    args, kwargs = sync_mock.call_args
    assert args[0] == str(venue_id)
    assert kwargs["name"] == "Gate A Food Court"
    assert kwargs["queue_type"] == "food"
    assert kwargs["zone_id"] == str(zone_id)


async def test_update_queue_admin_publishes_firestore(admin_client, mock_db):
    """Test queue patch writes the normalized Firestore payload."""
    queue_id = uuid.uuid4()
    venue_id = uuid.uuid4()
    zone_id = uuid.uuid4()
    queue = Queue(
        id=queue_id,
        venue_id=venue_id,
        zone_id=zone_id,
        name="North Stand Restrooms",
        queue_type=QueueType.RESTROOM,
        is_open=True,
        estimated_wait_minutes=3,
        current_length=9,
        throughput_per_minute=4.0,
        annotation=None,
    )

    result = MagicMock()
    result.scalar_one_or_none.return_value = queue
    mock_db.execute.return_value = result

    with patch("app.services.queue_sync.update_queue_state") as sync_mock:
        response = await admin_client.patch(
            f"/api/v1/queues/{queue_id}",
            json={"annotation": "Recently sanitized", "estimated_wait_minutes": 5},
        )

    assert response.status_code == 200
    payload = response.json()
    assert payload["estimated_wait_minutes"] == 5
    assert payload["annotation"] == "Recently sanitized"
    sync_mock.assert_called_once()
    args, kwargs = sync_mock.call_args
    assert args[0] == str(venue_id)
    assert args[1] == str(queue_id)
    assert kwargs["name"] == "North Stand Restrooms"
    assert kwargs["queue_type"] == "restroom"
    assert kwargs["annotation"] == "Recently sanitized"
