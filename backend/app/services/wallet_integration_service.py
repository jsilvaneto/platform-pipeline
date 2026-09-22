from datetime import datetime, timezone
import time
from typing import Any
import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status

from app.models.wallet_integration import WalletIntegration
from app.schemas.wallet_integration import (
    WalletIntegrationCreate,
    WalletIntegrationResponse,
    WalletIntegrationTestRequest,
    WalletIntegrationTestResponse,
)
from app.core.encryption import encrypt_secret, decrypt_secret, mask_token

DEFAULT_BASE_URL = "https://rest.budgetbakers.com/wallet"


async def get_integration(db: AsyncSession, user_id: str) -> WalletIntegrationResponse:
    """Busca as configurações da integração do usuário, sem expor a chave de API."""
    result = await db.execute(select(WalletIntegration).where(WalletIntegration.user_id == user_id))
    integration = result.scalar_one_or_none()

    if not integration:
        now_str = datetime.now(timezone.utc).isoformat()
        return WalletIntegrationResponse(
            id="",
            user_id=user_id,
            api_base_url=DEFAULT_BASE_URL,
            token_masked=None,
            is_configured=False,
            is_active=False,
            last_sync_status="NOT_CONFIGURED",
            last_sync_at=None,
            last_sync_rev=None,
            last_error_message=None,
            rate_limit_remaining=300,
            rate_limit_limit=300,
            rate_limit_reset_at=None,
            created_at=now_str,
            updated_at=now_str,
        )

    return WalletIntegrationResponse(
        id=integration.id,
        user_id=integration.user_id,
        api_base_url=integration.api_base_url,
        token_masked=integration.token_masked,
        is_configured=bool(integration.api_key_encrypted and integration.token_masked),
        is_active=integration.is_active,
        last_sync_at=integration.last_sync_at,
        last_sync_rev=integration.last_sync_rev,
        last_sync_status=integration.last_sync_status,
        last_error_message=integration.last_error_message,
        rate_limit_remaining=integration.rate_limit_remaining,
        rate_limit_limit=integration.rate_limit_limit,
        rate_limit_reset_at=integration.rate_limit_reset_at,
        created_at=integration.created_at,
        updated_at=integration.updated_at,
    )


async def get_decrypted_token(db: AsyncSession, user_id: str) -> str | None:
    """Recupera e descriptografa o token de API na memória volátil para chamadas do backend."""
    result = await db.execute(select(WalletIntegration).where(WalletIntegration.user_id == user_id))
    integration = result.scalar_one_or_none()
    if not integration or not integration.api_key_encrypted:
        return None
    try:
        return decrypt_secret(integration.api_key_encrypted)
    except Exception:
        return None


async def save_credentials(
    db: AsyncSession,
    user_id: str,
    data: WalletIntegrationCreate,
) -> WalletIntegrationResponse:
    """Criptografa o token e salva/atualiza as credenciais de integração com atomicidade."""
    clean_token = data.api_key.strip()
    if len(clean_token) < 10:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Token da API inválido. O token deve possuir pelo menos 10 caracteres.",
        )

    result = await db.execute(select(WalletIntegration).where(WalletIntegration.user_id == user_id))
    integration = result.scalar_one_or_none()

    encrypted = encrypt_secret(clean_token)
    masked = mask_token(clean_token)
    base_url = data.api_base_url.strip() if data.api_base_url else DEFAULT_BASE_URL

    if integration:
        integration.api_key_encrypted = encrypted
        integration.token_masked = masked
        integration.api_base_url = base_url
        integration.is_active = True
        integration.last_error_message = None
        if integration.last_sync_status == "NOT_CONFIGURED":
            integration.last_sync_status = "PENDING"
    else:
        integration = WalletIntegration(
            user_id=user_id,
            api_base_url=base_url,
            api_key_encrypted=encrypted,
            token_masked=masked,
            is_active=True,
            last_sync_status="PENDING",
            rate_limit_remaining=300,
            rate_limit_limit=300,
        )
        db.add(integration)

    await db.commit()
    await db.refresh(integration)
    return await get_integration(db, user_id)


