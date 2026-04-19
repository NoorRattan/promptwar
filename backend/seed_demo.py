"""
CrowdIQ Demo Data Seeder
========================
Seeds the live Supabase database with a demo venue, 6 zones, 4 queues, 4 menu
items, and initial crowd-density readings so the competition demo works end-to-end.

Usage (from the backend/ directory):
    python seed_demo.py \\
        --api-url http://localhost:8080/api/v1 \\
        --firebase-key your_firebase_web_api_key \\
        --admin-email admin@example.com

The script inserts rows directly via SQLAlchemy (sync psycopg2) to avoid
needing admin-create REST endpoints that don't exist yet, then calls the
live crowd-density API to seed Firestore/Redis state via the existing route.
"""
from __future__ import annotations

import argparse
import json
import logging
import os
import sys
import uuid
from decimal import Decimal

import httpx
import sqlalchemy as sa
from sqlalchemy import create_engine, text

logging.basicConfig(level=logging.INFO, format="%(levelname)s  %(message)s")
log = logging.getLogger("seed_demo")

# ---------------------------------------------------------------------------
# Data definitions
# ---------------------------------------------------------------------------

VENUE = {
    "name": "MetroArena Stadium",
    "address": "1 Stadium Way, New Delhi, India",
    "capacity": 50000,
    "timezone": "Asia/Kolkata",
    "lat_center": 28.6139,
    "lng_center": 77.2090,
}

ZONES = [
    {
        "name": "North Stand",
        "zone_type": "SEATING",
        "capacity": 8000,
        "lat_center": 28.6155,
        "lng_center": 77.2090,
        "initial_density": 0.65,
    },
    {
        "name": "South Stand",
        "zone_type": "SEATING",
        "capacity": 8000,
        "lat_center": 28.6123,
        "lng_center": 77.2090,
        "initial_density": 0.35,
    },
    {
        "name": "East Concourse",
        "zone_type": "CONCOURSE",
        "capacity": 5000,
        "lat_center": 28.6139,
        "lng_center": 77.2110,
        "initial_density": 0.78,
    },
    {
        "name": "West Concourse",
        "zone_type": "CONCOURSE",
        "capacity": 5000,
        "lat_center": 28.6139,
        "lng_center": 77.2070,
        "initial_density": 0.42,
    },
    {
        "name": "Food Court A",
        "zone_type": "FOOD",
        "capacity": 2000,
        "lat_center": 28.6148,
        "lng_center": 77.2085,
        "initial_density": 0.88,
    },
    {
        "name": "Main Gate",
        "zone_type": "ENTRY",
        "capacity": 3000,
        "lat_center": 28.6160,
        "lng_center": 77.2090,
        "initial_density": 0.25,
    },
]

QUEUES = [
    {"name": "Gate A Entry Queue",     "queue_type": "ENTRY",       "estimated_wait_minutes": 8,  "zone_name": "Main Gate"},
    {"name": "Food Court A Queue",     "queue_type": "FOOD",        "estimated_wait_minutes": 12, "zone_name": "Food Court A"},
    {"name": "North Stand Restroom",   "queue_type": "RESTROOM",    "estimated_wait_minutes": 5,  "zone_name": "North Stand"},
    {"name": "Merchandise Stand",      "queue_type": "MERCHANDISE", "estimated_wait_minutes": 3,  "zone_name": "East Concourse"},
]

