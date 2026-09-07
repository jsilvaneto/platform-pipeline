from collections.abc import Sequence
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.api.v1.deps import get_current_user
from app.models.user import User
from app.schemas.payment_method import (
    PaymentMethodCreate,
    PaymentMethodUpdate,
    PaymentMethodResponse,
)
from app.services import payment_method_service

router = APIRouter(prefix="/payment-methods", tags=["Formas de Pagamento"])

@router.get("/", response_model=list[PaymentMethodResponse])
async def list_payment_methods(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Sequence[PaymentMethodResponse]:
    """Retorna todas as formas de pagamento do usuário autenticado."""
    return await payment_method_service.list_payment_methods(db, current_user.id)

@router.post("/", response_model=PaymentMethodResponse, status_code=status.HTTP_201_CREATED)
async def create_payment_method(
    data: PaymentMethodCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> PaymentMethodResponse:
    """Cadastra uma nova forma de pagamento."""
    return await payment_method_service.create_payment_method(db, current_user.id, data)

@router.put("/{payment_method_id}", response_model=PaymentMethodResponse)
async def update_payment_method(
    payment_method_id: str,
    data: PaymentMethodUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> PaymentMethodResponse:
    """Atualiza uma forma de pagamento."""
    return await payment_method_service.update_payment_method(
        db, current_user.id, payment_method_id, data
    )

@router.delete("/{payment_method_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_payment_method(
    payment_method_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> None:
    """Remove uma forma de pagamento."""
    await payment_method_service.delete_payment_method(db, current_user.id, payment_method_id)
