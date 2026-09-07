from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select, func, text

from app.database import engine, Base, AsyncSessionLocal
import app.models  # Garante registro dos modelos no metadata
from app.models.user import User
from app.core.config import settings
from app.core.security import get_password_hash
from app.api.v1 import api_router

async def seed_initial_data():
    """Gera usuário administrador padrão caso a tabela de usuários esteja vazia."""
    async with AsyncSessionLocal() as session:
        user_count = await session.scalar(select(func.count(User.id)))
        if user_count == 0:
            admin_user = User(
                username=settings.DEFAULT_ADMIN_USERNAME,
                hashed_password=get_password_hash(settings.DEFAULT_ADMIN_PASSWORD),
                is_admin=True,
                is_active=True
            )
            session.add(admin_user)
            await session.commit()

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Ciclo de vida assíncrono da aplicação: inicialização de tabelas e sementes."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    await seed_initial_data()
    yield
    await engine.dispose()

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="API RESTful de Alta Performance com FastAPI, SQLAlchemy 2.0 Async e PostgreSQL",
    lifespan=lifespan
)

# Configuração de CORS permissivo para dev e proxy
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Registra as rotas da versão 1 da API
app.include_router(api_router)

@app.get("/api/health", tags=["Sistema"])
@app.get("/api/v1/health", tags=["Sistema"])
async def health_check():
    """Endpoint de verificação de saúde da aplicação e conectividade com o banco."""
    db_status = "connected"
    try:
        async with AsyncSessionLocal() as session:
            await session.execute(text("SELECT 1"))
    except Exception as e:
        db_status = f"unhealthy: {str(e)}"

    return {
        "status": "healthy" if db_status == "connected" else "degraded",
        "database": "postgresql",
        "db_status": db_status,
        "version": settings.APP_VERSION,
        "environment": settings.ENVIRONMENT
    }
