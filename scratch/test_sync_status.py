import asyncio
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../backend")))

from app.database import AsyncSessionLocal
from app.services.mobile_sync_service import get_sync_status

async def test_status():
    async with AsyncSessionLocal() as session:
        status_res = await get_sync_status(session)
        print("Status Res:", status_res.model_dump())
        assert status_res.api_online is True
        print("✓ get_sync_status executou com sucesso no banco SQLite!")

if __name__ == "__main__":
    asyncio.run(test_status())
