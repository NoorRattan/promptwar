"""
Seed demo venue + zones + queues + menu items directly into Supabase.
Run from repo root: python seed_demo.py
"""
import asyncio, os, sys, uuid
from datetime import datetime, timezone

sys.path.insert(0, "backend")
from dotenv import load_dotenv
load_dotenv("backend/.env")

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select, text

engine = create_async_engine(os.environ["DATABASE_URL"], echo=False)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def seed():
    async with AsyncSessionLocal() as db:
        # ── Check if venue already exists ──────────────────────────────
        result = await db.execute(text("SELECT id, name FROM venues LIMIT 5"))
        existing = result.fetchall()
        if existing:
            print("Venues already seeded:")
            for row in existing:
                print(f"  ✅ {row[1]} (id={row[0]})")
            venue_id = existing[0][0]
        else:
            # ── Create venue ───────────────────────────────────────────
            venue_id = str(uuid.uuid4())
            await db.execute(text("""
                INSERT INTO venues (id, name, address, capacity, timezone,
                                    lat_center, lng_center, is_active, created_at)
                VALUES (:id, :name, :address, :capacity, :timezone,
                        :lat_center, :lng_center, true, :now)
            """), {
                "id": venue_id,
                "name": "MetroArena Stadium",
                "address": "1 Rajpath, New Delhi 110001",
                "capacity": 50000,
                "timezone": "Asia/Kolkata",
                "lat_center": 28.6139,
                "lng_center": 77.2090,
                "now": datetime.now(timezone.utc),
            })
            print(f"✅ Venue created: MetroArena Stadium (id={venue_id})")

        # ── Check zones ────────────────────────────────────────────────
        result = await db.execute(text("SELECT count(*) FROM zones WHERE venue_id = :vid"), {"vid": venue_id})
        zone_count = result.scalar()

        if zone_count == 0:
            zones = [
                ("North Stand", "seating",    12000, 28.6145, 77.2090, "#EF4444"),
                ("South Stand", "seating",    12000, 28.6133, 77.2090, "#F97316"),
                ("East Concourse", "concourse", 5000, 28.6139, 77.2100, "#EAB308"),
                ("West Concourse", "concourse", 5000, 28.6139, 77.2080, "#22C55E"),
                ("Gate A Entry", "entry",      2000, 28.6150, 77.2085, "#3B82F6"),
                ("Gate B Entry", "entry",      2000, 28.6128, 77.2095, "#8B5CF6"),
                ("Food Court", "concession",   1500, 28.6130, 77.2092, "#EC4899"),
                ("VIP Lounge", "seating",      800,  28.6142, 77.2087, "#6366F1"),
            ]
            for name, ztype, cap, lat, lng, color in zones:
                zid = str(uuid.uuid4())
                await db.execute(text("""
                    INSERT INTO zones (id, venue_id, name, zone_type, capacity,
                                       lat_center, lng_center, color_hex,
                                       current_occupancy, is_open, is_exit_blocked, created_at)
                    VALUES (:id, :vid, :name, :ztype, :cap,
                            :lat, :lng, :color,
                            0, true, false, :now)
                """), {
                    "id": zid, "vid": venue_id, "name": name,
                    "ztype": ztype, "cap": cap, "lat": lat, "lng": lng,
                    "color": color, "now": datetime.now(timezone.utc),
                })
                print(f"  ✅ Zone: {name}")
        else:
            print(f"  ✅ {zone_count} zones already exist")

        # ── Check queues ───────────────────────────────────────────────
        result = await db.execute(text("SELECT count(*) FROM queues WHERE venue_id = :vid"), {"vid": venue_id})
        q_count = result.scalar()

        if q_count == 0:
            queues = [
                ("Main Entry Gate A", "ENTRY",        8, 45),
                ("Food Court North",  "FOOD",         12, 20),
                ("Merchandise Stand", "MERCHANDISE",   5, 30),
                ("VIP Fast Track",    "ENTRY",         2,  5),
                ("Medical Bay",       "MEDICAL",       1,  3),
            ]
            for name, qtype, cur, est in queues:
                qid = str(uuid.uuid4())
                await db.execute(text("""
                    INSERT INTO queues (id, venue_id, name, queue_type, current_length,
                                        estimated_wait_minutes, is_open, created_at)
                    VALUES (:id, :vid, :name, :qtype, :cur, :est, true, :now)
                """), {
                    "id": qid, "vid": venue_id, "name": name, "qtype": qtype,
                    "cur": cur, "est": est, "now": datetime.now(timezone.utc),
                })
            print(f"  6 queues created")
        else:
            print(f"  ✅ {q_count} queues already exist")

        # ── Check menu items ───────────────────────────────────────────
        result = await db.execute(text("SELECT count(*) FROM menu_items WHERE venue_id = :vid"), {"vid": venue_id})
        m_count = result.scalar()

        if m_count == 0:
            items = [
                ("Butter Chicken Wrap", "HOT_FOOD",    280.00, True),
                ("Masala Corn",         "SNACKS",       80.00, True),
                ("Cold Coffee",         "BEVERAGES",   120.00, True),
                ("Lassi",               "BEVERAGES",    60.00, True),
                ("Stadium Burger",      "HOT_FOOD",    220.00, True),
                ("Samosa (2pc)",        "SNACKS",       40.00, True),
                ("Water 500ml",         "BEVERAGES",    30.00, True),
                ("CrowdIQ Cap",         "MERCHANDISE", 399.00, True),
            ]
            for name, cat, price, avail in items:
                mid = str(uuid.uuid4())
                await db.execute(text("""
                    INSERT INTO menu_items (id, venue_id, name, category, price,
                                           is_available, created_at)
                    VALUES (:id, :vid, :name, :cat, :price, :avail, :now)
                """), {
                    "id": mid, "vid": venue_id, "name": name, "cat": cat,
                    "price": price, "avail": avail, "now": datetime.now(timezone.utc),
                })
            print(f"  ✅ {len(items)} menu items created")
        else:
            print(f"  ✅ {m_count} menu items already exist")

        await db.commit()

    print("\n🎉 Demo data ready!")
    print(f"   Venue ID: {venue_id}")
    print(f"   API: https://crowdiq-api-667912434114.us-central1.run.app/api/v1/venues")


asyncio.run(seed())
