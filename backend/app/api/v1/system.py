import time
from datetime import datetime, timezone
from fastapi import APIRouter, Depends
from sqlalchemy import select, func, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.api.v1.deps import get_current_user
from app.models.user import User
from app.models.category import Category
from app.models.contact import Contact
from app.models.item import Item
from app.models.payment_method import PaymentMethod
from app.models.expense import Expense
from app.models.payment import Payment
from app.core.config import settings
from app.schemas.system import (
    SystemDiagnosticsResponse,
    DatabaseDiagnostics,
    VolumetricStats,
    ApplicationDiagnostics,
    VersionRelease,
    SystemVersionResponse,
)
from app.services.changelog_service import ChangelogService

router = APIRouter(prefix="/system", tags=["Sistema & Infraestrutura"])


@router.get("/version", response_model=SystemVersionResponse)
async def get_system_version() -> SystemVersionResponse:
    """Retorna metadados da versão atual do sistema e histórico completo de lançamentos."""
    return ChangelogService.get_system_version()


@router.get("/changelog", response_model=list[VersionRelease])
async def get_system_changelog() -> list[VersionRelease]:
    """Retorna o histórico cronológico de releases com melhorias e correções catalogadas."""
    return ChangelogService.get_releases()


@router.get("/diagnostics", response_model=SystemDiagnosticsResponse)
async def get_system_diagnostics(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> SystemDiagnosticsResponse:
    """Retorna diagnósticos detalhados do banco de dados, infraestrutura e volumetria."""
    start_time = time.perf_counter()
    await db.execute(text("SELECT 1"))
    latency_ms = round((time.perf_counter() - start_time) * 1000, 2)

    # Consulta de tamanho do banco de dados no PostgreSQL
    size_res = await db.execute(
        text("SELECT pg_database_size(current_database()), pg_size_pretty(pg_database_size(current_database()))")
    )
    size_row = size_res.first()
    size_bytes = int(size_row[0]) if size_row and size_row[0] is not None else 0
    size_pretty = str(size_row[1]) if size_row and size_row[1] is not None else "0 MB"

    # Coleta de volumetria do usuário autenticado (e contagem global de usuários)
    cat_count = await db.scalar(select(func.count(Category.id)).where(Category.user_id == current_user.id)) or 0
    contact_count = await db.scalar(select(func.count(Contact.id)).where(Contact.user_id == current_user.id)) or 0
    item_count = await db.scalar(select(func.count(Item.id)).where(Item.user_id == current_user.id)) or 0
    pm_count = await db.scalar(select(func.count(PaymentMethod.id)).where(PaymentMethod.user_id == current_user.id)) or 0
    exp_count = await db.scalar(select(func.count(Expense.id)).where(Expense.user_id == current_user.id)) or 0
    pay_count = await db.scalar(select(func.count(Payment.id)).where(Payment.user_id == current_user.id)) or 0
    user_count = await db.scalar(select(func.count(User.id))) or 0

    return SystemDiagnosticsResponse(
        timestamp=datetime.now(timezone.utc).isoformat(),
        database=DatabaseDiagnostics(
            engine="PostgreSQL 16",
            driver="asyncpg (SQLAlchemy 2.0 Async)",
            status="connected",
            database_name=settings.POSTGRES_DB,
            server_host=settings.POSTGRES_SERVER,
            server_port=settings.POSTGRES_PORT,
            latency_ms=latency_ms,
            currency_storage_mode="Inteiros em Centavos (amount_cents)",
            zero_residual_precision=True,
            size_bytes=size_bytes,
            size_pretty=size_pretty,
        ),
        volumetrics=VolumetricStats(
            total_categories=cat_count,
            total_contacts=contact_count,
            total_items=item_count,
            total_payment_methods=pm_count,
            total_expenses=exp_count,
            total_payments=pay_count,
            total_users=user_count,
        ),
        application=ApplicationDiagnostics(
            app_name=settings.APP_NAME,
            version=settings.APP_VERSION,
            environment=settings.ENVIRONMENT,
            framework="FastAPI + Python 3.10",
            auth_algorithm=f"{settings.ALGORITHM} (JWT Bearer)",
            password_hasher="bcrypt (12 rounds)",
        ),
    )
