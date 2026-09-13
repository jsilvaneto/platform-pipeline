import pytest
from app.database import engine

@pytest.fixture(autouse=True)
async def cleanup_database_connections():
    """Garante que as conexões asyncpg sejam fechadas ao fim de cada teste evitando conflito de loops."""
    yield
    await engine.dispose()