async def delete_credentials(db: AsyncSession, user_id: str) -> bool:
    """Remove a credencial armazenada com segurança e desativa a integração."""
    result = await db.execute(select(WalletIntegration).where(WalletIntegration.user_id == user_id))
    integration = result.scalar_one_or_none()
    if not integration:
        return True

    integration.api_key_encrypted = None
    integration.token_masked = None
    integration.is_active = False
    integration.last_sync_status = "NOT_CONFIGURED"
    integration.last_error_message = None
    await db.commit()
    return True


async def test_connection(
    db: AsyncSession,
    user_id: str,
    data: WalletIntegrationTestRequest,
) -> WalletIntegrationTestResponse:
    """Valida a conexão e o token contra o endpoint oficial /api-usage/stats da BudgetBakers."""
    token: str | None = None
    if data.api_key and data.api_key.strip():
        token = data.api_key.strip()
    else:
        token = await get_decrypted_token(db, user_id)

    if not token:
        return WalletIntegrationTestResponse(
            success=False,
            message="Nenhuma chave de API configurada para testar. Insira a chave no campo de configuração.",
            latency_ms=0,
            status_code=400,
            api_usage=None,
        )

    # Busca a base_url cadastrada ou padrão
    result = await db.execute(select(WalletIntegration).where(WalletIntegration.user_id == user_id))
    integration = result.scalar_one_or_none()
    base_url = integration.api_base_url if integration else DEFAULT_BASE_URL
    target_url = f"{base_url.rstrip('/')}/v1/api/api-usage/stats"

    start_time = time.perf_counter()
    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/json",
        "User-Agent": "Wallet-Intelligence-Platform/1.0",
    }

    try:
        async with httpx.AsyncClient(timeout=12.0) as client:
            resp = await client.get(target_url, headers=headers)
        
        latency_ms = int((time.perf_counter() - start_time) * 1000)

        if resp.status_code == 200:
            usage_data: dict[str, Any] = {}
            try:
                usage_data = resp.json()
            except Exception:
                pass

            # Atualiza indicadores de rate limit se o registro existir
            if integration:
                integration.rate_limit_remaining = usage_data.get("remaining", integration.rate_limit_remaining)
                integration.rate_limit_limit = usage_data.get("limit", integration.rate_limit_limit)
                integration.last_error_message = None
                await db.commit()

            return WalletIntegrationTestResponse(
                success=True,
                message="Conexão com a BudgetBakers REST API estabelecida com sucesso!",
                latency_ms=latency_ms,
                status_code=200,
                api_usage=usage_data,
            )
        elif resp.status_code == 401:
            return WalletIntegrationTestResponse(
                success=False,
                message="Token de API não autorizado ou inválido. Verifique se o token foi copiado corretamente em Settings -> REST API no Wallet.",
                latency_ms=latency_ms,
                status_code=401,
                api_usage=None,
            )
        elif resp.status_code == 409:
            return WalletIntegrationTestResponse(
                success=False,
                message="A BudgetBakers ainda está preparando os dados iniciais da sua conta (init_sync_in_progress). Aguarde 2-3 minutos e tente novamente.",
                latency_ms=latency_ms,
                status_code=409,
                api_usage=None,
            )
        elif resp.status_code == 429:
            retry_after = resp.headers.get("Retry-After", "60")
            return WalletIntegrationTestResponse(
                success=False,
                message=f"Limite de taxa da API excedido (HTTP 429). Aguarde {retry_after} segundos antes de tentar novamente.",
                latency_ms=latency_ms,
                status_code=429,
                api_usage=None,
            )
        else:
            return WalletIntegrationTestResponse(
                success=False,
                message=f"A API da BudgetBakers respondeu com status inesperado: {resp.status_code}.",
                latency_ms=latency_ms,
                status_code=resp.status_code,
                api_usage=None,
            )

    except httpx.TimeoutException:
        latency_ms = int((time.perf_counter() - start_time) * 1000)
        return WalletIntegrationTestResponse(
            success=False,
            message="Tempo limite esgotado ao conectar com https://rest.budgetbakers.com. Verifique sua conexão com a internet.",
            latency_ms=latency_ms,
            status_code=504,
            api_usage=None,
        )
    except Exception as exc:
        latency_ms = int((time.perf_counter() - start_time) * 1000)
        return WalletIntegrationTestResponse(
            success=False,
            message=f"Falha ao conectar com o serviço Wallet: {str(exc)}",
            latency_ms=latency_ms,
            status_code=500,
            api_usage=None,
        )
