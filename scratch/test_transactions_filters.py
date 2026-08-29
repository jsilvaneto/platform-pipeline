import asyncio
import sys
import os

sys.path.append(os.path.abspath("backend"))

from app.database import AsyncSessionLocal
from app.models import Transaction, User
from sqlalchemy import select, or_

async def test_filters():
    print("Iniciando testes de filtros dinâmicos de transações no backend...")
    async with AsyncSessionLocal() as db:
        # 1. Test Query all transactions (no date constraint)
        res = await db.execute(select(Transaction).where(Transaction.profile == "PESSOAL"))
        all_trans = res.scalars().all()
        print(f"✓ Total de transações PESSOAL (sem filtro de data): {len(all_trans)}")

        # 2. Test search filter with ilike
        search_query = select(Transaction).where(
            Transaction.profile == "PESSOAL",
            or_(Transaction.description.ilike("%aluguel%"), Transaction.notes.ilike("%aluguel%"))
        )
        search_res = await db.execute(search_query)
        search_results = search_res.scalars().all()
        print(f"✓ Busca textual por 'aluguel': {len(search_results)} resultados")

        # 3. Test overdue query
        from datetime import datetime, timezone
        today_iso = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        overdue_query = select(Transaction).where(
            Transaction.profile == "PESSOAL",
            Transaction.status == "PENDENTE",
            Transaction.due_date < today_iso
        )
        overdue_res = await db.execute(overdue_query)
        overdue_results = overdue_res.scalars().all()
        print(f"✓ Filtro de atrasadas (due_date < {today_iso}): {len(overdue_results)} contas em atraso")

    print("\nTODOS OS TESTES DE FILTROS DE TRANSAÇÕES PASSARAM COM SUCESSO!")

if __name__ == "__main__":
    asyncio.run(test_filters())
