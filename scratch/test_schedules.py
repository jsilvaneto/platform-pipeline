import asyncio
import sys
import os

sys.path.append(os.path.join(os.path.dirname(__file__), "..", "backend"))

from app.database import AsyncSessionLocal, engine, Base
from app.models import Schedule, Transaction, User, Category
from app.main import migrate_database_schema, seed_initial_data
from app.api.v1.schedules import (
    create_schedule, list_schedules, adjust_schedule, perform_schedule_action, delete_schedule
)
from app.schemas.schedule import ScheduleCreate, ScheduleAdjust, ScheduleAction
from sqlalchemy import select

async def test_schedules_feature():
    print("Iniciando testes da Central de Assinaturas & Recorrências (Schedules)...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    await migrate_database_schema()
    await seed_initial_data()

    async with AsyncSessionLocal() as db:
        fake_user = User(id="user-1", username="test")

        # 1. Pega uma categoria existente de despesa
        cat_res = await db.execute(select(Category).where(Category.profile == "PESSOAL", Category.type == "DESPESA"))
        cat = cat_res.scalars().first()
        assert cat is not None, "Categoria não encontrada"

        # 2. Cria plano de assinatura contínua
        sched = await create_schedule(
            schedule_in=ScheduleCreate(
                profile="PESSOAL",
                type="DESPESA",
                category_id=cat.id,
                description="Assinatura Streaming Premium",
                schedule_type="RECORRENTE_CONTINUA",
                frequency="MENSAL",
                amount_cents=4590, # R$ 45,90
                start_date="2026-09-01",
                due_day=5
            ),
            db=db,
            _=fake_user
        )
        print(f"✓ Assinatura criada: {sched.description} | R$ {sched.amount_cents/100:.2f} | Status: {sched.status} | Pendentes: {sched.pending_count}")
        assert sched.pending_count == 12
        assert sched.amount_cents == 4590

        # 3. Simula quitação do 1º lançamento
        trans_res = await db.execute(select(Transaction).where(Transaction.schedule_id == sched.id).order_by(Transaction.due_date))
        transactions = trans_res.scalars().all()
        first_t = transactions[0]
        first_t.status = "CONCLUIDO"
        await db.commit()

        # 4. Listagem enriquecida
        list_res = await list_schedules(profile="PESSOAL", status_filter=None, schedule_type=None, db=db, _=fake_user)
        target_s = next(s for s in list_res if s.id == sched.id)
        print(f"✓ Listagem: Pagos={target_s.paid_count}, Pendentes={target_s.pending_count}, Próximo Venc={target_s.next_due_date}")
        assert target_s.paid_count == 1
        assert target_s.pending_count == 11

        # 5. Reajuste de valor e dia de vencimento (R$ 55,00, vencimento dia 10)
        adj_s = await adjust_schedule(
            schedule_id=sched.id,
            payload=ScheduleAdjust(new_amount_cents=5500, new_due_day=10, new_description="Assinatura Streaming 4K"),
            db=db,
            _=fake_user
        )
        print(f"✓ Reajuste aplicado: Novo valor = R$ {adj_s.amount_cents/100:.2f} | Novo dia = {adj_s.due_day}")
        assert adj_s.amount_cents == 5500
        assert adj_s.due_day == 10

        # Verifica se as transações pendentes foram atualizadas com o novo valor
        t_res = await db.execute(select(Transaction).where(Transaction.schedule_id == sched.id, Transaction.status == "PENDENTE"))
        pending_t = t_res.scalars().all()
        assert all(t.amount_cents == 5500 for t in pending_t)
        # O 1º que já estava concluído manteve R$ 45,90
        first_t_check = await db.get(Transaction, first_t.id)
        assert first_t_check.amount_cents == 4590
        print("✓ Histórico preservado e transações futuras atualizadas com sucesso!")

        # 6. Pausar e Reativar
        s_pause = await perform_schedule_action(
            schedule_id=sched.id,
            payload=ScheduleAction(action="PAUSAR"),
            db=db,
            _=fake_user
        )
        assert s_pause.status == "PAUSADO"
        print("✓ Assinatura pausada com sucesso.")

        s_active = await perform_schedule_action(
            schedule_id=sched.id,
            payload=ScheduleAction(action="REATIVAR"),
            db=db,
            _=fake_user
        )
        assert s_active.status == "ATIVO"
        print("✓ Assinatura reativada com sucesso.")

        # 7. Cancelar (deve excluir apenas as transações pendentes)
        s_cancel = await perform_schedule_action(
            schedule_id=sched.id,
            payload=ScheduleAction(action="CANCELAR"),
            db=db,
            _=fake_user
        )
        assert s_cancel.status == "CANCELADO"
        assert s_cancel.pending_count == 0
        assert s_cancel.paid_count == 1
        print("✓ Assinatura cancelada com exclusão limpa das parcelas futuras e preservação dos pagamentos anteriores.")

        # 8. Exclusão
        await delete_schedule(schedule_id=sched.id, db=db, _=fake_user)
        print("✓ Contrato excluído com sucesso.")

    print("\n✓ TODOS OS TESTES DA CENTRAL DE ASSINATURAS PASSARAM COM SUCESSO!")

if __name__ == "__main__":
    asyncio.run(test_schedules_feature())
