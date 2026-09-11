import uuid
from datetime import datetime, timezone
import pytest
from fastapi import HTTPException
from httpx import ASGITransport, AsyncClient

from app.database import AsyncSessionLocal, engine
from app.main import app
from app.models.user import User
from app.models.category import Category
from app.models.item import Item
from app.models.contact import Contact
from app.models.expense import Expense
from app.models.payment import Payment
from app.schemas.expense import ExpenseCreate
from app.schemas.item import ItemCreate
from app.schemas.contact import ContactCreate
from app.schemas.payment import PaymentUpdate, PaymentStatusUpdate
from app.services import expense_service, item_service, contact_service, category_service, payment_service
from app.core.security import create_access_token


@pytest.mark.asyncio
async def test_update_single_installment_service():
    """Valida a alteração do valor de uma única parcela específica sem alterar as demais, e verifica sincronização da despesa mãe."""
    async with AsyncSessionLocal() as session:
        unique_suffix = uuid.uuid4().hex[:8]
        temp_user = User(
            username=f"test_pay_usr_{unique_suffix}",
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
                ContactCreate(name=f"Escola {unique_suffix}"),
            )

            # Cria despesa parcelada em 3x de R$ 100,00 (Total = 30000 centavos)
            expense = await expense_service.create_expense(
                session,
                user_id,
                ExpenseCreate(
                    description=f"Curso de Programação {unique_suffix}",
                    total_amount_cents=30000,
                    issue_date="2026-09-01",
                    due_date="2026-09-10",
                    item_id=item.id,
                    contact_id=contact.id,
                    category_id=cat.id,
                    installments_count=3,
                ),
            )

            assert expense.total_amount_cents == 30000
            assert len(expense.payments) == 3
            sorted_payments = sorted(expense.payments, key=lambda p: p.installment_number)
            p1, p2, p3 = sorted_payments[0], sorted_payments[1], sorted_payments[2]

            assert p1.amount_cents == 10000
            assert p2.amount_cents == 10000
            assert p3.amount_cents == 10000

            # 1. Altera APENAS a parcela 2 para R$ 125,50 (12550 centavos)
            updated_p2 = await payment_service.update_payment(
                session,
                user_id,
                p2.id,
                PaymentUpdate(amount_cents=12550),
            )
            assert updated_p2.id == p2.id
            assert updated_p2.amount_cents == 12550

            # 2. Verifica se a parcela 1 e 3 continuam inalteradas
            refreshed_expense = await expense_service.get_expense(session, user_id, expense.id)
            r_payments = sorted(refreshed_expense.payments, key=lambda p: p.installment_number)
            assert r_payments[0].amount_cents == 10000
            assert r_payments[1].amount_cents == 12550
            assert r_payments[2].amount_cents == 10000

            # 3. A despesa mãe deve ter seu total_amount_cents sincronizado com a soma (10000 + 12550 + 10000 = 32550)
            assert refreshed_expense.total_amount_cents == 32550

            # 4. Paga a parcela 1 e testa editar parcela paga
            await payment_service.update_payment_status(
                session,
                user_id,
                p1.id,
                PaymentStatusUpdate(status="CONCLUIDO"),
            )
            updated_p1 = await payment_service.update_payment(
                session,
                user_id,
                p1.id,
                PaymentUpdate(amount_cents=11000),
            )
            assert updated_p1.amount_cents == 11000
            assert updated_p1.status == "CONCLUIDO"

            refreshed_expense2 = await expense_service.get_expense(session, user_id, expense.id)
            assert refreshed_expense2.total_amount_cents == 11000 + 12550 + 10000  # 33550

            # 5. Validação de erro: payload vazio dispara 400
            with pytest.raises(HTTPException) as exc_info:
                await payment_service.update_payment(session, user_id, p1.id, PaymentUpdate())
            assert exc_info.value.status_code == 400

            # 6. Parcela inexistente ou de outro usuário dispara 404
            with pytest.raises(HTTPException) as exc_info404:
                await payment_service.update_payment(session, "outro_usuario_id", p1.id, PaymentUpdate(amount_cents=9999))
            assert exc_info404.value.status_code == 404

        finally:
            await session.rollback()
            # Política do Resíduo Zero
            await session.execute(Payment.__table__.delete().where(Payment.user_id == user_id))
            await session.execute(Expense.__table__.delete().where(Expense.user_id == user_id))
            await session.execute(Item.__table__.delete().where(Item.user_id == user_id))
            await session.execute(Category.__table__.delete().where(Category.user_id == user_id))
            await session.execute(Contact.__table__.delete().where(Contact.user_id == user_id))
            await session.execute(User.__table__.delete().where(User.id == user_id))
            await session.commit()
            await engine.dispose()


