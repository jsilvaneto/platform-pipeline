from datetime import datetime, timezone
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.payment import Payment
from app.models.expense import Expense
from app.schemas.payment import PaymentStatusUpdate, PaymentUpdate

async def get_payment(db: AsyncSession, user_id: str, payment_id: str) -> Payment:
    """Busca uma parcela pelo ID garantindo que pertença ao usuário autenticado."""
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
    return payment

async def update_payment_status(
    db: AsyncSession, user_id: str, payment_id: str, data: PaymentStatusUpdate
) -> Payment:
    """Atualiza o status de liquidação de uma parcela e sincroniza com a despesa mãe."""
    payment = await get_payment(db, user_id, payment_id)

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

async def update_payment(
    db: AsyncSession, user_id: str, payment_id: str, data: PaymentUpdate
) -> Payment:
    """Atualiza individualmente o valor (ou vencimento) de uma parcela e sincroniza o total da despesa mãe."""
    payment = await get_payment(db, user_id, payment_id)

    if data.amount_cents is None and data.due_date is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Nenhum dado informado para atualização da parcela."
        )

    if data.amount_cents is not None:
        payment.amount_cents = data.amount_cents

    if data.due_date is not None:
        payment.due_date = data.due_date
        if payment.expense and payment.expense.installments_count == 1:
            payment.expense.due_date = data.due_date

    await db.flush()

    # Recalcula e sincroniza o total_amount_cents da despesa mãe com a soma das parcelas
    if payment.expense:
        expense_payments_res = await db.execute(
            select(Payment).where(Payment.expense_id == payment.expense_id)
        )
        all_payments = expense_payments_res.scalars().all()
        if all_payments:
            payment.expense.total_amount_cents = sum(p.amount_cents for p in all_payments)

    await db.commit()
    await db.refresh(payment)
    return payment