MENU_ITEMS = [
    {
        "name": "Stadium Burger",
        "description": "Juicy chicken patty with stadium-special sauce",
        "category": "HOT_FOOD",
        "price": 299.00,
        "prep_time_minutes": 8,
        "dietary_tags": [],
    },
    {
        "name": "Masala Chips",
        "description": "Crispy potato chips with spiced masala seasoning",
        "category": "SNACKS",
        "price": 149.00,
        "prep_time_minutes": 3,
        "dietary_tags": ["vegetarian", "vegan"],
    },
    {
        "name": "Cold Cola",
        "description": "Chilled carbonated cola drink",
        "category": "BEVERAGES",
        "price": 99.00,
        "prep_time_minutes": 1,
        "dietary_tags": ["vegan"],
    },
    {
        "name": "CrowdIQ Cap",
        "description": "Official CrowdIQ stadium cap — limited edition",
        "category": "MERCHANDISE",
        "price": 499.00,
        "prep_time_minutes": 0,
        "dietary_tags": [],
    },
]

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _get_firebase_token(firebase_api_key: str, email: str, password: str) -> tuple[str, str]:
    """Authenticate via Firebase REST API and return an ID token."""
    url = (
        "https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword"
        f"?key={firebase_api_key}"
    )
    resp = httpx.post(url, json={"email": email, "password": password, "returnSecureToken": True}, timeout=15)
    if resp.status_code != 200:
        log.error("Firebase auth failed: %s", resp.text)
        sys.exit(1)
    data = resp.json()
    return data["localId"], data["idToken"]


def _sync_db_url(async_url: str) -> str:
    """Convert asyncpg URL to psycopg2 URL for sync seeding."""
    return async_url.replace("postgresql+asyncpg://", "postgresql+psycopg2://")


def _density_level(density: float) -> str:
    if density <= 0.40:
        return "LOW"
    if density <= 0.65:
        return "MEDIUM"
    if density <= 0.85:
        return "HIGH"
    return "CRITICAL"


# ---------------------------------------------------------------------------
# Main seeding logic
# ---------------------------------------------------------------------------


