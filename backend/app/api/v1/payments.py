from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.api.v1.deps import get_current_user
from app.models.user import User
from app.schemas.payment import PaymentResponse, PaymentStatusUpdate
from app.services import payment_service

router = APIRouter(prefix="/payments", tags=["Pagamentos e Parcelas"])

@router.patch("/{payment_id}/status", response_model=PaymentResponse)
async def update_payment_status(
    payment_id: str,
    data: PaymentStatusUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PaymentResponse:
    """Marca uma parcela como CONCLUIDO (paga), PENDENTE ou CANCELADO."""
    return await payment_service.update_payment_status(db, current_user.id, payment_id, data)
