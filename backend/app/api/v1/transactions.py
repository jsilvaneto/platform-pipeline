from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, update
from sqlalchemy.orm import selectinload
from typing import List, Optional

from app.database import get_db
from app.models import Transaction, Debt, User, Attachment, CreditCard, Category, Account
from app.schemas.transaction import (
    TransactionCreate, TransactionUpdate, TransactionResponse,
    TransactionBatchAction, TransactionBatchComplete, TransactionBatchUpdate, TransactionBatchResponse
)
from app.services.attachment_service import enrich_attachment_schema
from app.services.credit_card_service import (
    calculate_invoice_period_and_due_date,
    sync_card_invoice_transaction,
    sync_all_card_invoices
)
from app.api.v1.deps import get_current_user
from datetime import datetime, timezone, date

router = APIRouter(prefix="/transactions", tags=["Transações e Fluxo"])

def enrich_transaction_response(trans: Transaction) -> TransactionResponse:
    """Serializa a transação incluindo lista de comprovantes e contador."""
    attachments_list = []
    if trans.attachments:
        attachments_list = [enrich_attachment_schema(att) for att in trans.attachments]
    
    resp = TransactionResponse.model_validate(trans)
    resp.attachments = attachments_list
    resp.attachments_count = len(attachments_list)
    return resp

@router.get("", response_model=List[TransactionResponse])
async def list_transactions(
    profile: Optional[str] = Query(None, description="Filtrar por PESSOAL ou EMPRESA"),
    type: Optional[str] = Query(None, description="RECEITA ou DESPESA"),
    status_filter: Optional[str] = Query(None, alias="status", description="PENDENTE, CONCLUIDO, CANCELADO"),
    start_due_date: Optional[str] = Query(None, description="Vencimento inicial (YYYY-MM-DD)"),
    end_due_date: Optional[str] = Query(None, description="Vencimento final (YYYY-MM-DD)"),
    category_id: Optional[str] = Query(None, description="Filtrar por Categoria"),
    account_id: Optional[str] = Query(None, description="Filtrar por Conta Bancária / Carteira"),
    payment_method_id: Optional[str] = Query(None, description="Filtrar por Forma de Pagamento"),
    credit_card_id: Optional[str] = Query(None, description="Filtrar por Cartão de Crédito"),
    include_card_expenses: bool = Query(False, description="Incluir compras individuais de cartão de crédito no extrato geral"),
    is_invoice_payment: Optional[bool] = Query(None, description="Filtrar lançamentos de débito de fatura"),
    contact_id: Optional[str] = Query(None, description="Filtrar por Contato / Favorecido"),
    debt_id: Optional[str] = Query(None, description="Filtrar por Dívida vinculada"),
    search: Optional[str] = Query(None, description="Busca textual na descrição ou observações"),
    is_overdue: Optional[bool] = Query(None, description="Filtrar apenas contas em atraso (vencidas e não pagas)"),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user)
):
    # Sincroniza faturas ativas para garantir que o lançamento consolidado de fatura reflita o consumo atualizado
    if isinstance(profile, str) and profile:
        await sync_all_card_invoices(db, profile=profile)
    else:
        await sync_all_card_invoices(db)

    query = select(Transaction).options(selectinload(Transaction.attachments))
    if isinstance(profile, str) and profile:
        query = query.where(Transaction.profile == profile)
    if isinstance(type, str) and type:
        query = query.where(Transaction.type == type)
    if isinstance(status_filter, str) and status_filter:
        query = query.where(Transaction.status == status_filter)
    if is_overdue is True:
        today_iso = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        query = query.where(Transaction.status == "PENDENTE", Transaction.due_date < today_iso)
    if isinstance(start_due_date, str) and start_due_date:
        query = query.where(Transaction.due_date >= start_due_date)
    if isinstance(end_due_date, str) and end_due_date:
        query = query.where(Transaction.due_date <= end_due_date)
    if isinstance(category_id, str) and category_id:
        query = query.where(Transaction.category_id == category_id)
    if isinstance(account_id, str) and account_id:
        query = query.where(
            or_(
                Transaction.account_id == account_id,
                Transaction.destination_account_id == account_id
            )
        )
    if isinstance(is_invoice_payment, bool):
        query = query.where(Transaction.is_invoice_payment == (1 if is_invoice_payment else 0))
        if isinstance(credit_card_id, str) and credit_card_id:
            query = query.where(Transaction.credit_card_id == credit_card_id)
    elif not include_card_expenses:
        # Por padrão, mantém o extrato de lançamentos limpo:
        # Exibe apenas movimentações diretas de contas/caixas e despesas consolidadas de fatura
        if isinstance(credit_card_id, str) and credit_card_id:
            query = query.where(Transaction.credit_card_id == credit_card_id, Transaction.is_invoice_payment == 1)
        else:
            query = query.where(or_(Transaction.credit_card_id.is_(None), Transaction.is_invoice_payment == 1))
    elif isinstance(credit_card_id, str) and credit_card_id:
        query = query.where(Transaction.credit_card_id == credit_card_id)
    if isinstance(contact_id, str) and contact_id:
        query = query.where(Transaction.contact_id == contact_id)
    if isinstance(debt_id, str) and debt_id:
        query = query.where(Transaction.debt_id == debt_id)
    if isinstance(search, str) and search.strip():
        term = f"%{search.strip()}%"
        query = query.where(or_(Transaction.description.ilike(term), Transaction.notes.ilike(term)))
        
    query = query.execution_options(populate_existing=True).order_by(Transaction.due_date.asc(), Transaction.created_at.asc())
    result = await db.execute(query)
    transactions = result.scalars().all()
    return [enrich_transaction_response(t) for t in transactions]

