from datetime import datetime, timezone, date
from collections.abc import Sequence
from fastapi import HTTPException, status
from sqlalchemy import select, func, distinct, and_
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.expense import Expense
from app.models.payment import Payment
from app.models.category import Category
from app.models.item import Item
from app.models.contact import Contact
from app.models.payment_method import PaymentMethod
from app.schemas.expense import ExpenseCreate, ExpenseUpdate, ExpenseFilter

def _add_months(source_date: date, months: int) -> date:
    """Adiciona N meses a uma data preservando integridade de dias do mês."""
    total_months = source_date.month - 1 + months
    year = source_date.year + total_months // 12
    month = total_months % 12 + 1
    # Dias por mês (considerando ano bissexto para fevereiro)
    is_leap = year % 4 == 0 and (year % 100 != 0 or year % 400 == 0)
    max_days = [31, 29 if is_leap else 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1]
    day = min(source_date.day, max_days)
    return date(year, month, day)

async def create_expense(db: AsyncSession, user_id: str, data: ExpenseCreate) -> Expense:
    """Cria uma despesa associada a um item obrigatório e contato obrigatório, herdando categoria e natureza."""
    # Valida item obrigatório e herda categoria e natureza intrínseca
    item_res = await db.execute(
        select(Item).where(Item.id == data.item_id, Item.user_id == user_id)
    )
    item = item_res.scalar_one_or_none()
    if not item:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Item informado é inválido ou não pertence ao usuário."
        )

    # Valida contato obrigatório
    contact_res = await db.execute(
        select(Contact).where(Contact.id == data.contact_id, Contact.user_id == user_id)
    )
    contact = contact_res.scalar_one_or_none()
    if not contact:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Contato informado é inválido ou não pertence ao usuário."
        )

    # Categoria e Natureza são estritamente vinculadas e herdadas do item
    target_category_id = item.category_id
    target_essentiality = item.nature

    # Valida categoria vinculada ao item
    cat = await db.execute(
        select(Category).where(Category.id == target_category_id, Category.user_id == user_id)
    )
    if not cat.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Categoria vinculada ao item é inválida ou não pertence ao usuário."
        )

    # Valida meio de pagamento se informado
    if data.payment_method_id:
        pm = await db.execute(
            select(PaymentMethod).where(
                PaymentMethod.id == data.payment_method_id,
                PaymentMethod.user_id == user_id
            )
        )
        if not pm.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Forma de pagamento informada é inválida ou não pertence ao usuário."
            )

    expense = Expense(
        user_id=user_id,
        category_id=target_category_id,
        item_id=item.id,
        contact_id=contact.id,
        payment_method_id=data.payment_method_id,
        description=data.description.strip(),
        total_amount_cents=data.total_amount_cents,
        issue_date=data.issue_date,
        due_date=data.due_date,
        essentiality=target_essentiality,
        status=data.status,
        installments_count=data.installments_count,
        is_recurring=data.is_recurring,
        notes=data.notes.strip() if data.notes else None,
    )
    db.add(expense)
    await db.flush()  # Garante geração do expense.id

    # Divisão precisa em centavos inteiros ou horizonte para recorrência
    start_due = date.fromisoformat(data.due_date)
    now_iso = datetime.now(timezone.utc).isoformat()

    if data.is_recurring:
        # Despesa fixa mensal contínua:
        # Gera pagamentos para o ano civil da data de vencimento informada (do mês de início até Dezembro)
        # O valor mensal integral de cada parcela é data.total_amount_cents
        start_year = start_due.year
        start_month = start_due.month
        months_in_year = 12 - start_month + 1

        expense.installments_count = months_in_year
        for idx in range(months_in_year):
            installment_num = idx + 1
            inst_amount = data.total_amount_cents
            inst_due = _add_months(start_due, idx).isoformat()
            inst_status = data.status if idx == 0 else "PENDENTE"
            paid_at = now_iso if (idx == 0 and inst_status == "CONCLUIDO") else None

            payment = Payment(
                user_id=user_id,
                expense_id=expense.id,
                installment_number=installment_num,
                amount_cents=inst_amount,
                due_date=inst_due,
                paid_at=paid_at,
                status=inst_status,
            )
            db.add(payment)
    else:
        count = data.installments_count
        base_cents = data.total_amount_cents // count
        remainder = data.total_amount_cents % count

        for idx in range(count):
            installment_num = idx + 1
            # O resto é atribuído à 1ª parcela para garantir que a soma das parcelas seja estritamente igual ao total
            inst_amount = base_cents + (remainder if idx == 0 else 0)
            inst_due = _add_months(start_due, idx).isoformat()
            inst_status = data.status if count == 1 else "PENDENTE"
            paid_at = now_iso if inst_status == "CONCLUIDO" else None

            payment = Payment(
                user_id=user_id,
                expense_id=expense.id,
                installment_number=installment_num,
                amount_cents=inst_amount,
                due_date=inst_due,
                paid_at=paid_at,
                status=inst_status,
            )
            db.add(payment)

    await db.commit()
    await db.refresh(expense)
    return await get_expense(db, user_id, expense.id)

