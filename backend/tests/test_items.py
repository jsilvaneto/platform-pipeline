import uuid
import pytest
from app.database import AsyncSessionLocal
from app.models.user import User
from app.models.category import Category
from app.models.item import Item
from app.models.expense import Expense
from app.schemas.item import ItemCreate, ItemUpdate
from app.schemas.expense import ExpenseCreate
from app.services import item_service, expense_service, category_service
from fastapi import HTTPException

@pytest.mark.asyncio
async def test_item_crud_and_expense_association_with_zero_residue():
    """Testa ciclo de vida de itens, herança na despesa e proteção contra exclusão."""
    async with AsyncSessionLocal() as session:
        unique_suffix = uuid.uuid4().hex[:8]
        temp_user = User(
            username=f"test_item_user_{unique_suffix}",
            hashed_password="hashed_pwd_test",
            is_admin=False,
            is_active=True,
        )
        session.add(temp_user)
        await session.commit()
        await session.refresh(temp_user)
        user_id = temp_user.id

        try:
            # 1. Teste de listagem inicial dispara criação de categorias e itens padrão
            initial_items = await item_service.list_items(session, user_id)
            assert len(initial_items) > 0

            # 2. Busca uma categoria criada automaticamente
            cats = await category_service.list_categories(session, user_id)
            assert len(cats) > 0
            first_cat = cats[0]

            # 3. Criação de item customizado
            new_item_data = ItemCreate(
                name="Item Personalizado Teste",
                category_id=first_cat.id,
                nature="DESEJO",
                is_active=True,
            )
            created_item = await item_service.create_item(session, user_id, new_item_data)
            assert created_item.id is not None
            assert created_item.name == "Item Personalizado Teste"
            assert created_item.nature == "DESEJO"
            assert created_item.category_id == first_cat.id

            # 4. Atualização de item
            update_data = ItemUpdate(
                name="Item Personalizado Atualizado",
                nature="OBRIGATORIO",
            )
            updated_item = await item_service.update_item(session, user_id, created_item.id, update_data)
            assert updated_item.name == "Item Personalizado Atualizado"
            assert updated_item.nature == "OBRIGATORIO"

            # 5. Cria despesa atrelada a este item e valida herança
            expense_data = ExpenseCreate(
                description="Despesa com Item",
                total_amount_cents=15000,
                issue_date="2026-09-10",
                due_date="2026-09-10",
                item_id=created_item.id,
                # Não informa category_id nem essentiality para testar a herança automática
            )
            created_expense = await expense_service.create_expense(session, user_id, expense_data)
            assert created_expense.item_id == created_item.id
            assert created_expense.category_id == first_cat.id
            assert created_expense.essentiality == "OBRIGATORIO"

            # 6. Tentativa de exclusão do item com despesa vinculada deve levantar HTTP 409 Conflict
            with pytest.raises(HTTPException) as exc_info:
                await item_service.delete_item(session, user_id, created_item.id)
            assert exc_info.value.status_code == 409

            # 7. Exclusão da despesa para permitir exclusão limpa do item
            await expense_service.delete_expense(session, user_id, created_expense.id)

            # 8. Exclusão do item com sucesso
            await item_service.delete_item(session, user_id, created_item.id)
            with pytest.raises(HTTPException) as exc_get:
                await item_service.get_item(session, user_id, created_item.id)
            assert exc_get.value.status_code == 404

        finally:
            await session.rollback()
            # LIMPEZA RIGOROSA DE RESÍDUO ZERO (test_data_cleanup.md)
            from app.models.payment import Payment
            await session.execute(Payment.__table__.delete().where(Payment.user_id == user_id))
            await session.execute(Expense.__table__.delete().where(Expense.user_id == user_id))
            await session.execute(Item.__table__.delete().where(Item.user_id == user_id))
            await session.execute(Category.__table__.delete().where(Category.user_id == user_id))
            await session.execute(User.__table__.delete().where(User.id == user_id))
            await session.commit()
