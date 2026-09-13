from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.api.v1.deps import get_current_user
from app.models.user import User
from app.schemas.calendar import CalendarMonthResponse
from app.services import calendar_service

router = APIRouter(prefix="/calendar", tags=["Calendário Financeiro"])

@router.get("/month", response_model=CalendarMonthResponse)
async def get_calendar_month(
    month: str = Query(..., pattern=r"^\d{4}-\d{2}$", description="Mês de competência no formato YYYY-MM"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> CalendarMonthResponse:
    """Retorna a visão de calendário mensal com as contas a pagar distribuídas pelos dias."""
    return await calendar_service.get_calendar_month(
        db=db,
        user_id=current_user.id,
        month=month,
    )
