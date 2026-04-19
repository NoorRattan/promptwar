"""Initial schema — all CrowdIQ tables.

Revision ID: 001_initial
Revises: None
Create Date: 2024-01-01 00:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '001_initial'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ENUMS — use DO blocks for idempotent creation (IF NOT EXISTS not supported for types in psycopg2)
    for stmt in [
        "CREATE TYPE user_role_enum AS ENUM ('ATTENDEE', 'STAFF', 'ADMIN', 'EMERGENCY')",
        "CREATE TYPE zone_type_enum AS ENUM ('ENTRY', 'CONCOURSE', 'SEATING', 'FOOD', 'RESTROOM', 'MEDICAL', 'EXIT')",
        "CREATE TYPE density_level_enum AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')",
        "CREATE TYPE queue_type_enum AS ENUM ('FOOD', 'RESTROOM', 'ENTRY', 'MERCHANDISE', 'MEDICAL')",
        "CREATE TYPE menu_category_enum AS ENUM ('HOT_FOOD', 'SNACKS', 'BEVERAGES', 'ALCOHOL', 'MERCHANDISE')",
        "CREATE TYPE order_status_enum AS ENUM ('RECEIVED', 'CONFIRMED', 'PREPARING', 'READY', 'COMPLETED', 'CANCELLED')",
        "CREATE TYPE upgrade_status_enum AS ENUM ('SENT', 'ACCEPTED', 'DECLINED', 'EXPIRED')",
        "CREATE TYPE incident_type_enum AS ENUM ('FIRE', 'MEDICAL', 'SECURITY', 'WEATHER', 'GENERAL')",
        "CREATE TYPE incident_severity_enum AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')",
        "CREATE TYPE incident_status_enum AS ENUM ('ACTIVE', 'RESOLVED')",
        "CREATE TYPE task_type_enum AS ENUM ('CROWD_CONTROL', 'MEDICAL', 'CLEANING', 'SECURITY', 'MAINTENANCE', 'SOS')",
        "CREATE TYPE task_priority_enum AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')",
        "CREATE TYPE task_status_enum AS ENUM ('OPEN', 'IN_PROGRESS', 'COMPLETED')",
    ]:
        op.execute(f"DO $$ BEGIN {stmt}; EXCEPTION WHEN duplicate_object THEN NULL; END $$;")

    # a. venues
    op.create_table(
        'venues',
        sa.Column('id', sa.UUID(as_uuid=True), primary_key=True),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('timezone', sa.String(length=50), nullable=False, server_default='UTC'),
        sa.Column('event_start_time', sa.DateTime(timezone=True), nullable=True),
        sa.Column('floor_plan_url', sa.String(length=255), nullable=True),
        sa.Column('floor_plan_bounds', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False)
    )

    # b. users
    op.create_table(
        'users',
        sa.Column('id', sa.UUID(as_uuid=True), primary_key=True),
        sa.Column('firebase_uid', sa.String(length=128), unique=True, nullable=False),
        sa.Column('email', sa.String(length=255), unique=True, nullable=False),
        sa.Column('name', sa.String(length=100), nullable=True),
        sa.Column('role', sa.Enum('ATTENDEE', 'STAFF', 'ADMIN', 'EMERGENCY', name='user_role_enum', create_type=False), server_default='ATTENDEE', nullable=False),
        sa.Column('is_active', sa.Boolean(), server_default='true', nullable=False),
        sa.Column('fcm_token', sa.String(length=255), nullable=True),
        sa.Column('venue_id', sa.UUID(as_uuid=True), sa.ForeignKey('venues.id', ondelete='RESTRICT'), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False)
    )

    # c. zones
    op.create_table(
        'zones',
        sa.Column('id', sa.UUID(as_uuid=True), primary_key=True),
        sa.Column('venue_id', sa.UUID(as_uuid=True), sa.ForeignKey('venues.id', ondelete='RESTRICT'), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('zone_type', sa.Enum('ENTRY', 'CONCOURSE', 'SEATING', 'FOOD', 'RESTROOM', 'MEDICAL', 'EXIT', name='zone_type_enum', create_type=False), nullable=False),
        sa.Column('capacity', sa.Integer(), nullable=False),
        sa.Column('current_count', sa.Integer(), server_default='0', nullable=False),
        sa.Column('current_density', sa.Float(), server_default='0.0', nullable=False),
        sa.Column('density_level', sa.Enum('LOW', 'MEDIUM', 'HIGH', 'CRITICAL', name='density_level_enum', create_type=False), server_default='LOW', nullable=False),
        sa.Column('is_open', sa.Boolean(), server_default='true', nullable=False),
        sa.Column('lat_center', sa.Float(), nullable=False),
        sa.Column('lng_center', sa.Float(), nullable=False),
        sa.Column('is_exit_blocked', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False)
    )

    # d. queues
    op.create_table(
        'queues',
        sa.Column('id', sa.UUID(as_uuid=True), primary_key=True),
        sa.Column('venue_id', sa.UUID(as_uuid=True), sa.ForeignKey('venues.id', ondelete='RESTRICT'), nullable=False),
        sa.Column('zone_id', sa.UUID(as_uuid=True), sa.ForeignKey('zones.id', ondelete='RESTRICT'), nullable=True),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('queue_type', sa.Enum('FOOD', 'RESTROOM', 'ENTRY', 'MERCHANDISE', 'MEDICAL', name='queue_type_enum', create_type=False), nullable=False),
        sa.Column('estimated_wait_minutes', sa.Integer(), server_default='0', nullable=False),
        sa.Column('current_length', sa.Integer(), server_default='0', nullable=False),
        sa.Column('is_open', sa.Boolean(), server_default='true', nullable=False),
        sa.Column('annotation', sa.String(length=255), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False)
    )

    # e. menu_items
    op.create_table(
        'menu_items',
        sa.Column('id', sa.UUID(as_uuid=True), primary_key=True),
        sa.Column('venue_id', sa.UUID(as_uuid=True), sa.ForeignKey('venues.id', ondelete='RESTRICT'), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('description', sa.String(length=255), nullable=True),
        sa.Column('price', sa.Float(), nullable=False),
        sa.Column('category', sa.Enum('HOT_FOOD', 'SNACKS', 'BEVERAGES', 'ALCOHOL', 'MERCHANDISE', name='menu_category_enum', create_type=False), nullable=False),
        sa.Column('is_available', sa.Boolean(), server_default='true', nullable=False),
        sa.Column('image_url', sa.String(length=255), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False)
    )

    # f. orders
    op.create_table(
        'orders',
        sa.Column('id', sa.UUID(as_uuid=True), primary_key=True),
        sa.Column('order_code', sa.String(length=4), unique=True, nullable=False),
        sa.Column('user_id', sa.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='RESTRICT'), nullable=False),
        sa.Column('venue_id', sa.UUID(as_uuid=True), sa.ForeignKey('venues.id', ondelete='RESTRICT'), nullable=False),
        sa.Column('pickup_zone_id', sa.UUID(as_uuid=True), sa.ForeignKey('zones.id', ondelete='RESTRICT'), nullable=True),
        sa.Column('total_price', sa.Float(), nullable=False),
        sa.Column('status', sa.Enum('RECEIVED', 'CONFIRMED', 'PREPARING', 'READY', 'COMPLETED', 'CANCELLED', name='order_status_enum', create_type=False), server_default='RECEIVED', nullable=False),
        sa.Column('payment_intent_id', sa.String(length=100), nullable=True),
        sa.Column('is_demo', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('items', sa.JSON(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False)
    )

    # g. seat_upgrades
    op.create_table(
        'seat_upgrades',
        sa.Column('id', sa.UUID(as_uuid=True), primary_key=True),
        sa.Column('venue_id', sa.UUID(as_uuid=True), sa.ForeignKey('venues.id', ondelete='RESTRICT'), nullable=False),
        sa.Column('target_user_id', sa.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='RESTRICT'), nullable=True),
        sa.Column('from_seat', sa.String(length=50), nullable=False),
        sa.Column('to_seat', sa.String(length=50), nullable=False),
        sa.Column('price_difference', sa.Float(), nullable=False),
        sa.Column('status', sa.Enum('SENT', 'ACCEPTED', 'DECLINED', 'EXPIRED', name='upgrade_status_enum', create_type=False), server_default='SENT', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False)
    )

    # h. incidents
    op.create_table(
        'incidents',
        sa.Column('id', sa.UUID(as_uuid=True), primary_key=True),
        sa.Column('venue_id', sa.UUID(as_uuid=True), sa.ForeignKey('venues.id', ondelete='RESTRICT'), nullable=False),
        sa.Column('zone_id', sa.UUID(as_uuid=True), sa.ForeignKey('zones.id', ondelete='RESTRICT'), nullable=True),
        sa.Column('reported_by_id', sa.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='RESTRICT'), nullable=True),
        sa.Column('created_by_id', sa.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='RESTRICT'), nullable=True),
        sa.Column('emergency_type', sa.Enum('FIRE', 'MEDICAL', 'SECURITY', 'WEATHER', 'GENERAL', name='incident_type_enum', create_type=False), nullable=False),
        sa.Column('severity', sa.Enum('LOW', 'MEDIUM', 'HIGH', 'CRITICAL', name='incident_severity_enum', create_type=False), server_default='HIGH', nullable=False),
        sa.Column('status', sa.Enum('ACTIVE', 'RESOLVED', name='incident_status_enum', create_type=False), server_default='ACTIVE', nullable=False),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('affected_zones', sa.JSON(), nullable=True),
        sa.Column('sos_reports_count', sa.Integer(), server_default='0', nullable=False),
        sa.Column('evacuation_routes_ready', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('deactivated_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False)
    )

    # i. staff_tasks
    op.create_table(
        'staff_tasks',
        sa.Column('id', sa.UUID(as_uuid=True), primary_key=True),
        sa.Column('venue_id', sa.UUID(as_uuid=True), sa.ForeignKey('venues.id', ondelete='RESTRICT'), nullable=False),
        sa.Column('zone_id', sa.UUID(as_uuid=True), sa.ForeignKey('zones.id', ondelete='RESTRICT'), nullable=True),
        sa.Column('incident_id', sa.UUID(as_uuid=True), sa.ForeignKey('incidents.id', ondelete='RESTRICT'), nullable=True),
        sa.Column('assigned_to', sa.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='RESTRICT'), nullable=True),
        sa.Column('created_by_id', sa.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='RESTRICT'), nullable=True),
        sa.Column('task_type', sa.Enum('CROWD_CONTROL', 'MEDICAL', 'CLEANING', 'SECURITY', 'MAINTENANCE', 'SOS', name='task_type_enum', create_type=False), nullable=False),
        sa.Column('priority', sa.Enum('LOW', 'MEDIUM', 'HIGH', 'CRITICAL', name='task_priority_enum', create_type=False), server_default='MEDIUM', nullable=False),
        sa.Column('status', sa.Enum('OPEN', 'IN_PROGRESS', 'COMPLETED', name='task_status_enum', create_type=False), server_default='OPEN', nullable=False),
        sa.Column('title', sa.String(length=100), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False)
    )

    # j. audit_logs
    op.create_table(
        'audit_logs',
        sa.Column('id', sa.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', sa.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='RESTRICT'), nullable=True),
        sa.Column('action', sa.String(length=100), nullable=False),
        sa.Column('resource_type', sa.String(length=50), nullable=False),
        sa.Column('resource_id', sa.String(length=50), nullable=True),
        sa.Column('details', sa.JSON(), nullable=True),
        sa.Column('ip_address', sa.String(length=45), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False)
    )

    # Indexes
    op.create_index("idx_users_firebase_uid", "users", ["firebase_uid"])
    op.create_index("idx_zones_venue_id", "zones", ["venue_id"])
    op.create_index("idx_queues_venue_id", "queues", ["venue_id"])
    op.create_index("idx_orders_user_id", "orders", ["user_id"])
    op.create_index("idx_orders_status", "orders", ["status"])
    op.create_index("idx_orders_venue_id", "orders", ["venue_id"])
    op.create_index("idx_staff_tasks_assigned_to", "staff_tasks", ["assigned_to"])


def downgrade() -> None:
    # Drop indexes
    op.drop_index("idx_staff_tasks_assigned_to", table_name="staff_tasks")
    op.drop_index("idx_orders_venue_id", table_name="orders")
    op.drop_index("idx_orders_status", table_name="orders")
    op.drop_index("idx_orders_user_id", table_name="orders")
    op.drop_index("idx_queues_venue_id", table_name="queues")
    op.drop_index("idx_zones_venue_id", table_name="zones")
    op.drop_index("idx_users_firebase_uid", table_name="users")

    # Drop tables
    op.drop_table('audit_logs')
    op.drop_table('staff_tasks')
    op.drop_table('incidents')
    op.drop_table('seat_upgrades')
    op.drop_table('orders')
    op.drop_table('menu_items')
    op.drop_table('queues')
    op.drop_table('zones')
    op.drop_table('users')
    op.drop_table('venues')

    # Drop types
    op.execute("DROP TYPE IF EXISTS task_status_enum")
    op.execute("DROP TYPE IF EXISTS task_priority_enum")
    op.execute("DROP TYPE IF EXISTS task_type_enum")
    op.execute("DROP TYPE IF EXISTS incident_status_enum")
    op.execute("DROP TYPE IF EXISTS incident_severity_enum")
    op.execute("DROP TYPE IF EXISTS incident_type_enum")
    op.execute("DROP TYPE IF EXISTS upgrade_status_enum")
    op.execute("DROP TYPE IF EXISTS order_status_enum")
    op.execute("DROP TYPE IF EXISTS menu_category_enum")
    op.execute("DROP TYPE IF EXISTS queue_type_enum")
    op.execute("DROP TYPE IF EXISTS density_level_enum")
    op.execute("DROP TYPE IF EXISTS zone_type_enum")
    op.execute("DROP TYPE IF EXISTS user_role_enum")
