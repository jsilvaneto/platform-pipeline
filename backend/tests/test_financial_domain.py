import unittest
from datetime import date
from pydantic import ValidationError

from app.services.expense_service import _add_months
from app.schemas.expense import ExpenseCreate
from app.schemas.category import CategoryCreate
from app.schemas.item import ItemCreate
from app.schemas.payment_method import PaymentMethodCreate
from app.schemas.dashboard import DashboardMetrics, MonthlySpending, ItemSpending
from app.schemas.system import (
    SystemDiagnosticsResponse,
    DatabaseDiagnostics,
    VolumetricStats,
    ApplicationDiagnostics,
)


class TestFinancialDomainLogic(unittest.TestCase):

    """Testes unitários para regras de negócio do domínio financeiro Wallet."""

    def test_add_months_regular(self):
        """Verifica soma de meses regular no mesmo ano."""
        d = date(2026, 3, 15)
        res = _add_months(d, 2)
        self.assertEqual(res, date(2026, 5, 15))

    def test_add_months_year_rollover(self):
        """Verifica virada de ano ao adicionar meses."""
        d = date(2026, 11, 20)
        res = _add_months(d, 3)
        self.assertEqual(res, date(2027, 2, 20))

    def test_add_months_end_of_february(self):
        """Verifica ajuste do dia para 28 de fevereiro em ano não bissexto."""
        d = date(2026, 1, 31)
        res = _add_months(d, 1)
        self.assertEqual(res, date(2026, 2, 28))

    def test_add_months_end_of_february_leap_year(self):
        """Verifica ajuste do dia para 29 de fevereiro em ano bissexto."""
        d = date(2024, 1, 31)
        res = _add_months(d, 1)
        self.assertEqual(res, date(2024, 2, 29))

    def test_installment_cents_precision_no_loss(self):
        """Verifica divisão exata em centavos inteiros sem perda residual de valor."""
        test_cases = [
            (10000, 3),   # R$ 100,00 em 3x (3334, 3333, 3333) -> 10000
            (100000, 7),  # R$ 1000,00 em 7x -> 100000
            (5055, 2),    # R$ 50,55 em 2x (2528, 2527) -> 5055
            (99999, 12),  # R$ 999,99 em 12x -> 99999
        ]
        for total_cents, count in test_cases:
            base_cents = total_cents // count
            remainder = total_cents % count
            installments = [
                base_cents + (remainder if idx == 0 else 0)
                for idx in range(count)
            ]
            self.assertEqual(sum(installments), total_cents)

    def test_expense_schema_validation_positive_cents(self):
        """Garante que despesa rejeita valor menor ou igual a zero em centavos."""
        with self.assertRaises(ValidationError):
            ExpenseCreate(
                description="Despesa Inválida",
                total_amount_cents=0,  # Proibido: deve ser > 0
                issue_date="2026-09-07",
                due_date="2026-09-07",
                item_id="item-test-123",
            )

        with self.assertRaises(ValidationError):
            ExpenseCreate(
                description="Despesa Negativa",
                total_amount_cents=-1500,
                issue_date="2026-09-07",
                due_date="2026-09-07",
                item_id="item-test-123",
            )

    def test_expense_schema_date_format_validation(self):
        """Valida que datas fora do padrão ISO YYYY-MM-DD são estritamente rejeitadas."""
        with self.assertRaises(ValidationError):
            ExpenseCreate(
                description="Data formato BR",
                total_amount_cents=5000,
                issue_date="07/09/2026",  # Formato inválido
                due_date="2026-09-07",
                item_id="item-test-123",
            )

    def test_expense_schema_essentiality_validation(self):
        """Valida enums estritos de essencialidade."""
        exp = ExpenseCreate(
            description="Mercado",
            total_amount_cents=25000,
            issue_date="2026-09-07",
            due_date="2026-09-10",
            item_id="item-test-123",
            essentiality="OBRIGATORIO",
        )
        self.assertEqual(exp.essentiality, "OBRIGATORIO")

        with self.assertRaises(ValidationError):
            ExpenseCreate(
                description="Mercado",
                total_amount_cents=25000,
                issue_date="2026-09-07",
                due_date="2026-09-10",
                item_id="item-test-123",
                essentiality="INVALIDO",
            )

    def test_expense_schema_requires_item_id(self):
        """Garante que o campo item_id é estritamente obrigatório no cadastro de lançamento."""
        with self.assertRaises(ValidationError):
            ExpenseCreate(
                description="Despesa Sem Item",
                total_amount_cents=10000,
                issue_date="2026-09-07",
                due_date="2026-09-07",
            )

        with self.assertRaises(ValidationError):
            ExpenseCreate(
                description="Despesa Com Item Vazio",
                total_amount_cents=10000,
                issue_date="2026-09-07",
                due_date="2026-09-07",
                item_id="",
            )

    def test_category_schema_validation(self):
        """Valida integridade do schema de categorias."""
        cat = CategoryCreate(name="Alimentação", icon="Utensils", color="#ef4444")
        self.assertEqual(cat.name, "Alimentação")

        with self.assertRaises(ValidationError):
            CategoryCreate(name="")

    def test_payment_method_schema_validation(self):
        """Valida tipos aceitos em PaymentMethod."""
        pm = PaymentMethodCreate(name="Cartão Nubank", type="CARTAO_CREDITO")
        self.assertEqual(pm.type, "CARTAO_CREDITO")

        with self.assertRaises(ValidationError):
            PaymentMethodCreate(name="Cartão Fake", type="TIPO_INEXISTENTE")

    def test_item_schema_validation(self):
        """Valida integridade e restrições do schema de Item."""
        item = ItemCreate(
            name="Supermercado",
            category_id="cat-123",
            nature="NECESSARIO",
            is_active=True,
        )
        self.assertEqual(item.name, "Supermercado")
        self.assertEqual(item.nature, "NECESSARIO")
        self.assertTrue(item.is_active)

        # Naturezas válidas
        for nat in ["OBRIGATORIO", "NECESSARIO", "DESEJO", "NENHUM"]:
            it = ItemCreate(name="Item Teste", category_id="cat-1", nature=nat)
            self.assertEqual(it.nature, nat)

        # Natureza inválida deve falhar
        with self.assertRaises(ValidationError):
            ItemCreate(name="Item Fake", category_id="cat-1", nature="INVALIDO")

        # Nome vazio deve falhar
        with self.assertRaises(ValidationError):
            ItemCreate(name="", category_id="cat-1")

    def test_expense_schema_with_item_id(self):
        """Valida criação de despesa associada a um item_id obrigatório."""
        exp = ExpenseCreate(
            description="Compras da Semana",
            total_amount_cents=35000,
            issue_date="2026-09-08",
            due_date="2026-09-10",
            category_id="cat-123",
            item_id="item-456",
            essentiality="NECESSARIO",
        )
        self.assertEqual(exp.item_id, "item-456")
        self.assertEqual(exp.category_id, "cat-123")

    def test_item_spending_schema(self):
        """Valida schema analítico de ItemSpending para o dashboard."""
        item_spending = ItemSpending(
            item_id="item-1",
            item_name="Supermercado",
            category_name="Alimentação",
            nature="NECESSARIO",
            total_cents=120000,
            percentage=24.5,
        )
        self.assertEqual(item_spending.item_name, "Supermercado")
        self.assertEqual(item_spending.total_cents, 120000)
        self.assertEqual(item_spending.percentage, 24.5)

    def test_monthly_spending_schema(self):
        """Valida schema de detalhamento mensal."""
        month_data = MonthlySpending(
            month=5,
            month_name="Mai",
            total_cents=15000,
            paid_cents=10000,
            pending_cents=5000,
        )
        self.assertEqual(month_data.month, 5)
        self.assertEqual(month_data.month_name, "Mai")
        self.assertEqual(month_data.total_cents, 15000)

        with self.assertRaises(ValidationError):
            MonthlySpending(month=13, month_name="Invalid")

    def test_dashboard_metrics_annual_schema(self):
        """Valida schema de métricas com dados anuais e quebra mensal."""
        metrics = DashboardMetrics(
            period="2026",
            year=2026,
            total_expenses_cents=100000,
            total_paid_cents=60000,
            total_pending_cents=40000,
            total_overdue_cents=0,
            monthly_breakdown=[
                MonthlySpending(month=1, month_name="Jan", total_cents=100000, paid_cents=60000, pending_cents=40000)
            ],
            by_category=[],
            by_essentiality=[],
            upcoming_payments=[],
        )
        self.assertEqual(metrics.year, 2026)
        self.assertEqual(metrics.period, "2026")
        self.assertEqual(len(metrics.monthly_breakdown), 1)

    def test_system_diagnostics_schema(self):
        """Valida schema de diagnóstico de banco de dados e infraestrutura."""
        diag = SystemDiagnosticsResponse(
            timestamp="2026-09-07T22:00:00Z",
            database=DatabaseDiagnostics(
                database_name="wallet",
                server_host="localhost",
                server_port=5432,
                latency_ms=1.45,
                size_bytes=8650752,
                size_pretty="8448 kB",
            ),
            volumetrics=VolumetricStats(
                total_categories=5,
                total_payment_methods=3,
                total_expenses=12,
                total_payments=24,
                total_users=2,
            ),
            application=ApplicationDiagnostics(
                app_name="Wallet",
                version="1.0.0",
                environment="development",
            ),
        )
        self.assertEqual(diag.database.engine, "PostgreSQL 16")
        self.assertEqual(diag.database.currency_storage_mode, "Inteiros em Centavos (amount_cents)")
        self.assertEqual(diag.database.size_pretty, "8448 kB")
        self.assertEqual(diag.volumetrics.total_categories, 5)


if __name__ == "__main__":
    unittest.main()


