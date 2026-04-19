import asyncio
import os
import uuid
import asyncpg
from datetime import datetime, timezone

async def seed():
    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        raise RuntimeError("Set DATABASE_URL before running seed_data.py")

    conn = await asyncpg.connect(database_url)
    
    venue_id = uuid.uuid4()
    await conn.execute("""
        INSERT INTO venues (id, name, timezone, event_start_time)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (id) DO NOTHING
    """, venue_id, 'MetroArena', 'UTC', datetime.now(timezone.utc))

    zone_types = ['ENTRY', 'CONCOURSE', 'FOOD', 'RESTROOM', 'SEATING', 'EXIT']
    for i, ztype in enumerate(zone_types):
        await conn.execute("""
            INSERT INTO zones (id, venue_id, name, zone_type, capacity, current_count, current_density, density_level, is_open, lat_center, lng_center, is_exit_blocked)
            VALUES ($1, $2, $3, $4, $5, 0, 0.0, 'LOW', True, 37.7749, -122.4194, False)
            ON CONFLICT (id) DO NOTHING
        """, uuid.uuid4(), venue_id, f"{ztype.capitalize()} Zone", ztype, 500)

    print(f"Successfully seeded database! Venue ID: {venue_id}")
    await conn.close()

if __name__ == "__main__":
    asyncio.run(seed())
