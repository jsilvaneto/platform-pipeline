from typing import Any
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.api.v1.deps import get_current_user
from app.models.user import User
from app.schemas.commitment import CommitmentsSummary
from app.services import commitment_service

router = APIRouter(prefix="/commitments", tags=["Compromissos Financeiros"])

@router.get("/summary", response_model=CommitmentsSummary, status_code=status.HTTP_200_OK)
async def get_commitments_summary(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> CommitmentsSummary:
    """Retorna consolidação de despesas fixas recorrentes e ordens programadas."""
    return await commitment_service.get_commitments_summary(db, current_user.id)

@router.patch("/{expense_id}/toggle-status", status_code=status.HTTP_200_OK)
async def toggle_recurring_status(
    expense_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    """Pausa ou reativa uma ordem fixa recorrente."""
    return await commitment_service.toggle_recurring_commitment(db, current_user.id, expense_id)
