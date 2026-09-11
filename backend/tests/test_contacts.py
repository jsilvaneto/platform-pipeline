import uuid
import pytest
from fastapi import HTTPException
from app.database import AsyncSessionLocal, engine
from app.models.user import User
from app.models.category import Category
from app.models.item import Item
from app.models.contact import Contact
from app.models.expense import Expense
from app.models.payment import Payment
from app.schemas.contact import ContactCreate, ContactUpdate
from app.schemas.item import ItemCreate
from app.schemas.expense import ExpenseCreate
from app.services import contact_service, item_service, category_service, expense_service


@pytest.mark.asyncio
async def test_contact_auto_seeding_and_crud():
    """Valida auto-seeding do contato padrão 'Pessoal', criação, edição, filtros e busca."""
    async with AsyncSessionLocal() as session:
        unique_suffix = uuid.uuid4().hex[:8]
        temp_user = User(
            username=f"test_contact_user_{unique_suffix}",
            hashed_password="hashed_pwd_test",
            is_admin=False,
            is_active=True,
        )
        session.add(temp_user)
        await session.commit()
        await session.refresh(temp_user)
        user_id = temp_user.id

        try:
            # 1. Listagem inicial dispara criação automática do contato "Pessoal"
            initial_contacts = await contact_service.list_contacts(session, user_id)
            assert len(initial_contacts) == 1
            default_contact = initial_contacts[0]
            assert default_contact.name == "Pessoal"
            assert default_contact.is_active is True

            # 2. Criação de novo contato
            new_contact_data = ContactCreate(
                name="Dentista Dr. Silva",
                email="contato@drsilva.com.br",
                phone="(11) 98765-4321",
                notes="Consultório perto de casa",
                is_active=True,
            )
            created_contact = await contact_service.create_contact(
                session, user_id, new_contact_data
            )
            assert created_contact.id is not None
            assert created_contact.name == "Dentista Dr. Silva"
            assert created_contact.email == "contato@drsilva.com.br"
            assert created_contact.phone == "(11) 98765-4321"

            # 3. Busca por texto (search)
            search_results = await contact_service.list_contacts(
                session, user_id, search="Silva"
            )
            assert len(search_results) == 1
            assert search_results[0].id == created_contact.id

            # 4. Atualização de contato
            update_data = ContactUpdate(
                name="Dentista Dr. Silva Jr.",
                is_active=False,
            )
            updated_contact = await contact_service.update_contact(
                session, user_id, created_contact.id, update_data
            )
            assert updated_contact.name == "Dentista Dr. Silva Jr."
            assert updated_contact.is_active is False

            # 5. Filtro active_only
            active_contacts = await contact_service.list_contacts(
                session, user_id, active_only=True
            )
            assert len(active_contacts) == 1
            assert active_contacts[0].name == "Pessoal"

            # 6. Exclusão de contato sem lançamentos vinculados
            await contact_service.delete_contact(session, user_id, created_contact.id)
            with pytest.raises(HTTPException) as exc_get:
                await contact_service.get_contact(session, user_id, created_contact.id)
            assert exc_get.value.status_code == 404

        finally:
            await session.rollback()
            # LIMPEZA RIGOROSA DE RESÍDUO ZERO (test_data_cleanup.md)
            await session.execute(Payment.__table__.delete().where(Payment.user_id == user_id))
            await session.execute(Expense.__table__.delete().where(Expense.user_id == user_id))
            await session.execute(Item.__table__.delete().where(Item.user_id == user_id))
            await session.execute(Category.__table__.delete().where(Category.user_id == user_id))
            await session.execute(Contact.__table__.delete().where(Contact.user_id == user_id))
            await session.execute(User.__table__.delete().where(User.id == user_id))
            await session.commit()
            await engine.dispose()


@pytest.mark.asyncio
async def test_contact_linked_expense_conflict_and_summary():
    """Valida bloqueio de exclusão em contatos com despesas e cálculo do resumo com pagamentos planejados."""
    async with AsyncSessionLocal() as session:
        unique_suffix = uuid.uuid4().hex[:8]
        temp_user = User(
            username=f"test_contact_exp_{unique_suffix}",
            hashed_password="hashed_pwd_test",
            is_admin=False,
            is_active=True,
        )
        session.add(temp_user)
        await session.commit()
        await session.refresh(temp_user)
        user_id = temp_user.id

        try:
            # Garante categorias padrão e cria um item
            cats = await category_service.list_categories(session, user_id)
            first_cat = cats[0]

            item = await item_service.create_item(
                session,
                user_id,
                ItemCreate(
                    name="Consulta Médica",
                    category_id=first_cat.id,
                    nature="NECESSARIO",
                ),
            )

            # Cria contato
            contact = await contact_service.create_contact(
                session,
                user_id,
                ContactCreate(
                    name="Clínica Saúde Total",
                    notes="Atendimento com especialista",
                ),
            )

            # Cria despesa parcelada em 2 vezes associada ao contato
            expense_data = ExpenseCreate(
                description="Tratamento Odontológico",
                total_amount_cents=20000,  # R$ 200,00 -> 2 parcelas de R$ 100,00
                issue_date="2026-09-10",
                due_date="2026-09-15",
                item_id=item.id,
                contact_id=contact.id,
                installments_count=2,
            )
            expense = await expense_service.create_expense(session, user_id, expense_data)
            assert expense.contact_id == contact.id
            assert len(expense.payments) == 2

            # Atualiza a primeira parcela para CONCLUIDO
            p1 = expense.payments[0]
            p1.status = "CONCLUIDO"
            p1.paid_at = "2026-09-10T12:00:00Z"
            await session.commit()

            # Obtém resumo do contato
            summary = await contact_service.get_contact_summary(session, user_id, contact.id)
            assert summary.contact.id == contact.id
            assert summary.total_expenses_cents == 20000
            assert summary.total_paid_cents == 10000
            assert summary.total_pending_cents == 10000
            assert summary.expenses_count == 1
            assert len(summary.planned_payments) == 1  # Apenas a parcela pendente
            assert summary.planned_payments[0].amount_cents == 10000
            assert summary.planned_payments[0].item_name == "Consulta Médica"
            assert summary.planned_payments[0].category_name == first_cat.name
            assert summary.planned_payments[0].installment_number == 2

            # Tentativa de deletar contato com despesa vinculada deve falhar com 409
            with pytest.raises(HTTPException) as exc_info:
                await contact_service.delete_contact(session, user_id, contact.id)
            assert exc_info.value.status_code == 409

            # Remove a despesa
            await expense_service.delete_expense(session, user_id, expense.id)

            # Agora a exclusão do contato é permitida
            await contact_service.delete_contact(session, user_id, contact.id)
            with pytest.raises(HTTPException) as exc_get:
                await contact_service.get_contact(session, user_id, contact.id)
            assert exc_get.value.status_code == 404

        finally:
            await session.rollback()
            # LIMPEZA RIGOROSA DE RESÍDUO ZERO (test_data_cleanup.md)
            await session.execute(Payment.__table__.delete().where(Payment.user_id == user_id))
            await session.execute(Expense.__table__.delete().where(Expense.user_id == user_id))
            await session.execute(Item.__table__.delete().where(Item.user_id == user_id))
            await session.execute(Category.__table__.delete().where(Category.user_id == user_id))
            await session.execute(Contact.__table__.delete().where(Contact.user_id == user_id))
            await session.execute(User.__table__.delete().where(User.id == user_id))
            await session.commit()
            await engine.dispose()
