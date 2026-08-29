import asyncio
import sys
import os

sys.path.append(os.path.join(os.path.dirname(__file__), "..", "backend"))

from app.database import AsyncSessionLocal, engine, Base
from app.models import Account, Category, Transaction, PaymentMethod, Contact
from app.main import migrate_database_schema, seed_initial_data
from sqlalchemy import select, delete

async def run_tests():
    print("Iniciando validação de Ações em Lote (Batch Actions)...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    await migrate_database_schema()
    await seed_initial_data()

    async with AsyncSessionLocal() as db:
        # 1. Dependências de teste
        acc = Account(profile="PESSOAL", name="Conta Batch Teste", type="CORRENTE")
        pm = PaymentMethod(profile="PESSOAL", name="Pix Batch Teste")
        contact = Contact(profile="PESSOAL", name="Contato Batch Teste", type="FORNECEDOR")
        cats = (await db.execute(select(Category).where(Category.profile == "PESSOAL", Category.type == "DESPESA"))).scalars().all()
        cat1 = cats[0]
        cat2 = cats[1]
        
        db.add_all([acc, pm, contact])
        await db.commit()
        await db.refresh(acc)
        await db.refresh(pm)
        await db.refresh(contact)

        # 2. Cria 4 transações de teste
        t1 = Transaction(profile="PESSOAL", type="DESPESA", category_id=cat1.id, description="Batch Item 1", amount_cents=1000, due_date="2026-08-20", status="PENDENTE")
        t2 = Transaction(profile="PESSOAL", type="DESPESA", category_id=cat1.id, description="Batch Item 2", amount_cents=2000, due_date="2026-08-21", status="PENDENTE")
        t3 = Transaction(profile="PESSOAL", type="DESPESA", category_id=cat1.id, description="Batch Item 3", amount_cents=3000, due_date="2026-08-22", status="PENDENTE")
        t4 = Transaction(profile="PESSOAL", type="DESPESA", category_id=cat1.id, description="Batch Item 4", amount_cents=4000, due_date="2026-08-23", status="PENDENTE")
        
        db.add_all([t1, t2, t3, t4])
        await db.commit()
        for t in [t1, t2, t3, t4]:
            await db.refresh(t)

        test_ids = [t1.id, t2.id, t3.id, t4.id]
        print(f"✓ {len(test_ids)} transações de teste criadas com status PENDENTE e categoria {cat1.name}.")

        # 3. Teste Batch Complete (Liquidar t1, t2, t3)
        from app.schemas.transaction import TransactionBatchComplete, TransactionBatchUpdate, TransactionBatchAction
        from app.api.v1.transactions import batch_complete_transactions, batch_update_transactions, batch_uncomplete_transactions, batch_delete_transactions
        from app.models import User

        fake_user = User(id="fake-id", username="test")

        res_complete = await batch_complete_transactions(
            payload=TransactionBatchComplete(transaction_ids=[t1.id, t2.id, t3.id], payment_date="2026-08-20"),
            db=db,
            _=fake_user
        )
        print(f"✓ batch_complete: {res_complete.message}")
        assert res_complete.affected_count == 3

        # Verifica no banco
        q_comp = select(Transaction).where(Transaction.id.in_([t1.id, t2.id, t3.id]))
        items_comp = (await db.execute(q_comp)).scalars().all()
        for item in items_comp:
            assert item.status == "CONCLUIDO"
            assert item.payment_date == "2026-08-20"

        # 4. Teste Batch Update (Mudar Categoria, Conta, Meio de Pagto, Contato e Data de Vencimento para todos os 4)
        res_update = await batch_update_transactions(
            payload=TransactionBatchUpdate(
                transaction_ids=test_ids,
                category_id=cat2.id,
                account_id=acc.id,
                payment_method_id=pm.id,
                contact_id=contact.id,
                due_date="2026-08-30"
            ),
            db=db,
            _=fake_user
        )
        print(f"✓ batch_update: {res_update.message}")
        assert res_update.affected_count == 4

        # Verifica atualizações
        q_all = select(Transaction).where(Transaction.id.in_(test_ids))
        items_up = (await db.execute(q_all)).scalars().all()
        for item in items_up:
            assert item.category_id == cat2.id
            assert item.account_id == acc.id
            assert item.payment_method_id == pm.id
            assert item.contact_id == contact.id
            assert item.due_date == "2026-08-30"
        print(f"✓ Campos Categoria, Conta, Meio de Pagamento, Contato e Vencimento atualizados em lote!")

        # 5. Teste Batch Uncomplete (Reabrir t1, t2, t3)
        res_uncomp = await batch_uncomplete_transactions(
            payload=TransactionBatchAction(transaction_ids=[t1.id, t2.id, t3.id]),
            db=db,
            _=fake_user
        )
        print(f"✓ batch_uncomplete: {res_uncomp.message}")
        assert res_uncomp.affected_count == 3
        
        q_uncomp = select(Transaction).where(Transaction.id.in_([t1.id, t2.id, t3.id]))
        items_uncomp = (await db.execute(q_uncomp)).scalars().all()
        for item in items_uncomp:
            assert item.status == "PENDENTE"
            assert item.payment_date is None

        # 6. Teste Batch Delete (Excluir todos os 4)
        res_del = await batch_delete_transactions(
            payload=TransactionBatchAction(transaction_ids=test_ids),
            db=db,
            _=fake_user
        )
        print(f"✓ batch_delete: {res_del.message}")
        assert res_del.affected_count == 4

        # Verifica se foram excluídos
        q_after = select(Transaction).where(Transaction.id.in_(test_ids))
        assert len((await db.execute(q_after)).scalars().all()) == 0
        print("✓ Todos os lançamentos de teste foram excluídos com sucesso.")

        # Limpeza das dependências
        await db.delete(acc)
        await db.delete(pm)
        await db.delete(contact)
        await db.commit()
        print("✓ Limpeza concluída.")

    print("\n✓ TODOS OS TESTES BACKEND DE AÇÕES EM LOTE PASSARAM COM SUCESSO!")

if __name__ == "__main__":
    asyncio.run(run_tests())