@pytest.mark.asyncio
async def test_update_payment_api_endpoint():
    """Valida o endpoint HTTP PATCH /api/v1/payments/{payment_id}."""
    async with AsyncSessionLocal() as session:
        unique_suffix = uuid.uuid4().hex[:8]
        user = User(
            username=f"api_usr_{unique_suffix}",
            hashed_password="hashed_pwd_test",
            is_admin=False,
            is_active=True,
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)
        user_id = user.id

        token = create_access_token(data={"sub": user.username})

        try:
            cats = await category_service.list_categories(session, user_id)
            cat = cats[0]

            item = await item_service.create_item(
                session,
                user_id,
                ItemCreate(name=f"Smartphone {unique_suffix}", category_id=cat.id, nature="DESEJO"),
            )

            contact = await contact_service.create_contact(
                session,
                user_id,
                ContactCreate(name=f"Loja Tech {unique_suffix}"),
            )

            expense = await expense_service.create_expense(
                session,
                user_id,
                ExpenseCreate(
                    description=f"Celular {unique_suffix}",
                    total_amount_cents=20000,
                    issue_date="2026-09-01",
                    due_date="2026-09-15",
                    item_id=item.id,
                    contact_id=contact.id,
                    category_id=cat.id,
                    installments_count=2,
                ),
            )

            payment_id = expense.payments[0].id

            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as client:
                # 1. GET parcela
                get_res = await client.get(
                    f"/api/v1/payments/{payment_id}",
                    headers={"Authorization": f"Bearer {token}"},
                )
                assert get_res.status_code == 200
                data = get_res.json()
                assert data["id"] == payment_id
                assert data["amount_cents"] == 10000

                # 2. PATCH valor da parcela para 13500
                patch_res = await client.patch(
                    f"/api/v1/payments/{payment_id}",
                    headers={"Authorization": f"Bearer {token}"},
                    json={"amount_cents": 13500},
                )
                assert patch_res.status_code == 200
                patch_data = patch_res.json()
                assert patch_data["amount_cents"] == 13500

                # 3. Verifica se a despesa mãe agora reflete o novo total
                exp_res = await client.get(
                    f"/api/v1/expenses/{expense.id}",
                    headers={"Authorization": f"Bearer {token}"},
                )
                assert exp_res.status_code == 200
                exp_data = exp_res.json()
                assert exp_data["total_amount_cents"] == 23500  # 13500 + 10000

                # 4. Validar valor inválido <= 0
                bad_res = await client.patch(
                    f"/api/v1/payments/{payment_id}",
                    headers={"Authorization": f"Bearer {token}"},
                    json={"amount_cents": 0},
                )
                assert bad_res.status_code == 422

        finally:
            await session.rollback()
            # Política do Resíduo Zero
            await session.execute(Payment.__table__.delete().where(Payment.user_id == user_id))
            await session.execute(Expense.__table__.delete().where(Expense.user_id == user_id))
            await session.execute(Item.__table__.delete().where(Item.user_id == user_id))
            await session.execute(Category.__table__.delete().where(Category.user_id == user_id))
            await session.execute(Contact.__table__.delete().where(Contact.user_id == user_id))
            await session.execute(User.__table__.delete().where(User.id == user_id))
            await session.commit()
            await engine.dispose()
