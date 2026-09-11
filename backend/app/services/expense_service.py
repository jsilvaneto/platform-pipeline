from datetime import datetime, timezone, date
from collections.abc import Sequence
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.expense import Expense
from app.models.payment import Payment
from app.models.category import Category
from app.models.item import Item
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
    """Cria uma despesa e gera atomicamente suas parcelas/liquidações em centavos."""
    target_category_id = data.category_id
    target_essentiality = data.essentiality

    # Valida item se informado e herda categoria e natureza se apropriado
    if data.item_id:
        item_res = await db.execute(
            select(Item).where(Item.id == data.item_id, Item.user_id == user_id)
        )
        item = item_res.scalar_one_or_none()
        if not item:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Item informado é inválido ou não pertence ao usuário."
            )
        if not target_category_id:
            target_category_id = item.category_id
        # Se a essencialidade não foi alterada explicitamente pelo usuário, herda do item
        if data.essentiality == "NECESSARIO" and item.nature:
            target_essentiality = item.nature

    # Valida categoria se informada
    if target_category_id:
        cat = await db.execute(
            select(Category).where(Category.id == target_category_id, Category.user_id == user_id)
        )
        if not cat.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Categoria informada é inválida ou não pertence ao usuário."
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
        item_id=data.item_id,
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

    # Divisão precisa em centavos inteiros
    count = data.installments_count
    base_cents = data.total_amount_cents // count
    remainder = data.total_amount_cents % count
    start_due = date.fromisoformat(data.due_date)

    now_iso = datetime.now(timezone.utc).isoformat()

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
        .options(
            selectinload(Expense.category),
            selectinload(Expense.item).selectinload(Item.category),
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

async def list_expenses(
    db: AsyncSession, user_id: str, filter_params: ExpenseFilter
) -> Sequence[Expense]:
    """Lista despesas do usuário com filtros opcionais por mês, status, categoria, item ou essencialidade."""
    query = (
        select(Expense)
        .options(
            selectinload(Expense.category),
            selectinload(Expense.item).selectinload(Item.category),
            selectinload(Expense.payment_method),
            selectinload(Expense.payments),
        )
        .where(Expense.user_id == user_id)
    )

    if filter_params.month:
        # Inclui despesa se a data principal ou alguma das parcelas tiver vencimento no mês informado (YYYY-MM)
        query = query.where(
            Expense.payments.any(Payment.due_date.startswith(filter_params.month))
        )

    if filter_params.status:
        query = query.where(Expense.status == filter_params.status)

    if filter_params.category_id:
        query = query.where(Expense.category_id == filter_params.category_id)

    if filter_params.item_id:
        query = query.where(Expense.item_id == filter_params.item_id)

    if filter_params.payment_method_id:
        query = query.where(Expense.payment_method_id == filter_params.payment_method_id)

    if filter_params.essentiality:
        query = query.where(Expense.essentiality == filter_params.essentiality)

    query = query.order_by(Expense.due_date.desc(), Expense.created_at.desc())
    result = await db.execute(query)
    return result.scalars().all()

async def update_expense(
    db: AsyncSession, user_id: str, expense_id: str, data: ExpenseUpdate
) -> Expense:
    """Atualiza metadados da despesa (descrição, categoria, item, notas, essencialidade)."""
    expense = await get_expense(db, user_id, expense_id)

    if data.item_id is not None:
        if data.item_id != "":
            item_res = await db.execute(
                select(Item).where(Item.id == data.item_id, Item.user_id == user_id)
            )
            item = item_res.scalar_one_or_none()
            if not item:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Item informado é inválido."
                )
            expense.item_id = data.item_id
            if not expense.category_id:
                expense.category_id = item.category_id
        else:
            expense.item_id = None

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

    if data.description is not None:
        expense.description = data.description.strip()
    if data.essentiality is not None:
        expense.essentiality = data.essentiality
    if data.status is not None:
        expense.status = data.status
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
