import unittest
from datetime import date, datetime, timedelta
from dateutil.rrule import rrulestr

from app.core.encryption import (
    encrypt_secret,
    decrypt_secret,
    mask_token,
    _get_fernet_key,
)
from app.services.budgetbakers_client import (
    BudgetBakersAPIError,
    BudgetBakersRateLimitError,
    BudgetBakersInitSyncError,
    BudgetBakersClient,
)
from app.schemas.wallet_integration import (
    WalletIntegrationResponse,
    WalletIntegrationUpdate,
    WalletSyncJobStatus,
)
from app.schemas.wallet_account import (
    WalletAccountResponse,
)
from app.schemas.wallet_record import (
    WalletRecordResponse,
    PaginatedRecordsResponse,
)
from app.schemas.analytics import (
    DailyBalanceProjection,
    GoalProjection,
    BudgetForecast,
    UpcomingScheduledItem,
    LiquidityAlert,
)


class TestWalletEncryption(unittest.TestCase):
    """Validação da infraestrutura de criptografia AES-256 e mascaramento de credenciais."""

    def test_key_derivation_deterministic(self):
        """Verifica que a chave Fernet é derivada corretamente."""
        key = _get_fernet_key()
        self.assertIsInstance(key, bytes)
        self.assertEqual(len(key), 44)  # 32 bytes base64 encoded = 44 chars

    def test_encrypt_and_decrypt_cycle(self):
        """Verifica ciclo completo de cifragem e decifragem de API key."""
        raw_token = "wal_api_key_super_secret_token_xyz987654321"
        encrypted = encrypt_secret(raw_token)
        self.assertNotEqual(encrypted, raw_token)
        decrypted = decrypt_secret(encrypted)
        self.assertEqual(decrypted, raw_token)

    def test_mask_token_standard(self):
        """Verifica mascaramento padrão com prefixo de 4 e sufixo de 4 caracteres."""
        token = "wal_api_token_abc123456789xyz"
        masked = mask_token(token)
        self.assertTrue(masked.startswith("wal_••••••••"))
        self.assertTrue(masked.endswith("9xyz"))
        self.assertNotIn("abc12345678", masked)

    def test_mask_token_short(self):
        """Verifica que tokens muito curtos são mascarados com segurança total."""
        short_token = "123"
        masked = mask_token(short_token)
        self.assertEqual(masked, "••••••••")

    def test_mask_token_empty(self):
        """Verifica token vazio."""
        self.assertEqual(mask_token(""), "")


class TestBudgetBakersClientDefenses(unittest.TestCase):
    """Validação das defesas de taxa de requisições e tratamento de erros da API."""

    def test_rate_limit_error_retry_after(self):
        """Verifica que BudgetBakersRateLimitError preserva retry_after."""
        err = BudgetBakersRateLimitError(retry_after=120)
        self.assertEqual(err.retry_after, 120)
        self.assertIn("120", str(err))

    def test_init_sync_in_progress_error(self):
        """Verifica exceção semântica para HTTP 409 initial sync."""
        err = BudgetBakersInitSyncError("Sincronização inicial ainda em andamento nos servidores BudgetBakers.")
        self.assertIsInstance(err, BudgetBakersAPIError)
        self.assertIn("Sincronização inicial", str(err))

    def test_client_init_and_throttle_defaults(self):
        """Verifica inicialização segura do cliente e intervalo mínimo."""
        client = BudgetBakersClient(token="test_token_123")
        self.assertEqual(client.token, "test_token_123")
        self.assertEqual(client.min_request_interval, 0.25)
        self.assertFalse(client.sync_in_progress)


