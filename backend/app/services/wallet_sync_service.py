import asyncio
from datetime import datetime, timezone
import logging
from typing import Any
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import AsyncSessionLocal
from app.models.wallet_integration import WalletIntegration
from app.models.wallet_account import WalletAccount
from app.models.category import Category
from app.models.wallet_label import WalletLabel
from app.models.wallet_record import WalletRecord, WalletRecordLabel
from app.models.wallet_budget import WalletBudget
from app.models.wallet_standing_order import WalletStandingOrder, WalletStandingOrderItem
from app.models.wallet_goal import WalletGoal
from app.services.budgetbakers_client import (
    BudgetBakersClient,
    BudgetBakersAuthError,
    BudgetBakersInitSyncError,
    BudgetBakersRateLimitError,
)
from app.core.encryption import decrypt_secret
from app.schemas.wallet_integration import WalletSyncJobStatus

logger = logging.getLogger("wallet_sync_service")

# Memória volátil para acompanhamento do progresso em tempo real
_active_jobs: dict[str, WalletSyncJobStatus] = {}

CARDINALITY_MAP = {
    "must": "OBRIGATORIO",
    "need": "NECESSARIO",
    "want": "DESEJO",
    "none": "NENHUM",
}


def _extract_group_name(raw_group: Any) -> str | None:
    """Extrai string segura para o nome do grupo da categoria, mesmo se for dict da API."""
    if isinstance(raw_group, dict):
        name = raw_group.get("name") or raw_group.get("id")
        return str(name)[:100] if name else None
    if raw_group:
        return str(raw_group)[:100]
    return None


def _extract_amount(val: Any) -> float:
    """Extrai valor numérico decimal seguro de campos da API (float ou dict com value)."""
    if isinstance(val, dict):
        return float(val.get("value", 0) or 0)
    try:
        return float(val or 0)
    except (ValueError, TypeError):
        return 0.0


def get_sync_status(user_id: str) -> WalletSyncJobStatus:
    """Retorna o status atual do job de sincronização para o usuário informado."""
    if user_id in _active_jobs:
        return _active_jobs[user_id]
    return WalletSyncJobStatus()


async def trigger_sync(user_id: str, mode: str = "incremental") -> WalletSyncJobStatus:
    """Dispara a sincronização em segundo plano, evitando bloqueio de threads HTTP."""
    current = _active_jobs.get(user_id)
    if current and current.is_running:
        return current

    job = WalletSyncJobStatus(
        is_running=True,
        step="INICIANDO",
        progress_percent=2,
        message="Inicializando motor de sincronização...",
        status="IN_PROGRESS",
        started_at=datetime.now(timezone.utc).isoformat(),
        items_synced={
            "accounts": 0,
            "categories": 0,
            "labels": 0,
            "records": 0,
            "budgets": 0,
            "standing_orders": 0,
            "goals": 0,
        },
    )
    _active_jobs[user_id] = job

    # Dispara tarefa assíncrona desacoplada
    asyncio.create_task(_execute_sync(user_id=user_id, mode=mode))
    return job


