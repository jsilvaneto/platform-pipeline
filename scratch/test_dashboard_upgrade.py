import asyncio
import sys
import os

sys.path.append(os.path.join(os.path.dirname(__file__), "..", "backend"))

from app.database import AsyncSessionLocal, engine, Base
from app.models import Account, Category, Transaction, PaymentMethod, User, Goal, Budget, Debt
from app.main import migrate_database_schema, seed_initial_data
from app.api.v1.dashboard import get_dashboard_summary

async def test_dashboard():
    print("Iniciando testes do novo Dashboard Analítico...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    await migrate_database_schema()
    await seed_initial_data()

    async with AsyncSessionLocal() as db:
        fake_user = User(id="test-user", username="test")
        
        summary = await get_dashboard_summary(
            profile="PESSOAL",
            month=8,
            year=2026,
            db=db,
            _=fake_user
        )

        print(f"✓ Profile: {summary.profile}, Período: {summary.month}/{summary.year}")
        print(f"✓ Realizado - Receitas: R$ {summary.income_realized_cents/100:.2f} | Despesas: R$ {summary.expense_realized_cents/100:.2f} | Saldo: R$ {summary.net_realized_cents/100:.2f}")
        print(f"✓ Taxa de Poupança: {summary.savings_rate}%")
        print(f"✓ Patrimônio Líquido: R$ {summary.net_worth_cents/100:.2f}")
        print(f"✓ Total em Contas: R$ {summary.total_account_balance_cents/100:.2f} ({len(summary.accounts_balances)} contas)")
        print(f"✓ Histórico 6 Meses: {len(summary.historical_trend)} meses retornados")
        for h in summary.historical_trend:
            print(f"   -> {h.label}: Receitas R$ {h.income_realized_cents/100:.2f} | Despesas R$ {h.expense_realized_cents/100:.2f} | Líquido R$ {h.net_realized_cents/100:.2f}")
        print(f"✓ Diagnóstico 50-30-20: {len(summary.nature_breakdown)} naturezas")
        for nat in summary.nature_breakdown:
            print(f"   -> {nat.nature_label}: R$ {nat.amount_cents/100:.2f} ({nat.percentage}%) [Meta: {nat.target_percentage}% - Status: {nat.status}]")
        print(f"✓ Top Categorias: {len(summary.top_expense_categories)}")
        print(f"✓ Próximos 7 Dias: {len(summary.upcoming_7_days)} lançamentos")
        print(f"✓ Distribuição por Meio de Pagamento: {len(summary.payment_methods_distribution)}")

        assert summary.historical_trend is not None
        assert len(summary.historical_trend) == 6
        assert len(summary.nature_breakdown) == 4

    print("\n✓ TODOS OS TESTES DO NOVO DASHBOARD PASSARAM COM SUCESSO!")

if __name__ == "__main__":
    asyncio.run(test_dashboard())
