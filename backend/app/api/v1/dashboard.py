from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.api.v1.deps import get_current_user
from app.models.user import User
from app.schemas.dashboard import DashboardMetrics
from app.services import dashboard_service

router = APIRouter(prefix="/dashboard", tags=["Dashboard Financeiro"])

@router.get("/metrics", response_model=DashboardMetrics)
async def get_metrics(
    year: int | None = Query(default=None, ge=2000, le=2100, description="Ano de referência (ex: 2026)"),
    month: str | None = Query(default=None, pattern=r"^\d{4}-\d{2}$", description="Mês no formato YYYY-MM"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> DashboardMetrics:
    """Retorna indicadores e agregações do dashboard para o ano atual (ou período informado)."""
    return await dashboard_service.get_dashboard_metrics(
        db=db,
        user_id=current_user.id,
        year=year,
        month=month,
    )