async def get_expense(db: AsyncSession, user_id: str, expense_id: str) -> Expense:
    """Busca uma despesa com seus pagamentos e relacionamentos garantindo isolamento por usuário."""
    query = (
        select(Expense)
        .execution_options(populate_existing=True)
        .options(
            selectinload(Expense.category),
            selectinload(Expense.item).selectinload(Item.category),
            selectinload(Expense.contact),
            selectinload(Expense.payment_method),
            selectinload(Expense.payments),
        )
        .where(Expense.id == expense_id, Expense.user_id == user_id)
    )
    result = await db.execute(query)
    expense = result.scalar_one_or_none()
    if not expense:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Despesa não encontrada ou não pertence ao usuário."
        )
    return expense

async def ensure_recurring_horizon(
    db: AsyncSession,
    user_id: str,
    target_year: int | None = None,
) -> None:
    """
    Garante que despesas fixas recorrentes ativas tenham pagamentos gerados
    para o ano atual e para o ano de referência solicitado (virada de ano automática contínua).
    """
    today = date.today()
    current_year = today.year
    horizon_year = max(current_year, target_year) if target_year else current_year

    query = (
        select(Expense)
        .execution_options(populate_existing=True)
        .options(selectinload(Expense.payments))
        .where(
            Expense.user_id == user_id,
            Expense.is_recurring.is_(True),
            Expense.status != "CANCELADO",
        )
    )
    result = await db.execute(query)
    recurring_expenses = result.scalars().all()
    updated = False

    for exp in recurring_expenses:
        if not exp.due_date:
            continue
        try:
            start_due = date.fromisoformat(exp.due_date)
        except ValueError:
            continue

        start_year = start_due.year
        start_month = start_due.month

        # Mapeia competências (YYYY-MM) já geradas para evitar duplicações
        existing_payments = exp.payments
        existing_months = {p.due_date[:7] for p in existing_payments if p.due_date}
        max_inst_num = max([p.installment_number for p in existing_payments], default=0)

        # Gera pagamentos faltantes desde start_year até horizon_year
        for year in range(start_year, horizon_year + 1):
            m_start = start_month if year == start_year else 1
            m_end = 12

            for m in range(m_start, m_end + 1):
                month_key = f"{year:04d}-{m:02d}"
                if month_key not in existing_months:
                    # Calcula data de vencimento preservando o dia original
                    months_diff = (year - start_year) * 12 + (m - start_month)
                    due_date_calc = _add_months(start_due, months_diff).isoformat()

                    max_inst_num += 1
                    payment = Payment(
                        user_id=user_id,
                        expense_id=exp.id,
                        installment_number=max_inst_num,
                        amount_cents=exp.total_amount_cents,
                        due_date=due_date_calc,
                        paid_at=None,
                        status="PENDENTE",
                    )
                    db.add(payment)
                    exp.payments.append(payment)
                    existing_months.add(month_key)
                    updated = True

        total_generated = len(existing_months)
        if exp.installments_count != total_generated:
            exp.installments_count = total_generated
            updated = True

    if updated:
        await db.commit()

