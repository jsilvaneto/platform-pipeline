import asyncio
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../backend")))

from app.database import engine, Base, AsyncSessionLocal
from app.models import User, PaymentMethod, Category, Account, Transaction
from app.main import migrate_database_schema, seed_initial_data
from app.schemas.payment_method import PaymentMethodCreate, PaymentMethodUpdate
from app.schemas.transaction import TransactionCreate
from app.api.v1.payment_methods import list_payment_methods, create_payment_method, update_payment_method, delete_payment_method
from app.api.v1.transactions import list_transactions, create_transaction, delete_transaction
from sqlalchemy import select

async def run_tests():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    await migrate_database_schema()
    await seed_initial_data()

    async with AsyncSessionLocal() as db:
        # Mock admin user
        user = (await db.execute(select(User).where(User.username == "admin"))).scalar_one()

        # 1. List Payment Methods for PESSOAL
        pms = await list_payment_methods(profile="PESSOAL", db=db, _=user)
        print(f"✓ Formas de Pagamento cadastradas no PESSOAL ({len(pms)} itens): {[p.name for p in pms]}")
        assert len(pms) >= 7, "Deveriam existir ao menos 7 formas de pagamento padrão"

        # 2. Create Custom Payment Method
        pm_in = PaymentMethodCreate(profile="PESSOAL", name="Vale Alimentação Ticket")
        new_pm = await create_payment_method(pm_in=pm_in, db=db, _=user)
        print(f"✓ Criada forma de pagamento: {new_pm.name} (ID: {new_pm.id})")
        assert new_pm.name == "Vale Alimentação Ticket"

        # 3. Update Payment Method
        up_pm_in = PaymentMethodUpdate(name="Vale Alimentação Sodexo")
        updated_pm = await update_payment_method(pm_id=new_pm.id, pm_in=up_pm_in, db=db, _=user)
        print(f"✓ Atualizada forma de pagamento para: {updated_pm.name}")
        assert updated_pm.name == "Vale Alimentação Sodexo"

        # 4. Get category and account
        cat = (await db.execute(select(Category).where(Category.profile == "PESSOAL"))).scalars().first()
        acc = (await db.execute(select(Account).where(Account.profile == "PESSOAL"))).scalars().first()

        # 5. Create Transaction with payment_method_id
        t_in = TransactionCreate(
            profile="PESSOAL",
            type="DESPESA",
            category_id=cat.id,
            account_id=acc.id,
            payment_method_id=new_pm.id,
            description="Almoço Teste",
            amount_cents=3500,
            due_date="2026-08-20",
            status="PENDENTE"
        )
        trans_resp = await create_transaction(trans_in=t_in, db=db, _=user)
        print(f"✓ Transação criada com payment_method_id: {trans_resp.id} (pm_id: {trans_resp.payment_method_id})")
        assert trans_resp.payment_method_id == new_pm.id

        # 6. Filter transactions by payment_method_id
        filtered = await list_transactions(profile="PESSOAL", payment_method_id=new_pm.id, db=db, _=user)
        print(f"✓ Filtro de transações por payment_method_id retornou {len(filtered)} lançamento(s)")
        assert len(filtered) == 1
        assert filtered[0].id == trans_resp.id

        # 7. Delete payment method and verify transaction payment_method_id set to null
        await delete_payment_method(pm_id=new_pm.id, db=db, _=user)
        print("✓ Forma de pagamento excluída com sucesso")

        # Reload transaction
        trans_db = (await db.execute(select(Transaction).where(Transaction.id == trans_resp.id))).scalar_one()
        print(f"✓ Transação após exclusão da forma: payment_method_id = {trans_db.payment_method_id}")
        assert trans_db.payment_method_id is None

        # Clean up test transaction
        await delete_transaction(trans_id=trans_resp.id, db=db, _=user)
        print("✓ Transação de teste removida")

    print("\n✓ TODOS OS TESTES BACKEND DE FORMAS DE PAGAMENTO PASSARAM COM SUCESSO!")

if __name__ == "__main__":
    asyncio.run(run_tests())
