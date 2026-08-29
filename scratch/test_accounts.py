import asyncio
import sys
import os

sys.path.append(os.path.abspath("backend"))

from app.database import AsyncSessionLocal
from app.models import Account
from sqlalchemy import select

async def test_accounts():
    print("Iniciando testes de Contas no SQLite...")
    async with AsyncSessionLocal() as db:
        # 1. Query existing accounts
        res = await db.execute(select(Account))
        accounts = res.scalars().all()
        print(f"✓ Total de contas existentes: {len(accounts)}")
        for acc in accounts:
            print(f"  - [{acc.profile}] {acc.name} ({acc.type}) ID: {acc.id}")

        # 2. Insert test account
        test_acc = Account(
            profile="PESSOAL",
            name="Conta Teste Automatizado",
            type="CORRENTE"
        )
        db.add(test_acc)
        await db.commit()
        await db.refresh(test_acc)
        print(f"✓ Conta de teste criada com ID: {test_acc.id}")

        # 3. Update test account
        test_acc.name = "Conta Teste Atualizada"
        test_acc.type = "INVESTIMENTO"
        await db.commit()
        await db.refresh(test_acc)
        print(f"✓ Conta atualizada para: {test_acc.name} ({test_acc.type})")

        # 4. Clean up test account
        await db.delete(test_acc)
        await db.commit()
        print("✓ Conta de teste removida com sucesso.")

    print("\nTODOS OS TESTES DE CONTAS PASSARAM COM SUCESSO!")

if __name__ == "__main__":
    asyncio.run(test_accounts())
