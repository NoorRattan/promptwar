"""One-time utility for backfilling queue state documents into Firestore."""

import argparse
import asyncio
import uuid

from sqlalchemy import select

from app.db.models.queue import Queue
from app.db.session import AsyncSessionLocal
from app.firebase.admin import initialize_firebase
from app.services.queue_sync import sync_queue_state


async def sync_existing_queues(venue_id: str | None = None) -> int:
    """Republish current PostgreSQL queue rows into Firestore."""
    initialize_firebase()

    async with AsyncSessionLocal() as session:
        query = select(Queue).order_by(Queue.created_at.asc())
        if venue_id:
            query = query.where(Queue.venue_id == uuid.UUID(venue_id))

        result = await session.execute(query)
        queues = result.scalars().all()

    for queue in queues:
        sync_queue_state(queue)

    return len(queues)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Republish existing queue rows into Firestore."
    )
    parser.add_argument(
        "--venue-id",
        dest="venue_id",
        help="Optional venue UUID to limit the sync to a single venue.",
    )
    args = parser.parse_args()

    synced = asyncio.run(sync_existing_queues(args.venue_id))
    print(f"Synced {synced} queues into Firestore.")


if __name__ == "__main__":
    main()
