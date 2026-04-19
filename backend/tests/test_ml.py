from unittest.mock import patch, MagicMock
from app.ml.training_data import (
    generate_crowd_training_data,
    generate_wait_time_training_data,
)
from app.ml.crowd_predictor import CrowdPredictor
from app.ml.wait_time_forecaster import WaitTimeForecaster
from app.ml.congestion_alerter import (
    check_congestion_threshold,
    get_venue_alert_summary,
)


def test_crowd_training_data_shape():
    """Training data generates expected number of rows and required columns."""
    df = generate_crowd_training_data()
    assert len(df) > 0
    assert "density_level" in df.columns
    assert "minute_of_event" in df.columns
    assert df["density_level"].between(0, 3).all()


def test_crowd_training_data_class_distribution():
    """All four density levels are represented in training data."""
    df = generate_crowd_training_data()
    assert df["density_level"].nunique() == 4


def test_wait_time_training_data_prophet_format():
    """Wait time data has required Prophet columns ds and y."""
    df = generate_wait_time_training_data()
    assert "ds" in df.columns
    assert "y" in df.columns
    assert len(df) > 100
    assert (df["y"] >= 0).all()


def test_crowd_predictor_trains_successfully():
    """CrowdPredictor initializes and marks itself as trained."""
    predictor = CrowdPredictor()
    assert predictor._is_trained is True
    assert predictor._model is not None


def test_crowd_predictor_predict_zone_schema():
    """predict_zone returns dict with all required keys."""
    predictor = CrowdPredictor()
    result = predictor.predict_zone(
        zone_type="food", current_density=0.75, minute_of_event=60, venue_fill_ratio=0.6
    )
    assert "predicted_level_15min" in result
    assert "predicted_level_30min" in result
    assert "confidence" in result
    assert "alert" in result
    assert result["predicted_level_15min"] in ("LOW", "MEDIUM", "HIGH", "CRITICAL")
    assert 0.0 <= result["confidence"] <= 1.0
    assert isinstance(result["alert"], bool)


def test_crowd_predictor_unknown_zone_type():
    """predict_zone handles unknown zone_type gracefully without raising."""
    predictor = CrowdPredictor()
    result = predictor.predict_zone(
        zone_type="unknown_zone",
        current_density=0.5,
        minute_of_event=30,
        venue_fill_ratio=0.5,
    )
    assert "predicted_level_15min" in result  # Schema intact even with unknown type


def test_crowd_predictor_predict_venue_empty():
    """predict_venue handles empty zone list without raising."""
    predictor = CrowdPredictor()
    result = predictor.predict_venue([], minute_of_event=60)
    assert result == []


def test_crowd_predictor_predict_venue_schema():
    """predict_venue returns list with zone_id and zone_name for each zone."""
    predictor = CrowdPredictor()
    zones = [
        {
            "id": "z1",
            "name": "Gate A",
            "zone_type": "entry",
            "current_density": 0.7,
            "lat_center": 12.0,
            "lng_center": 77.0,
        },
    ]
    results = predictor.predict_venue(zones, minute_of_event=10)
    assert len(results) == 1
    assert results[0]["zone_id"] == "z1"
    assert results[0]["zone_name"] == "Gate A"


def test_wait_time_forecaster_trains_successfully():
    """WaitTimeForecaster initializes and marks itself as trained."""
    forecaster = WaitTimeForecaster()
    assert forecaster._is_trained is True


def test_wait_time_forecaster_forecast_schema():
    """forecast_queue returns dict with required keys."""
    forecaster = WaitTimeForecaster()
    result = forecaster.forecast_queue(
        queue_name="Gate B Food",
        current_wait_minutes=8,
        current_length=25,
        queue_type="food",
    )
    assert "predicted_wait_15min" in result
    assert "predicted_wait_30min" in result
    assert "alert" in result
    assert isinstance(result["predicted_wait_15min"], int)
    assert result["predicted_wait_15min"] >= 0


def test_wait_time_forecaster_untrained_fallback():
    """forecast_queue returns safe fallback when model is not trained."""
    forecaster = WaitTimeForecaster()
    forecaster._is_trained = False  # Simulate training failure
    result = forecaster.forecast_queue("Test Queue", 10, 30)
    assert "predicted_wait_15min" in result
    assert isinstance(result["alert"], bool)


def test_congestion_alerter_no_alert_below_threshold():
    """No alert fired when density is below 0.80 threshold."""
    with patch("app.ml.congestion_alerter.fcm") as mock_fcm:
        check_congestion_threshold(
            zone_id="z1",
            zone_name="Seating A",
            zone_type="seating",
            current_density=0.50,
            current_level="MEDIUM",
            minute_of_event=30,
            venue_fill_ratio=0.50,
            staff_fcm_tokens=["token1"],
        )
        mock_fcm.send_congestion_alert.assert_not_called()


def test_congestion_alerter_rule_fires_above_threshold():
    """Congestion alert FCM is sent when density exceeds 0.80."""
    with patch("app.ml.congestion_alerter.fcm") as mock_fcm:
        mock_fcm.send_congestion_alert = MagicMock()
        check_congestion_threshold(
            zone_id="z1",
            zone_name="Gate C",
            zone_type="entry",
            current_density=0.90,
            current_level="CRITICAL",
            minute_of_event=10,
            venue_fill_ratio=0.85,
            staff_fcm_tokens=["token1", "token2"],
        )
        assert mock_fcm.send_congestion_alert.call_count == 2


def test_congestion_alerter_never_raises():
    """check_congestion_threshold never raises even with invalid inputs."""
    check_congestion_threshold(
        zone_id="",
        zone_name="",
        zone_type="invalid",
        current_density=2.0,  # Invalid — above 1.0
        current_level="UNKNOWN",
        minute_of_event=-1,
        venue_fill_ratio=-1.0,
        staff_fcm_tokens=[],
    )
    # If we reach here, no exception was raised — test passes


def test_venue_alert_summary_empty_zones():
    """get_venue_alert_summary returns safe defaults for empty zone list."""
    result = get_venue_alert_summary([], minute_of_event=60)
    assert result["total_alerts"] == 0
    assert result["overall_risk"] == "LOW"
