import logging
import numpy as np
from typing import Any

from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score
from app.ml.training_data import generate_crowd_training_data

logger = logging.getLogger(__name__)

DENSITY_LABELS = {0: "LOW", 1: "MEDIUM", 2: "HIGH", 3: "CRITICAL"}
ALERT_CONFIDENCE_THRESHOLD = 0.75
FEATURE_COLUMNS = [
    "minute_of_event",
    "zone_type_encoded",
    "is_halftime",
    "is_entry_period",
    "is_exit_period",
    "venue_fill_ratio",
    "gates_open",
]


class CrowdPredictor:
    """
    Random Forest crowd density predictor for stadium zones.

    Trained on synthetic historical data at instantiation time.
    Provides 15-minute and 30-minute density level predictions with
    confidence scores for each venue zone.

    The model is intentionally simple (RandomForest with 50 estimators)
    to train fast on Cloud Run's cold start. Accuracy on synthetic data
    is approximately 85% — sufficient for congestion alerting.
    """

    def __init__(self) -> None:
        """
        Initialize and train the RandomForest model on synthetic data.
        Called once when the module is imported.
        """
        self._model: RandomForestClassifier | None = None
        self._zone_type_map: dict[str, int] = {
            "entry": 0,
            "concourse": 1,
            "seating": 2,
            "food": 3,
            "restroom": 4,
            "medical": 5,
            "exit": 6,
        }
        self._is_trained: bool = False
        self._train()

    def _train(self) -> None:
        """
        Train the RandomForestClassifier on synthetic crowd data.
        Logs training accuracy for verification. Sets self._is_trained=True on success.
        """
        try:
            df = generate_crowd_training_data()
            X = df[FEATURE_COLUMNS].values
            y = df["density_level"].values

            X_train, X_test, y_train, y_test = train_test_split(
                X, y, test_size=0.2, random_state=42, stratify=y
            )

            self._model = RandomForestClassifier(
                n_estimators=50,  # Keep small — must train fast on cold start
                max_depth=8,  # Limit depth to prevent overfitting on small dataset
                min_samples_leaf=5,  # Prevent tiny leaves — adds regularisation
                class_weight="balanced",  # Handle class imbalance (CRITICAL is rare)
                random_state=42,
                n_jobs=1,  # Single thread — Cloud Run free tier has 1 vCPU
            )
            self._model.fit(X_train, y_train)

            # Evaluate on held-out test set
            y_pred = self._model.predict(X_test)
            accuracy = accuracy_score(y_test, y_pred)
            self._is_trained = True

            logger.info(
                "CrowdPredictor trained: accuracy=%.2f%% n_estimators=50 features=%d",
                accuracy * 100,
                len(FEATURE_COLUMNS),
            )
        except Exception as e:
            logger.error("CrowdPredictor training failed: %s", str(e))
            self._is_trained = False

    def predict_zone(
        self,
        zone_type: str,
        current_density: float,
        minute_of_event: int,
        venue_fill_ratio: float,
        gates_open: bool = False,
    ) -> dict[str, Any]:
        """
        Predict crowd density level for a zone at +15 and +30 minutes.

        Args:
            zone_type: Zone type string (entry|concourse|seating|food|restroom|medical|exit)
            current_density: Current zone density ratio (0.0–1.0)
            minute_of_event: Minutes elapsed since event start (0–120)
            venue_fill_ratio: Overall venue fill ratio (0.0–1.0)
            gates_open: Whether entry gates are currently open

        Returns:
            dict with keys:
                predicted_level_15min: str (LOW|MEDIUM|HIGH|CRITICAL)
                predicted_level_30min: str
                confidence: float (0.0–1.0) — max confidence across the two predictions
                alert: bool — True if confidence >= threshold AND HIGH or CRITICAL predicted
                alert_message: str | None — human-readable alert if alert=True
        """
        if not self._is_trained or self._model is None:
            return {
                "predicted_level_15min": "MEDIUM",
                "predicted_level_30min": "MEDIUM",
                "confidence": 0.0,
                "alert": False,
                "alert_message": None,
            }

        zone_encoded = self._zone_type_map.get(zone_type.lower(), 2)  # default: seating

        def _make_features(minute_offset: int) -> np.ndarray[Any, Any]:
            future_minute = min(120, minute_of_event + minute_offset)
            return np.array(
                [
                    [
                        future_minute,
                        zone_encoded,
                        1 if 55 <= future_minute <= 65 else 0,
                        1 if 0 <= future_minute <= 20 else 0,
                        1 if 100 <= future_minute <= 120 else 0,
                        venue_fill_ratio,
                        1 if gates_open else 0,
                    ]
                ]
            )

        features_15 = _make_features(15)
        features_30 = _make_features(30)

        pred_15 = int(self._model.predict(features_15)[0])
        pred_30 = int(self._model.predict(features_30)[0])
        proba_15 = self._model.predict_proba(features_15)[0]
        proba_30 = self._model.predict_proba(features_30)[0]

        confidence = float(max(proba_15.max(), proba_30.max()))
        level_15 = DENSITY_LABELS[pred_15]
        level_30 = DENSITY_LABELS[pred_30]

        alert = confidence >= ALERT_CONFIDENCE_THRESHOLD and (
            level_15 in ("HIGH", "CRITICAL") or level_30 in ("HIGH", "CRITICAL")
        )

        alert_message: str | None = None
        if alert:
            worst = level_15 if pred_15 >= pred_30 else level_30
            time_frame = "15" if pred_15 >= pred_30 else "30"
            alert_message = (
                f"Zone predicted to reach {worst} density in {time_frame} minutes "
                f"(confidence: {confidence:.0%}). Consider deploying crowd control."
            )

        return {
            "predicted_level_15min": level_15,
            "predicted_level_30min": level_30,
            "confidence": round(confidence, 3),
            "alert": alert,
            "alert_message": alert_message,
        }

    def predict_venue(
        self,
        zones: list[dict[str, Any]],
        minute_of_event: int,
    ) -> list[dict[str, Any]]:
        """
        Predict density for all zones in a venue.
        Called by the GET /crowd/predictions admin endpoint.

        Args:
            zones: List of zone dicts with keys: id, name, zone_type,
                   current_density, lat_center, lng_center
            minute_of_event: Minutes elapsed since event start

        Returns:
            list of prediction dicts, one per zone, including zone_id and zone_name
        """
        venue_fill = (
            sum(z.get("current_density", 0) for z in zones) / len(zones)
            if zones
            else 0.0
        )

        predictions = []
        for zone in zones:
            prediction = self.predict_zone(
                zone_type=zone.get("zone_type", "seating"),
                current_density=zone.get("current_density", 0.5),
                minute_of_event=minute_of_event,
                venue_fill_ratio=venue_fill,
            )
            predictions.append(
                {
                    "zone_id": zone["id"],
                    "zone_name": zone.get("name", "Unknown Zone"),
                    **prediction,
                }
            )

        alert_count = sum(1 for p in predictions if p["alert"])
        if alert_count > 0:
            logger.warning(
                "Venue prediction: %d zone(s) with congestion alerts", alert_count
            )

        return predictions


_predictor: CrowdPredictor | None = None


def get_predictor() -> CrowdPredictor:
    """
    Return the module-level CrowdPredictor singleton.
    Instantiates and trains the model on first call.
    Subsequent calls return the already-trained instance.
    """
    global _predictor
    if _predictor is None:
        logger.info("Initializing CrowdPredictor — training on synthetic data...")
        _predictor = CrowdPredictor()
    return _predictor
