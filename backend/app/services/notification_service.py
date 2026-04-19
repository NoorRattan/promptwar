import logging
from app.firebase import fcm, firestore as fs
from app.db.models.user import User
from app.db.models.order import Order

logger = logging.getLogger(__name__)


def notify_order_ready(order: Order, user: User, counter_name: str) -> None:
    """
    Notify an attendee that their order is ready for pickup.
    Called from BackgroundTask after admin marks order as READY.

    Steps:
    1. Update Firestore order state to READY
    2. Send FCM push to attendee's device (only if fcm_token exists)

    Args:
        order: Order ORM model (has id, order_code, status)
        user: User ORM model (has fcm_token, firebase_uid)
        counter_name: Name of the pickup counter shown in notification
    """
    # Always update Firestore — it's the real-time state source
    fs.write_order_state(
        order_id=str(order.id),
        user_firebase_uid=user.firebase_uid,
        status=order.status.value,
        order_code=order.order_code,
        pickup_zone_name=counter_name,
    )
    # FCM push is best-effort — skip if no token
    if user.fcm_token:
        fcm.send_order_ready(
            fcm_token=user.fcm_token,
            order_code=order.order_code,
            counter_name=counter_name,
        )
    else:
        logger.debug(
            "No FCM token for user %s — order ready notification skipped",
            user.firebase_uid,
        )


def notify_order_status_update(order: Order, user: User) -> None:
    """
    Update Firestore order state for any status change (not just READY).
    Does NOT send FCM for non-READY statuses (received, confirmed, preparing).
    """
    fs.write_order_state(
        order_id=str(order.id),
        user_firebase_uid=user.firebase_uid,
        status=order.status.value,
        order_code=order.order_code,
    )


def notify_emergency_activated(
    venue_id: str,
    emergency_type: str,
    message: str,
    affected_zones: list[str],
    activated_by_email: str,
) -> None:
    """
    Broadcast emergency via FCM after Firestore write (called as BackgroundTask).
    The Firestore write is already done inline by the emergency route —
    this function handles only the FCM broadcast.
    """
    fcm.send_emergency_broadcast(
        venue_id=venue_id,
        emergency_type=emergency_type,
        message=message,
    )


def notify_emergency_deactivated(venue_id: str) -> None:
    """Send all-clear FCM broadcast (called as BackgroundTask)."""
    fcm.send_all_clear_broadcast(venue_id=venue_id)


def notify_seat_upgrade(
    user: User, from_seat: str, to_seat: str, price_diff: float, upgrade_id: str
) -> None:
    """
    Send seat upgrade FCM notification if user has an FCM token.
    """
    if user.fcm_token:
        fcm.send_seat_upgrade_offer(
            fcm_token=user.fcm_token,
            from_seat=from_seat,
            to_seat=to_seat,
            price_diff=price_diff,
            upgrade_id=upgrade_id,
        )


def notify_task_assigned(
    user: User, task_title: str, priority: str, zone_name: str | None
) -> None:
    """Send task assignment notification to a staff member."""
    if user.fcm_token:
        fcm.send_task_assignment(
            fcm_token=user.fcm_token,
            task_title=task_title,
            priority=priority,
            zone_name=zone_name,
        )
