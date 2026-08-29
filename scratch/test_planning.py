import asyncio
import sys
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import AsyncSessionLocal
from app.api.v1.planning import (
    get_cashflow_projection, simulate_scenario, get_runway_metrics,
    get_goals_projection, get_committed_income_map
)
from app.schemas.planning import ScenarioSimulationRequest
from app.models import User

async def main():
    async with AsyncSessionLocal() as db:
        dummy_user = User(id="test", username="admin")
        print("=== 1. Testando Fluxo de Caixa Projetado (PESSOAL 12M) ===")
        proj_pessoal = await get_cashflow_projection(profile="PESSOAL", months=12, db=db, _=dummy_user)
        print(f"OK! Meses retornados: {len(proj_pessoal.items)}, Saldo Atual: {proj_pessoal.current_balance_cents}")

        print("=== 2. Testando Fluxo de Caixa Projetado (EMPRESA 24M) ===")
        proj_empresa = await get_cashflow_projection(profile="EMPRESA", months=24, db=db, _=dummy_user)
        print(f"OK! Meses retornados: {len(proj_empresa.items)}, Menor Saldo: {proj_empresa.lowest_balance_cents}")

        print("=== 3. Testando Simulador de Cenários What-If ===")
        sim_req = ScenarioSimulationRequest(
            profile="PESSOAL",
            months=12,
            income_variation_percent=10.0,
            discretionary_cut_percent=30.0,
            necessary_cut_percent=5.0,
            additional_monthly_expense_cents=20000
        )
        sim_res = await simulate_scenario(payload=sim_req, db=db, _=dummy_user)
        print(f"OK! Delta Total: {sim_res.total_delta_cents}, Economia: {sim_res.total_savings_generated_cents}")

        print("=== 4. Testando Runway & Fôlego ===")
        runway = await get_runway_metrics(profile="PESSOAL", db=db, _=dummy_user)
        print(f"OK! Runway Meses: {runway.runway_months}, Status: {runway.health_status}, Reserva Recomendada: {runway.recommended_reserve_cents}")

        print("=== 5. Testando Metas com Projeção Temporal ===")
        goals = await get_goals_projection(profile="PESSOAL", db=db, _=dummy_user)
        print(f"OK! Total Metas: {len(goals.goals)}, Meta Total: {goals.total_target_cents}")

        print("=== 6. Testando Mapa de Comprometimento de Renda ===")
        committed = await get_committed_income_map(profile="PESSOAL", months=6, db=db, _=dummy_user)
        print(f"OK! Comprometimento Médio: {committed.average_committed_percentage}% em {len(committed.items)} meses")

        print("\n>>> TODOS OS TESTES DE PLANEJAMENTO PASSARAM COM SUCESSO! <<<")

if __name__ == "__main__":
    asyncio.run(main())
