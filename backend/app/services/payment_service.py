from datetime import datetime, timezone
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.payment import Payment
from app.models.expense import Expense
from app.schemas.payment import PaymentStatusUpdate

async def update_payment_status(
    db: AsyncSession, user_id: str, payment_id: str, data: PaymentStatusUpdate
) -> Payment:
    """Atualiza o status de liquidação de uma parcela e sincroniza com a despesa mãe."""
    result = await db.execute(
        select(Payment)
        .options(selectinload(Payment.expense))
        .where(Payment.id == payment_id, Payment.user_id == user_id)
    )
    payment = result.scalar_one_or_none()
    if not payment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Parcela ou pagamento não encontrado ou não pertence ao usuário."
        )

    payment.status = data.status
    if data.status == "CONCLUIDO":
        payment.paid_at = data.paid_at or datetime.now(timezone.utc).isoformat()
    elif data.status == "PENDENTE":
        payment.paid_at = None

    await db.flush()

    # Sincroniza status da Expense mãe
    expense_payments_res = await db.execute(
        select(Payment).where(Payment.expense_id == payment.expense_id)
    )
    all_payments = expense_payments_res.scalars().all()
    
    if all_payments:
        all_completed = all(p.status == "CONCLUIDO" for p in all_payments)
        all_cancelled = all(p.status == "CANCELADO" for p in all_payments)

        if all_completed:
            payment.expense.status = "CONCLUIDO"
        elif all_cancelled:
            payment.expense.status = "CANCELADO"
        else:
            payment.expense.status = "PENDENTE"

    await db.commit()
    await db.refresh(payment)
    return payment
