import uuid
import pytest
from datetime import date
from sqlalchemy import select

from app.database import AsyncSessionLocal
from app.models.user import User
from app.models.expense import Expense
from app.models.payment import Payment
from app.models.item import Item
from app.models.category import Category
from app.models.contact import Contact
from app.schemas.expense import ExpenseCreate
from app.schemas.item import ItemCreate
from app.schemas.contact import ContactCreate
from app.services import expense_service, item_service, contact_service, category_service, calendar_service


@pytest.mark.asyncio
async def test_calendar_month_grid_and_metrics():
    """
    Testa:
    1. Geração de grade de calendário para determinado mês com padding de domingo a sábado.
    2. Agrupamento correto de despesas e parcelas por data.
    3. Identificação do dia de pico de desembolso.
    4. Limpeza rigorosa (Resíduo Zero).
    """
    async with AsyncSessionLocal() as session:
        unique_suffix = uuid.uuid4().hex[:8]
        temp_user = User(
            username=f"test_cal_{unique_suffix}",
            hashed_password="hashed_pwd_test",
            is_admin=False,
            is_active=True,
        )
        session.add(temp_user)
        await session.commit()
        await session.refresh(temp_user)
        user_id = temp_user.id

        try:
            cats = await category_service.list_categories(session, user_id)
            cat = cats[0]

            item = await item_service.create_item(
                session,
                user_id,
                ItemCreate(name=f"Internet {unique_suffix}", category_id=cat.id, nature="OBRIGATORIO"),
            )
            contact = await contact_service.create_contact(
                session,
                user_id,
                ContactCreate(name=f"Operadora {unique_suffix}"),
            )

            # Cria despesa com vencimento no dia 2026-09-15
            exp1 = await expense_service.create_expense(
                session,
                user_id,
                ExpenseCreate(
                    description=f"Plano Fibra {unique_suffix}",
                    total_amount_cents=12000,  # R$ 120,00
                    issue_date="2026-09-01",
                    due_date="2026-09-15",
                    item_id=item.id,
                    contact_id=contact.id,
                    category_id=cat.id,
                    essentiality="OBRIGATORIO",
                    status="PENDENTE",
                    installments_count=1,
                    is_recurring=False,
                ),
            )

            # Cria segunda despesa com vencimento no mesmo dia 2026-09-15
            exp2 = await expense_service.create_expense(
                session,
                user_id,
                ExpenseCreate(
                    description=f"Hospedagem {unique_suffix}",
                    total_amount_cents=8000,  # R$ 80,00
                    issue_date="2026-09-01",
                    due_date="2026-09-15",
                    item_id=item.id,
                    contact_id=contact.id,
                    category_id=cat.id,
                    essentiality="OBRIGATORIO",
                    status="PENDENTE",
                    installments_count=1,
                    is_recurring=False,
                ),
            )

            cal_res = await calendar_service.get_calendar_month(session, user_id, "2026-09")

            assert cal_res.month == "2026-09"
            assert cal_res.year == 2026
            assert cal_res.month_num == 9
            assert cal_res.total_cents == 20000
            assert cal_res.peak_day == "2026-09-15"
            assert cal_res.peak_day_amount_cents == 20000

            # Verifica grade de dias (múltiplo de 7)
            assert len(cal_res.days) % 7 == 0
            day_15 = next((d for d in cal_res.days if d.date == "2026-09-15"), None)
            assert day_15 is not None
            assert len(day_15.payments) == 2
            assert day_15.total_cents == 20000
            assert day_15.pending_cents == 20000

        finally:
            # Resíduo Zero
            exp_res = await session.execute(select(Expense).where(Expense.user_id == user_id))
            for e in exp_res.scalars().all():
                await session.delete(e)

            item_res = await session.execute(select(Item).where(Item.user_id == user_id))
            for it in item_res.scalars().all():
                await session.delete(it)

            contact_res = await session.execute(select(Contact).where(Contact.user_id == user_id))
            for ct in contact_res.scalars().all():
                await session.delete(ct)

            cat_res = await session.execute(select(Category).where(Category.user_id == user_id))
            for c in cat_res.scalars().all():
                await session.delete(c)

            u_res = await session.execute(select(User).where(User.id == user_id))
            u = u_res.scalar_one_or_none()
            if u:
                await session.delete(u)

            await session.commit()