async def list_expenses(
    db: AsyncSession,
    user_id: str,
    filter_params: ExpenseFilter,
    page: int | None = None,
    page_size: int | None = None,
) -> tuple[Sequence[Expense], int]:
    """Lista despesas do usuário com filtros opcionais por mês, status, categoria, item ou essencialidade."""
    target_year = None
    if filter_params.month:
        try:
            target_year = int(filter_params.month.split("-")[0])
        except (ValueError, IndexError):
            pass

    await ensure_recurring_horizon(db, user_id, target_year=target_year)

    query = (
        select(Expense)
        .options(
            selectinload(Expense.category),
            selectinload(Expense.item).selectinload(Item.category),
            selectinload(Expense.contact),
            selectinload(Expense.payment_method),
            selectinload(Expense.payments),
        )
        .where(Expense.user_id == user_id)
    )

    count_query = (
        select(func.count(distinct(Expense.id)))
        .select_from(Expense)
        .where(Expense.user_id == user_id)
    )

    if filter_params.month:
        month_cond = Expense.payments.any(Payment.due_date.startswith(filter_params.month))
        query = query.where(month_cond)
        count_query = count_query.where(month_cond)

    if filter_params.status:
        query = query.where(Expense.status == filter_params.status)
        count_query = count_query.where(Expense.status == filter_params.status)

    if filter_params.category_id:
        query = query.where(Expense.category_id == filter_params.category_id)
        count_query = count_query.where(Expense.category_id == filter_params.category_id)

    if filter_params.item_id:
        query = query.where(Expense.item_id == filter_params.item_id)
        count_query = count_query.where(Expense.item_id == filter_params.item_id)

    if filter_params.contact_id:
        query = query.where(Expense.contact_id == filter_params.contact_id)
        count_query = count_query.where(Expense.contact_id == filter_params.contact_id)

    if filter_params.payment_method_id:
        query = query.where(Expense.payment_method_id == filter_params.payment_method_id)
        count_query = count_query.where(Expense.payment_method_id == filter_params.payment_method_id)

    if filter_params.essentiality:
        query = query.where(Expense.essentiality == filter_params.essentiality)
        count_query = count_query.where(Expense.essentiality == filter_params.essentiality)

    if filter_params.is_overdue:
        today_str = date.today().isoformat()
        overdue_cond = Expense.payments.any(
            and_(Payment.status == "PENDENTE", Payment.due_date < today_str)
        )
        query = query.where(overdue_cond)
        count_query = count_query.where(overdue_cond)

    total_count = await db.scalar(count_query) or 0

    query = query.order_by(Expense.due_date.desc(), Expense.created_at.desc())

    if page is not None and page_size is not None:
        offset_val = (page - 1) * page_size
        query = query.offset(offset_val).limit(page_size)

    result = await db.execute(query)
    items = result.scalars().all()
    return items, total_count

