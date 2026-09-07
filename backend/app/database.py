from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase

from app.core.config import settings

DATABASE_URL = settings.get_database_url()

engine = create_async_engine(
    DATABASE_URL,
    echo=False,
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True,
    pool_recycle=300
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False
)

class Base(DeclarativeBase):
    """Classe base declarativa para os modelos SQLAlchemy."""
    pass

async def get_db():
    """Dependência FastAPI que injeta uma AsyncSession transacional e garante fechamento."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
