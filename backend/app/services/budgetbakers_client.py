import asyncio
import logging
import time
from typing import Any
import httpx

logger = logging.getLogger("budgetbakers_client")


class BudgetBakersAPIError(Exception):
    """Exceção base para erros da REST API do BudgetBakers."""
    def __init__(self, message: str, status_code: int = 500, details: Any = None) -> None:
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.details = details


class BudgetBakersAuthError(BudgetBakersAPIError):
    """Token de autenticação inválido, revogado ou expirado (HTTP 401)."""
    def __init__(self, message: str = "Token de API não autorizado ou inválido.") -> None:
        super().__init__(message=message, status_code=401)


class BudgetBakersInitSyncError(BudgetBakersAPIError):
    """A API do Wallet ainda está preparando a sincronização inicial da conta (HTTP 409)."""
    def __init__(self, message: str = "Sincronização inicial da BudgetBakers ainda em andamento (init_sync_in_progress).") -> None:
        super().__init__(message=message, status_code=409)


class BudgetBakersRateLimitError(BudgetBakersAPIError):
    """Cota horária ou burst de requisições excedido (HTTP 429)."""
    def __init__(self, retry_after: int = 60, message: str = "Limite de requisições da BudgetBakers excedido.") -> None:
        super().__init__(message=f"{message} Aguarde {retry_after}s.", status_code=429)
        self.retry_after = retry_after


