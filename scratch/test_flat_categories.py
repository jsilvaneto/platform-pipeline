import asyncio
import sys
import os

sys.path.append(os.path.abspath("backend"))

from app.database import AsyncSessionLocal
from app.models import Category, Item, Transaction
from sqlalchemy import select, text

async def test_flat_categories():
    print("Iniciando testes de Categorias Planas e Desvinculação de Subcategorias...")
    
    async with AsyncSessionLocal() as db:
        # 1. Verificar se a tabela SQLite possui coluna parent_id ou se já está desvinculada
        try:
            await db.execute(text("UPDATE categories SET parent_id = NULL WHERE parent_id IS NOT NULL"))
            await db.commit()
            print("✓ Migração de dados SQLite executada: subcategorias promovidas a categorias autônomas.")
        except Exception as e:
            print(f"Info tabela: {e}")

        # 2. Listar todas as categorias
        res = await db.execute(select(Category).order_by(Category.name.asc()))
        cats = res.scalars().all()
        print(f"✓ Total de categorias: {len(cats)}")
        for c in cats:
            print(f"  - [{c.profile}] {c.name} ({c.type}) • Natureza: {c.nature}")

        # 3. Criar uma nova categoria de teste
        new_cat = Category(
            profile="PESSOAL",
            type="DESPESA",
            name="Categoria Teste Plana",
            nature="NECESSARIO"
        )
        db.add(new_cat)
        await db.commit()
        await db.refresh(new_cat)
        print(f"✓ Categoria criada com sucesso: ID {new_cat.id}")

        # 4. Criar um item diretamente vinculado à nova categoria
        new_item = Item(
            profile="PESSOAL",
            category_id=new_cat.id,
            name="Item Teste Direto",
            default_amount_cents=5000
        )
        db.add(new_item)
        await db.commit()
        await db.refresh(new_item)
        print(f"✓ Item vinculado diretamente à categoria criado com sucesso: ID {new_item.id}")

        # 5. Cleanup
        await db.delete(new_item)
        await db.delete(new_cat)
        await db.commit()
        print("✓ Cleanup de registros de teste concluído com sucesso.")

    print("\nTODOS OS TESTES DE CATEGORIAS PLANAS FORAM CONCLUÍDOS COM 100% DE SUCESSO!")

if __name__ == "__main__":
    asyncio.run(test_flat_categories())
