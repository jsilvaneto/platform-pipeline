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
from app.schemas.expense import ExpenseCreate, ExpenseFilter
from app.schemas.item import ItemCreate
from app.schemas.contact import ContactCreate
from app.services import expense_service, item_service, contact_service, category_service, dashboard_service


@pytest.mark.asyncio
async def test_dashboard_annual_and_monthly_views_and_overdue():
    """
    Testa:
    1. Dashboard no modo anual (view_mode='annual', monthly_breakdown com 12 meses).
    2. Dashboard no modo mensal (view_mode='monthly', daily_breakdown com dias do mês).
    3. Contas em atraso cumulativo histórico e listagem em overdue_payments.
    4. Filtro is_overdue na listagem de despesas.
    5. Política de Resíduo Zero.
    """
    async with AsyncSessionLocal() as session:
        unique_suffix = uuid.uuid4().hex[:8]
        temp_user = User(
            username=f"test_dash_{unique_suffix}",
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
                ItemCreate(name=f"Telefone {unique_suffix}", category_id=cat.id, nature="OBRIGATORIO"),
            )
            contact = await contact_service.create_contact(
                session,
                user_id,
                ContactCreate(name=f"Vivo {unique_suffix}"),
            )

            # 1. Cria uma despesa atrasada (vencida em 2025-01-10)
            overdue_exp = await expense_service.create_expense(
                session,
                user_id,
                ExpenseCreate(
                    description=f"Conta Antiga {unique_suffix}",
                    total_amount_cents=5500,  # R$ 55,00
                    issue_date="2025-01-01",
                    due_date="2025-01-10",
                    item_id=item.id,
                    contact_id=contact.id,
                    category_id=cat.id,
                    essentiality="OBRIGATORIO",
                    status="PENDENTE",
                    installments_count=1,
                    is_recurring=False,
                ),
            )

            # 2. Cria uma despesa no mês de 2026-09 com vencimento futuro
            exp_sep = await expense_service.create_expense(
                session,
                user_id,
                ExpenseCreate(
                    description=f"Plano Celular {unique_suffix}",
                    total_amount_cents=9900,  # R$ 99,00
                    issue_date="2026-09-01",
                    due_date="2026-09-28",
                    item_id=item.id,
                    contact_id=contact.id,
                    category_id=cat.id,
                    essentiality="OBRIGATORIO",
                    status="PENDENTE",
                    installments_count=1,
                    is_recurring=False,
                ),
            )

            # Teste Visão Anual 2026
            annual_metrics = await dashboard_service.get_dashboard_metrics(session, user_id, year=2026)
            assert annual_metrics.view_mode == "annual"
            assert len(annual_metrics.monthly_breakdown) == 12
            # Atraso cumulativo histórico deve incluir a conta de 2025!
            assert annual_metrics.total_overdue_cents >= 5500
            overdue_ids = [p.payment_id for p in annual_metrics.overdue_payments]
            assert overdue_exp.payments[0].id in overdue_ids

            # Teste Visão Mensal (2026-09)
            monthly_metrics = await dashboard_service.get_dashboard_metrics(session, user_id, month="2026-09")
            assert monthly_metrics.view_mode == "monthly"
            assert monthly_metrics.month == "2026-09"
            assert len(monthly_metrics.daily_breakdown) == 30  # Setembro tem 30 dias
            # Dia 28 deve conter os 9900
            day_28 = next((d for d in monthly_metrics.daily_breakdown if d.day == 28), None)
            assert day_28 is not None
            assert day_28.total_cents == 9900

            # Teste Filtro is_overdue na listagem de despesas
            overdue_list, count = await expense_service.list_expenses(
                session, user_id, ExpenseFilter(is_overdue=True)
            )
            assert count >= 1
            overdue_exp_ids = [e.id for e in overdue_list]
            assert overdue_exp.id in overdue_exp_ids
            assert exp_sep.id not in overdue_exp_ids  # exp_sep vence em 2026-09-12 (não atrasado se today <= 2026-09-12)

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
