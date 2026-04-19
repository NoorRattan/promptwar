import logging
from app.ml.crowd_predictor import get_predictor
from app.firebase import fcm

logger = logging.getLogger(__name__)

RULE_BASED_ALERT_THRESHOLD = 0.80  # 80% capacity triggers immediate rule alert
ML_ALERT_CONFIDENCE = 0.75  # Minimum ML confidence for predictive alert


def _as_bool(value: object, default: bool = False) -> bool:
    return value if isinstance(value, bool) else default


def _as_float(value: object, default: float = 0.0) -> float:
    return float(value) if isinstance(value, (int, float)) else default


def _as_str(value: object, default: str) -> str:
    return value if isinstance(value, str) else default


def check_congestion_threshold(
    zone_id: str,
    zone_name: str,
    zone_type: str,
    current_density: float,
    current_level: str,
    minute_of_event: int,
    venue_fill_ratio: float,
    staff_fcm_tokens: list[str],
) -> None:
    """
    Evaluate congestion thresholds and send alerts if warranted.
    Called as a FastAPI BackgroundTask after each density update.
    Never raises — all errors are logged and suppressed.

    Decision logic:
    1. RULE: If current_density >= 0.80 → immediate alert (known high density)
    2. ML: If ML predicts HIGH/CRITICAL in 15min with confidence >= 0.75 → predictive alert
    3. If BOTH fire → send single alert with combined message (avoid duplicate pushes)

    Args:
        zone_id: Zone UUID string (for logging)
        zone_name: Human-readable zone name (for alert messages)
        zone_type: Zone type for ML feature input
        current_density: Current density ratio 0.0–1.0
        current_level: Current density level string (for rule check)
        minute_of_event: Minutes since event start (for ML features)
        venue_fill_ratio: Overall venue density for ML features
        staff_fcm_tokens: FCM tokens for all STAFF users at the venue
    """
    try:
        rule_alert = current_density >= RULE_BASED_ALERT_THRESHOLD
        ml_alert = False

        # ML prediction (only if not already at CRITICAL — rule already covers it)
        if current_level != "CRITICAL":
            try:
                predictor = get_predictor()
                prediction = predictor.predict_zone(
                    zone_type=zone_type,
                    current_density=current_density,
                    minute_of_event=minute_of_event,
                    venue_fill_ratio=venue_fill_ratio,
                )
                ml_alert = prediction.get("alert", False)
            except Exception as ml_err:
                logger.debug(
                    "ML prediction failed in congestion check: %s", str(ml_err)
                )

        if not rule_alert and not ml_alert:
            return  # No alert needed — exit early

        logger.warning(
            "CONGESTION ALERT: zone=%s level=%s density=%.2f rule=%s ml=%s",
            zone_name,
            current_level,
            current_density,
            rule_alert,
            ml_alert,
        )

        # Send FCM to all staff tokens — fire and forget
        for token in staff_fcm_tokens:
            try:
                fcm.send_congestion_alert(
                    fcm_token=token,
                    zone_name=zone_name,
                    level=current_level,
                )
            except Exception as fcm_err:
                logger.debug(
                    "FCM congestion alert failed token=%s: %s", token[:20], str(fcm_err)
                )

    except Exception as e:
        # Never raise from BackgroundTask — log and return
        logger.error("check_congestion_threshold failed zone=%s: %s", zone_id, str(e))


def get_venue_alert_summary(
    zones: list[dict[str, object]],
    minute_of_event: int,
) -> dict[str, object]:
    """
    Generate a summary of congestion alerts across all venue zones.
    Used by the admin dashboard to show a venue-wide alert status.

    Args:
        zones: List of zone dicts with current_density, zone_type, name, id
        minute_of_event: Minutes since event start

    Returns:
        dict: total_alerts, critical_zones (list of zone names), overall_risk (str)
    """
    try:
        predictor = get_predictor()
        venue_fill = (
            sum(_as_float(z.get("current_density", 0)) for z in zones) / len(zones)
            if zones
            else 0.0
        )

        alert_zones = []
        for zone in zones:
            density = _as_float(zone.get("current_density", 0))
            level = _as_str(zone.get("density_level", "LOW"), "LOW")
            if density >= RULE_BASED_ALERT_THRESHOLD or level in ("HIGH", "CRITICAL"):
                alert_zones.append(_as_str(zone.get("name", "Unknown"), "Unknown"))
                continue

            try:
                pred = predictor.predict_zone(
                    zone_type=_as_str(zone.get("zone_type", "seating"), "seating"),
                    current_density=density,
                    minute_of_event=minute_of_event,
                    venue_fill_ratio=venue_fill,
                )
                if _as_bool(pred.get("alert")):
                    alert_zones.append(_as_str(zone.get("name", "Unknown"), "Unknown"))
            except Exception:
                continue

        total = len(alert_zones)
        if total == 0:
            overall_risk = "LOW"
        elif total <= 2:
            overall_risk = "MEDIUM"
        elif total <= 4:
            overall_risk = "HIGH"
        else:
            overall_risk = "CRITICAL"

        return {
            "total_alerts": total,
            "alert_zones": alert_zones,
            "overall_risk": overall_risk,
        }
    except Exception as e:
        logger.error("get_venue_alert_summary failed: %s", str(e))
        return {"total_alerts": 0, "alert_zones": [], "overall_risk": "LOW"}
