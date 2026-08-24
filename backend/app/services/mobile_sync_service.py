import json
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from app.models import (
    Transaction, Category, Item, Contact, Account, 
    PaymentMethod, CreditCard, Debt, Budget, Goal, 
    Schedule, SyncLog, Attachment, generate_uuid, now_utc_iso
)
from app.schemas.sync import (
    MobileTransactionSyncItem,
    MobileSyncPushResponse,
    MobileSyncPullResponse,
    SyncStatusResponse,
)
from app.services.attachment_service import get_storage_directory, is_directory_writable

async def record_sync_log(
    db: AsyncSession,
    action: str,
    status: str,
    message: str,
    imported: int = 0,
    exported: int = 0,
    details: Optional[str] = None
) -> SyncLog:
    """Registra uma entrada de auditoria na tabela sync_logs."""
    log = SyncLog(
        id=generate_uuid(),
        action=action,
        status=status,
        items_imported=imported,
        items_exported=exported,
        message=message,
        details=details,
        created_at=now_utc_iso()
    )
    db.add(log)
    await db.commit()
    return log

async def get_sync_status(db: AsyncSession) -> SyncStatusResponse:
    """Retorna métricas operacionais da API e integridade do armazenamento."""
    # 1. Total de transações
    trans_count = (await db.execute(select(func.count(Transaction.id)))).scalar_one() or 0
    att_count = (await db.execute(select(func.count(Attachment.id)))).scalar_one() or 0

    # 2. Saúde do diretório de armazenamento
    storage_dir = await get_storage_directory(db)
    is_writable = is_directory_writable(storage_dir)

    # 3. Último log de sincronização
    last_log_query = select(SyncLog).order_by(SyncLog.created_at.desc()).limit(1)
    last_log = (await db.execute(last_log_query)).scalar_one_or_none()

    return SyncStatusResponse(
        api_online=True,
        server_time=now_utc_iso(),
        database="SQLite WAL",
        total_transactions=trans_count,
        total_attachments=att_count,
        storage_healthy=is_writable,
        last_sync_at=last_log.created_at if last_log else None,
        last_sync_status=last_log.status if last_log else None,
        last_action=last_log.action if last_log else None,
    )

async def get_mobile_sync_pull(
    db: AsyncSession,
    profile: Optional[str] = None,
    since: Optional[str] = None
) -> MobileSyncPullResponse:
    """
    Retorna o payload completo de dados mestres e lançamentos modificados
    para sincronização e cache offline no app mobile Android.
    """
    # 1. Categorias
    cat_query = select(Category).order_by(Category.name.asc())
    if profile:
        cat_query = cat_query.where(Category.profile == profile)
    categories = (await db.execute(cat_query)).scalars().all()

    # 2. Contas
    acc_query = select(Account).order_by(Account.name.asc())
    if profile:
        acc_query = acc_query.where(Account.profile == profile)
    accounts = (await db.execute(acc_query)).scalars().all()

    # 3. Formas de Pagamento
    pm_query = select(PaymentMethod).order_by(PaymentMethod.name.asc())
    if profile:
        pm_query = pm_query.where(PaymentMethod.profile == profile)
    payment_methods = (await db.execute(pm_query)).scalars().all()

    # 4. Cartões de Crédito
    card_query = select(CreditCard).options(selectinload(CreditCard.account)).order_by(CreditCard.name.asc())
    if profile:
        card_query = card_query.where(CreditCard.profile == profile)
    credit_cards = (await db.execute(card_query)).scalars().all()

    # 5. Itens
    item_query = select(Item).options(selectinload(Item.category)).order_by(Item.name.asc())
    if profile:
        item_query = item_query.where(Item.profile == profile)
    items = (await db.execute(item_query)).scalars().all()

    # 6. Contatos
    cont_query = select(Contact).order_by(Contact.name.asc())
    if profile:
        cont_query = cont_query.where(Contact.profile == profile)
    contacts = (await db.execute(cont_query)).scalars().all()

    # 7. Dívidas
    debt_query = select(Debt).order_by(Debt.title.asc())
    if profile:
        debt_query = debt_query.where(Debt.profile == profile)
    debts = (await db.execute(debt_query)).scalars().all()

    # 8. Orçamentos
    budget_query = select(Budget).options(selectinload(Budget.category))
    if profile:
        budget_query = budget_query.where(Budget.profile == profile)
    budgets = (await db.execute(budget_query)).scalars().all()

    # 9. Metas
    goal_query = select(Goal).order_by(Goal.title.asc())
    if profile:
        goal_query = goal_query.where(Goal.profile == profile)
    goals = (await db.execute(goal_query)).scalars().all()

    # 10. Schedules / Assinaturas
    sched_query = select(Schedule).options(
        selectinload(Schedule.category),
        selectinload(Schedule.item),
        selectinload(Schedule.contact),
        selectinload(Schedule.debt),
        selectinload(Schedule.payment_method),
        selectinload(Schedule.credit_card)
    ).order_by(Schedule.description.asc())
    if profile:
        sched_query = sched_query.where(Schedule.profile == profile)
    schedules = (await db.execute(sched_query)).scalars().all()

    # 11. Transações (Delta por data de atualização se 'since' for informado, senão todas do perfil)
    trans_query = select(Transaction).options(
        selectinload(Transaction.account),
        selectinload(Transaction.destination_account),
        selectinload(Transaction.credit_card),
        selectinload(Transaction.category),
        selectinload(Transaction.item),
        selectinload(Transaction.contact),
        selectinload(Transaction.debt),
        selectinload(Transaction.schedule),
        selectinload(Transaction.payment_method),
        selectinload(Transaction.attachments)
    ).order_by(Transaction.due_date.desc(), Transaction.created_at.desc())

    if profile:
        trans_query = trans_query.where(Transaction.profile == profile)

    if since and since.strip():
        # Filtra registros modificados ou criados a partir do timestamp informado
        trans_query = trans_query.where(
            (Transaction.updated_at >= since.strip()) | (Transaction.created_at >= since.strip())
        )

    transactions = (await db.execute(trans_query)).scalars().all()

    # Registra log de auditoria
    await record_sync_log(
        db=db,
        action="MOBILE_PULL",
        status="SUCESSO",
        message=f"Mobile Pull concluído: {len(transactions)} transações e dados mestres exportados para o cliente mobile.",
        exported=len(transactions)
    )

    return MobileSyncPullResponse(
        server_timestamp=now_utc_iso(),
        profile=profile,
        categories=categories,
        accounts=accounts,
        payment_methods=payment_methods,
        credit_cards=credit_cards,
        items=items,
        contacts=contacts,
        debts=debts,
        budgets=budgets,
        goals=goals,
        schedules=schedules,
        transactions=transactions
    )

