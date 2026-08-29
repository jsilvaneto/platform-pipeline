import asyncio
import os
import sys
import uuid
from datetime import datetime, timezone

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../backend")))

from app.database import AsyncSessionLocal
from app.models import Category, Item, Contact, Account, Debt, Budget, Transaction, User
from app.services.google_sheets_service import (
    ALL_SHEETS_HEADERS,
    HEADER_TRANSACOES,
    HEADER_CATEGORIAS,
    HEADER_ITENS,
    HEADER_CONTAS,
    HEADER_CONTATOS,
    HEADER_DIVIDAS,
    HEADER_ORCAMENTOS,
    HEADER_FILA_MOBILE,
)
from sqlalchemy import select
from sqlalchemy.orm import aliased

async def test_full_sync_logic():
    print("Iniciando testes de lógica de sincronização completa...")
    
    # 1. Validar configuração dos cabeçalhos
    assert len(ALL_SHEETS_HEADERS) == 8, "Devem existir 8 abas configuradas."
    assert "Transacoes" in ALL_SHEETS_HEADERS
    assert "Categorias" in ALL_SHEETS_HEADERS
    assert "Itens" in ALL_SHEETS_HEADERS
    assert "Contas" in ALL_SHEETS_HEADERS
    assert "Contatos" in ALL_SHEETS_HEADERS
    assert "Dividas" in ALL_SHEETS_HEADERS
    assert "Orcamentos" in ALL_SHEETS_HEADERS
    assert "Fila_Mobile" in ALL_SHEETS_HEADERS
    print("✓ Validação de 8 abas e cabeçalhos OK")

    async with AsyncSessionLocal() as db:
        # 2. Testar extração de todas as tabelas mestras e operacionais
        # Categorias
        cat_query = select(Category).order_by(Category.profile.asc(), Category.type.asc(), Category.name.asc())
        cat_records = (await db.execute(cat_query)).scalars().all()
        print(f"✓ Query Categorias OK ({len(cat_records)} registros encontrados)")

        # Itens
        item_query = (
            select(
                Item,
                Category.name.label("cat_name")
            )
            .join(Category, Item.category_id == Category.id)
            .order_by(Item.profile.asc(), Category.name.asc(), Item.name.asc())
        )
        item_records = (await db.execute(item_query)).all()
        print(f"✓ Query Itens OK ({len(item_records)} registros encontrados)")

        # Contas
        acc_query = select(Account).order_by(Account.profile.asc(), Account.name.asc())
        acc_records = (await db.execute(acc_query)).scalars().all()
        print(f"✓ Query Contas OK ({len(acc_records)} registros encontrados)")

        # Contatos
        con_query = select(Contact).order_by(Contact.profile.asc(), Contact.name.asc())
        con_records = (await db.execute(con_query)).scalars().all()
        print(f"✓ Query Contatos OK ({len(con_records)} registros encontrados)")

        # Dívidas
        debt_query = (
            select(Debt, Contact.name.label("contact_name"))
            .outerjoin(Contact, Debt.contact_id == Contact.id)
            .order_by(Debt.profile.asc(), Debt.created_at.desc())
        )
        debt_records = (await db.execute(debt_query)).all()
        print(f"✓ Query Dívidas OK ({len(debt_records)} registros encontrados)")

        # Orçamentos
        bud_query = (
            select(Budget, Category.name.label("category_name"))
            .join(Category, Budget.category_id == Category.id)
            .order_by(Budget.year.desc(), Budget.month.desc(), Budget.profile.asc())
        )
        bud_records = (await db.execute(bud_query)).all()
        print(f"✓ Query Orçamentos OK ({len(bud_records)} registros encontrados)")

        # Transações
        trans_query = (
            select(
                Transaction,
                Category.name.label("category_name"),
                Item.name.label("item_name"),
                Contact.name.label("contact_name"),
                Account.name.label("account_name")
            )
            .join(Category, Transaction.category_id == Category.id)
            .outerjoin(Item, Transaction.item_id == Item.id)
            .outerjoin(Contact, Transaction.contact_id == Contact.id)
            .outerjoin(Account, Transaction.account_id == Account.id)
            .order_by(Transaction.due_date.desc(), Transaction.created_at.desc())
        )
        trans_records = (await db.execute(trans_query)).all()
        print(f"✓ Query Transações OK ({len(trans_records)} registros encontrados)")

        # 3. Testar simulação de montagem de payload
        entity_counts = {
            "transacoes": len(trans_records),
            "categorias": len(cat_records),
            "itens": len(item_records),
            "contas": len(acc_records),
            "contatos": len(con_records),
            "dividas": len(debt_records),
            "orcamentos": len(bud_records)
        }
        total_exported = sum(entity_counts.values())
        print(f"✓ Contadores Consolidados: {entity_counts}")
        print(f"✓ Total Exportável: {total_exported} registros")

    print("\nTODOS OS TESTES DE CONSULTA E ESTRUTURAÇÃO DO SYNC PASSARAM COM SUCESSO!")

if __name__ == "__main__":
    asyncio.run(test_full_sync_logic())
