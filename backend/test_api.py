import argparse
import os

from fastapi.testclient import TestClient

from app.main import app


def _require_setting(name: str, value: str | None) -> str:
    if value:
        return value
    raise RuntimeError(
        f"Missing {name}. Pass --{name.lower().replace('_', '-')} or set the {name} environment variable."
    )


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Exercise the crowd density endpoint against a configured database."
    )
    parser.add_argument("--db-url", default=os.environ.get("DATABASE_URL"), help="Async DATABASE_URL to use.")
    parser.add_argument(
        "--venue-id",
        default=os.environ.get("TEST_VENUE_ID"),
        help="Venue UUID to send in the payload.",
    )
    parser.add_argument("--zone-id", default=os.environ.get("TEST_ZONE_ID"), help="Zone UUID to update.")
    parser.add_argument("--density", type=float, default=0.65, help="Density value to send.")
    parser.add_argument("--count", type=int, default=5200, help="Crowd count to send.")
    args = parser.parse_args()

    os.environ["DATABASE_URL"] = _require_setting("DATABASE_URL", args.db_url)
    venue_id = _require_setting("TEST_VENUE_ID", args.venue_id)
    zone_id = _require_setting("TEST_ZONE_ID", args.zone_id)

    with TestClient(app) as client:
        from app.core.dependencies import require_admin
        from app.db.models.user import User

        app.dependency_overrides[require_admin] = lambda: User(
            id="12345678-1234-1234-1234-123456789012",
            role="ADMIN",
        )

        payload = {
            "venue_id": venue_id,
            "density": args.density,
            "count": args.count,
        }

        print(f"Making POST to /api/v1/crowd/density/{zone_id}")
        resp = client.post(f"/api/v1/crowd/density/{zone_id}", json=payload)
        print(resp.status_code)
        print(resp.json())

        app.dependency_overrides.pop(require_admin, None)


if __name__ == "__main__":
    main()
