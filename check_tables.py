import asyncio, os
from pathlib import Path
from dotenv import load_dotenv
load_dotenv(Path("backend/.env").resolve())
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

async def check():
    engine = create_async_engine(os.environ["DATABASE_URL"])
    async with engine.connect() as conn:
        result = await conn.execute(
            text("SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name")
        )
        tables = [r[0] for r in result]
        print(f"Tables: {len(tables)}")
        for t in tables:
            print(f"  - {t}")

asyncio.run(check())