@router.post("", response_model=TransactionResponse, status_code=status.HTTP_201_CREATED)
async def create_transaction(
    trans_in: TransactionCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user)
):
    trans_data = trans_in.model_dump()
    attachment_ids = trans_data.pop("attachment_ids", None)

    for fk in ["account_id", "destination_account_id", "credit_card_id", "category_id", "item_id", "contact_id", "debt_id", "payment_method_id", "notes", "payment_date"]:
        if fk in trans_data and trans_data[fk] == "":
            trans_data[fk] = None

    # Validações para Transferência Interna
    if trans_data.get("type") == "TRANSFERENCIA":
        if not trans_data.get("account_id") or not trans_data.get("destination_account_id"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Transferências exigem a conta de origem (account_id) e a conta de destino (destination_account_id)."
            )
        if trans_data.get("account_id") == trans_data.get("destination_account_id"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A conta de origem e a conta de destino não podem ser iguais."
            )
        if not trans_data.get("category_id"):
            cat_query = select(Category).where(
                Category.profile == trans_data["profile"],
                Category.name == "Transferência Interna"
            )
            cat_res = await db.execute(cat_query)
            transfer_cat = cat_res.scalar_one_or_none()
            if not transfer_cat:
                transfer_cat = Category(
                    profile=trans_data["profile"],
                    type="DESPESA",
                    nature="NENHUM",
                    name="Transferência Interna"
                )
                db.add(transfer_cat)
                await db.flush()
            trans_data["category_id"] = transfer_cat.id

    # Se estiver vinculado a cartão de crédito e não tiver competência informada, calcula automaticamente
    if trans_data.get("credit_card_id") and not (trans_data.get("invoice_month") and trans_data.get("invoice_year")):
        card = await db.get(CreditCard, trans_data["credit_card_id"])
        if card:
            try:
                base_dt = datetime.strptime(trans_data["due_date"], "%Y-%m-%d").date()
            except Exception:
                base_dt = date.today()
            inv_m, inv_y, _, _, calc_due = calculate_invoice_period_and_due_date(
                base_dt, card.closing_day, card.due_day
            )
            trans_data["invoice_month"] = inv_m
            trans_data["invoice_year"] = inv_y
            trans_data["due_date"] = calc_due

    new_trans = Transaction(**trans_data)
    db.add(new_trans)
    
    # Se já for criada como CONCLUIDO e vinculada a uma dívida, abate o saldo
    if new_trans.status == "CONCLUIDO" and new_trans.debt_id:
        debt_query = select(Debt).where(Debt.id == new_trans.debt_id)
        debt_res = await db.execute(debt_query)
        debt = debt_res.scalar_one_or_none()
        if debt:
            debt.remaining_amount_cents = max(0, debt.remaining_amount_cents - new_trans.amount_cents)
            if debt.remaining_amount_cents == 0:
                debt.status = "QUITADA"

    await db.commit()
    await db.refresh(new_trans)

    # Vincula comprovantes pré-carregados se informados
    if attachment_ids:
        await db.execute(
            update(Attachment)
            .where(Attachment.id.in_(attachment_ids))
            .values(transaction_id=new_trans.id)
        )
        await db.commit()

    # Se for compra individual no cartão, sincroniza o lançamento consolidado de fatura na tela de lançamentos
    if new_trans.credit_card_id and new_trans.invoice_year and new_trans.invoice_month and new_trans.is_invoice_payment == 0:
        await sync_card_invoice_transaction(db, new_trans.credit_card_id, new_trans.invoice_year, new_trans.invoice_month)
        await db.commit()

    # Recarrega com relacionamentos
    query = select(Transaction).options(selectinload(Transaction.attachments)).where(Transaction.id == new_trans.id)
    reloaded = (await db.execute(query)).scalar_one()
    return enrich_transaction_response(reloaded)