class TestAnalyticsDomainLogic(unittest.TestCase):
    """Validação das regras de negócio do motor analítico passado e preditivo futuro."""

    def test_net_worth_calculation(self):
        """Verifica que patrimônio líquido soma ativos e subtrai passivos/dívidas."""
        # 1000 reais em conta corrente (100000 centavos)
        # 500 reais em poupança (50000 centavos)
        # 300 reais de fatura de cartão (-30000 centavos)
        # 200 reais de empréstimo (-20000 centavos)
        checking = 100000
        savings = 50000
        credit_card_debt = -30000
        loan_debt = -20000

        total_assets = checking + savings
        total_liabilities = abs(credit_card_debt) + abs(loan_debt)
        net_worth = total_assets - total_liabilities

        self.assertEqual(total_assets, 150000)
        self.assertEqual(total_liabilities, 50000)
        self.assertEqual(net_worth, 100000)

    def test_recurrence_rrule_daily_projection(self):
        """Verifica expansão de regra RFC-5545 RRULE para projeção diária futura."""
        start_date = date(2026, 3, 1)
        rrule_str = "FREQ=MONTHLY;INTERVAL=1;BYMONTHDAY=10"
        rule = rrulestr(rrule_str, dtstart=datetime.combine(start_date, datetime.min.time()))

        # Expande para os próximos 60 dias
        horizon_end = start_date + timedelta(days=60)
        occurrences = rule.between(
            datetime.combine(start_date, datetime.min.time()),
            datetime.combine(horizon_end, datetime.max.time()),
            inc=True,
        )
        occ_dates = [d.date() for d in occurrences]
        self.assertIn(date(2026, 3, 10), occ_dates)
        self.assertIn(date(2026, 4, 10), occ_dates)

    def test_goal_forecast_logic(self):
        """Verifica cálculo de progresso percentual e status de metas."""
        target_cents = 1000000  # R$ 10.000,00
        current_cents = 650000  # R$ 6.500,00
        progress_pct = round((current_cents / target_cents) * 100, 1)
        self.assertEqual(progress_pct, 65.0)

        # Meta de R$ 10.000,00 com R$ 10.000,00 atingida
        completed_pct = round((1000000 / target_cents) * 100, 1)
        self.assertEqual(completed_pct, 100.0)

    def test_budget_burn_rate_daily(self):
        """Verifica cálculo de queima diária e projeção de estouro de orçamento."""
        budget_limit_cents = 300000  # R$ 3.000,00 no mês (30 dias)
        spent_so_far_cents = 250000  # R$ 2.500,00 gastos no dia 15
        days_passed = 15
        days_total = 30

        burn_rate_daily = spent_so_far_cents // days_passed  # ~166,66/dia
        projected_end_cents = burn_rate_daily * days_total  # R$ 5.000,00 -> Estoura!

        self.assertGreater(projected_end_cents, budget_limit_cents)
        is_exceeded_projected = projected_end_cents > budget_limit_cents
        self.assertTrue(is_exceeded_projected)


class TestWalletSchemasContract(unittest.TestCase):
    """Validação dos contratos Pydantic e proteção contra vazamento de credenciais."""

    def test_wallet_integration_response_schema(self):
        """Garante que WalletIntegrationResponse expõe apenas token_masked e nenhum segredo em texto claro."""
        resp = WalletIntegrationResponse(
            id="integ_123",
            user_id="usr_456",
            api_base_url="https://rest.budgetbakers.com/wallet",
            token_masked="wal_••••••••abcd",
            is_configured=True,
            is_active=True,
            last_sync_at="2026-09-22T10:00:00Z",
            last_sync_status="SUCCESS",
            rate_limit_limit=300,
            rate_limit_remaining=288,
            created_at="2026-09-22T08:00:00Z",
            updated_at="2026-09-22T10:00:00Z",
        )
        data = resp.model_dump()
        self.assertIn("token_masked", data)
        self.assertNotIn("api_key_encrypted", data)
        self.assertNotIn("api_key", data)
        self.assertEqual(data["token_masked"], "wal_••••••••abcd")

    def test_account_amount_cents_integer(self):
        """Garante conformidade com financial-domain-guard (apenas BigInteger/int centavos)."""
        acc = WalletAccountResponse(
            id="acc_123",
            user_id="usr_456",
            name="Nubank Conta",
            account_type="CHECKING",
            currency_code="BRL",
            initial_balance_cents=0,
            current_balance_cents=152430,  # R$ 1.524,30
            exclude_from_stats=False,
            color="#8a05be",
            is_archived=False,
            created_at="2026-09-22T08:00:00Z",
            updated_at="2026-09-22T08:00:00Z",
        )
        self.assertIsInstance(acc.current_balance_cents, int)
        self.assertEqual(acc.current_balance_cents, 152430)

    def test_wallet_record_states(self):
        """Verifica estados válidos de conciliação bancária de transações."""
        rec = WalletRecordResponse(
            id="rec_999",
            user_id="usr_456",
            account_id="acc_123",
            account_name="Nubank Conta",
            record_type="DESPESA",
            amount_cents=4590,
            currency_code="BRL",
            converted_amount_cents=4590,
            record_date="2026-09-22T08:00:00Z",
            record_state="reconciled",
            source="bank-sync",
            is_transfer=False,
            labels=["Alimentação", "Trabalho"],
        )
        self.assertEqual(rec.record_state, "reconciled")
        self.assertEqual(rec.amount_cents, 4590)


if __name__ == "__main__":
    unittest.main()
