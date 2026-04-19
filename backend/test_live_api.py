import argparse
import os

import httpx

from seed_demo import _get_firebase_token

def _require_setting(name: str, value: str | None) -> str:
    if value:
        return value
    raise RuntimeError(
        f"Missing {name}. Pass --{name.lower().replace('_', '-')} or set the {name} environment variable."
    )


def main() -> None:
    parser = argparse.ArgumentParser(description="Call the crowd density endpoint with explicit credentials.")
    parser.add_argument(
        "--api-url",
        default=os.environ.get("CROWDIQ_API_URL", "http://localhost:8080/api/v1"),
        help="Base API URL, including /api/v1.",
    )
    parser.add_argument(
        "--firebase-key",
        default=os.environ.get("VITE_FIREBASE_API_KEY") or os.environ.get("FIREBASE_WEB_API_KEY"),
        help="Firebase web API key.",
    )
    parser.add_argument(
        "--admin-email",
        default=os.environ.get("SEED_ADMIN_EMAIL"),
        help="Admin email used to request a Firebase ID token.",
    )
    parser.add_argument(
        "--admin-password",
        default=os.environ.get("SEED_ADMIN_PASSWORD"),
        help="Admin password used to request a Firebase ID token.",
    )
    parser.add_argument("--venue-id", default=os.environ.get("TEST_VENUE_ID"), help="Venue UUID to send.")
    parser.add_argument("--zone-id", default=os.environ.get("TEST_ZONE_ID"), help="Zone UUID to update.")
    parser.add_argument("--density", type=float, default=0.65, help="Density value to send.")
    parser.add_argument("--count", type=int, default=5200, help="Crowd count to send.")
    args = parser.parse_args()

    firebase_key = _require_setting("FIREBASE_WEB_API_KEY", args.firebase_key)
    admin_email = _require_setting("SEED_ADMIN_EMAIL", args.admin_email)
    admin_password = _require_setting("SEED_ADMIN_PASSWORD", args.admin_password)
    zone_id = _require_setting("TEST_ZONE_ID", args.zone_id)
    venue_id = _require_setting("TEST_VENUE_ID", args.venue_id)

    _, admin_token = _get_firebase_token(firebase_key, admin_email, admin_password)
    headers = {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}
    payload = {
        "venue_id": venue_id,
        "density": args.density,
        "count": args.count,
    }

    with httpx.Client(base_url=args.api_url, headers=headers) as client:
        resp = client.post(f"/crowd/density/{zone_id}", json=payload)
        print(resp.status_code)
        print(resp.text)


if __name__ == "__main__":
    main()