@router.get("/{trans_id}", response_model=TransactionResponse)
async def get_transaction(
    trans_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user)
):
    query = select(Transaction).options(selectinload(Transaction.attachments)).where(Transaction.id == trans_id)
    trans = (await db.execute(query)).scalar_one_or_none()
    if not trans:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transação não encontrada")
    return enrich_transaction_response(trans)

@router.patch("/{trans_id}/complete", response_model=TransactionResponse)
async def complete_transaction(
    trans_id: str,
    payment_date: Optional[str] = Query(default=None, description="Data de pagamento (YYYY-MM-DD), padrão hoje"),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user)
):
    """Marca uma transação pendente como CONCLUIDA e abate dívidas vinculadas."""
    query = select(Transaction).options(selectinload(Transaction.attachments)).where(Transaction.id == trans_id)
    result = await db.execute(query)
    trans = result.scalar_one_or_none()
    if not trans:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transação não encontrada")
    
    clean_payment_date = payment_date if isinstance(payment_date, str) and payment_date.strip() else None

    if trans.status != "CONCLUIDO":
        trans.status = "CONCLUIDO"
        trans.payment_date = clean_payment_date or datetime.now(timezone.utc).strftime("%Y-%m-%d")
        trans.sync_status = "PENDENTE"
        trans.updated_at = datetime.now(timezone.utc).isoformat()
        
        # Se for liquidação de fatura de cartão, baixa todas as compras individuais da fatura
        if trans.is_invoice_payment == 1 and trans.credit_card_id and trans.invoice_year and trans.invoice_month:
            card_items_q = select(Transaction).where(
                Transaction.credit_card_id == trans.credit_card_id,
                Transaction.invoice_year == trans.invoice_year,
                Transaction.invoice_month == trans.invoice_month,
                Transaction.is_invoice_payment == 0,
                Transaction.type == "DESPESA"
            )
            card_items = (await db.execute(card_items_q)).scalars().all()
            for ci in card_items:
                ci.status = "CONCLUIDO"
                ci.payment_date = trans.payment_date
                ci.sync_status = "PENDENTE"

        # Abatimento em dívida
        if trans.debt_id:
            debt_query = select(Debt).where(Debt.id == trans.debt_id)
            debt_res = await db.execute(debt_query)
            debt = debt_res.scalar_one_or_none()
            if debt:
                debt.remaining_amount_cents = max(0, debt.remaining_amount_cents - trans.amount_cents)
                if debt.remaining_amount_cents == 0:
                    debt.status = "QUITADA"
                    
        await db.commit()
        
    reload_query = select(Transaction).options(selectinload(Transaction.attachments)).where(Transaction.id == trans.id)
    reloaded = (await db.execute(reload_query)).scalar_one()
    return enrich_transaction_response(reloaded)

