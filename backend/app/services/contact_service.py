from collections.abc import Sequence
from fastapi import HTTPException, status
from sqlalchemy import select, func, or_
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.contact import Contact
from app.models.expense import Expense
from app.models.payment import Payment
from app.schemas.contact import (
    ContactCreate,
    ContactUpdate,
    ContactSummaryResponse,
    ContactResponse,
    PlannedPaymentItem,
)

async def ensure_default_contact(db: AsyncSession, user_id: str) -> None:
    """Gera um contato padrão ('Pessoal') caso o usuário ainda não possua nenhum contato cadastrado."""
    contact_count = await db.scalar(
        select(func.count(Contact.id)).where(Contact.user_id == user_id)
    )
    if contact_count and contact_count > 0:
        return

    default_contact = Contact(
        user_id=user_id,
        name="Pessoal",
        notes="Contato padrão para despesas e contas próprias",
        is_active=True,
    )
    db.add(default_contact)
    await db.commit()

async def list_contacts(
    db: AsyncSession,
    user_id: str,
    active_only: bool = False,
    search: str | None = None,
) -> Sequence[Contact]:
    """Retorna lista de contatos do usuário com suporte a filtros e busca textual."""
    await ensure_default_contact(db, user_id)

    query = select(Contact).where(Contact.user_id == user_id)

    if active_only:
        query = query.where(Contact.is_active.is_(True))

    if search and search.strip():
        term = f"%{search.strip()}%"
        query = query.where(
            or_(
                Contact.name.ilike(term),
                Contact.email.ilike(term),
                Contact.phone.ilike(term),
            )
        )

    query = query.order_by(Contact.name.asc())
    result = await db.execute(query)
    return result.scalars().all()

async def get_contact(db: AsyncSession, user_id: str, contact_id: str) -> Contact:
    """Busca contato garantindo isolamento estrito por usuário."""
    query = select(Contact).where(Contact.id == contact_id, Contact.user_id == user_id)
    result = await db.execute(query)
    contact = result.scalar_one_or_none()
    if not contact:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Contato não encontrado ou não pertence ao usuário."
        )
    return contact

async def create_contact(db: AsyncSession, user_id: str, data: ContactCreate) -> Contact:
    """Cadastra um novo contato para o usuário."""
    contact = Contact(
        user_id=user_id,
        name=data.name.strip(),
        email=data.email.strip() if data.email else None,
        phone=data.phone.strip() if data.phone else None,
        notes=data.notes.strip() if data.notes else None,
        is_active=data.is_active,
    )
    db.add(contact)
    await db.commit()
    await db.refresh(contact)
    return contact

async def update_contact(
    db: AsyncSession, user_id: str, contact_id: str, data: ContactUpdate
) -> Contact:
    """Atualiza dados cadastrais de um contato."""
    contact = await get_contact(db, user_id, contact_id)

    if data.name is not None:
        contact.name = data.name.strip()
    if data.email is not None:
        contact.email = data.email.strip() if data.email else None
    if data.phone is not None:
        contact.phone = data.phone.strip() if data.phone else None
    if data.notes is not None:
        contact.notes = data.notes.strip() if data.notes else None
    if data.is_active is not None:
        contact.is_active = data.is_active

    await db.commit()
    await db.refresh(contact)
    return contact

async def delete_contact(db: AsyncSession, user_id: str, contact_id: str) -> None:
    """Exclui contato apenas se não possuir lançamentos financeiros atrelados."""
    contact = await get_contact(db, user_id, contact_id)

    expense_count = await db.scalar(
        select(func.count(Expense.id)).where(
            Expense.contact_id == contact_id, Expense.user_id == user_id
        )
    )
    if expense_count and expense_count > 0:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                f"Este contato possui {expense_count} lançamento(s) associado(s) e não pode ser excluído. "
                "Para ocultá-lo em novos lançamentos, desative-o."
            )
        )

    await db.delete(contact)
    await db.commit()

async def get_contact_summary(
    db: AsyncSession, user_id: str, contact_id: str
) -> ContactSummaryResponse:
    """Gera resumo financeiro e lista detalhada de pagamentos planejados vinculados ao contato."""
    contact = await get_contact(db, user_id, contact_id)

    query = (
        select(Expense)
        .options(
            selectinload(Expense.category),
            selectinload(Expense.item),
            selectinload(Expense.payment_method),
            selectinload(Expense.payments),
        )
        .where(Expense.contact_id == contact_id, Expense.user_id == user_id)
        .order_by(Expense.due_date.desc(), Expense.created_at.desc())
    )
    result = await db.execute(query)
    expenses = result.scalars().all()

    total_expenses_cents = sum(e.total_amount_cents for e in expenses)
    total_paid_cents = 0
    total_pending_cents = 0
    planned_payments: list[PlannedPaymentItem] = []

    for exp in expenses:
        for p in exp.payments:
            if p.status == "CONCLUIDO":
                total_paid_cents += p.amount_cents
            elif p.status == "PENDENTE":
                total_pending_cents += p.amount_cents
                planned_payments.append(
                    PlannedPaymentItem(
                        id=p.id,
                        expense_id=exp.id,
                        description=exp.description,
                        installment_number=p.installment_number,
                        installments_count=exp.installments_count,
                        amount_cents=p.amount_cents,
                        due_date=p.due_date,
                        status=p.status,
                        category_name=exp.category.name if exp.category else None,
                        category_color=exp.category.color if exp.category else None,
                        item_name=exp.item.name if exp.item else None,
                        payment_method_name=exp.payment_method.name if exp.payment_method else None,
                    )
                )

    # Ordena pagamentos planejados por vencimento mais próximo
    planned_payments.sort(key=lambda x: x.due_date)

    return ContactSummaryResponse(
        contact=ContactResponse.model_validate(contact),
        total_expenses_cents=total_expenses_cents,
        total_paid_cents=total_paid_cents,
        total_pending_cents=total_pending_cents,
        expenses_count=len(expenses),
        pending_payments_count=len(planned_payments),
        planned_payments=planned_payments,
    )
