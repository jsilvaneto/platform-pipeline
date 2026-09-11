from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.api.v1.deps import get_current_user
from app.models.user import User
from app.schemas.commitment import CommitmentsSummary
from app.schemas.expense import ExpenseResponse
from app.services import commitment_service

router = APIRouter(prefix="/commitments", tags=["Compromissos Financeiros"])

@router.get("/summary", response_model=CommitmentsSummary, status_code=status.HTTP_200_OK)
async def get_commitments_summary(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> CommitmentsSummary:
    """Retorna consolidação de despesas fixas recorrentes e compras parceladas com projeção de quitação."""
    return await commitment_service.get_commitments_summary(db, current_user.id)

@router.patch("/{expense_id}/toggle-status", response_model=ExpenseResponse, status_code=status.HTTP_200_OK)
async def toggle_recurring_status(
    expense_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ExpenseResponse:
    """Pausa ou reativa uma despesa fixa recorrente."""
    updated = await commitment_service.toggle_recurring_commitment(db, current_user.id, expense_id)
    return ExpenseResponse.model_validate(updated)
