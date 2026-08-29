import asyncio
import sys
import os

sys.path.append(os.path.join(os.path.dirname(__file__), "..", "backend"))

from app.database import AsyncSessionLocal, engine, Base
from app.models import Goal, User
from app.main import migrate_database_schema, seed_initial_data
from app.api.v1.goals import create_goal, update_goal, contribute_to_goal, delete_goal, list_goals
from app.schemas.goal import GoalCreate, GoalUpdate, GoalContribute

async def test_goals_feature():
    print("Iniciando testes de Metas Financeiras (Goals)...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    await migrate_database_schema()
    await seed_initial_data()

    async with AsyncSessionLocal() as db:
        fake_user = User(id="user-1", username="test")

        # 1. Criação de Meta
        new_g = await create_goal(
            goal_in=GoalCreate(
                profile="PESSOAL",
                title="Reserva de Emergência 6 Meses",
                target_amount_cents=1000000, # R$ 10.000,00
                current_amount_cents=200000, # R$ 2.000,00
                target_date="2026-12-31"
            ),
            db=db,
            _=fake_user
        )
        print(f"✓ Meta criada: {new_g.title} | Alvo: R$ {new_g.target_amount_cents/100:.2f} | Atual: R$ {new_g.current_amount_cents/100:.2f} | Progresso: {new_g.progress_percentage}%")
        assert new_g.status == "EM_ANDAMENTO"
        assert new_g.progress_percentage == 20.0

        # 2. Aporte de R$ 3.000,00
        g_aporte = await contribute_to_goal(
            goal_id=new_g.id,
            payload=GoalContribute(amount_cents=300000, action="APORTE"),
            db=db,
            _=fake_user
        )
        print(f"✓ Aporte realizado: Novo saldo = R$ {g_aporte.current_amount_cents/100:.2f} ({g_aporte.progress_percentage}%)")
        assert g_aporte.current_amount_cents == 500000
        assert g_aporte.progress_percentage == 50.0

        # 3. Aporte para atingir a meta (R$ 5.000,00 adicionais)
        g_concluida = await contribute_to_goal(
            goal_id=new_g.id,
            payload=GoalContribute(amount_cents=500000, action="APORTE"),
            db=db,
            _=fake_user
        )
        print(f"✓ Meta atingida: Status = {g_concluida.status} ({g_concluida.progress_percentage}%)")
        assert g_concluida.status == "CONCLUIDA"
        assert g_concluida.progress_percentage == 100.0

        # 4. Resgate parcial (R$ 1.000,00)
        g_resgate = await contribute_to_goal(
            goal_id=new_g.id,
            payload=GoalContribute(amount_cents=100000, action="RESGATE"),
            db=db,
            _=fake_user
        )
        print(f"✓ Resgate realizado: Status = {g_resgate.status} | Saldo = R$ {g_resgate.current_amount_cents/100:.2f} ({g_resgate.progress_percentage}%)")
        assert g_resgate.status == "EM_ANDAMENTO"
        assert g_resgate.current_amount_cents == 900000

        # 5. Listagem
        all_goals = await list_goals(profile="PESSOAL", status_filter=None, db=db, _=fake_user)
        assert any(g.id == new_g.id for g in all_goals)
        print(f"✓ Listagem validada com {len(all_goals)} meta(s).")

        # 6. Exclusão
        await delete_goal(goal_id=new_g.id, db=db, _=fake_user)
        print("✓ Meta excluída com sucesso.")

    print("\n✓ TODOS OS TESTES DE METAS FINANCEIRAS PASSARAM COM SUCESSO!")

if __name__ == "__main__":
    asyncio.run(test_goals_feature())
