from datetime import date, datetime, timedelta
from typing import Any
from dateutil.rrule import rrulestr
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status

from app.models.expense import Expense
from app.models.payment import Payment
from app.models.wallet_standing_order import WalletStandingOrder
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
    """Consolida compromissos recorrentes e ordens programadas a partir de despesas locais e da Wallet API."""
    today = date.today()
    today_str = today.isoformat()

    # 1. Garante que despesas recorrentes manuais possuam o horizonte gerado
    await ensure_recurring_horizon(db, user_id, target_year=today.year + 1)

    recurring_items: list[RecurringCommitmentItem] = []
    installment_items: list[InstallmentCommitmentItem] = []
    potential_next_payoffs: list[NextPayoffInfo] = []

    fixed_monthly_total_cents = 0
    active_recurring_count = 0
    total_installments_remaining_cents = 0
    active_installments_count = 0

    # 2. Busca despesas manuais/locais
    exp_query = (
        select(Expense)
        .options(
            selectinload(Expense.category),
            selectinload(Expense.item),
            selectinload(Expense.contact),
            selectinload(Expense.payment_method),
            selectinload(Expense.payments).selectinload(Payment.attachments),
            selectinload(Expense.attachments),
        )
        .where(
            Expense.user_id == user_id,
        )
    )
    exp_res = await db.execute(exp_query)
    expenses = exp_res.scalars().all()

    for exp in expenses:
        payments_sorted = sorted(exp.payments, key=lambda p: p.installment_number)
        if exp.is_recurring:
            if exp.status != "CANCELADO":
                fixed_monthly_total_cents += exp.total_amount_cents
                active_recurring_count += 1

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
        elif exp.installments_count > 1:
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

    # 3. Busca WalletStandingOrder sincronizadas
    so_query = (
        select(WalletStandingOrder)
        .options(
            selectinload(WalletStandingOrder.account),
            selectinload(WalletStandingOrder.category),
        )
        .where(
            WalletStandingOrder.user_id == user_id,
            WalletStandingOrder.record_type != "RECEITA",
        )
        .order_by(WalletStandingOrder.name.asc())
    )
    so_res = await db.execute(so_query)
    standing_orders = so_res.scalars().all()

    for so in standing_orders:
        acc_name = so.account.name if so.account else "Conta Principal"
        cat_name = so.category.name if so.category else "Geral"
        cat_color = so.category.color if so.category and so.category.color else "#6366f1"

        next_due = so.due_date
        if so.recurrence_rule and so.due_date:
            try:
                base_dt = date.fromisoformat(so.due_date)
                rule_obj = rrulestr(
                    so.recurrence_rule,
                    dtstart=datetime.combine(base_dt, datetime.min.time()),
                )
                next_dts = rule_obj.between(
                    datetime.combine(today, datetime.min.time()),
                    datetime.combine(today + timedelta(days=90), datetime.max.time()),
                    inc=True,
                )
                if next_dts:
                    next_due = next_dts[0].date().isoformat()
            except Exception:
                pass

        due_day = 1
        if so.due_date:
            parts = so.due_date.split("-")
            if len(parts) == 3:
                try:
                    due_day = int(parts[2])
                except ValueError:
                    due_day = 1

        is_finite = so.payment_count is not None and so.payment_count > 1

        if not is_finite:
            if so.is_active:
                fixed_monthly_total_cents += so.amount_cents
                active_recurring_count += 1

            recurring_items.append(
                RecurringCommitmentItem(
                    expense_id=so.id,
                    description=so.name,
                    item_id=so.id,
                    item_name=so.name,
                    category_id=so.category_id,
                    category_name=cat_name,
                    category_color=cat_color,
                    contact_name=acc_name,
                    payment_method_name=acc_name,
                    amount_cents=so.amount_cents,
                    due_day=due_day,
                    status="ATIVO" if so.is_active else "CANCELADO",
                    next_due_date=next_due,
                    next_payment_id=f"so_{so.id}",
                    next_payment_status="PENDENTE",
                )
            )
        else:
            total_count = so.payment_count or 1
            remaining_count = total_count
            total_cents = so.amount_cents * total_count
            remaining_cents = total_cents

            if so.is_active:
                active_installments_count += 1
                total_installments_remaining_cents += remaining_cents

                potential_next_payoffs.append(
                    NextPayoffInfo(
                        expense_id=so.id,
                        description=so.name,
                        item_name=so.name,
                        remaining_installments=remaining_count,
                        total_installments=total_count,
                        payoff_due_date=next_due or today_str,
                        remaining_cents=remaining_cents,
                    )
                )

            installment_items.append(
                InstallmentCommitmentItem(
                    expense_id=so.id,
                    description=so.name,
                    item_name=so.name,
                    category_name=cat_name,
                    category_color=cat_color,
                    contact_name=acc_name,
                    total_amount_cents=total_cents,
                    paid_amount_cents=0,
                    remaining_amount_cents=remaining_cents,
                    installment_amount_cents=so.amount_cents,
                    total_installments=total_count,
                    paid_installments=0,
                    remaining_installments=remaining_count,
                    progress_percentage=0,
                    next_due_date=next_due,
                    last_due_date=next_due,
                    payments=[],
                )
            )

    potential_next_payoffs.sort(key=lambda x: x.payoff_due_date)
    next_payoff = potential_next_payoffs[0] if potential_next_payoffs else None

    recurring_items.sort(key=lambda x: (x.status == "CANCELADO", x.due_day))
    installment_items.sort(key=lambda x: (x.remaining_installments == 0, x.next_due_date or "9999"))

    # 4. Projeção mensal dos próximos 12 meses consolidada
    monthly_projection: list[MonthlyCommitmentProjection] = []
    curr_year = today.year
    curr_month = today.month

    for i in range(12):
        target_month_num = ((curr_month - 1 + i) % 12) + 1
        target_year_num = curr_year + ((curr_month - 1 + i) // 12)
        prefix = f"{target_year_num}-{str(target_month_num).zfill(2)}"
        month_abbr = MONTH_ABBRS[target_month_num - 1]
        label = f"{month_abbr}/{str(target_year_num)[2:]}"

        rec_cents = sum(
            p.amount_cents
            for exp in expenses
            if exp.is_recurring and exp.status != "CANCELADO"
            for p in exp.payments
            if p.status != "CANCELADO" and p.due_date.startswith(prefix)
        )
        so_rec_cents = sum(
            so.amount_cents
            for so in standing_orders
            if so.is_active and (so.payment_count is None or so.payment_count <= 1)
        )
        total_rec_month = rec_cents + so_rec_cents

        inst_cents = sum(
            p.amount_cents
            for exp in expenses
            if not exp.is_recurring and exp.installments_count > 1 and exp.status != "CANCELADO"
            for p in exp.payments
            if p.status != "CANCELADO" and p.due_date.startswith(prefix)
        )
        so_inst_cents = sum(
            so.amount_cents
            for so in standing_orders
            if so.is_active and so.payment_count is not None and so.payment_count > 1
        )
        total_inst_month = inst_cents + so_inst_cents

        monthly_projection.append(
            MonthlyCommitmentProjection(
                month=prefix,
                month_name=label,
                recurring_cents=total_rec_month,
                installments_cents=total_inst_month,
                total_cents=total_rec_month + total_inst_month,
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


async def toggle_recurring_commitment(db: AsyncSession, user_id: str, expense_id: str) -> dict[str, Any]:
    """Alterna o status de uma ordem ou despesa recorrente entre ativa e pausada/cancelada."""
    # 1. Tenta encontrar em Expense
    exp_res = await db.execute(
        select(Expense)
        .options(selectinload(Expense.payments))
        .where(
            Expense.id == expense_id,
            Expense.user_id == user_id,
            Expense.is_recurring == True,  # noqa: E712
        )
    )
    expense = exp_res.scalar_one_or_none()
    if expense:
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
        return {"id": expense.id, "status": expense.status}

    # 2. Tenta encontrar em WalletStandingOrder
    so_res = await db.execute(
        select(WalletStandingOrder)
        .where(
            WalletStandingOrder.id == expense_id,
            WalletStandingOrder.user_id == user_id,
        )
    )
    so = so_res.scalar_one_or_none()
    if so:
        so.is_active = not so.is_active
        await db.commit()
        return {"id": so.id, "is_active": so.is_active}

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Compromisso recorrente não encontrado.",
    )
