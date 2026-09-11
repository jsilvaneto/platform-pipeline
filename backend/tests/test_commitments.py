import uuid
import pytest
from httpx import ASGITransport, AsyncClient

from app.database import AsyncSessionLocal, engine
from app.main import app
from app.models.user import User
from app.models.expense import Expense
from app.models.payment import Payment
from app.models.item import Item
from app.models.category import Category
from app.models.contact import Contact
from app.schemas.expense import ExpenseCreate
from app.schemas.item import ItemCreate
from app.schemas.contact import ContactCreate
from app.services import expense_service, item_service, contact_service, category_service
from app.core.security import create_access_token


@pytest.mark.asyncio
async def test_recurring_expense_12_months_and_commitments_summary():
    """Valida a projeção de 12 meses para despesa recorrente e consolidação no endpoint de compromissos."""
    async with AsyncSessionLocal() as session:
        unique_suffix = uuid.uuid4().hex[:8]
        temp_user = User(
            username=f"test_comm_{unique_suffix}",
            hashed_password="hashed_pwd_test",
            is_admin=False,
            is_active=True,
        )
        session.add(temp_user)
        await session.commit()
        await session.refresh(temp_user)
        user_id = temp_user.id

        token = create_access_token(data={"sub": temp_user.username})
        headers = {"Authorization": f"Bearer {token}"}

        try:
            cats = await category_service.list_categories(session, user_id)
            cat = cats[0]

            item = await item_service.create_item(
                session,
                user_id,
                ItemCreate(name=f"Internet Fibra {unique_suffix}", category_id=cat.id, nature="NECESSARIO"),
            )
            contact = await contact_service.create_contact(
                session,
                user_id,
                ContactCreate(name=f"Operadora {unique_suffix}"),
            )

            # 1. Cria despesa recorrente de R$ 120,00/mês
            rec_expense = await expense_service.create_expense(
                session,
                user_id,
                ExpenseCreate(
                    description=f"Plano de Internet {unique_suffix}",
                    total_amount_cents=12000,
                    issue_date="2026-09-01",
                    due_date="2026-09-10",
                    item_id=item.id,
                    contact_id=contact.id,
                    category_id=cat.id,
                    essentiality="NECESSARIO",
                    status="PENDENTE",
                    installments_count=1,
                    is_recurring=True,
                ),
            )

            # Deve gerar exatamente 12 pagamentos, cada um de R$ 120,00
            assert len(rec_expense.payments) == 12
            for p in rec_expense.payments:
                assert p.amount_cents == 12000
                assert p.status == "PENDENTE"

            # 2. Cria compra parcelada em 4x de R$ 250,00 (Total = R$ 1.000,00)
            item_pc = await item_service.create_item(
                session,
                user_id,
                ItemCreate(name=f"Monitor {unique_suffix}", category_id=cat.id, nature="DESEJO"),
            )
            inst_expense = await expense_service.create_expense(
                session,
                user_id,
                ExpenseCreate(
                    description=f"Monitor Gamer {unique_suffix}",
                    total_amount_cents=100000,
                    issue_date="2026-09-01",
                    due_date="2026-09-15",
                    item_id=item_pc.id,
                    contact_id=contact.id,
                    category_id=cat.id,
                    essentiality="DESEJO",
                    status="PENDENTE",
                    installments_count=4,
                    is_recurring=False,
                ),
            )
            assert len(inst_expense.payments) == 4
            assert sum(p.amount_cents for p in inst_expense.payments) == 100000

            # 3. Testa endpoint GET /api/v1/commitments/summary via HTTP
            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as client:
                res = await client.get("/api/v1/commitments/summary", headers=headers)
                assert res.status_code == 200
                data = res.json()

                # Custo fixo mensal deve ser R$ 120,00 (12000 cents)
                assert data["fixed_monthly_total_cents"] == 12000
                assert data["active_recurring_count"] == 1
                assert len(data["recurring_commitments"]) == 1
                assert data["recurring_commitments"][0]["amount_cents"] == 12000

                # Saldo devedor parcelado deve ser R$ 1.000,00 (100000 cents)
                assert data["total_installments_remaining_cents"] == 100000
                assert data["active_installments_count"] == 1
                assert len(data["installment_commitments"]) == 1
                assert data["installment_commitments"][0]["remaining_installments"] == 4

                # Próxima quitação identificada
                assert data["next_payoff"] is not None
                assert data["next_payoff"]["expense_id"] == inst_expense.id

                # Projeção de 12 meses deve estar calculada
                assert len(data["monthly_projection"]) == 12
                # O primeiro mês tem recorrência (12000) + parcela (25000) = 37000 cents
                assert data["monthly_projection"][0]["total_cents"] == 37000

                # 4. Testa alternar status da recorrência (Pausar)
                toggle_res = await client.patch(
                    f"/api/v1/commitments/{rec_expense.id}/toggle-status",
                    headers=headers
                )
                assert toggle_res.status_code == 200
                assert toggle_res.json()["status"] == "CANCELADO"

                # Ao consultar o summary novamente, o custo fixo ativo deve ser 0
                res2 = await client.get("/api/v1/commitments/summary", headers=headers)
                data2 = res2.json()
                assert data2["fixed_monthly_total_cents"] == 0
                assert data2["active_recurring_count"] == 0
                assert data2["recurring_commitments"][0]["status"] == "CANCELADO"

        finally:
            await session.rollback()
            await session.execute(Payment.__table__.delete().where(Payment.user_id == user_id))
            await session.execute(Expense.__table__.delete().where(Expense.user_id == user_id))
            await session.execute(Item.__table__.delete().where(Item.user_id == user_id))
            await session.execute(Category.__table__.delete().where(Category.user_id == user_id))
            await session.execute(Contact.__table__.delete().where(Contact.user_id == user_id))
            await session.execute(User.__table__.delete().where(User.id == user_id))
            await session.commit()
            await engine.dispose()
