import uuid
from datetime import datetime, timezone
import pytest
from fastapi import HTTPException
from sqlalchemy import select

from app.database import AsyncSessionLocal, engine
from app.models.user import User
from app.models.category import Category
from app.models.item import Item
from app.models.contact import Contact
from app.models.expense import Expense
from app.models.payment import Payment
from app.models.payment_method import PaymentMethod
from app.schemas.expense import ExpenseCreate, ExpenseUpdate
from app.schemas.item import ItemCreate
from app.schemas.contact import ContactCreate
from app.services import expense_service, item_service, contact_service, category_service


@pytest.mark.asyncio
async def test_expense_update_single_installment():
    """Valida edição de lançamento à vista (1 parcela), sincronização de datas, valor, status e troca de item/contato."""
    async with AsyncSessionLocal() as session:
        unique_suffix = uuid.uuid4().hex[:8]
        temp_user = User(
            username=f"test_update_user_{unique_suffix}",
            hashed_password="hashed_pwd_test",
            is_admin=False,
            is_active=True,
        )
        session.add(temp_user)
        await session.commit()
        await session.refresh(temp_user)
        user_id = temp_user.id

        try:
            # Categorias base
            cats = await category_service.list_categories(session, user_id)
            cat1 = cats[0]
            cat2 = cats[1]

            # Dois Itens com naturezas distintas
            item1 = await item_service.create_item(
                session,
                user_id,
                ItemCreate(name=f"Item A {unique_suffix}", category_id=cat1.id, nature="NECESSARIO"),
            )
            item2 = await item_service.create_item(
                session,
                user_id,
                ItemCreate(name=f"Item B {unique_suffix}", category_id=cat2.id, nature="DESEJO"),
            )

            # Dois Contatos
            contact1 = await contact_service.create_contact(
                session,
                user_id,
                ContactCreate(name=f"Contato 1 {unique_suffix}"),
            )
            contact2 = await contact_service.create_contact(
                session,
                user_id,
                ContactCreate(name=f"Contato 2 {unique_suffix}"),
            )

            # Criação do lançamento à vista
            expense = await expense_service.create_expense(
                session,
                user_id,
                ExpenseCreate(
                    description="Compra Inicial",
                    total_amount_cents=5000,
                    issue_date="2026-09-01",
                    due_date="2026-09-10",
                    item_id=item1.id,
                    contact_id=contact1.id,
                    installments_count=1,
                    is_recurring=False,
                    notes="Nota antiga",
                ),
            )
            assert expense.description == "Compra Inicial"
            assert expense.total_amount_cents == 5000
            assert expense.essentiality == "NECESSARIO"
            assert expense.item_id == item1.id
            assert expense.contact_id == contact1.id
            assert expense.category_id == cat1.id
            assert len(expense.payments) == 1
            assert expense.payments[0].amount_cents == 5000
            assert expense.payments[0].due_date == "2026-09-10"

            # 1. Edição simples: descrição, notas, data despesa e vencimento
            updated = await expense_service.update_expense(
                session,
                user_id,
                expense.id,
                ExpenseUpdate(
                    description="Compra Modificada",
                    notes="Nota atualizada",
                    issue_date="2026-09-02",
                    due_date="2026-09-15",
                ),
            )
            assert updated.description == "Compra Modificada"
            assert updated.notes == "Nota atualizada"
            assert updated.issue_date == "2026-09-02"
            assert updated.due_date == "2026-09-15"
            assert updated.payments[0].due_date == "2026-09-15"

            # 2. Edição de item: deve sincronizar categoria e essencialidade
            updated_item = await expense_service.update_expense(
                session,
                user_id,
                expense.id,
                ExpenseUpdate(item_id=item2.id),
            )
            assert updated_item.item_id == item2.id
            assert updated_item.category_id == cat2.id
            assert updated_item.essentiality == "DESEJO"

            # 3. Edição de contato
            updated_contact = await expense_service.update_expense(
                session,
                user_id,
                expense.id,
                ExpenseUpdate(contact_id=contact2.id),
            )
            assert updated_contact.contact_id == contact2.id

            # 4. Edição de valor à vista
            updated_amount = await expense_service.update_expense(
                session,
                user_id,
                expense.id,
                ExpenseUpdate(total_amount_cents=8500),
            )
            assert updated_amount.total_amount_cents == 8500
            assert updated_amount.payments[0].amount_cents == 8500

            # 5. Edição de status para CONCLUIDO
            updated_status = await expense_service.update_expense(
                session,
                user_id,
                expense.id,
                ExpenseUpdate(status="CONCLUIDO"),
            )
            assert updated_status.status == "CONCLUIDO"
            assert updated_status.payments[0].status == "CONCLUIDO"
            assert updated_status.payments[0].paid_at is not None

        finally:
            await session.rollback()
            # Resíduo zero
            await session.execute(Payment.__table__.delete().where(Payment.user_id == user_id))
            await session.execute(Expense.__table__.delete().where(Expense.user_id == user_id))
            await session.execute(Item.__table__.delete().where(Item.user_id == user_id))
            await session.execute(Category.__table__.delete().where(Category.user_id == user_id))
            await session.execute(Contact.__table__.delete().where(Contact.user_id == user_id))
            await session.execute(User.__table__.delete().where(User.id == user_id))
            await session.commit()
            await engine.dispose()


