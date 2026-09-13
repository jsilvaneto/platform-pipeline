import uuid
import pytest
from datetime import date
from sqlalchemy import select
from sqlalchemy.orm import selectinload

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
from app.services import expense_service, item_service, contact_service, category_service, payment_service
from app.schemas.payment import PaymentStatusUpdate


@pytest.mark.asyncio
async def test_recurring_expense_current_year_and_rollover():
    """
    Testa:
    1. Criação de despesa fixa mensal no ano civil atual (ex: Setembro gera 4 meses até Dezembro).
    2. Virada de ano automática via ensure_recurring_horizon gerando os 12 meses do novo ano.
    3. Idempotência (não duplica meses já existentes).
    4. Preservação de status PENDENTE ao quitar parcelas do ano atual.
    """
    async with AsyncSessionLocal() as session:
        unique_suffix = uuid.uuid4().hex[:8]
        temp_user = User(
            username=f"test_rec_{unique_suffix}",
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
                ItemCreate(name=f"Aluguel {unique_suffix}", category_id=cat.id, nature="OBRIGATORIO"),
            )
            contact = await contact_service.create_contact(
                session,
                user_id,
                ContactCreate(name=f"Imobiliaria {unique_suffix}"),
            )

            # 1. Cria despesa fixa recorrente iniciando em 2026-09-10 (Setembro de 2026)
            rec_expense = await expense_service.create_expense(
                session,
                user_id,
                ExpenseCreate(
                    description=f"Aluguel Residencial {unique_suffix}",
                    total_amount_cents=150000,  # R$ 1.500,00/mês
                    issue_date="2026-09-01",
                    due_date="2026-09-10",
                    item_id=item.id,
                    contact_id=contact.id,
                    category_id=cat.id,
                    essentiality="OBRIGATORIO",
                    status="PENDENTE",
                    installments_count=1,
                    is_recurring=True,
                ),
            )

            # Para 2026 com início em Setembro, deve conter exatamente 4 meses: Set, Out, Nov, Dez
            assert len(rec_expense.payments) == 4
            due_months = [p.due_date[:7] for p in sorted(rec_expense.payments, key=lambda x: x.due_date)]
            assert due_months == ["2026-09", "2026-10", "2026-11", "2026-12"]

            # Cada parcela deve ter o valor mensal integral
            for p in rec_expense.payments:
                assert p.amount_cents == 150000
                assert p.status == "PENDENTE"

            # 2. Simula virada de ano / consulta ao ano de 2027
            await expense_service.ensure_recurring_horizon(session, user_id, target_year=2027)

            # Recarrega a despesa
            updated_exp = await expense_service.get_expense(session, user_id, rec_expense.id)

            # Deve ter gerado os 12 meses de 2027 (total: 4 de 2026 + 12 de 2027 = 16)
            assert len(updated_exp.payments) == 16
            updated_months = [p.due_date[:7] for p in sorted(updated_exp.payments, key=lambda x: x.due_date)]
            assert "2027-01" in updated_months
            assert "2027-12" in updated_months

            # 3. Teste de Idempotência: rodar novamente não deve duplicar nenhum mês
            await expense_service.ensure_recurring_horizon(session, user_id, target_year=2027)
            rechecked_exp = await expense_service.get_expense(session, user_id, rec_expense.id)
            assert len(rechecked_exp.payments) == 16

            # 4. Quitação das parcelas de 2026 não deve marcar a despesa contínua como CONCLUIDO
            p_2026 = [p for p in rechecked_exp.payments if p.due_date.startswith("2026-")]
            for p in p_2026:
                await payment_service.update_payment_status(
                    session, user_id, p.id, PaymentStatusUpdate(status="CONCLUIDO")
                )

            refreshed_exp = await expense_service.get_expense(session, user_id, rec_expense.id)
            # A despesa mãe deve permanecer PENDENTE pois é contínua e possui pagamentos futuros em 2027
            assert refreshed_exp.status == "PENDENTE"

        finally:
            # Política de Resíduo Zero: Limpeza completa dos dados de teste
            # Deleta pagamentos, despesa, item, contato, categorias e usuário
            exp_res = await session.execute(select(Expense).where(Expense.user_id == user_id))
            exps = exp_res.scalars().all()
            for e in exps:
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