@router.patch("/{trans_id}/uncomplete", response_model=TransactionResponse)
async def uncomplete_transaction(
    trans_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user)
):
    """Desmarca uma transação liquidada, retornando para PENDENTE e restaurando saldos de dívida se houver."""
    query = select(Transaction).options(selectinload(Transaction.attachments)).where(Transaction.id == trans_id)
    result = await db.execute(query)
    trans = result.scalar_one_or_none()
    if not trans:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transação não encontrada")
    
    if trans.status == "CONCLUIDO":
        trans.status = "PENDENTE"
        trans.payment_date = None
        trans.sync_status = "PENDENTE"
        trans.updated_at = datetime.now(timezone.utc).isoformat()
        
        # Se for fatura de cartão, retorna todas as compras da fatura para PENDENTE
        if trans.is_invoice_payment == 1 and trans.credit_card_id and trans.invoice_year and trans.invoice_month:
            card_items_q = select(Transaction).where(
                Transaction.credit_card_id == trans.credit_card_id,
                Transaction.invoice_year == trans.invoice_year,
                Transaction.invoice_month == trans.invoice_month,
                Transaction.is_invoice_payment == 0,
                Transaction.type == "DESPESA"
            )
            card_items = (await db.execute(card_items_q)).scalars().all()
            for ci in card_items:
                ci.status = "PENDENTE"
                ci.payment_date = None
                ci.sync_status = "PENDENTE"

        # Restaura saldo de dívida
        if trans.debt_id:
            debt_query = select(Debt).where(Debt.id == trans.debt_id)
            debt_res = await db.execute(debt_query)
            debt = debt_res.scalar_one_or_none()
            if debt:
                debt.remaining_amount_cents = min(debt.total_amount_cents, debt.remaining_amount_cents + trans.amount_cents)
                if debt.status == "QUITADA" and debt.remaining_amount_cents > 0:
                    debt.status = "ATIVA"
                    
        await db.commit()
        
    reload_query = select(Transaction).options(selectinload(Transaction.attachments)).where(Transaction.id == trans.id)
    reloaded = (await db.execute(reload_query)).scalar_one()
    return enrich_transaction_response(reloaded)

@router.patch("/{trans_id}/toggle-status", response_model=TransactionResponse)
async def toggle_transaction_status(
    trans_id: str,
    payment_date: Optional[str] = Query(default=None, description="Data de pagamento (YYYY-MM-DD), padrão hoje"),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user)
):
    """Alterna o status da transação entre CONCLUIDO e PENDENTE."""
    query = select(Transaction).options(selectinload(Transaction.attachments)).where(Transaction.id == trans_id)
    result = await db.execute(query)
    trans = result.scalar_one_or_none()
    if not trans:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transação não encontrada")
    
    clean_payment_date = payment_date if isinstance(payment_date, str) and payment_date.strip() else None

    if trans.status == "CONCLUIDO":
        return await uncomplete_transaction(trans_id=trans_id, db=db, _=_)
    else:
        return await complete_transaction(trans_id=trans_id, payment_date=clean_payment_date, db=db, _=_)

