from collections.abc import Sequence
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.payment_method import PaymentMethod
from app.schemas.payment_method import PaymentMethodCreate, PaymentMethodUpdate

DEFAULT_PAYMENT_METHODS = [
    {"name": "Cartão de Crédito", "type": "CARTAO_CREDITO"},
    {"name": "Cartão de Débito", "type": "CARTAO_DEBITO"},
    {"name": "Pix", "type": "PIX"},
    {"name": "Dinheiro em Espécie", "type": "DINHEIRO"},
    {"name": "Boleto Bancário", "type": "BOLETO"},
]

async def ensure_default_payment_methods(db: AsyncSession, user_id: str) -> None:
    """Gera automaticamente as formas de pagamento padrão para o usuário se não existirem."""
    result = await db.execute(select(PaymentMethod).where(PaymentMethod.user_id == user_id))
    existing = result.scalars().first()
    if existing is None:
        for item in DEFAULT_PAYMENT_METHODS:
            method = PaymentMethod(
                user_id=user_id,
                name=item["name"],
                type=item["type"],
            )
            db.add(method)
        await db.commit()

async def list_payment_methods(db: AsyncSession, user_id: str) -> Sequence[PaymentMethod]:
    """Retorna todas as formas de pagamento do usuário autenticado."""
    await ensure_default_payment_methods(db, user_id)
    result = await db.execute(
        select(PaymentMethod)
        .where(PaymentMethod.user_id == user_id)
        .order_by(PaymentMethod.name.asc())
    )
    return result.scalars().all()

async def get_payment_method(db: AsyncSession, user_id: str, payment_method_id: str) -> PaymentMethod:
    """Busca uma forma de pagamento garantindo isolamento por usuário."""
    result = await db.execute(
        select(PaymentMethod).where(
            PaymentMethod.id == payment_method_id,
            PaymentMethod.user_id == user_id
        )
    )
    method = result.scalar_one_or_none()
    if not method:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Forma de pagamento não encontrada ou não pertence ao usuário."
        )
    return method

async def create_payment_method(
    db: AsyncSession, user_id: str, data: PaymentMethodCreate
) -> PaymentMethod:
    """Cria uma nova forma de pagamento para o usuário."""
    method = PaymentMethod(
        user_id=user_id,
        name=data.name.strip(),
        type=data.type,
    )
    db.add(method)
    await db.commit()
    await db.refresh(method)
    return method

async def update_payment_method(
    db: AsyncSession, user_id: str, payment_method_id: str, data: PaymentMethodUpdate
) -> PaymentMethod:
    """Atualiza a forma de pagamento do usuário."""
    method = await get_payment_method(db, user_id, payment_method_id)
    if data.name is not None:
        method.name = data.name.strip()
    if data.type is not None:
        method.type = data.type

    await db.commit()
    await db.refresh(method)
    return method

async def delete_payment_method(db: AsyncSession, user_id: str, payment_method_id: str) -> None:
    """Exclui a forma de pagamento do usuário."""
    method = await get_payment_method(db, user_id, payment_method_id)
    await db.delete(method)
    await db.commit()
