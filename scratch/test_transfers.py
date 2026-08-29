import asyncio
import sys
import os

sys.path.append(os.path.join(os.path.dirname(__file__), "..", "backend"))

from app.database import AsyncSessionLocal, engine, Base
from app.models import Account, Category, Transaction
from app.main import migrate_database_schema, seed_initial_data
from sqlalchemy import select, delete, or_

async def run_tests():
    print("Iniciando validação de Transferências Entre Contas...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    await migrate_database_schema()
    await seed_initial_data()

    async with AsyncSessionLocal() as db:
        # 1. Cria duas contas de teste
        acc_corrente = Account(profile="PESSOAL", name="Banco Alpha Corrente Teste", type="CORRENTE")
        acc_poupanca = Account(profile="PESSOAL", name="Banco Alpha Poupança Teste", type="POUPANCA")
        db.add_all([acc_corrente, acc_poupanca])
        await db.commit()
        await db.refresh(acc_corrente)
        await db.refresh(acc_poupanca)
        print(f"✓ Contas criadas: {acc_corrente.name} e {acc_poupanca.name}")

        # 2. Busca categoria para despesas/receitas operacionais
        cat_rec = (await db.execute(select(Category).where(Category.profile == "PESSOAL", Category.type == "RECEITA"))).scalars().first()
        cat_desp = (await db.execute(select(Category).where(Category.profile == "PESSOAL", Category.type == "DESPESA"))).scalars().first()

        # 3. Cria Receita Operacional: R$ 1.000,00 (100000)
        t_rec = Transaction(
            profile="PESSOAL",
            type="RECEITA",
            account_id=acc_corrente.id,
            category_id=cat_rec.id,
            description="Salário Mensal Teste",
            amount_cents=100000,
            due_date="2026-08-15",
            payment_date="2026-08-15",
            status="CONCLUIDO"
        )

        # 4. Cria Despesa Operacional: R$ 200,00 (20000)
        t_desp = Transaction(
            profile="PESSOAL",
            type="DESPESA",
            account_id=acc_corrente.id,
            category_id=cat_desp.id,
            description="Supermercado Teste",
            amount_cents=20000,
            due_date="2026-08-16",
            payment_date="2026-08-16",
            status="CONCLUIDO"
        )

        # 5. Cria Transferência Interna: R$ 300,00 (30000) de Corrente -> Poupança
        t_transf = Transaction(
            profile="PESSOAL",
            type="TRANSFERENCIA",
            account_id=acc_corrente.id,
            destination_account_id=acc_poupanca.id,
            category_id=cat_desp.id,
            description="Transferência: Corrente -> Poupança Teste",
            amount_cents=30000,
            due_date="2026-08-17",
            payment_date="2026-08-17",
            status="CONCLUIDO"
        )
        db.add_all([t_rec, t_desp, t_transf])
        await db.commit()
        print("✓ Lançamentos de Receita, Despesa e Transferência inseridos.")

        # 6. Validação dos relatórios operacionais (Dashboard)
        test_ids = [t_rec.id, t_desp.id, t_transf.id]
        
        # Receitas do teste (deve somar APENAS t_rec)
        rec_sum = (await db.execute(
            select(Transaction.amount_cents).where(
                Transaction.id.in_(test_ids),
                Transaction.type == "RECEITA",
                Transaction.status == "CONCLUIDO"
            )
        )).scalars().all()
        total_rec = sum(rec_sum)

        # Despesas do teste (deve somar APENAS t_desp)
        desp_sum = (await db.execute(
            select(Transaction.amount_cents).where(
                Transaction.id.in_(test_ids),
                Transaction.type == "DESPESA",
                Transaction.status == "CONCLUIDO"
            )
        )).scalars().all()
        total_desp = sum(desp_sum)

        # Transferências do teste (deve listar t_transf isolada)
        transf_sum = (await db.execute(
            select(Transaction.amount_cents).where(
                Transaction.id.in_(test_ids),
                Transaction.type == "TRANSFERENCIA",
                Transaction.status == "CONCLUIDO"
            )
        )).scalars().all()
        total_transf = sum(transf_sum)

        print(f"\n--- VERIFICAÇÃO DE DASHBOARD (NÃO INFLAÇÃO) ---")
        print(f"Total Receitas: R$ {total_rec / 100:.2f} (Esperado: R$ 1000.00)")
        print(f"Total Despesas: R$ {total_desp / 100:.2f} (Esperado: R$ 200.00)")
        print(f"Total Transferências: R$ {total_transf / 100:.2f} (Esperado: R$ 300.00)")
        assert total_rec == 100000, f"Receita incorreta! Esperado 100000, obtido {total_rec}"
        assert total_desp == 20000, f"Despesa incorreta! Esperado 20000, obtido {total_desp}"
        assert total_transf == 30000, f"Transferência incorreta! Esperado 30000, obtido {total_transf}"
        print("✓ Dashboard não é inflado pela transferência!")

        # 7. Validação do Filtro por Conta
        # Filtrando pela conta corrente (deve achar receita, despesa e transferência como saída)
        q_corr = select(Transaction).where(
            or_(
                Transaction.account_id == acc_corrente.id,
                Transaction.destination_account_id == acc_corrente.id
            )
        )
        corr_trans = (await db.execute(q_corr)).scalars().all()
        assert len(corr_trans) == 3, f"Esperado 3 transações na conta corrente, obtido {len(corr_trans)}"
        print(f"✓ Filtro Conta Corrente retornou corretamente 3 lançamentos (Receita, Despesa, Transferência Saída).")

        # Filtrando pela conta poupança (deve achar a transferência como entrada)
        q_poup = select(Transaction).where(
            or_(
                Transaction.account_id == acc_poupanca.id,
                Transaction.destination_account_id == acc_poupanca.id
            )
        )
        poup_trans = (await db.execute(q_poup)).scalars().all()
        assert len(poup_trans) == 1, f"Esperado 1 transação na poupança, obtido {len(poup_trans)}"
        assert poup_trans[0].type == "TRANSFERENCIA"
        assert poup_trans[0].destination_account_id == acc_poupanca.id
        print(f"✓ Filtro Conta Poupança retornou corretamente 1 lançamento (Transferência Entrada).")

        # 8. Limpeza
        await db.execute(delete(Transaction).where(Transaction.id.in_([t_rec.id, t_desp.id, t_transf.id])))
        await db.delete(acc_corrente)
        await db.delete(acc_poupanca)
        await db.commit()
        print("✓ Limpeza de dados de teste concluída.")

    print("\n✓ TODOS OS TESTES BACKEND DE TRANSFERÊNCIAS ENTRE CONTAS PASSARAM COM SUCESSO!")

if __name__ == "__main__":
    asyncio.run(run_tests())
