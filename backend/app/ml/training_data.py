import numpy as np
import pandas as pd
import logging
from typing import TypedDict

logger = logging.getLogger(__name__)

ZONE_TYPES = ["entry", "concourse", "seating", "food", "restroom", "medical", "exit"]
EVENT_DURATION_MINUTES = 120  # Standard 2-hour sporting event
SAMPLES_PER_ZONE = 500  # Synthetic samples per zone type
RANDOM_SEED = 42  # Fixed seed for reproducibility


class ZoneDensityProfile(TypedDict):
    peak_minutes: list[int]
    base: float
    peak: float


def generate_crowd_training_data() -> pd.DataFrame:
    """
    Generate synthetic crowd density training data for the RandomForest model.

    Features engineered to capture real stadium crowd dynamics:
    - minute_of_event: 0–120 (time since event start)
    - zone_type_encoded: integer encoding of zone type (0–6)
    - is_halftime: 1 if minute 55–65, else 0
    - is_entry_period: 1 if minute 0–20, else 0
    - is_exit_period: 1 if minute 100–120, else 0
    - venue_fill_ratio: overall venue density 0.0–1.0 (simulates crowd flow)
    - gates_open: 1 if gates are open (minutes 0–10), else 0

    Target variable:
    - density_level: 0=LOW, 1=MEDIUM, 2=HIGH, 3=CRITICAL

    Returns:
        pd.DataFrame with feature columns and 'density_level' target column.
        Shape: approximately (ZONE_TYPES × SAMPLES_PER_ZONE, 8)
    """
    np.random.seed(RANDOM_SEED)
    records = []

    zone_density_profiles: dict[str, ZoneDensityProfile] = {
        "entry": {"peak_minutes": [10, 15], "base": 0.2, "peak": 0.9},
        "concourse": {"peak_minutes": [15, 60, 105], "base": 0.3, "peak": 0.75},
        "seating": {"peak_minutes": [20, 65, 110], "base": 0.5, "peak": 0.7},
        "food": {"peak_minutes": [60, 65], "base": 0.15, "peak": 0.85},
        "restroom": {"peak_minutes": [58, 100], "base": 0.1, "peak": 0.8},
        "medical": {"peak_minutes": [], "base": 0.05, "peak": 0.25},
        "exit": {"peak_minutes": [110, 115, 120], "base": 0.05, "peak": 0.95},
    }

    for zone_idx, (zone_type, profile) in enumerate(zone_density_profiles.items()):
        for _ in range(SAMPLES_PER_ZONE):
            minute = int(np.random.randint(0, EVENT_DURATION_MINUTES + 1))

            # Calculate density based on proximity to peak minutes
            density = profile["base"]
            for peak_min in profile["peak_minutes"]:
                proximity = max(0, 1 - abs(minute - peak_min) / 20)
                density += float(profile["peak"] - profile["base"]) * proximity

            # Add realistic noise
            density += np.random.normal(0, 0.08)
            density = float(np.clip(density, 0.0, 1.0))

            # Map density to level
            if density <= 0.40:
                level = 0  # LOW
            elif density <= 0.65:
                level = 1  # MEDIUM
            elif density <= 0.85:
                level = 2  # HIGH
            else:
                level = 3  # CRITICAL

            records.append(
                {
                    "minute_of_event": minute,
                    "zone_type_encoded": zone_idx,
                    "is_halftime": 1 if 55 <= minute <= 65 else 0,
                    "is_entry_period": 1 if 0 <= minute <= 20 else 0,
                    "is_exit_period": 1 if 100 <= minute <= 120 else 0,
                    "venue_fill_ratio": min(
                        1.0, max(0.0, density + np.random.normal(0, 0.05))
                    ),
                    "gates_open": 1 if minute <= 10 else 0,
                    "density_level": level,
                }
            )

    df = pd.DataFrame(records)
    logger.info(
        "Generated crowd training data: %d rows, class distribution: %s",
        len(df),
        df["density_level"].value_counts().to_dict(),
    )
    return df


def generate_wait_time_training_data() -> pd.DataFrame:
    """
    Generate synthetic wait time time-series data for the Prophet forecaster.

    Prophet expects a DataFrame with exactly two columns:
    - ds: datetime (timestamp)
    - y: numeric value to forecast (wait time in minutes)

    Generates one year of synthetic hourly queue wait time data for a
    "typical food queue at a stadium". Captures:
    - Weekly seasonality: weekends have higher wait times
    - Daily seasonality: peaks at noon, 6pm, and 8pm (event times)
    - Event-day spikes at halftime (simulated)
    - Random noise for realism

    Returns:
        pd.DataFrame with columns: ds (datetime), y (float wait minutes)
        Shape: approximately (8760, 2) — 365 days × 24 hours
    """
    np.random.seed(RANDOM_SEED + 1)

    # Generate hourly timestamps for one year
    start = pd.Timestamp("2024-01-01")
    dates = pd.date_range(start=start, periods=365 * 24, freq="h")

    wait_times = []
    for ts in dates:
        hour = ts.hour
        day_of_week = ts.dayofweek  # 0=Monday, 6=Sunday

        # Base wait time
        base_wait = 3.0

        # Daily pattern: peaks at noon, 6pm, 8pm
        hour_factor = 1.0
        if 11 <= hour <= 13:
            hour_factor = 3.5
        elif 17 <= hour <= 19:
            hour_factor = 4.0
        elif 19 <= hour <= 21:
            hour_factor = 3.0
        elif 22 <= hour or hour <= 8:
            hour_factor = 0.5

        # Weekend spike
        weekend_factor = 1.8 if day_of_week >= 5 else 1.0

        # Halftime simulation (random spike ~50% of event-day hours)
        halftime_spike = np.random.choice([0, 8], p=[0.5, 0.5])

        wait = (base_wait * hour_factor * weekend_factor) + halftime_spike
        wait += np.random.normal(0, 1.5)  # noise
        wait = max(0, wait)
        wait_times.append(wait)

    df = pd.DataFrame({"ds": dates, "y": wait_times})
    logger.info("Generated wait time training data: %d hourly rows", len(df))
    return df
