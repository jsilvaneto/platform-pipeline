from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.api.v1.deps import get_current_user
from app.models.user import User
from app.schemas.payment import PaymentResponse, PaymentStatusUpdate, PaymentUpdate
from app.services import payment_service

router = APIRouter(prefix="/payments", tags=["Pagamentos e Parcelas"])

@router.get("/{payment_id}", response_model=PaymentResponse)
async def get_payment(
    payment_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PaymentResponse:
    """Obtém os detalhes de uma parcela individual."""
    return await payment_service.get_payment(db, current_user.id, payment_id)

@router.patch("/{payment_id}", response_model=PaymentResponse)
@router.put("/{payment_id}", response_model=PaymentResponse)
async def update_payment(
    payment_id: str,
    data: PaymentUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PaymentResponse:
    """Atualiza dados de uma parcela individual (ex: valor em centavos)."""
    return await payment_service.update_payment(db, current_user.id, payment_id, data)

@router.patch("/{payment_id}/status", response_model=PaymentResponse)
async def update_payment_status(
    payment_id: str,
    data: PaymentStatusUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PaymentResponse:
    """Marca uma parcela como CONCLUIDO (paga), PENDENTE ou CANCELADO."""
    return await payment_service.update_payment_status(db, current_user.id, payment_id, data)