async def process_mobile_sync_push(
    db: AsyncSession,
    profile: str,
    transactions_data: List[MobileTransactionSyncItem]
) -> MobileSyncPushResponse:
    """
    Processa a lista de lançamentos criados ou alterados offline no aplicativo Android,
    gravando-os atomicamente no SQLite local.
    """
    inserted_count = 0
    updated_count = 0
    synced_ids: List[str] = []
    errors: List[str] = []

    for item in transactions_data:
        try:
            target_id = item.id if item.id and item.id.strip() else generate_uuid()

            # Verifica se a transação já existe no SQLite
            existing = await db.get(Transaction, target_id)

            if existing:
                # Atualização idempotente (Last-Write-Wins)
                existing.type = item.type
                existing.description = item.description
                existing.amount_cents = item.amount_cents
                existing.due_date = item.due_date
                existing.payment_date = item.payment_date
                existing.status = item.status
                existing.category_id = item.category_id
                existing.account_id = item.account_id
                existing.destination_account_id = item.destination_account_id
                existing.credit_card_id = item.credit_card_id
                existing.payment_method_id = item.payment_method_id
                existing.contact_id = item.contact_id
                existing.item_id = item.item_id
                existing.debt_id = item.debt_id
                existing.schedule_id = item.schedule_id
                existing.notes = item.notes
                existing.installment_number = item.installment_number
                existing.total_installments = item.total_installments
                existing.invoice_month = item.invoice_month
                existing.invoice_year = item.invoice_year
                existing.is_invoice_payment = item.is_invoice_payment or 0
                existing.sync_status = "SINCRONIZADO"
                existing.updated_at = now_utc_iso()

                updated_count += 1
                synced_ids.append(target_id)
            else:
                # Inserção de nova transação com o ID gerado pelo mobile
                new_transaction = Transaction(
                    id=target_id,
                    profile=profile,
                    type=item.type,
                    description=item.description,
                    amount_cents=item.amount_cents,
                    due_date=item.due_date,
                    payment_date=item.payment_date,
                    status=item.status,
                    category_id=item.category_id,
                    account_id=item.account_id,
                    destination_account_id=item.destination_account_id,
                    credit_card_id=item.credit_card_id,
                    payment_method_id=item.payment_method_id,
                    contact_id=item.contact_id,
                    item_id=item.item_id,
                    debt_id=item.debt_id,
                    schedule_id=item.schedule_id,
                    notes=item.notes,
                    installment_number=item.installment_number,
                    total_installments=item.total_installments,
                    invoice_month=item.invoice_month,
                    invoice_year=item.invoice_year,
                    is_invoice_payment=item.is_invoice_payment or 0,
                    sync_status="SINCRONIZADO",
                    created_at=item.created_at or now_utc_iso(),
                    updated_at=now_utc_iso()
                )
                db.add(new_transaction)
                inserted_count += 1
                synced_ids.append(target_id)

        except Exception as e:
            errors.append(f"Erro ao processar lançamento '{item.description}' ({getattr(item, 'id', 'sem_id')}): {str(e)}")

    await db.commit()

    total_processed = inserted_count + updated_count
    log_status = "SUCESSO" if not errors else ("PARCIAL" if total_processed > 0 else "ERRO")
    msg = f"Mobile Push: {inserted_count} inseridos, {updated_count} atualizados a partir do app mobile."
    if errors:
        msg += f" {len(errors)} erro(s)."

    await record_sync_log(
        db=db,
        action="MOBILE_PUSH",
        status=log_status,
        message=msg,
        imported=total_processed,
        details="\n".join(errors) if errors else None
    )

    return MobileSyncPushResponse(
        success=len(errors) == 0,
        server_timestamp=now_utc_iso(),
        inserted_count=inserted_count,
        updated_count=updated_count,
        synced_ids=synced_ids,
        errors=errors
    )
