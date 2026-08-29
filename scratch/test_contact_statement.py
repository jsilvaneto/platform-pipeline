import asyncio
import sys
import os

sys.path.append(os.path.join(os.path.dirname(__file__), "..", "backend"))

from app.database import AsyncSessionLocal, engine, Base
from app.models import Contact, Category, Transaction, Debt
from app.main import migrate_database_schema, seed_initial_data
from app.services.contact_service import get_contact_statement
from sqlalchemy import select, delete

async def run_tests():
    print("Iniciando validação do Extrato de Contato (Conta-Corrente)...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    await migrate_database_schema()
    await seed_initial_data()

    async with AsyncSessionLocal() as db:
        # 1. Cria um contato de teste (Fornecedor)
        contact = Contact(
            profile="PESSOAL",
            name="Consultoria Tech Teste",
            type="FORNECEDOR",
            document="12.345.678/0001-90",
            notes="PIX: contato@consultoriatech.com"
        )
        db.add(contact)
        await db.commit()
        await db.refresh(contact)
        print(f"✓ Contato criado: {contact.name} ({contact.type})")

        # 2. Busca categorias de teste
        cat_desp = (await db.execute(select(Category).where(Category.profile == "PESSOAL", Category.type == "DESPESA"))).scalars().first()
        cat_rec = (await db.execute(select(Category).where(Category.profile == "PESSOAL", Category.type == "RECEITA"))).scalars().first()

        # 3. Cria transações para o contato:
        # - Despesa Concluída (Pago): R$ 500,00 (50000)
        # - Despesa Pendente (A Pagar): R$ 300,00 (30000)
        # - Receita Concluída (Recebido/Reembolso): R$ 100,00 (10000)
        # - Receita Pendente (A Receber): R$ 50,00 (5000)
        t1 = Transaction(
            profile="PESSOAL",
            type="DESPESA",
            category_id=cat_desp.id,
            contact_id=contact.id,
            description="Desenvolvimento Módulo 1",
            amount_cents=50000,
            due_date="2026-08-10",
            payment_date="2026-08-10",
            status="CONCLUIDO"
        )
        t2 = Transaction(
            profile="PESSOAL",
            type="DESPESA",
            category_id=cat_desp.id,
            contact_id=contact.id,
            description="Desenvolvimento Módulo 2",
            amount_cents=30000,
            due_date="2026-08-25",
            status="PENDENTE"
        )
        t3 = Transaction(
            profile="PESSOAL",
            type="RECEITA",
            category_id=cat_rec.id,
            contact_id=contact.id,
            description="Reembolso de Taxa",
            amount_cents=10000,
            due_date="2026-08-12",
            payment_date="2026-08-12",
            status="CONCLUIDO"
        )
        t4 = Transaction(
            profile="PESSOAL",
            type="RECEITA",
            category_id=cat_rec.id,
            contact_id=contact.id,
            description="Bônus Previsto",
            amount_cents=5000,
            due_date="2026-08-30",
            status="PENDENTE"
        )
        db.add_all([t1, t2, t3, t4])
        await db.commit()
        print("✓ 4 transações de teste vinculadas ao contato inseridas com sucesso.")

        # 4. Cria dívida/passivo vinculado ao contato
        debt = Debt(
            profile="PESSOAL",
            contact_id=contact.id,
            title="Contrato Anual de Suporte",
            total_amount_cents=120000, # R$ 1.200,00
            remaining_amount_cents=80000, # R$ 800,00
            status="ATIVA"
        )
        db.add(debt)
        await db.commit()
        await db.refresh(debt)
        print("✓ Dívida de teste vinculada ao contato criada com sucesso.")

        # 5. Executa o extrato
        statement = await get_contact_statement(db, contact.id)
        
        print("\n--- RESUMO DO EXTRATO ---")
        print(f"Total Pago (Despesas Concluídas): R$ {statement.summary.total_paid_cents / 100:.2f}")
        print(f"Total Recebido (Receitas Concluídas): R$ {statement.summary.total_received_cents / 100:.2f}")
        print(f"Total Pendente a Pagar: R$ {statement.summary.total_pending_pay_cents / 100:.2f}")
        print(f"Total Pendente a Receber: R$ {statement.summary.total_pending_receive_cents / 100:.2f}")
        print(f"Saldo Líquido Realizado: R$ {statement.summary.net_realized_cents / 100:.2f}")
        print(f"Lançamentos: {len(statement.transactions)}")

        assert statement.summary.total_paid_cents == 50000, f"Esperado 50000, obtido {statement.summary.total_paid_cents}"
        assert statement.summary.total_received_cents == 10000, f"Esperado 10000, obtido {statement.summary.total_received_cents}"
        assert statement.summary.total_pending_pay_cents == 30000, f"Esperado 30000, obtido {statement.summary.total_pending_pay_cents}"
        assert statement.summary.total_pending_receive_cents == 5000, f"Esperado 5000, obtido {statement.summary.total_pending_receive_cents}"
        assert statement.summary.net_realized_cents == -40000, f"Esperado -40000, obtido {statement.summary.net_realized_cents}"
        assert statement.summary.transactions_count == 4

        # Cleanup
        await db.execute(delete(Transaction).where(Transaction.contact_id == contact.id))
        await db.delete(debt)
        await db.delete(contact)
        await db.commit()
        print("✓ Limpeza de dados de teste concluída com sucesso.")

    print("\n✓ TODOS OS TESTES BACKEND DE EXTRATO DE CONTATO PASSARAM COM SUCESSO!")

if __name__ == "__main__":
    asyncio.run(run_tests())