@router.put("/{trans_id}", response_model=TransactionResponse)
async def update_transaction(
    trans_id: str,
    trans_in: TransactionUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user)
):
    query = select(Transaction).options(selectinload(Transaction.attachments)).where(Transaction.id == trans_id)
    result = await db.execute(query)
    trans = result.scalar_one_or_none()
    if not trans:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transação não encontrada")
    
    old_card_id = trans.credit_card_id
    old_inv_y = trans.invoice_year
    old_inv_m = trans.invoice_month

    update_data = trans_in.model_dump(exclude_unset=True)
    attachment_ids = update_data.pop("attachment_ids", None)

    for fk in ["account_id", "destination_account_id", "credit_card_id", "category_id", "item_id", "contact_id", "debt_id", "payment_method_id", "notes", "payment_date"]:
        if fk in update_data and update_data[fk] == "":
            update_data[fk] = None

    # Validação de Transferência
    target_type = update_data.get("type", trans.type)
    if target_type == "TRANSFERENCIA":
        src_acc = update_data.get("account_id", trans.account_id)
        dst_acc = update_data.get("destination_account_id", trans.destination_account_id)
        if not src_acc or not dst_acc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Transferências exigem conta de origem e conta de destino."
            )
        if src_acc == dst_acc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A conta de origem e a conta de destino não podem ser iguais."
            )

    old_status = trans.status
    for field, value in update_data.items():
        setattr(trans, field, value)
    
    # Se alterou para CONCLUIDO e não tinha data de quitação, define hoje
    if trans.status == "CONCLUIDO" and not trans.payment_date:
        trans.payment_date = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    elif trans.status == "PENDENTE" and "payment_date" not in update_data:
        trans.payment_date = None

    # Abatimento em dívida se acabou de ser marcada como CONCLUIDO
    if old_status != "CONCLUIDO" and trans.status == "CONCLUIDO" and trans.debt_id:
        debt_query = select(Debt).where(Debt.id == trans.debt_id)
        debt_res = await db.execute(debt_query)
        debt = debt_res.scalar_one_or_none()
        if debt:
            debt.remaining_amount_cents = max(0, debt.remaining_amount_cents - trans.amount_cents)
            if debt.remaining_amount_cents == 0:
                debt.status = "QUITADA"

    trans.sync_status = "PENDENTE"
    trans.updated_at = datetime.now(timezone.utc).isoformat()

    # Vincula novos anexos adicionados durante a edição
    if attachment_ids:
        await db.execute(
            update(Attachment)
            .where(Attachment.id.in_(attachment_ids))
            .values(transaction_id=trans.id)
        )

    await db.commit()

    # Sincroniza faturas se envolver cartão de crédito
    if old_card_id and old_inv_y and old_inv_m:
        await sync_card_invoice_transaction(db, old_card_id, old_inv_y, old_inv_m)
    if trans.credit_card_id and trans.invoice_year and trans.invoice_month and (trans.credit_card_id != old_card_id or trans.invoice_year != old_inv_y or trans.invoice_month != old_inv_m):
        await sync_card_invoice_transaction(db, trans.credit_card_id, trans.invoice_year, trans.invoice_month)
    await db.commit()
    
    # Recarrega com anexos atualizados
    reload_query = select(Transaction).options(selectinload(Transaction.attachments)).where(Transaction.id == trans.id)
    reloaded = (await db.execute(reload_query)).scalar_one()
    return enrich_transaction_response(reloaded)

@router.delete("/{trans_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_transaction(
    trans_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user)
):
    query = select(Transaction).where(Transaction.id == trans_id)
    result = await db.execute(query)
    trans = result.scalar_one_or_none()
    if not trans:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transação não encontrada")
    
    card_id = trans.credit_card_id
    inv_y = trans.invoice_year
    inv_m = trans.invoice_month
    is_inv = trans.is_invoice_payment

    await db.delete(trans)
    await db.commit()

    if card_id and inv_y and inv_m and is_inv == 0:
        await sync_card_invoice_transaction(db, card_id, inv_y, inv_m)
        await db.commit()

# --- ENDPOINTS DE AÇÕES EM LOTE (BATCH ACTIONS) ---

@router.post("/batch/complete", response_model=TransactionBatchResponse)
async def batch_complete_transactions(
    payload: TransactionBatchComplete,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user)
):
    """Liquida múltiplos lançamentos selecionados de uma só vez."""
    query = select(Transaction).where(Transaction.id.in_(payload.transaction_ids))
    result = await db.execute(query)
    transactions = result.scalars().all()
    
    pay_date = payload.payment_date if payload.payment_date and payload.payment_date.strip() else datetime.now(timezone.utc).strftime("%Y-%m-%d")
    count = 0
    
    for trans in transactions:
        if trans.status != "CONCLUIDO":
            trans.status = "CONCLUIDO"
            trans.payment_date = pay_date
            trans.sync_status = "PENDENTE"
            trans.updated_at = datetime.now(timezone.utc).isoformat()
            count += 1
            
            # Abatimento em dívida se houver
            if trans.debt_id:
                debt_query = select(Debt).where(Debt.id == trans.debt_id)
                debt_res = await db.execute(debt_query)
                debt = debt_res.scalar_one_or_none()
                if debt:
                    debt.remaining_amount_cents = max(0, debt.remaining_amount_cents - trans.amount_cents)
                    if debt.remaining_amount_cents == 0:
                        debt.status = "QUITADA"

    await db.commit()
    return TransactionBatchResponse(
        affected_count=count,
        message=f"{count} lançamento(s) liquidado(s) com sucesso."
    )

