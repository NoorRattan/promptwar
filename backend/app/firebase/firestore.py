"""Synchronous Firestore helpers used from executors or background tasks."""

import logging
from typing import Any

logger = logging.getLogger(__name__)


def _firestore_module() -> object:
    """Import Firebase Firestore lazily."""
    from firebase_admin import firestore

    return firestore


def _get_db() -> object:
    """Return a Firestore client after Firebase Admin has been initialized."""
    firestore = _firestore_module()
    return firestore.client()


def update_zone_density(
    venue_id: str,
    zone_id: str,
    density: float,
    count: int,
    level: str,
) -> None:
    """Write crowd density for a zone to Firestore."""
    firestore = _firestore_module()
    try:
        _get_db().collection("crowd_density").document(venue_id).collection(
            "zones"
        ).document(zone_id).set(
            {
                "density": density,
                "count": count,
                "level": level,
                "updated_at": firestore.SERVER_TIMESTAMP,
            },
            merge=True,
        )
    except Exception as exc:
        logger.error(
            "Firestore density write failed venue=%s zone=%s: %s",
            venue_id,
            zone_id,
            exc,
        )
        raise


def update_queue_state(
    venue_id: str,
    queue_id: str,
    wait_minutes: int,
    is_open: bool,
    current_length: int,
    annotation: str | None = None,
    *,
    name: str | None = None,
    zone_id: str | None = None,
    queue_type: str | None = None,
    throughput_per_minute: float | None = None,
) -> None:
    """Write queue state to Firestore for real-time attendee updates."""
    firestore = _firestore_module()
    data: dict[str, Any] = {
        "estimated_wait_minutes": wait_minutes,
        "is_open": is_open,
        "current_length": current_length,
        "updated_at": firestore.SERVER_TIMESTAMP,
    }
    if name is not None:
        data["name"] = name
    if zone_id is not None:
        data["zone_id"] = zone_id
    if queue_type is not None:
        data["queue_type"] = queue_type
    if throughput_per_minute is not None:
        data["throughput_per_minute"] = throughput_per_minute
    if annotation is not None:
        data["annotation"] = annotation
    try:
        _get_db().collection("queue_states").document(venue_id).collection(
            "queues"
        ).document(queue_id).set(data, merge=True)
    except Exception as exc:
        logger.error(
            "Firestore queue write failed venue=%s queue=%s: %s",
            venue_id,
            queue_id,
            exc,
        )
        raise


def activate_emergency(
    venue_id: str,
    emergency_type: str,
    message: str,
    affected_zones: list[str],
    activated_by_email: str,
    evacuation_routes: dict[str, Any],
) -> None:
    """Write emergency activation state to Firestore."""
    firestore = _firestore_module()
    try:
        _get_db().collection("emergency").document(venue_id).set(
            {
                "is_active": True,
                "type": emergency_type,
                "message": message,
                "affected_zones": affected_zones,
                "activated_by_email": activated_by_email,
                "evacuation_routes": evacuation_routes,
                "evacuation_routes_ready": bool(evacuation_routes),
                "activated_at": firestore.SERVER_TIMESTAMP,
                "deactivated_at": None,
            }
        )
    except Exception as exc:
        logger.error(
            "Firestore emergency activation write failed venue=%s: %s",
            venue_id,
            exc,
        )
        raise


def update_evacuation_routes(venue_id: str, routes: dict[str, Any]) -> None:
    """Update evacuation routes in the active emergency document."""
    try:
        _get_db().collection("emergency").document(venue_id).set(
            {"evacuation_routes": routes, "evacuation_routes_ready": True},
            merge=True,
        )
    except Exception as exc:
        logger.error("Firestore evacuation routes update failed: %s", exc)


def deactivate_emergency(venue_id: str) -> None:
    """Clear emergency state in Firestore."""
    firestore = _firestore_module()
    try:
        _get_db().collection("emergency").document(venue_id).set(
            {
                "is_active": False,
                "deactivated_at": firestore.SERVER_TIMESTAMP,
            },
            merge=True,
        )
    except Exception as exc:
        logger.error(
            "Firestore emergency deactivation failed venue=%s: %s",
            venue_id,
            exc,
        )
        raise


def write_order_state(
    order_id: str,
    user_firebase_uid: str,
    status: str,
    order_code: str,
    pickup_slot: str | None = None,
    pickup_zone_name: str | None = None,
) -> None:
    """Write or update order state in Firestore for real-time status tracking."""
    firestore = _firestore_module()
    try:
        _get_db().collection("order_states").document(order_id).set(
            {
                "user_id": user_firebase_uid,
                "status": status,
                "order_code": order_code,
                "pickup_slot": pickup_slot,
                "pickup_zone_name": pickup_zone_name,
                "updated_at": firestore.SERVER_TIMESTAMP,
            },
            merge=True,
        )
    except Exception as exc:
        logger.error("Firestore order state write failed order=%s: %s", order_id, exc)


def update_staff_location(
    venue_id: str,
    user_id: str,
    lat: float,
    lng: float,
    role: str,
) -> None:
    """Update a staff member's location document."""
    firestore = _firestore_module()
    try:
        _get_db().collection("staff_locations").document(venue_id).collection(
            "staff"
        ).document(user_id).set(
            {
                "lat": lat,
                "lng": lng,
                "role": role,
                "updated_at": firestore.SERVER_TIMESTAMP,
            },
            merge=True,
        )
    except Exception as exc:
        logger.error("Firestore staff location update failed: %s", exc)


def get_emergency_state(venue_id: str) -> dict[str, Any] | None:
    """Read the current emergency state for a venue."""
    try:
        doc = _get_db().collection("emergency").document(venue_id).get()
        return doc.to_dict() if doc.exists else None
    except Exception as exc:
        logger.error(
            "Firestore emergency state read failed venue=%s: %s",
            venue_id,
            exc,
        )
        return None