@pytest.mark.asyncio
async def test_expense_update_multi_installments():
    """Valida edição de lançamento parcelado: recálculo de parcelas pendentes e bloqueio de valor quando já há parcelas pagas."""
    async with AsyncSessionLocal() as session:
        unique_suffix = uuid.uuid4().hex[:8]
        temp_user = User(
            username=f"test_update_multi_{unique_suffix}",
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
                ItemCreate(name=f"Curso Online {unique_suffix}", category_id=cat.id, nature="NECESSARIO"),
            )
            contact = await contact_service.create_contact(
                session,
                user_id,
                ContactCreate(name=f"Escola Tech {unique_suffix}"),
            )

            # Lançamento em 3 parcelas de R$ 100,00 cada (total R$ 300,00 = 30000 centavos)
            expense = await expense_service.create_expense(
                session,
                user_id,
                ExpenseCreate(
                    description="Assinatura Anual",
                    total_amount_cents=30000,
                    issue_date="2026-09-01",
                    due_date="2026-09-10",
                    item_id=item.id,
                    contact_id=contact.id,
                    installments_count=3,
                ),
            )
            assert len(expense.payments) == 3
            for p in expense.payments:
                assert p.amount_cents == 10000

            # 1. Altera valor total com todas as parcelas pendentes: 10000 centavos em 3x (3334, 3333, 3333)
            updated = await expense_service.update_expense(
                session,
                user_id,
                expense.id,
                ExpenseUpdate(total_amount_cents=10000),
            )
            assert updated.total_amount_cents == 10000
            payments_sorted = sorted(updated.payments, key=lambda x: x.installment_number)
            assert payments_sorted[0].amount_cents == 3334
            assert payments_sorted[1].amount_cents == 3333
            assert payments_sorted[2].amount_cents == 3333
            assert sum(p.amount_cents for p in payments_sorted) == 10000

            # 2. Altera data de vencimento inicial: parcelas mensais devem ser recalculadas
            updated_dates = await expense_service.update_expense(
                session,
                user_id,
                expense.id,
                ExpenseUpdate(due_date="2026-10-15"),
            )
            p_dates = sorted(updated_dates.payments, key=lambda x: x.installment_number)
            assert p_dates[0].due_date == "2026-10-15"
            assert p_dates[1].due_date == "2026-11-15"
            assert p_dates[2].due_date == "2026-12-15"

            # 3. Paga a primeira parcela
            p_dates[0].status = "CONCLUIDO"
            p_dates[0].paid_at = datetime.now(timezone.utc).isoformat()
            await session.commit()

            # 4. Tentar alterar o valor total agora deve disparar HTTP 400
            with pytest.raises(HTTPException) as exc_info:
                await expense_service.update_expense(
                    session,
                    user_id,
                    expense.id,
                    ExpenseUpdate(total_amount_cents=15000),
                )
            assert exc_info.value.status_code == 400
            assert "já possui parcelas pagas" in exc_info.value.detail

            # 5. Alterar outros campos (descrição, observações) ainda é permitido mesmo com parcela paga
            updated_meta = await expense_service.update_expense(
                session,
                user_id,
                expense.id,
                ExpenseUpdate(description="Assinatura Renegociada", notes="Parcela 1 paga"),
            )
            assert updated_meta.description == "Assinatura Renegociada"
            assert updated_meta.notes == "Parcela 1 paga"

        finally:
            await session.rollback()
            # Resíduo zero
            await session.execute(Payment.__table__.delete().where(Payment.user_id == user_id))
            await session.execute(Expense.__table__.delete().where(Expense.user_id == user_id))
            await session.execute(Item.__table__.delete().where(Item.user_id == user_id))
            await session.execute(Category.__table__.delete().where(Category.user_id == user_id))
            await session.execute(Contact.__table__.delete().where(Contact.user_id == user_id))
            await session.execute(User.__table__.delete().where(User.id == user_id))
            await session.commit()
            await engine.dispose()
