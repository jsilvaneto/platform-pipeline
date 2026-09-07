import unittest
from datetime import date
from pydantic import ValidationError

from app.services.expense_service import _add_months
from app.schemas.expense import ExpenseCreate
from app.schemas.category import CategoryCreate
from app.schemas.payment_method import PaymentMethodCreate

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
            )

        with self.assertRaises(ValidationError):
            ExpenseCreate(
                description="Despesa Negativa",
                total_amount_cents=-1500,
                issue_date="2026-09-07",
                due_date="2026-09-07",
            )

    def test_expense_schema_date_format_validation(self):
        """Valida que datas fora do padrão ISO YYYY-MM-DD são estritamente rejeitadas."""
        with self.assertRaises(ValidationError):
            ExpenseCreate(
                description="Data formato BR",
                total_amount_cents=5000,
                issue_date="07/09/2026",  # Formato inválido
                due_date="2026-09-07",
            )

    def test_expense_schema_essentiality_validation(self):
        """Valida enums estritos de essencialidade."""
        exp = ExpenseCreate(
            description="Mercado",
            total_amount_cents=25000,
            issue_date="2026-09-07",
            due_date="2026-09-10",
            essentiality="OBRIGATORIO",
        )
        self.assertEqual(exp.essentiality, "OBRIGATORIO")

        with self.assertRaises(ValidationError):
            ExpenseCreate(
                description="Mercado",
                total_amount_cents=25000,
                issue_date="2026-09-07",
                due_date="2026-09-10",
                essentiality="INVALIDO",
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

if __name__ == "__main__":
    unittest.main()
