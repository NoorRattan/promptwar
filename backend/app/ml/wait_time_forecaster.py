"""Queue wait-time forecasting with Prophet and safe fallback logic."""

import logging
from typing import Any

import numpy as np

from app.ml.training_data import generate_wait_time_training_data

try:
    from prophet import Prophet

    _PROPHET_AVAILABLE = True
except ImportError:
    _PROPHET_AVAILABLE = False
    Prophet = None  # type: ignore[assignment,misc]

logger = logging.getLogger(__name__)

SPIKE_THRESHOLD_MINUTES = 15
ALERT_INCREASE_THRESHOLD = 5


class WaitTimeForecaster:
    """Prophet-backed queue wait-time forecaster with safe fallback behavior."""

    def __init__(self) -> None:
        self._model: Prophet | None = None
        self._is_trained = False
        self._train()

    def _train(self) -> None:
        """Train Prophet or switch to the linear fallback path."""
        if not _PROPHET_AVAILABLE:
            logger.warning(
                "Prophet not available - using linear extrapolation fallback"
            )
            self._is_trained = True
            return

        try:
            training_frame = generate_wait_time_training_data()
            self._model = Prophet(
                daily_seasonality=True,
                weekly_seasonality=True,
                yearly_seasonality=False,
                changepoint_prior_scale=0.05,
                seasonality_prior_scale=10,
                interval_width=0.80,
                uncertainty_samples=100,
            )
            logging.getLogger("cmdstanpy").setLevel(logging.WARNING)
            logging.getLogger("prophet").setLevel(logging.WARNING)
            self._model.fit(training_frame)
            self._is_trained = True
            logger.info(
                "WaitTimeForecaster trained on %d hourly data points",
                len(training_frame),
            )
        except Exception as exc:
            logger.error("WaitTimeForecaster training failed: %s", exc)
            self._model = None
            self._is_trained = True

    def forecast_queue(
        self,
        queue_name: str,
        current_wait_minutes: int,
        current_length: int,
        queue_type: str = "food",
    ) -> dict[str, Any]:
        """Forecast queue wait times for the next 15 and 30 minutes."""
        if not self._is_trained or self._model is None:
            trend = max(0, current_length // 3)
            return {
                "predicted_wait_15min": current_wait_minutes + trend,
                "predicted_wait_30min": current_wait_minutes + (trend * 2),
                "alert": current_wait_minutes > SPIKE_THRESHOLD_MINUTES,
                "recommendation": None,
            }

        try:
            future = self._model.make_future_dataframe(periods=2, freq="h")
            forecast = self._model.predict(future)
            last_two = forecast.tail(2)

            base_15 = float(last_two.iloc[0]["yhat"])
            base_30 = float(last_two.iloc[1]["yhat"] if len(last_two) > 1 else base_15)
            base_now = float(forecast.iloc[-3]["yhat"]) if len(forecast) > 2 else 5.0
            scale = (current_wait_minutes / base_now) if base_now > 0 else 1.0
            scale = float(np.clip(scale, 0.5, 3.0))

            predicted_15 = max(0, int(round(base_15 * scale)))
            predicted_30 = max(0, int(round(base_30 * scale)))
            alert = (
                predicted_15 > current_wait_minutes + ALERT_INCREASE_THRESHOLD
                or predicted_15 > SPIKE_THRESHOLD_MINUTES
            )

            recommendation: str | None = None
            if alert and predicted_15 > 20:
                recommendation = (
                    f"{queue_name} predicted to reach {predicted_15}-minute wait "
                    "consider opening an additional counter."
                )
            elif alert and predicted_15 > SPIKE_THRESHOLD_MINUTES:
                recommendation = (
                    f"{queue_name} predicted at {predicted_15} minutes wait "
                    "monitor closely and prepare backup staff."
                )

            return {
                "predicted_wait_15min": predicted_15,
                "predicted_wait_30min": predicted_30,
                "alert": alert,
                "recommendation": recommendation,
            }
        except Exception as exc:
            logger.error(
                "WaitTimeForecaster predict failed queue=%s: %s",
                queue_name,
                exc,
            )
            return {
                "predicted_wait_15min": current_wait_minutes,
                "predicted_wait_30min": current_wait_minutes,
                "alert": False,
                "recommendation": None,
            }

    def forecast_venue_queues(
        self,
        queues: list[dict[str, Any]],
    ) -> list[dict[str, Any]]:
        """Forecast wait times for every open queue in a venue."""
        results: list[dict[str, Any]] = []
        for queue in queues:
            if not queue.get("is_open", True):
                continue

            forecast = self.forecast_queue(
                queue_name=str(queue.get("name", "Queue")),
                current_wait_minutes=int(queue.get("estimated_wait_minutes", 0)),
                current_length=int(queue.get("current_length", 0)),
                queue_type=str(queue.get("queue_type", "food")),
            )
            results.append(
                {
                    "queue_id": queue["id"],
                    "queue_name": queue.get("name", "Queue"),
                    "current_wait": queue.get("estimated_wait_minutes", 0),
                    **forecast,
                }
            )

        logger.info(
            "Queue forecast complete: %d queues, %d alerts",
            len(results),
            sum(1 for item in results if item["alert"]),
        )
        return results


_forecaster: WaitTimeForecaster | None = None


def get_forecaster() -> WaitTimeForecaster:
    """Return the module-level forecaster singleton."""
    global _forecaster
    if _forecaster is None:
        _forecaster = WaitTimeForecaster()
    return _forecaster