def seed(
    api_url: str,
    firebase_api_key: str,
    db_url_async: str,
    admin_email: str,
    admin_password: str,
) -> None:  # noqa: C901
    """Insert demo data into Supabase and seed crowd density via the live API."""

    # ── 1. Authenticate ─────────────────────────────────────────────────────
    log.info("Authenticating as %s ...", admin_email)
    admin_firebase_id, token = _get_firebase_token(firebase_api_key, admin_email, admin_password)
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    client = httpx.Client(base_url=api_url, headers=headers, timeout=20)

    # ── 2. Connect to database directly ────────────────────────────────────
    os.environ["DATABASE_URL"] = db_url_async.replace("postgresql+asyncpg://", "postgresql://")
    
    log.info("Connecting to database …")
    try:
        engine = create_engine(os.environ["DATABASE_URL"])
        conn = engine.connect()

        # INJECT ADMIN USER (Required for API auth)
        conn.execute(
            text(
                """
                INSERT INTO users (firebase_uid, email, name, role)
                VALUES (:uid, :email, 'Admin Seed', 'ADMIN')
                ON CONFLICT (email) DO NOTHING
                """
            ),
            {"uid": admin_firebase_id, "email": admin_email},
        )
        conn.commit()
    except Exception as exc:
        log.error("Could not connect to database: %s", exc)
        log.info("Tip: install psycopg2-binary → pip install psycopg2-binary")
        sys.exit(1)

    # ── 3. Patch missing columns in venues table ────────────────────────────
    # The initial schema migration lacked several columns defined in the SQLAlchemy model.
    # We add them here idempotently to avoid crashing on insert or when the backend queries.
    try:
        conn.execute(text("ALTER TABLE venues ADD COLUMN IF NOT EXISTS address VARCHAR(500) DEFAULT ''"))
        conn.execute(text("ALTER TABLE venues ADD COLUMN IF NOT EXISTS city VARCHAR(100) DEFAULT ''"))
        conn.execute(text("ALTER TABLE venues ADD COLUMN IF NOT EXISTS country VARCHAR(100) DEFAULT ''"))
        conn.execute(text("ALTER TABLE venues ADD COLUMN IF NOT EXISTS capacity INTEGER DEFAULT 0"))
        conn.execute(text("ALTER TABLE venues ADD COLUMN IF NOT EXISTS lat_center FLOAT DEFAULT 0.0"))
        conn.execute(text("ALTER TABLE venues ADD COLUMN IF NOT EXISTS lng_center FLOAT DEFAULT 0.0"))
        conn.execute(text("ALTER TABLE venues ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true"))
        
        # Patch menu_items
        conn.execute(text("ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS prep_time_minutes INTEGER DEFAULT 5"))
        conn.execute(text("ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS dietary_tags JSONB DEFAULT '[]'::jsonb"))
        conn.execute(text("ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS is_sold_out BOOLEAN DEFAULT false"))
        
        # Patch users
        conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS preferred_language VARCHAR(10) DEFAULT 'en'"))
        conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS seat_number VARCHAR(20)"))

        # Patch zones
        conn.execute(text("ALTER TABLE zones ADD COLUMN IF NOT EXISTS polygon JSON"))

        # Patch queues
        conn.execute(text("ALTER TABLE queues ADD COLUMN IF NOT EXISTS throughput_per_minute FLOAT"))
        conn.execute(text("ALTER TABLE queues ADD COLUMN IF NOT EXISTS last_updated TIMESTAMP WITH TIME ZONE"))

        # Patch orders
        conn.execute(text("ALTER TABLE orders ADD COLUMN IF NOT EXISTS pickup_slot TIMESTAMP WITH TIME ZONE"))
        conn.execute(text("ALTER TABLE orders ADD COLUMN IF NOT EXISTS special_instructions VARCHAR(500)"))

        # Patch seat_upgrades
        conn.execute(text("ALTER TABLE seat_upgrades ADD COLUMN IF NOT EXISTS from_section VARCHAR(50)"))
        conn.execute(text("ALTER TABLE seat_upgrades ADD COLUMN IF NOT EXISTS to_section VARCHAR(50)"))
        conn.execute(text("ALTER TABLE seat_upgrades ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE"))
        conn.execute(text("ALTER TABLE seat_upgrades ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMP WITH TIME ZONE"))

        # Patch audit_logs
        conn.execute(text("ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS user_agent VARCHAR(500)"))

        # Patch incidents
        conn.execute(text("ALTER TABLE incidents ADD COLUMN IF NOT EXISTS incident_type VARCHAR(50)"))
        conn.execute(text("ALTER TABLE incidents ADD COLUMN IF NOT EXISTS title VARCHAR(255)"))
        conn.execute(text("ALTER TABLE incidents ADD COLUMN IF NOT EXISTS description TEXT"))
        conn.execute(text("ALTER TABLE incidents ADD COLUMN IF NOT EXISTS reported_by UUID"))
        conn.execute(text("ALTER TABLE incidents ADD COLUMN IF NOT EXISTS activated_at TIMESTAMP WITH TIME ZONE"))
        conn.execute(text("ALTER TABLE incidents ADD COLUMN IF NOT EXISTS attendees_affected INTEGER"))
        
        # Patch staff_tasks
        conn.execute(text("ALTER TABLE staff_tasks ADD COLUMN IF NOT EXISTS due_at TIMESTAMP WITH TIME ZONE"))
        
        conn.commit()
        log.info("Successfully aligned PostgreSQL schema with SQLAlchemy models.")
    except Exception as exc:
        log.warning("Schema alignment warnings (ignored): %s", exc)

    # ── 4. Check if venue already exists ────────────────────────────────────
    existing = conn.execute(
        text("SELECT id FROM venues WHERE name = :name LIMIT 1"),
        {"name": VENUE["name"]},
    ).fetchone()

    if existing:
        venue_id = str(existing[0])
        log.info("Venue already exists — ID: %s (skipping venue insert)", venue_id)
    else:
        # ── 5. Insert venue ─────────────────────────────────────────────────
        venue_id = str(uuid.uuid4())
        conn.execute(
            text(
                """
                INSERT INTO venues (id, name, address, city, country, capacity, timezone,
                                    lat_center, lng_center, is_active, created_at, updated_at)
                VALUES (:id, :name, :address, :city, :country, :capacity, :timezone,
                        :lat_center, :lng_center, true, now(), now())
                """
            ),
            {"id": venue_id, "city": "New Delhi", "country": "India", **VENUE},
        )
        conn.commit()
        log.info("✅ Venue created: %s  ID=%s", VENUE["name"], venue_id)

    # ── 6. Insert zones ──────────────────────────────────────────────────────
    zone_map: dict[str, str] = {}  # name → id
    zones_created = 0

    for z in ZONES:
        existing_zone = conn.execute(
            text("SELECT id FROM zones WHERE venue_id = :vid AND name = :name LIMIT 1"),
            {"vid": venue_id, "name": z["name"]},
        ).fetchone()

        if existing_zone:
            zone_map[z["name"]] = str(existing_zone[0])
            log.info("  Zone already exists: %s", z["name"])
            continue

        zone_id = str(uuid.uuid4())
        conn.execute(
            text(
                """
                INSERT INTO zones (id, venue_id, name, zone_type, capacity,
                                   lat_center, lng_center, current_density, current_count,
                                   is_open, is_exit_blocked, created_at, updated_at)
                VALUES (:id, :venue_id, :name, :zone_type, :capacity,
                        :lat_center, :lng_center, :density, :count,
                        true, false, now(), now())
                """
            ),
            {
                "id": zone_id,
                "venue_id": venue_id,
                "name": z["name"],
                "zone_type": z["zone_type"],
                "capacity": z["capacity"],
                "lat_center": z["lat_center"],
                "lng_center": z["lng_center"],
                "density": z["initial_density"],
                "count": int(z["capacity"] * z["initial_density"]),
            },
        )
        zone_map[z["name"]] = zone_id
        zones_created += 1

    conn.commit()
    log.info("✅ %d zones created (+ %d pre-existing)", zones_created, len(ZONES) - zones_created)

    # ── 7. Insert queues ────────────────────────────────────────────────────
    queues_created = 0
    for q in QUEUES:
        zone_id = zone_map.get(q["zone_name"])
        if not zone_id:
            log.warning("  Zone not found for queue: %s — skipping", q["name"])
            continue

        existing_q = conn.execute(
            text("SELECT id FROM queues WHERE venue_id = :vid AND name = :name LIMIT 1"),
            {"vid": venue_id, "name": q["name"]},
        ).fetchone()
        if existing_q:
            log.info("  Queue already exists: %s", q["name"])
            continue

        queue_id = str(uuid.uuid4())
        conn.execute(
            text(
                """
                INSERT INTO queues (id, venue_id, zone_id, name, queue_type,
                                    estimated_wait_minutes, current_length,
                                    is_open, created_at, updated_at)
                VALUES (:id, :venue_id, :zone_id, :name, :queue_type,
                        :wait, 0, true, now(), now())
                """
            ),
            {
                "id": queue_id,
                "venue_id": venue_id,
                "zone_id": zone_id,
                "name": q["name"],
                "queue_type": q["queue_type"],
                "wait": q["estimated_wait_minutes"],
            },
        )
        queues_created += 1

    conn.commit()
    log.info("✅ %d queues created", queues_created)

    # ── 8. Insert menu items ────────────────────────────────────────────────
    menu_created = 0
    for item in MENU_ITEMS:
        existing_mi = conn.execute(
            text("SELECT id FROM menu_items WHERE venue_id = :vid AND name = :name LIMIT 1"),
            {"vid": venue_id, "name": item["name"]},
        ).fetchone()
        if existing_mi:
            log.info("  Menu item already exists: %s", item["name"])
            continue

        mi_id = str(uuid.uuid4())
        conn.execute(
            text(
                """
                INSERT INTO menu_items (id, venue_id, name, description, category,
                                        price, prep_time_minutes, dietary_tags,
                                        is_available, is_sold_out, created_at, updated_at)
                VALUES (:id, :venue_id, :name, :description, :category,
                        :price, :prep, :tags, true, false, now(), now())
                """
            ),
            {
                "id": mi_id,
                "venue_id": venue_id,
                "name": item["name"],
                "description": item["description"],
                "category": item["category"],
                "price": Decimal(str(item["price"])),
                "prep": item["prep_time_minutes"],
                "tags": json.dumps(item["dietary_tags"]),
            },
        )
        menu_created += 1

    conn.commit()
    log.info("✅ %d menu items created", menu_created)

    # ── 9. Seed crowd density via live API (writes to Firestore + Redis) ──────
    density_seeded = 0
    for z in ZONES:
        zone_id = zone_map.get(z["name"])
        if not zone_id:
            continue

        count = int(z["initial_density"] * next(zz["capacity"] for zz in ZONES if zz["name"] == z["name"]))
        resp = client.post(
            f"/crowd/density/{zone_id}",
            json={"venue_id": venue_id, "density": z["initial_density"], "count": count},
        )
        if resp.status_code in (200, 201):
            density_seeded += 1
            log.info(
                "  Crowd density seeded: %-20s → %.2f (%s)",
                z["name"],
                z["initial_density"],
                _density_level(z["initial_density"]),
            )
        else:
            log.warning("  Density seed failed for %s: %s %s", z["name"], resp.status_code, resp.text)

    log.info("✅ Crowd density seeded for %d/%d zones via live API", density_seeded, len(ZONES))

    conn.close()
    engine.dispose()

    # ── 10. Summary ──────────────────────────────────────────────────────────
    print()
    print("═" * 60)
    print(f"✅ Venue created/confirmed: {VENUE['name']}")
    print(f"   Venue ID: {venue_id}")
    print(f"✅ {len(ZONES)} zones configured")
    print(f"✅ {queues_created} queues created")
    print(f"✅ {menu_created} menu items created")
    print(f"✅ Crowd density seeded for all zones ({density_seeded} via live API)")
    print()
    print(f"📋 Venue ID for demo URL: {venue_id}")
    print(f"🌐 Demo URL: https://promptwar-db092.web.app?venue={venue_id}&demo=true")
    print("═" * 60)


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed CrowdIQ demo data")
    parser.add_argument(
        "--api-url",
        default=os.environ.get("CROWDIQ_API_URL", "http://localhost:8080/api/v1"),
        help="Base URL of the live API (including /api/v1)",
    )
    parser.add_argument(
        "--firebase-key",
        required=True,
        help="Firebase Web API key (VITE_FIREBASE_API_KEY from frontend/.env.local)",
    )
    parser.add_argument(
        "--db-url",
        default=None,
        help="Async DATABASE_URL override (reads backend/.env if not provided)",
    )
    parser.add_argument(
        "--admin-email",
        default=os.environ.get("SEED_ADMIN_EMAIL"),
        help="Admin email used for demo seeding auth.",
    )
    parser.add_argument(
        "--admin-password",
        default=os.environ.get("SEED_ADMIN_PASSWORD"),
        help="Admin password used for demo seeding auth.",
    )
    args = parser.parse_args()

    if not args.admin_email or not args.admin_password:
        log.error(
            "Missing admin credentials. Pass --admin-email/--admin-password or set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD."
        )
        sys.exit(1)

    # Resolve DB URL
    db_url = args.db_url
    if not db_url:
        try:
            import os
            from pathlib import Path

            env_path = Path(__file__).parent / ".env"
            for line in env_path.read_text().splitlines():
                if line.startswith("DATABASE_URL="):
                    db_url = line.split("=", 1)[1].strip()
                    break
        except Exception:
            pass

    if not db_url:
        log.error("No DATABASE_URL found. Pass --db-url or set it in backend/.env")
        sys.exit(1)

    seed(
        api_url=args.api_url,
        firebase_api_key=args.firebase_key,
        db_url_async=db_url,
        admin_email=args.admin_email,
        admin_password=args.admin_password,
    )


if __name__ == "__main__":
    main()
