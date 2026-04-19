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
            "SELECT pg_type.typname, enumlabel FROM pg_enum "
            "JOIN pg_type ON pg_enum.enumtypid=pg_type.oid "
            "WHERE pg_type.typname LIKE '%menu%' OR pg_type.typname LIKE '%category%' "
            "ORDER BY pg_type.typname, enumsortorder"
        ))
        rows = r.fetchall()
        if rows:
            for row in rows:
                print(f"  {row[0]}: {row[1]}")
        else:
            print("No menu/category enums found")

asyncio.run(run())
