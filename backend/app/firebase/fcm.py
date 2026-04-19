"""Best-effort Firebase Cloud Messaging helpers."""

import logging

logger = logging.getLogger(__name__)


def _messaging_module() -> object:
    """Import Firebase messaging lazily."""
    from firebase_admin import messaging

    return messaging


def send_emergency_broadcast(venue_id: str, emergency_type: str, message: str) -> None:
    """Broadcast an emergency message to the venue topic without raising."""
    messaging = _messaging_module()
    payload = messaging.Message(
        notification=messaging.Notification(
            title=f"EMERGENCY: {emergency_type.title()}",
            body=message,
        ),
        data={
            "type": "EMERGENCY",
            "venue_id": venue_id,
            "emergency_type": emergency_type,
        },
        topic=f"venue_{venue_id}",
        android=messaging.AndroidConfig(priority="high"),
        apns=messaging.APNSConfig(headers={"apns-priority": "10"}),
    )
    try:
        messaging.send(payload)
    except Exception as exc:  # pragma: no cover - network integration
        logger.error("Emergency FCM broadcast failed for venue %s: %s", venue_id, exc)


def send_all_clear_broadcast(venue_id: str) -> None:
    """Broadcast an all-clear notification to the venue topic."""
    messaging = _messaging_module()
    payload = messaging.Message(
        notification=messaging.Notification(
            title="All Clear",
            body="The emergency has been resolved. Resume normal activities.",
        ),
        data={"type": "ALL_CLEAR", "venue_id": venue_id},
        topic=f"venue_{venue_id}",
        android=messaging.AndroidConfig(priority="high"),
        apns=messaging.APNSConfig(headers={"apns-priority": "10"}),
    )
    try:
        messaging.send(payload)
    except Exception as exc:  # pragma: no cover - network integration
        logger.error("All-clear FCM broadcast failed for venue %s: %s", venue_id, exc)


def send_order_ready(fcm_token: str, order_code: str, counter_name: str) -> None:
    """Send an order-ready notification to a device token."""
    messaging = _messaging_module()
    payload = messaging.Message(
        notification=messaging.Notification(
            title="Your order is ready",
            body=f"Order {order_code} is ready at {counter_name}",
        ),
        data={"type": "ORDER_READY", "order_code": order_code},
        token=fcm_token,
    )
    try:
        messaging.send(payload)
    except Exception as exc:  # pragma: no cover - network integration
        logger.error("Order ready FCM failed for %s: %s", order_code, exc)


def send_seat_upgrade_offer(
    fcm_token: str,
    from_seat: str,
    to_seat: str,
    price_diff: float,
    upgrade_id: str,
) -> None:
    """Send a seat-upgrade offer without raising."""
    messaging = _messaging_module()
    payload = messaging.Message(
        notification=messaging.Notification(
            title="Seat upgrade available",
            body=f"Upgrade from {from_seat} to {to_seat} for {price_diff:.0f}",
        ),
        data={"type": "SEAT_UPGRADE", "upgrade_id": upgrade_id},
        token=fcm_token,
    )
    try:
        messaging.send(payload)
    except Exception as exc:  # pragma: no cover - network integration
        logger.error("Seat upgrade FCM failed for %s: %s", upgrade_id, exc)


def send_congestion_alert(fcm_token: str, zone_name: str, level: str) -> None:
    """Send a congestion alert to a staff device without raising."""
    messaging = _messaging_module()
    payload = messaging.Message(
        notification=messaging.Notification(
            title=f"Congestion alert: {zone_name}",
            body=f"Zone predicted to reach {level} density.",
        ),
        data={"type": "CONGESTION_ALERT", "zone_name": zone_name, "level": level},
        token=fcm_token,
        android=messaging.AndroidConfig(priority="high"),
        apns=messaging.APNSConfig(headers={"apns-priority": "10"}),
    )
    try:
        messaging.send(payload)
    except Exception as exc:  # pragma: no cover - network integration
        logger.error("Congestion alert FCM failed for %s: %s", zone_name, exc)


def send_task_assignment(
    fcm_token: str,
    task_title: str,
    priority: str,
    zone_name: str | None,
) -> None:
    """Send a task-assignment notification without raising."""
    messaging = _messaging_module()
    location = f" in {zone_name}" if zone_name else ""
    payload = messaging.Message(
        notification=messaging.Notification(
            title=f"New task [{priority.upper()}]",
            body=f"{task_title}{location}",
        ),
        data={"type": "TASK_ASSIGNED", "priority": priority},
        token=fcm_token,
    )
    try:
        messaging.send(payload)
    except Exception as exc:  # pragma: no cover - network integration
        logger.error("Task assignment FCM failed: %s", exc)


def subscribe_to_venue_topic(fcm_token: str, venue_id: str) -> None:
    """Subscribe a device token to the venue topic without raising."""
    messaging = _messaging_module()
    try:
        messaging.subscribe_to_topic([fcm_token], f"venue_{venue_id}")
    except Exception as exc:  # pragma: no cover - network integration
        logger.error("FCM topic subscription failed for venue %s: %s", venue_id, exc)
