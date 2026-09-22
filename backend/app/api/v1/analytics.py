from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.api.v1.deps import get_current_user
from app.models.user import User
from app.schemas.analytics import (
    FinancialOverviewResponse,
    HistoricalAnalyticsResponse,
    FutureAnalyticsResponse,
)
from app.services import analytics_service

router = APIRouter(prefix="/analytics", tags=["Inteligência Financeira (Passada & Futura)"])


@router.get("/overview", response_model=FinancialOverviewResponse)
async def get_overview(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> FinancialOverviewResponse:
    """Retorna os indicadores consolidados (Net Worth, saldo do mês, alerta de liquidez)."""
    return await analytics_service.get_financial_overview(
        db=db,
        user_id=current_user.id,
    )


@router.get("/past", response_model=HistoricalAnalyticsResponse)
async def get_historical_analytics(
    months: int = Query(default=12, ge=1, le=120, description="Meses de histórico para agregação"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> HistoricalAnalyticsResponse:
    """Gera o diagnóstico retrospectivo: fluxo de caixa mensal, essencialidade, categorias e conciliação."""
    return await analytics_service.get_historical_analytics(
        db=db,
        user_id=current_user.id,
        months=months,
    )


@router.get("/future", response_model=FutureAnalyticsResponse)
async def get_future_analytics(
    horizon_days: int = Query(default=90, ge=7, le=365, description="Horizonte de projeção em dias"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> FutureAnalyticsResponse:
    """Simula o saldo futuro dia a dia, alertas de risco de cheque especial e previsão de metas."""
    return await analytics_service.get_future_analytics(
        db=db,
        user_id=current_user.id,
        horizon_days=horizon_days,
    )
