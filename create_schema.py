"""
Direct schema creation script — bypasses alembic and uses asyncpg directly.
Run this once to create all tables in Supabase.
"""
import asyncio, os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / "backend/.env")

import asyncpg

CREATE_SQL = """
DO $$ BEGIN
  CREATE TYPE user_role_enum AS ENUM ('ATTENDEE', 'STAFF', 'ADMIN', 'EMERGENCY');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE zone_type_enum AS ENUM ('ENTRY', 'CONCOURSE', 'SEATING', 'FOOD', 'RESTROOM', 'MEDICAL', 'EXIT');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE density_level_enum AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE queue_type_enum AS ENUM ('FOOD', 'RESTROOM', 'ENTRY', 'MERCHANDISE', 'MEDICAL');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE menu_category_enum AS ENUM ('HOT_FOOD', 'SNACKS', 'BEVERAGES', 'ALCOHOL', 'MERCHANDISE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE order_status_enum AS ENUM ('RECEIVED', 'CONFIRMED', 'PREPARING', 'READY', 'COMPLETED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE upgrade_status_enum AS ENUM ('SENT', 'ACCEPTED', 'DECLINED', 'EXPIRED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE incident_type_enum AS ENUM ('FIRE', 'MEDICAL', 'SECURITY', 'WEATHER', 'GENERAL');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE incident_severity_enum AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE incident_status_enum AS ENUM ('ACTIVE', 'RESOLVED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE task_type_enum AS ENUM ('CROWD_CONTROL', 'MEDICAL', 'CLEANING', 'SECURITY', 'MAINTENANCE', 'SOS');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE task_priority_enum AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE task_status_enum AS ENUM ('OPEN', 'IN_PROGRESS', 'COMPLETED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS venues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  timezone VARCHAR(50) NOT NULL DEFAULT 'UTC',
  event_start_time TIMESTAMPTZ,
  floor_plan_url VARCHAR(255),
  floor_plan_bounds JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firebase_uid VARCHAR(128) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(100),
  role user_role_enum NOT NULL DEFAULT 'ATTENDEE',
  is_active BOOLEAN NOT NULL DEFAULT true,
  fcm_token VARCHAR(255),
  venue_id UUID REFERENCES venues(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE RESTRICT,
  name VARCHAR(100) NOT NULL,
  zone_type zone_type_enum NOT NULL,
  capacity INTEGER NOT NULL,
  current_count INTEGER NOT NULL DEFAULT 0,
  current_density FLOAT NOT NULL DEFAULT 0.0,
  density_level density_level_enum NOT NULL DEFAULT 'LOW',
  is_open BOOLEAN NOT NULL DEFAULT true,
  lat_center FLOAT NOT NULL,
  lng_center FLOAT NOT NULL,
  is_exit_blocked BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS queues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE RESTRICT,
  zone_id UUID REFERENCES zones(id) ON DELETE RESTRICT,
  name VARCHAR(100) NOT NULL,
  queue_type queue_type_enum NOT NULL,
  estimated_wait_minutes INTEGER NOT NULL DEFAULT 0,
  current_length INTEGER NOT NULL DEFAULT 0,
  is_open BOOLEAN NOT NULL DEFAULT true,
  annotation VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE RESTRICT,
  name VARCHAR(100) NOT NULL,
  description VARCHAR(255),
  price FLOAT NOT NULL,
  category menu_category_enum NOT NULL,
  is_available BOOLEAN NOT NULL DEFAULT true,
  image_url VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_code VARCHAR(4) UNIQUE NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE RESTRICT,
  pickup_zone_id UUID REFERENCES zones(id) ON DELETE RESTRICT,
  total_price FLOAT NOT NULL,
  status order_status_enum NOT NULL DEFAULT 'RECEIVED',
  payment_intent_id VARCHAR(100),
  is_demo BOOLEAN NOT NULL DEFAULT false,
  items JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS seat_upgrades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE RESTRICT,
  target_user_id UUID REFERENCES users(id) ON DELETE RESTRICT,
  from_seat VARCHAR(50) NOT NULL,
  to_seat VARCHAR(50) NOT NULL,
  price_difference FLOAT NOT NULL,
  status upgrade_status_enum NOT NULL DEFAULT 'SENT',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE RESTRICT,
  zone_id UUID REFERENCES zones(id) ON DELETE RESTRICT,
  reported_by_id UUID REFERENCES users(id) ON DELETE RESTRICT,
  created_by_id UUID REFERENCES users(id) ON DELETE RESTRICT,
  emergency_type incident_type_enum NOT NULL,
  severity incident_severity_enum NOT NULL DEFAULT 'HIGH',
  status incident_status_enum NOT NULL DEFAULT 'ACTIVE',
  message TEXT NOT NULL,
  affected_zones JSONB,
  sos_reports_count INTEGER NOT NULL DEFAULT 0,
  evacuation_routes_ready BOOLEAN NOT NULL DEFAULT false,
  deactivated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS staff_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE RESTRICT,
  zone_id UUID REFERENCES zones(id) ON DELETE RESTRICT,
  incident_id UUID REFERENCES incidents(id) ON DELETE RESTRICT,
  assigned_to UUID REFERENCES users(id) ON DELETE RESTRICT,
  created_by_id UUID REFERENCES users(id) ON DELETE RESTRICT,
  task_type task_type_enum NOT NULL,
  priority task_priority_enum NOT NULL DEFAULT 'MEDIUM',
  status task_status_enum NOT NULL DEFAULT 'OPEN',
  title VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE RESTRICT,
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50) NOT NULL,
  resource_id VARCHAR(50),
  details JSONB,
  ip_address VARCHAR(45),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_firebase_uid ON users(firebase_uid);
CREATE INDEX IF NOT EXISTS idx_zones_venue_id ON zones(venue_id);
CREATE INDEX IF NOT EXISTS idx_queues_venue_id ON queues(venue_id);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_venue_id ON orders(venue_id);
CREATE INDEX IF NOT EXISTS idx_staff_tasks_assigned_to ON staff_tasks(assigned_to);

INSERT INTO public.alembic_version(version_num) VALUES ('001_initial')
  ON CONFLICT DO NOTHING;
"""

async def main():
    url = os.environ["DATABASE_URL"].replace("postgresql+asyncpg://", "")
    # Parse user:pass@host:port/dbname
    conn = await asyncpg.connect(dsn="postgresql://" + url)
    await conn.execute(CREATE_SQL)
    print("Schema applied successfully!")

    rows = await conn.fetch(
        "SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name"
    )
    tables = [r["table_name"] for r in rows]
    print(f"Tables in DB ({len(tables)}): {tables}")
    await conn.close()

asyncio.run(main())