async def update_expense(
    db: AsyncSession, user_id: str, expense_id: str, data: ExpenseUpdate
) -> Expense:
    """Atualiza metadados da despesa (descrição, categoria, item, notas, essencialidade)."""
    expense = await get_expense(db, user_id, expense_id)

    if data.item_id is not None:
        if data.item_id.strip() != "":
            item_res = await db.execute(
                select(Item).where(Item.id == data.item_id, Item.user_id == user_id)
            )
            item = item_res.scalar_one_or_none()
            if not item:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Item informado é inválido ou não pertence ao usuário."
                )
            expense.item_id = item.id
            expense.category_id = item.category_id
            expense.essentiality = item.nature
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="O campo item é obrigatório no lançamento."
            )

    if data.contact_id is not None:
        if data.contact_id.strip() != "":
            contact_res = await db.execute(
                select(Contact).where(Contact.id == data.contact_id, Contact.user_id == user_id)
            )
            contact = contact_res.scalar_one_or_none()
            if not contact:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Contato informado é inválido ou não pertence ao usuário."
                )
            expense.contact_id = contact.id
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="O campo contato é obrigatório no lançamento."
            )

    if data.category_id is not None:
        if data.category_id != "":
            cat = await db.execute(
                select(Category).where(Category.id == data.category_id, Category.user_id == user_id)
            )
            if not cat.scalar_one_or_none():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Categoria inválida."
                )
            expense.category_id = data.category_id
        else:
            expense.category_id = None

    if data.payment_method_id is not None:
        if data.payment_method_id != "":
            pm = await db.execute(
                select(PaymentMethod).where(
                    PaymentMethod.id == data.payment_method_id,
                    PaymentMethod.user_id == user_id
                )
            )
            if not pm.scalar_one_or_none():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Forma de pagamento inválida."
                )
            expense.payment_method_id = data.payment_method_id
        else:
            expense.payment_method_id = None

    if data.issue_date is not None:
        expense.issue_date = data.issue_date

    if data.due_date is not None:
        expense.due_date = data.due_date
        if expense.installments_count == 1 and expense.payments:
            expense.payments[0].due_date = data.due_date
        elif expense.installments_count > 1 and expense.payments:
            if all(p.status == "PENDENTE" for p in expense.payments):
                start_due = date.fromisoformat(data.due_date)
                for p in sorted(expense.payments, key=lambda x: x.installment_number):
                    p.due_date = _add_months(start_due, p.installment_number - 1).isoformat()

    if data.total_amount_cents is not None and data.total_amount_cents != expense.total_amount_cents:
        if expense.is_recurring:
            # Para despesa recorrente, atualiza o valor mensal padrão e todos os pagamentos pendentes futuros
            expense.total_amount_cents = data.total_amount_cents
            for p in expense.payments:
                if p.status == "PENDENTE":
                    p.amount_cents = data.total_amount_cents
        elif expense.installments_count == 1:
            expense.total_amount_cents = data.total_amount_cents
            if expense.payments:
                expense.payments[0].amount_cents = data.total_amount_cents
        else:
            if any(p.status == "CONCLUIDO" for p in expense.payments):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Não é possível alterar o valor total de uma despesa parcelada que já possui parcelas pagas."
                )
            expense.total_amount_cents = data.total_amount_cents
            count = expense.installments_count
            base_cents = data.total_amount_cents // count
            remainder = data.total_amount_cents % count
            for idx, p in enumerate(sorted(expense.payments, key=lambda x: x.installment_number)):
                p.amount_cents = base_cents + (remainder if idx == 0 else 0)

    if data.description is not None:
        expense.description = data.description.strip()
    if data.essentiality is not None:
        expense.essentiality = data.essentiality
    if data.status is not None:
        expense.status = data.status
        if expense.is_recurring:
            if data.status == "CANCELADO":
                for p in expense.payments:
                    if p.status == "PENDENTE":
                        p.status = "CANCELADO"
            elif data.status != "CANCELADO":
                for p in expense.payments:
                    if p.status == "CANCELADO":
                        p.status = "PENDENTE"
        elif expense.installments_count == 1 and expense.payments:
            expense.payments[0].status = data.status
            if data.status == "CONCLUIDO" and not expense.payments[0].paid_at:
                expense.payments[0].paid_at = datetime.now(timezone.utc).isoformat()
            elif data.status != "CONCLUIDO":
                expense.payments[0].paid_at = None
    if data.is_recurring is not None:
        expense.is_recurring = data.is_recurring
    if data.notes is not None:
        expense.notes = data.notes.strip() if data.notes else None

    await db.commit()
    await db.refresh(expense)
    return await get_expense(db, user_id, expense.id)

async def delete_expense(db: AsyncSession, user_id: str, expense_id: str) -> None:
    """Exclui a despesa e suas parcelas em cascata."""
    expense = await get_expense(db, user_id, expense_id)
    await db.delete(expense)
    await db.commit()