class BudgetBakersClient:
    """Cliente HTTP defensivo e resiliente para a REST API do BudgetBakers Wallet.
    
    Implementa:
    - Intervalo mínimo entre requisições (rate limiting smoothing / anti-burst).
    - Extração e rastreamento de headers de sync (X-Last-Data-Change-Rev, X-Last-Data-Change-At).
    - Backoff para HTTP 429 e detecção de HTTP 409 (init_sync_in_progress).
    - Sanitização de logs (token de autenticação nunca é exposto em traces).
    """

    def __init__(
        self,
        token: str,
        base_url: str = "https://rest.budgetbakers.com/wallet",
        min_request_interval_seconds: float = 0.25,
        timeout_seconds: float = 25.0,
    ) -> None:
        self.token = token.strip()
        self.base_url = base_url.rstrip("/")
        self.min_request_interval = min_request_interval_seconds
        self.timeout = timeout_seconds
        self._last_request_time: float = 0.0
        self._lock = asyncio.Lock()

        # Watermarks e metadados retornados nos cabeçalhos da última requisição
        self.last_data_change_at: str | None = None
        self.last_data_change_rev: int | None = None
        self.sync_in_progress: bool = False

    async def _throttle(self) -> None:
        """Garante espaçamento mínimo entre requisições consecutivas para proteger o token bucket."""
        async with self._lock:
            now = time.monotonic()
            elapsed = now - self._last_request_time
            if elapsed < self.min_request_interval:
                await asyncio.sleep(self.min_request_interval - elapsed)
            self._last_request_time = time.monotonic()

    async def _request(
        self,
        method: str,
        path: str,
        params: dict[str, Any] | None = None,
        json_data: Any | None = None,
        max_retries: int = 2,
    ) -> Any:
        url = f"{self.base_url}/{path.lstrip('/')}"
        headers = {
            "Authorization": f"Bearer {self.token}",
            "Accept": "application/json",
            "User-Agent": "Wallet-Platform-Sync/1.0",
        }

        retries = 0
        while retries <= max_retries:
            await self._throttle()
            try:
                async with httpx.AsyncClient(timeout=self.timeout) as client:
                    resp = await client.request(
                        method=method,
                        url=url,
                        headers=headers,
                        params=params,
                        json=json_data,
                    )

                # Extrai cabeçalhos de sincronização e revisão do Wallet
                if "X-Last-Data-Change-Rev" in resp.headers:
                    try:
                        self.last_data_change_rev = int(resp.headers["X-Last-Data-Change-Rev"])
                    except (ValueError, TypeError):
                        pass

                if "X-Last-Data-Change-At" in resp.headers:
                    self.last_data_change_at = resp.headers["X-Last-Data-Change-At"]

                if "X-Sync-In-Progress" in resp.headers:
                    self.sync_in_progress = resp.headers["X-Sync-In-Progress"].lower() == "true"

                if resp.status_code == 200:
                    return resp.json()
                elif resp.status_code == 401:
                    logger.error("Falha de autenticação na BudgetBakers API (HTTP 401).")
                    raise BudgetBakersAuthError()
                elif resp.status_code == 409:
                    logger.warning("BudgetBakers em sincronização inicial (HTTP 409 init_sync_in_progress).")
                    raise BudgetBakersInitSyncError()
                elif resp.status_code == 429:
                    retry_after_str = resp.headers.get("Retry-After", "60")
                    retry_after = int(retry_after_str) if retry_after_str.isdigit() else 60
                    logger.warning(f"Rate limit atingido na BudgetBakers (HTTP 429). Retry-After: {retry_after}s.")
                    if retries < max_retries:
                        retries += 1
                        logger.info(f"Aguardando {retry_after}s antes da tentativa {retries}/{max_retries}...")
                        await asyncio.sleep(retry_after)
                        continue
                    raise BudgetBakersRateLimitError(retry_after=retry_after)
                elif resp.status_code >= 500:
                    logger.error(f"Erro no servidor da BudgetBakers (HTTP {resp.status_code}).")
                    if retries < max_retries:
                        retries += 1
                        await asyncio.sleep(2 ** retries)
                        continue
                    raise BudgetBakersAPIError(
                        message=f"Servidor da BudgetBakers indisponível (HTTP {resp.status_code}).",
                        status_code=resp.status_code,
                    )
                else:
                    detail = ""
                    try:
                        detail = resp.text
                    except Exception:
                        pass
                    raise BudgetBakersAPIError(
                        message=f"Erro na requisição ({resp.status_code}): {detail}",
                        status_code=resp.status_code,
                        details=detail,
                    )

            except (httpx.ConnectError, httpx.TimeoutException) as conn_err:
                logger.warning(f"Falha de conexão com a BudgetBakers: {conn_err}. Tentativa {retries}/{max_retries}.")
                if retries < max_retries:
                    retries += 1
                    await asyncio.sleep(2 ** retries)
                    continue
                raise BudgetBakersAPIError(
                    message="Não foi possível conectar com os servidores da BudgetBakers.",
                    status_code=504,
                )

    # -------------------------------------------------------------------------
    # Recursos da API
    # -------------------------------------------------------------------------

    async def get_usage_stats(self) -> dict[str, Any]:
        """Consulta as estatísticas de consumo e cota do token atual."""
        return await self._request("GET", "/v1/api/api-usage/stats")

    async def get_accounts(self, limit: int = 200, offset: int = 0) -> list[dict[str, Any]]:
        """Busca todas as contas bancárias, cartões e investimentos."""
        data = await self._request("GET", "/v1/api/accounts", params={"limit": limit, "offset": offset})
        if isinstance(data, list):
            return data
        return data.get("items", data.get("data", []))

    async def get_categories(self, limit: int = 200, offset: int = 0) -> list[dict[str, Any]]:
        """Busca todas as categorias e subcategorias com suas cardinalidades."""
        data = await self._request("GET", "/v1/api/categories", params={"limit": limit, "offset": offset})
        if isinstance(data, list):
            return data
        return data.get("items", data.get("data", []))

    async def get_labels(self, limit: int = 200, offset: int = 0) -> list[dict[str, Any]]:
        """Busca todas as etiquetas (tags) registradas."""
        data = await self._request("GET", "/v1/api/labels", params={"limit": limit, "offset": offset})
        if isinstance(data, list):
            return data
        return data.get("items", data.get("data", []))

    async def get_records_page(
        self,
        limit: int = 200,
        offset: int = 0,
        updated_at_gte: str | None = None,
        sort_by: str = "+recordDate",
    ) -> list[dict[str, Any]]:
        """Busca uma página de transações financeiras (records)."""
        params: dict[str, Any] = {
            "limit": limit,
            "offset": offset,
            "sortBy": sort_by,
        }
        if updated_at_gte:
            params["updatedAt"] = f"gte.{updated_at_gte}"

        data = await self._request("GET", "/v1/api/records", params=params)
        if isinstance(data, list):
            return data
        return data.get("items", data.get("data", []))

    async def get_budgets(self, limit: int = 200, offset: int = 0) -> list[dict[str, Any]]:
        """Busca orçamentos programados e limites."""
        params = {"limit": limit, "offset": offset, "spending": "current+5"}
        data = await self._request("GET", "/v1/api/budgets", params=params)
        if isinstance(data, list):
            return data
        return data.get("items", data.get("data", []))

    async def get_standing_orders(self, limit: int = 200, offset: int = 0) -> list[dict[str, Any]]:
        """Busca ordens permanentes e pagamentos planejados recorrentes (RRULE)."""
        data = await self._request("GET", "/v1/api/standing-orders", params={"limit": limit, "offset": offset})
        if isinstance(data, list):
            return data
        return data.get("items", data.get("data", []))

    async def get_standing_order_items(self, limit: int = 200, offset: int = 0) -> list[dict[str, Any]]:
        """Busca ocorrências individuais geradas para cada ordem permanente."""
        data = await self._request("GET", "/v1/api/standing-orders/items", params={"limit": limit, "offset": offset})
        if isinstance(data, list):
            return data
        return data.get("items", data.get("data", []))

    async def get_goals(self, limit: int = 200, offset: int = 0) -> list[dict[str, Any]]:
        """Busca metas financeiras e progresso."""
        data = await self._request("GET", "/v1/api/goals", params={"limit": limit, "offset": offset})
        if isinstance(data, list):
            return data
        return data.get("items", data.get("data", []))