async def _execute_sync(user_id: str, mode: str) -> None:
    """Orquestrador completo de sincronização e persistência no PostgreSQL."""
    job = _active_jobs[user_id]
    async with AsyncSessionLocal() as db:
        try:
            # 1. Obter e descriptografar token
            res = await db.execute(select(WalletIntegration).where(WalletIntegration.user_id == user_id))
            integration = res.scalar_one_or_none()
            if not integration or not integration.api_key_encrypted:
                job.is_running = False
                job.status = "FAILED"
                job.error = "Chave de API não configurada. Configure a chave em Configurações -> Integração Wallet."
                job.message = job.error
                return

            token = decrypt_secret(integration.api_key_encrypted)
            if not token:
                job.is_running = False
                job.status = "FAILED"
                job.error = "Falha ao descriptografar token de acesso da API."
                job.message = job.error
                return

            client = BudgetBakersClient(token=token, base_url=integration.api_base_url)

            # Atualiza status no banco
            integration.last_sync_status = "IN_PROGRESS"
            await db.commit()

            # 2. Passo Contas Bancárias
            job.step = "CONTAS"
            job.progress_percent = 12
            job.message = "Sincronizando contas bancárias, cartões e investimentos..."
            
            raw_accounts = await client.get_accounts(limit=200)
            for acc in raw_accounts:
                acc_id = str(acc.get("id"))
                if not acc_id:
                    continue

                init_val = float(acc.get("initialBalance", 0) or 0)
                init_cents = round(init_val * 100)

                # Saldo calculado pela API
                curr_val = float(acc.get("currentBalance", acc.get("balance", {}).get("currentBalance", 0)) or 0)
                curr_cents = round(curr_val * 100)

                credit_bal = acc.get("creditBalance", acc.get("balance", {}).get("creditBalance"))
                credit_cents = round(float(credit_bal) * 100) if credit_bal is not None else None

                credit_lim = acc.get("creditLimit", acc.get("balance", {}).get("creditLimit"))
                limit_cents = round(float(credit_lim) * 100) if credit_lim is not None else None

                avail_cred = acc.get("availableCredit", acc.get("balance", {}).get("availableCredit"))
                avail_cents = round(float(avail_cred) * 100) if avail_cred is not None else None

                account_obj = WalletAccount(
                    id=acc_id,
                    user_id=user_id,
                    name=str(acc.get("name", "Conta")),
                    account_type=str(acc.get("accountType", "General")),
                    currency_code=str(acc.get("currencyCode", "BRL")),
                    initial_balance_cents=init_cents,
                    current_balance_cents=curr_cents,
                    credit_balance_cents=credit_cents,
                    credit_limit_cents=limit_cents,
                    available_credit_cents=avail_cents,
                    balance_mode=acc.get("balanceMode"),
                    exclude_from_stats=bool(acc.get("excludeFromStats", False)),
                    color=str(acc.get("color", "#2563eb")),
                    is_archived=bool(acc.get("archived", False)),
                )
                await db.merge(account_obj)

            await db.commit()
            job.items_synced["accounts"] = len(raw_accounts)

            # 3. Passo Categorias & Subcategorias
            job.step = "CATEGORIAS"
            job.progress_percent = 25
            job.message = "Sincronizando categorias e taxonomia financeira..."
            
            raw_categories = await client.get_categories(limit=200)
            
            # Passada 1: Categorias principais
            for cat in raw_categories:
                cat_id = str(cat.get("id"))
                if not cat_id:
                    continue
                parent_id = cat.get("parentId")
                if not parent_id:
                    raw_card = str(cat.get("cardinality", "none")).lower()
                    cardinality = CARDINALITY_MAP.get(raw_card, "NENHUM")
                    group_name = _extract_group_name(cat.get("group") or cat.get("groupName"))
                    cat_obj = Category(
                        id=cat_id,
                        user_id=user_id,
                        parent_id=None,
                        name=str(cat.get("name", "Categoria")),
                        group_name=group_name,
                        cardinality=cardinality,
                        icon=str(cat.get("icon", "Tag")),
                        color=str(cat.get("color", "#6366f1")),
                    )
                    await db.merge(cat_obj)
            await db.commit()

            # Passada 2: Subcategorias
            for cat in raw_categories:
                cat_id = str(cat.get("id"))
                parent_id = cat.get("parentId")
                if cat_id and parent_id:
                    raw_card = str(cat.get("cardinality", "none")).lower()
                    cardinality = CARDINALITY_MAP.get(raw_card, "NENHUM")
                    group_name = _extract_group_name(cat.get("group") or cat.get("groupName"))
                    sub_obj = Category(
                        id=cat_id,
                        user_id=user_id,
                        parent_id=str(parent_id),
                        name=str(cat.get("name", "Subcategoria")),
                        group_name=group_name,
                        cardinality=cardinality,
                        icon=str(cat.get("icon", "Tag")),
                        color=str(cat.get("color", "#6366f1")),
                    )
                    await db.merge(sub_obj)
            await db.commit()
            job.items_synced["categories"] = len(raw_categories)

            # 4. Passo Etiquetas (Labels)
            job.step = "ETIQUETAS"
            job.progress_percent = 38
            job.message = "Sincronizando etiquetas (tags)..."
            
            raw_labels = await client.get_labels(limit=200)
            for lbl in raw_labels:
                lbl_id = str(lbl.get("id"))
                if not lbl_id:
                    continue
                lbl_obj = WalletLabel(
                    id=lbl_id,
                    user_id=user_id,
                    name=str(lbl.get("name", "Tag")),
                    color=str(lbl.get("color", "#64748b")),
                    is_archived=bool(lbl.get("archived", False)),
                )
                await db.merge(lbl_obj)
            await db.commit()
            job.items_synced["labels"] = len(raw_labels)

            # 5. Passo Transações (Records) - Carga Completa ou Incremental
            job.step = "TRANSATIVANDO_RECORDS"
            job.progress_percent = 50
            job.message = "Baixando e processando histórico de transações..."
            
            updated_at_gte = None
            if mode == "incremental" and integration.last_sync_at:
                # Usa watermark para sync leve
                updated_at_gte = integration.last_sync_at

            offset = 0
            total_records_processed = 0
            while True:
                page = await client.get_records_page(
                    limit=200,
                    offset=offset,
                    updated_at_gte=updated_at_gte,
                )
                if not page:
                    break

                for rec in page:
                    rec_id = str(rec.get("id"))
                    acc_id = str(rec.get("accountId"))
                    if not rec_id or not acc_id:
                        continue

                    # Valor monetário
                    raw_val = float(rec.get("amount", {}).get("value", 0) or 0)
                    amount_cents = abs(round(raw_val * 100))

                    conv_val = float(rec.get("convertedAmount", {}).get("value", raw_val) or raw_val)
                    converted_cents = abs(round(conv_val * 100))

                    # Natureza do registro
                    is_transf = bool(rec.get("isTransfer", False) or rec.get("transfer"))
                    rec_type_api = str(rec.get("recordType", "")).lower()
                    if is_transf:
                        rec_type = "TRANSFERENCIA"
                    elif raw_val < 0 or rec_type_api == "expense":
                        rec_type = "DESPESA"
                    else:
                        rec_type = "RECEITA"

                    state = str(rec.get("recordState", "cleared"))
                    if state not in ("reconciled", "cleared", "uncleared", "void", "waitForAssign"):
                        state = "cleared"

                    cat_val = rec.get("categoryId") or (rec.get("category", {}).get("id") if isinstance(rec.get("category"), dict) else None)
                    cat_fk = str(cat_val) if cat_val and cat_val != "unknown" else None

                    raw_cp = rec.get("counterParty")
                    cp_str = str(raw_cp.get("name") or raw_cp.get("id")) if isinstance(raw_cp, dict) else (str(raw_cp) if raw_cp is not None else None)

                    rec_obj = WalletRecord(
                        id=rec_id,
                        user_id=user_id,
                        account_id=acc_id,
                        category_id=cat_fk,
                        record_type=rec_type,
                        amount_cents=amount_cents,
                        currency_code=str(rec.get("amount", {}).get("currencyCode", "BRL")),
                        converted_amount_cents=converted_cents,
                        record_date=str(rec.get("recordDate", "")),
                        record_state=state,
                        counter_party=cp_str,
                        note=str(rec.get("note")) if rec.get("note") is not None else None,
                        source=str(rec.get("source", "rest")),
                        is_transfer=is_transf,
                        transfer_id=rec.get("transfer", {}).get("transferId") if isinstance(rec.get("transfer"), dict) else None,
                        other_account_id=rec.get("transfer", {}).get("otherAccountId") if isinstance(rec.get("transfer"), dict) else None,
                        other_record_id=rec.get("transfer", {}).get("otherRecordId") if isinstance(rec.get("transfer"), dict) else None,
                        created_at_api=rec.get("createdAt"),
                        updated_at_api=rec.get("updatedAt"),
                    )
                    await db.merge(rec_obj)

                    # Relação N:N de Etiquetas
                    raw_rec_labels = rec.get("labels", []) or rec.get("labelIds", [])
                    if raw_rec_labels:
                        await db.execute(delete(WalletRecordLabel).where(WalletRecordLabel.record_id == rec_id))
                        for l_item in raw_rec_labels:
                            l_id = str(l_item.get("id") if isinstance(l_item, dict) else l_item)
                            if l_id:
                                db.add(WalletRecordLabel(record_id=rec_id, label_id=l_id))

                await db.commit()
                total_records_processed += len(page)
                job.items_synced["records"] = total_records_processed
                job.message = f"Processadas {total_records_processed} transações..."
                
                offset += len(page)
                if len(page) < 200:
                    break

            # 6. Passo Orçamentos (Budgets)
            job.step = "ORCAMENTOS"
            job.progress_percent = 78
            job.message = "Sincronizando tetos e orçamentos programados..."
            
            raw_budgets = await client.get_budgets(limit=20)
            for bgt in raw_budgets:
                b_id = str(bgt.get("id"))
                if not b_id:
                    continue
                b_amount = round(_extract_amount(bgt.get("amount", 0)) * 100)
                bgt_obj = WalletBudget(
                    id=b_id,
                    user_id=user_id,
                    name=str(bgt.get("name", "Orçamento")),
                    amount_cents=b_amount,
                    currency_code=str(bgt.get("currencyCode", "BRL")),
                    interval_type=str(bgt.get("interval", "BUDGET_INTERVAL_MONTH")),
                    start_date=bgt.get("startDate"),
                    end_date=bgt.get("endDate"),
                    is_active=bool(bgt.get("active", True)),
                    raw_data=bgt,
                )
                await db.merge(bgt_obj)
            await db.commit()
            job.items_synced["budgets"] = len(raw_budgets)

            # 7. Passo Ordens Recorrentes (Standing Orders & Items)
            job.step = "RECORRENCIAS"
            job.progress_percent = 88
            job.message = "Sincronizando pagamentos planejados e projeções futuras..."
            
            raw_so = await client.get_standing_orders(limit=200)
            for so in raw_so:
                so_id = str(so.get("id"))
                acc_id = str(so.get("accountId"))
                if not so_id or not acc_id:
                    continue
                so_amount = round(_extract_amount(so.get("amount", 0)) * 100)
                so_cat_val = so.get("categoryId") or (so.get("category", {}).get("id") if isinstance(so.get("category"), dict) else None)
                so_cat_fk = str(so_cat_val) if so_cat_val and so_cat_val != "unknown" else None
                so_obj = WalletStandingOrder(
                    id=so_id,
                    user_id=user_id,
                    account_id=acc_id,
                    category_id=so_cat_fk,
                    name=str(so.get("name", "Ordem Permanente")),
                    amount_cents=so_amount,
                    currency_code=str(so.get("currencyCode", "BRL")),
                    record_type="DESPESA",
                    recurrence_rule=str(so.get("recurrenceRule", "FREQ=MONTHLY;INTERVAL=1")),
                    due_date=str(so.get("dueDate", "")),
                    payment_count=so.get("paymentCount"),
                    reminder=str(so.get("reminder", "none")),
                    is_active=bool(so.get("active", True)),
                    note=str(so.get("note")) if so.get("note") is not None else None,
                )
                await db.merge(so_obj)
            await db.commit()
            job.items_synced["standing_orders"] = len(raw_so)

            raw_so_items = await client.get_standing_order_items(limit=200)
            for soi in raw_so_items:
                soi_id = str(soi.get("id"))
                so_fk = str(soi.get("standingOrderId"))
                if not soi_id or not so_fk:
                    continue
                soi_obj = WalletStandingOrderItem(
                    id=soi_id,
                    standing_order_id=so_fk,
                    original_date=str(soi.get("originalDate", "")),
                    aligned_date=str(soi.get("alignedDate", "")),
                    paid_date=soi.get("paidDate"),
                    is_dismissed=bool(soi.get("dismissed", False)),
                    record_ids=soi.get("recordIds", []),
                )
                await db.merge(soi_obj)
            await db.commit()

            # 8. Passo Metas de Poupança (Goals)
            job.step = "METAS"
            job.progress_percent = 95
            job.message = "Sincronizando metas de economia..."
            
            raw_goals = await client.get_goals(limit=200)
            for g in raw_goals:
                g_id = str(g.get("id"))
                if not g_id:
                    continue
                target_cents = round(_extract_amount(g.get("targetAmount", 0)) * 100)
                init_cents = round(_extract_amount(g.get("initialAmount", 0)) * 100)
                curr_cents = round(_extract_amount(g.get("currentAmount", init_cents / 100)) * 100)
                g_currency = (g.get("targetAmount", {}).get("currencyCode") if isinstance(g.get("targetAmount"), dict) else None) or str(g.get("currencyCode", "BRL"))
                g_state = str(g.get("state", "active"))
                if g_state not in ("active", "paused", "reached"):
                    g_state = "active"

                g_obj = WalletGoal(
                    id=g_id,
                    user_id=user_id,
                    name=str(g.get("name", "Meta")),
                    note=str(g.get("note")) if g.get("note") is not None else None,
                    target_amount_cents=target_cents,
                    initial_amount_cents=init_cents,
                    current_amount_cents=curr_cents,
                    currency_code=g_currency,
                    desired_date=g.get("desiredDate"),
                    state=g_state,
                    state_updated_at=g.get("stateUpdatedAt"),
                )
                await db.merge(g_obj)
            await db.commit()
            job.items_synced["goals"] = len(raw_goals)

            # 9. Finalização e Atualização do Watermark
            now_iso = datetime.now(timezone.utc).isoformat()
            integration.last_sync_at = now_iso
            if client.last_data_change_rev:
                integration.last_sync_rev = client.last_data_change_rev
            integration.last_sync_status = "SUCCESS"
            integration.last_error_message = None

            # Tenta atualizar rate limits se disponíveis
            try:
                usage = await client.get_usage_stats()
                if isinstance(usage, dict):
                    if "remaining" in usage:
                        integration.rate_limit_remaining = usage["remaining"]
                    if "limit" in usage:
                        integration.rate_limit_limit = usage["limit"]
            except Exception:
                pass

            await db.commit()

            job.step = "CONCLUIDO"
            job.progress_percent = 100
            job.finished_at = now_iso
            job.status = "SUCCESS"
            job.is_running = False
            job.message = (
                f"Sincronização concluída com sucesso! "
                f"{job.items_synced['accounts']} contas, "
                f"{job.items_synced['categories']} categorias, "
                f"{job.items_synced['records']} transações, "
                f"{job.items_synced['standing_orders']} recorrências e "
                f"{job.items_synced['goals']} metas sincronizadas."
            )

        except BudgetBakersAuthError:
            job.is_running = False
            job.status = "FAILED"
            job.error = "Token inválido ou revogado pela BudgetBakers."
            job.message = job.error
            if integration:
                integration.last_sync_status = "FAILED"
                integration.last_error_message = job.error
                await db.commit()

        except BudgetBakersInitSyncError:
            job.is_running = False
            job.status = "INIT_SYNC_WAITING"
            job.error = "A BudgetBakers ainda está preparando a primeira sincronização da conta. Tente novamente em 2-3 minutos."
            job.message = job.error
            if integration:
                integration.last_sync_status = "WAITING_RETRY"
                integration.last_error_message = job.error
                await db.commit()

        except BudgetBakersRateLimitError as rle:
            job.is_running = False
            job.status = "RATE_LIMITED"
            job.error = f"Cota de requisições excedida (HTTP 429). Aguarde {rle.retry_after} segundos."
            job.message = job.error
            if integration:
                integration.last_sync_status = "RATE_LIMITED"
                integration.last_error_message = job.error
                await db.commit()

        except Exception as exc:
            logger.exception("Erro inesperado durante sincronização do Wallet:")
            job.is_running = False
            job.status = "FAILED"
            job.error = f"Falha na sincronização: {str(exc)}"
            job.message = job.error
            if integration:
                integration.last_sync_status = "FAILED"
                integration.last_error_message = str(exc)
                await db.commit()
