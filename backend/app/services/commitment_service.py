from datetime import date
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status

from app.models.expense import Expense
from app.models.payment import Payment
from app.schemas.payment import PaymentResponse
from app.schemas.commitment import (
    CommitmentsSummary,
    RecurringCommitmentItem,
    InstallmentCommitmentItem,
    NextPayoffInfo,
    MonthlyCommitmentProjection,
)
from app.services.expense_service import ensure_recurring_horizon

MONTH_ABBRS: list[str] = [
    "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
    "Jul", "Ago", "Set", "Out", "Nov", "Dez"
]

async def get_commitments_summary(db: AsyncSession, user_id: str) -> CommitmentsSummary:
    """Consolida compromissos recorrentes e parcelamentos ativos com projeção de desoneração."""
    today = date.today()
    today_str = today.isoformat()

    # 1. Garante que despesas recorrentes possuam o horizonte de 12 meses gerado (ano atual + próximo ano)
    await ensure_recurring_horizon(db, user_id, target_year=today.year + 1)

    # 2. Busca todas as despesas do usuário com seus relacionamentos
    query = (
        select(Expense)
        .options(
            selectinload(Expense.category),
            selectinload(Expense.item),
            selectinload(Expense.contact),
            selectinload(Expense.payment_method),
            selectinload(Expense.payments),
        )
        .where(
            Expense.user_id == user_id,
            (Expense.is_recurring.is_(True)) | (Expense.installments_count > 1),
        )
        .order_by(Expense.created_at.desc())
    )
    result = await db.execute(query)
    expenses = result.scalars().all()

    recurring_items: list[RecurringCommitmentItem] = []
    installment_items: list[InstallmentCommitmentItem] = []

    fixed_monthly_total_cents = 0
    active_recurring_count = 0

    total_installments_remaining_cents = 0
    active_installments_count = 0

    potential_next_payoffs: list[NextPayoffInfo] = []

    for exp in expenses:
        payments_sorted = sorted(exp.payments, key=lambda p: p.installment_number)

        if exp.is_recurring:
            # Recorrência contínua
            is_active = exp.status != "CANCELADO"
            if is_active:
                fixed_monthly_total_cents += exp.total_amount_cents
                active_recurring_count += 1

            # Próximo pagamento pendente
            next_p = next(
                (p for p in payments_sorted if p.due_date >= today_str and p.status != "CANCELADO"),
                None
            )
            if not next_p:
                next_p = next((p for p in payments_sorted if p.status == "PENDENTE"), None)

            due_day = int(exp.due_date.split("-")[2]) if len(exp.due_date.split("-")) == 3 else 1

            recurring_items.append(
                RecurringCommitmentItem(
                    expense_id=exp.id,
                    description=exp.description,
                    item_id=exp.item_id,
                    item_name=exp.item.name if exp.item else exp.description,
                    category_id=exp.category_id,
                    category_name=exp.category.name if exp.category else "Geral",
                    category_color=exp.category.color if exp.category else "#6366f1",
                    contact_name=exp.contact.name if exp.contact else None,
                    payment_method_name=exp.payment_method.name if exp.payment_method else None,
                    amount_cents=exp.total_amount_cents,
                    due_day=due_day,
                    status=exp.status,
                    next_due_date=next_p.due_date if next_p else None,
                    next_payment_id=next_p.id if next_p else None,
                    next_payment_status=next_p.status if next_p else None,
                )
            )
        else:
            # Compra parcelada
            paid_payments = [p for p in payments_sorted if p.status == "CONCLUIDO"]
            pending_payments = [p for p in payments_sorted if p.status == "PENDENTE"]

            total_count = exp.installments_count or len(payments_sorted)
            paid_count = len(paid_payments)
            remaining_count = len(pending_payments)

            remaining_cents = sum(p.amount_cents for p in pending_payments)
            paid_cents = sum(p.amount_cents for p in paid_payments)
            progress_pct = round((paid_count / total_count * 100)) if total_count > 0 else 0

            next_due = pending_payments[0].due_date if pending_payments else None
            last_due = payments_sorted[-1].due_date if payments_sorted else None
            inst_amount = (
                pending_payments[0].amount_cents
                if pending_payments
                else (payments_sorted[0].amount_cents if payments_sorted else 0)
            )

            is_active_plan = remaining_count > 0 and exp.status != "CANCELADO"
            if is_active_plan:
                active_installments_count += 1
                total_installments_remaining_cents += remaining_cents
                if last_due:
                    potential_next_payoffs.append(
                        NextPayoffInfo(
                            expense_id=exp.id,
                            description=exp.description,
                            item_name=exp.item.name if exp.item else exp.description,
                            remaining_installments=remaining_count,
                            total_installments=total_count,
                            payoff_due_date=last_due,
                            remaining_cents=remaining_cents,
                        )
                    )

            installment_items.append(
                InstallmentCommitmentItem(
                    expense_id=exp.id,
                    description=exp.description,
                    item_name=exp.item.name if exp.item else exp.description,
                    category_name=exp.category.name if exp.category else "Geral",
                    category_color=exp.category.color if exp.category else "#6366f1",
                    contact_name=exp.contact.name if exp.contact else None,
                    total_amount_cents=exp.total_amount_cents,
                    paid_amount_cents=paid_cents,
                    remaining_amount_cents=remaining_cents,
                    installment_amount_cents=inst_amount,
                    total_installments=total_count,
                    paid_installments=paid_count,
                    remaining_installments=remaining_count,
                    progress_percentage=progress_pct,
                    next_due_date=next_due,
                    last_due_date=last_due,
                    payments=[PaymentResponse.model_validate(p) for p in payments_sorted],
                )
            )

    # Ordena quitação mais próxima
    potential_next_payoffs.sort(key=lambda x: x.payoff_due_date)
    next_payoff = potential_next_payoffs[0] if potential_next_payoffs else None

    # Ordena listas
    recurring_items.sort(key=lambda x: (x.status == "CANCELADO", x.due_day))
    installment_items.sort(key=lambda x: (x.remaining_installments == 0, x.next_due_date or "9999"))

    # 3. Projeção mensal dos próximos 12 meses
    monthly_projection: list[MonthlyCommitmentProjection] = []

    curr_year = today.year
    curr_month = today.month

    for i in range(12):
        target_month_num = ((curr_month - 1 + i) % 12) + 1
        target_year_num = curr_year + ((curr_month - 1 + i) // 12)
        prefix = f"{target_year_num}-{str(target_month_num).zfill(2)}"
        month_abbr = MONTH_ABBRS[target_month_num - 1]
        label = f"{month_abbr}/{str(target_year_num)[2:]}"

        # Soma recorrências ativas para o mês
        rec_cents = sum(
            p.amount_cents
            for exp in expenses
            if exp.is_recurring and exp.status != "CANCELADO"
            for p in exp.payments
            if p.status != "CANCELADO" and p.due_date.startswith(prefix)
        )
        if rec_cents == 0 and active_recurring_count > 0:
            rec_cents = fixed_monthly_total_cents

        # Soma parcelas não canceladas que vencem nesse mês
        inst_cents = sum(
            p.amount_cents
            for exp in expenses
            if not exp.is_recurring and exp.installments_count > 1 and exp.status != "CANCELADO"
            for p in exp.payments
            if p.status != "CANCELADO" and p.due_date.startswith(prefix)
        )

        monthly_projection.append(
            MonthlyCommitmentProjection(
                month=prefix,
                month_name=label,
                recurring_cents=rec_cents,
                installments_cents=inst_cents,
                total_cents=rec_cents + inst_cents,
            )
        )

    return CommitmentsSummary(
        fixed_monthly_total_cents=fixed_monthly_total_cents,
        active_recurring_count=active_recurring_count,
        total_installments_remaining_cents=total_installments_remaining_cents,
        active_installments_count=active_installments_count,
        next_payoff=next_payoff,
        recurring_commitments=recurring_items,
        installment_commitments=installment_items,
        monthly_projection=monthly_projection,
    )

async def toggle_recurring_commitment(db: AsyncSession, user_id: str, expense_id: str) -> Expense:
    """Alterna o status de uma recorrência entre ATIVA (PENDENTE) e PAUSADA (CANCELADO)."""
    query = (
        select(Expense)
        .options(selectinload(Expense.payments))
        .where(
            Expense.id == expense_id,
            Expense.user_id == user_id,
            Expense.is_recurring.is_(True)
        )
    )
    result = await db.execute(query)
    expense = result.scalar_one_or_none()
    if not expense:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Despesa recorrente não encontrada ou não pertence ao usuário."
        )

    if expense.status == "CANCELADO":
        expense.status = "PENDENTE"
        for p in expense.payments:
            if p.status == "CANCELADO":
                p.status = "PENDENTE"
    else:
        expense.status = "CANCELADO"
        for p in expense.payments:
            if p.status == "PENDENTE":
                p.status = "CANCELADO"

    await db.commit()
    await db.refresh(expense)
    return expense
