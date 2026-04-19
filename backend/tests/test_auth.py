import pytest

pytestmark = pytest.mark.asyncio


async def test_register_new_user_success(admin_client):
    """Test successful user registration using database sync."""
    response = await admin_client.post(
        "/api/v1/auth/register",
        json={
            "email": "test@example.com",
            "full_name": "Test User",
            "preferred_language": "en",
        },
    )
    assert response.status_code in [200, 201]


async def test_get_me_authenticated(attendee_client):
    """Test retrieving profile for authenticated user."""
    response = await attendee_client.get("/api/v1/auth/me")
    assert response.status_code == 200


async def test_get_me_unauthenticated(async_client):
    """Test receiving 401 when trying to get profile unauthenticated."""
    response = await async_client.get("/api/v1/auth/me")
    assert response.status_code == 401


async def test_update_profile_success(attendee_client):
    """Test profile partial updates succeed."""
    response = await attendee_client.patch(
        "/api/v1/auth/me", json={"full_name": "Updated Name"}
    )
    assert response.status_code == 200


async def test_update_profile_invalid_language(attendee_client):
    """Test profile update fails with invalid language length/pattern."""
    response = await attendee_client.patch(
        "/api/v1/auth/me", json={"preferred_language": "xx"}
    )
    assert response.status_code == 422


async def test_update_fcm_token_success(attendee_client):
    """Test FCM token update succeeds."""
    response = await attendee_client.post(
        "/api/v1/auth/me/fcm-token", json={"fcm_token": "valid_token_1234567890"}
    )
    assert response.status_code == 200


async def test_register_invalid_full_name_html(admin_client):
    """Test full_name validation rejects HTML tags."""
    response = await admin_client.post(
        "/api/v1/auth/register",
        json={
            "email": "hacker@example.com",
            "full_name": "<script>alert('x')</script>",
            "preferred_language": "en",
        },
    )
    assert response.status_code == 422


async def test_update_profile_empty_name(attendee_client):
    """Test update profile fails with name too short."""
    response = await attendee_client.patch("/api/v1/auth/me", json={"full_name": "x"})
    assert response.status_code == 422
