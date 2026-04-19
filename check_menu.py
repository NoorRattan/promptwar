import asyncio, os, sys
sys.path.insert(0, "backend")
from dotenv import load_dotenv
load_dotenv("backend/.env")
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
engine = create_async_engine(os.environ["DATABASE_URL"])

async def run():
    async with engine.connect() as c:
        r = await c.execute(text(
            "SELECT column_name FROM information_schema.columns "
            "WHERE table_name='menu_items' ORDER BY ordinal_position"
        ))
        print([row[0] for row in r])

asyncio.run(run())