@router.post("/batch/uncomplete", response_model=TransactionBatchResponse)
async def batch_uncomplete_transactions(
    payload: TransactionBatchAction,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user)
):
    """Reabre múltiplos lançamentos liquidados, retornando para PENDENTE."""
    query = select(Transaction).where(Transaction.id.in_(payload.transaction_ids))
    result = await db.execute(query)
    transactions = result.scalars().all()
    count = 0

    for trans in transactions:
        if trans.status == "CONCLUIDO":
            trans.status = "PENDENTE"
            trans.payment_date = None
            trans.sync_status = "PENDENTE"
            trans.updated_at = datetime.now(timezone.utc).isoformat()
            count += 1

            # Restaura saldo de dívida se houver
            if trans.debt_id:
                debt_query = select(Debt).where(Debt.id == trans.debt_id)
                debt_res = await db.execute(debt_query)
                debt = debt_res.scalar_one_or_none()
                if debt:
                    debt.remaining_amount_cents = min(debt.total_amount_cents, debt.remaining_amount_cents + trans.amount_cents)
                    if debt.status == "QUITADA" and debt.remaining_amount_cents > 0:
                        debt.status = "ATIVA"

    await db.commit()
    return TransactionBatchResponse(
        affected_count=count,
        message=f"{count} lançamento(s) reaberto(s) para pendente."
    )

@router.post("/batch/update", response_model=TransactionBatchResponse)
async def batch_update_transactions(
    payload: TransactionBatchUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user)
):
    """Atualiza campos em lote (Categoria, Conta, Forma de Pagamento, Contato, Vencimento, etc.) para múltiplos lançamentos."""
    query = select(Transaction).where(Transaction.id.in_(payload.transaction_ids))
    result = await db.execute(query)
    transactions = result.scalars().all()
    
    update_fields = {}
    if payload.category_id is not None:
        update_fields["category_id"] = payload.category_id
    if payload.account_id is not None:
        update_fields["account_id"] = payload.account_id or None
    if payload.payment_method_id is not None:
        update_fields["payment_method_id"] = payload.payment_method_id or None
    if payload.contact_id is not None:
        update_fields["contact_id"] = payload.contact_id or None
    if payload.due_date is not None:
        update_fields["due_date"] = payload.due_date
    if payload.payment_date is not None:
        update_fields["payment_date"] = payload.payment_date or None
    if payload.notes is not None:
        update_fields["notes"] = payload.notes or None
    if payload.status is not None:
        update_fields["status"] = payload.status

    if not update_fields:
        return TransactionBatchResponse(affected_count=0, message="Nenhum campo informado para atualização.")

    now_iso = datetime.now(timezone.utc).isoformat()
    for trans in transactions:
        for f, val in update_fields.items():
            setattr(trans, f, val)
        trans.sync_status = "PENDENTE"
        trans.updated_at = now_iso

    await db.commit()
    return TransactionBatchResponse(
        affected_count=len(transactions),
        message=f"{len(transactions)} lançamento(s) atualizado(s) com sucesso."
    )

@router.post("/batch/delete", response_model=TransactionBatchResponse)
async def batch_delete_transactions(
    payload: TransactionBatchAction,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user)
):
    """Exclui múltiplos lançamentos selecionados de uma só vez."""
    query = select(Transaction).where(Transaction.id.in_(payload.transaction_ids))
    result = await db.execute(query)
    transactions = result.scalars().all()
    count = len(transactions)

    for trans in transactions:
        # Se foi concluída e tinha dívida vinculada, restaura saldo de dívida
        if trans.status == "CONCLUIDO" and trans.debt_id:
            debt_query = select(Debt).where(Debt.id == trans.debt_id)
            debt_res = await db.execute(debt_query)
            debt = debt_res.scalar_one_or_none()
            if debt:
                debt.remaining_amount_cents = min(debt.total_amount_cents, debt.remaining_amount_cents + trans.amount_cents)
                if debt.status == "QUITADA" and debt.remaining_amount_cents > 0:
                    debt.status = "ATIVA"
        await db.delete(trans)

    await db.commit()
    return TransactionBatchResponse(
        affected_count=count,
        message=f"{count} lançamento(s) excluído(s) com sucesso."
    )
