import calendar
from datetime import datetime, date, timedelta
from typing import Tuple, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, and_, or_
from fastapi import HTTPException, status

from sqlalchemy.orm import selectinload
from app.services.attachment_service import enrich_attachment_schema
from app.models import CreditCard, Transaction, Account, Category, Contact, Attachment
from app.schemas.credit_card import (
    CreditCardInvoiceItem,
    CreditCardInvoiceSummary,
    CreditCardInvoiceDetail,
    CreditCardInvoiceCategoryBreakdown,
    CreditCardInvoiceSettleRequest,
    CreditCardInvoiceSettleResponse
)

def calculate_invoice_period_and_due_date(
    purchase_date: date,
    closing_day: int,
    due_day: int
) -> Tuple[int, int, str, str, str]:
    """
    Calcula:
    1. invoice_month (Mês de competência)
    2. invoice_year (Ano de competência)
    3. period_start (YYYY-MM-DD)
    4. period_end (YYYY-MM-DD) - Data de fechamento
    5. due_date (YYYY-MM-DD) - Data de vencimento da fatura
    """
    # 1. Se a compra ocorreu antes do dia de fechamento, cai no mês da compra.
    #    Se ocorreu a partir do dia de fechamento ("melhor dia"), cai no mês seguinte.
    if purchase_date.day < closing_day:
        inv_month = purchase_date.month
        inv_year = purchase_date.year
    else:
        inv_month = 1 if purchase_date.month == 12 else purchase_date.month + 1
        inv_year = purchase_date.year + 1 if purchase_date.month == 12 else purchase_date.year

    # 2. Data de fechamento (period_end)
    max_days_inv = calendar.monthrange(inv_year, inv_month)[1]
    clamped_closing = min(closing_day, max_days_inv)
    period_end_dt = date(inv_year, inv_month, clamped_closing)

    # 3. Data de início do ciclo (dia seguinte ao fechamento anterior)
    prev_m = 12 if inv_month == 1 else inv_month - 1
    prev_y = inv_year - 1 if inv_month == 1 else inv_year
    max_days_prev = calendar.monthrange(prev_y, prev_m)[1]
    prev_clamped_closing = min(closing_day, max_days_prev)
    period_start_dt = date(prev_y, prev_m, prev_clamped_closing) + timedelta(days=1)

    # 4. Data de vencimento da fatura (due_date)
    # Se o dia de vencimento for >= dia de fechamento, vence no mesmo mês do fechamento.
    # Se for < dia de fechamento (ex: fecha dia 25 e vence dia 05), vence no mês seguinte.
    if due_day >= closing_day:
        due_m = inv_month
        due_y = inv_year
    else:
        due_m = 1 if inv_month == 12 else inv_month + 1
        due_y = inv_year + 1 if inv_month == 12 else inv_year

    max_days_due = calendar.monthrange(due_y, due_m)[1]
    clamped_due = min(due_day, max_days_due)
    due_dt = date(due_y, due_m, clamped_due)

    return (
        inv_month,
        inv_year,
        period_start_dt.strftime("%Y-%m-%d"),
        period_end_dt.strftime("%Y-%m-%d"),
        due_dt.strftime("%Y-%m-%d")
    )


async def calculate_card_limits(
    db: AsyncSession,
    card: CreditCard
) -> Tuple[int, int, int]:
    """
    Retorna (used_limit_cents, available_limit_cents, current_invoice_cents)
    """
    today = date.today()
    cur_inv_m, cur_inv_y, _, _, _ = calculate_invoice_period_and_due_date(
        today, card.closing_day, card.due_day
    )

    # Limite Comprometido (Todas as despesas pendentes neste cartão, incluindo parcelas futuras)
    used_query = select(func.coalesce(func.sum(Transaction.amount_cents), 0)).where(
        Transaction.credit_card_id == card.id,
        Transaction.type == "DESPESA",
        Transaction.is_invoice_payment == 0,
        Transaction.status == "PENDENTE"
    )
    used_limit_cents = (await db.execute(used_query)).scalar() or 0
    available_limit_cents = max(0, card.limit_cents - used_limit_cents)

    # Fatura Atual do ciclo corrente
    cur_inv_query = select(func.coalesce(func.sum(Transaction.amount_cents), 0)).where(
        Transaction.credit_card_id == card.id,
        Transaction.type == "DESPESA",
        Transaction.is_invoice_payment == 0,
        Transaction.invoice_year == cur_inv_y,
        Transaction.invoice_month == cur_inv_m,
        Transaction.status != "CANCELADO"
    )
    current_invoice_cents = (await db.execute(cur_inv_query)).scalar() or 0

    return (used_limit_cents, available_limit_cents, current_invoice_cents)


async def get_card_invoices_summary(
    db: AsyncSession,
    card: CreditCard
) -> List[CreditCardInvoiceSummary]:
    """
    Retorna a lista cronológica de faturas do cartão (passadas, atual e futuras com lançamentos).
    """
    # 1. Busca todos os pares (invoice_year, invoice_month) que possuem transações no cartão
    distinct_query = (
        select(Transaction.invoice_year, Transaction.invoice_month)
        .where(
            Transaction.credit_card_id == card.id,
            Transaction.invoice_year.isnot(None),
            Transaction.invoice_month.isnot(None),
            Transaction.is_invoice_payment == 0,
            Transaction.status != "CANCELADO"
        )
        .distinct()
    )
    distinct_rows = (await db.execute(distinct_query)).all()

    today = date.today()
    cur_inv_m, cur_inv_y, _, _, _ = calculate_invoice_period_and_due_date(
        today, card.closing_day, card.due_day
    )

    periods_set = set((row[0], row[1]) for row in distinct_rows)
    # Garante que o ciclo atual sempre apareça
    periods_set.add((cur_inv_y, cur_inv_m))

    summaries: List[CreditCardInvoiceSummary] = []

    for y, m in periods_set:
        dummy_purchase = date(y, m, 1)
        _, _, start_str, end_str, due_str = calculate_invoice_period_and_due_date(
            dummy_purchase, card.closing_day, card.due_day
        )

        # Busca transações deste ciclo
        items_query = select(Transaction).where(
            Transaction.credit_card_id == card.id,
            Transaction.invoice_year == y,
            Transaction.invoice_month == m,
            Transaction.is_invoice_payment == 0,
            Transaction.status != "CANCELADO"
        )
        items = (await db.execute(items_query)).scalars().all()

        total_cents = sum(t.amount_cents for t in items if t.type == "DESPESA")
        paid_cents = sum(t.amount_cents for t in items if t.type == "DESPESA" and t.status == "CONCLUIDO")
        remaining_cents = total_cents - paid_cents

        today_str = today.strftime("%Y-%m-%d")
        if len(items) > 0 and all(t.status == "CONCLUIDO" for t in items):
            inv_status = "PAGA"
        elif today_str > end_str:
            inv_status = "FECHADA"
        else:
            inv_status = "ABERTA"

        summaries.append(CreditCardInvoiceSummary(
            card_id=card.id,
            card_name=card.name,
            month=m,
            year=y,
            period_start=start_str,
            period_end=end_str,
            due_date=due_str,
            status=inv_status,
            total_cents=total_cents,
            paid_cents=paid_cents,
            remaining_cents=remaining_cents,
            items_count=len(items)
        ))

    # Ordena por ano e mês decrescente
    summaries.sort(key=lambda s: (s.year, s.month), reverse=True)
    return summaries


async def get_invoice_detail(
    db: AsyncSession,
    card: CreditCard,
    year: int,
    month: int
) -> CreditCardInvoiceDetail:
    """
    Retorna o detalhe da fatura com a listagem de todos os lançamentos que a compõem e distribuição por categoria.
    """
    dummy_purchase = date(year, month, 1)
    _, _, start_str, end_str, due_str = calculate_invoice_period_and_due_date(
        dummy_purchase, card.closing_day, card.due_day
    )

    query = (
        select(
            Transaction,
            Category.name.label("category_name"),
            Contact.name.label("contact_name")
        )
        .options(selectinload(Transaction.attachments))
        .join(Category, Transaction.category_id == Category.id)
        .outerjoin(Contact, Transaction.contact_id == Contact.id)
        .where(
            Transaction.credit_card_id == card.id,
            Transaction.invoice_year == year,
            Transaction.invoice_month == month,
            Transaction.is_invoice_payment == 0,
            Transaction.status != "CANCELADO"
        )
        .order_by(Transaction.due_date.asc(), Transaction.created_at.asc())
    )
    results = (await db.execute(query)).all()

    items: List[CreditCardInvoiceItem] = []
    total_cents = 0
    paid_cents = 0
    cat_totals: dict = {}

    for t, cat_name, con_name in results:
        if t.type == "DESPESA":
            total_cents += t.amount_cents
            if t.status == "CONCLUIDO":
                paid_cents += t.amount_cents
            
            if t.category_id:
                if t.category_id not in cat_totals:
                    cat_totals[t.category_id] = {"name": cat_name, "amount_cents": 0}
                cat_totals[t.category_id]["amount_cents"] += t.amount_cents

        attachments_list = []
        if t.attachments:
            attachments_list = [enrich_attachment_schema(att) for att in t.attachments]

        items.append(CreditCardInvoiceItem(
            id=t.id,
            description=t.description,
            amount_cents=t.amount_cents,
            category_id=t.category_id,
            category_name=cat_name,
            contact_id=t.contact_id,
            contact_name=con_name,
            due_date=t.due_date,
            payment_date=t.payment_date,
            created_at=t.created_at,
            installment_number=t.installment_number,
            total_installments=t.total_installments,
            status=t.status, # type: ignore
            notes=t.notes,
            attachments=attachments_list,
            attachments_count=len(attachments_list)
        ))

    today_str = date.today().strftime("%Y-%m-%d")
    if len(items) > 0 and all(item.status == "CONCLUIDO" for item in items):
        inv_status = "PAGA"
    elif today_str > end_str:
        inv_status = "FECHADA"
    else:
        inv_status = "ABERTA"

    category_breakdown: List[CreditCardInvoiceCategoryBreakdown] = []
    for c_id, data in sorted(cat_totals.items(), key=lambda x: x[1]["amount_cents"], reverse=True):
        pct = round((data["amount_cents"] / total_cents) * 100, 1) if total_cents > 0 else 0.0
        category_breakdown.append(CreditCardInvoiceCategoryBreakdown(
            category_id=c_id,
            category_name=data["name"],
            amount_cents=data["amount_cents"],
            percentage=pct
        ))

    return CreditCardInvoiceDetail(
        card_id=card.id,
        card_name=card.name,
        month=month,
        year=year,
        period_start=start_str,
        period_end=end_str,
        due_date=due_str,
        status=inv_status,
        total_cents=total_cents,
        paid_cents=paid_cents,
        remaining_cents=total_cents - paid_cents,
        items_count=len(items),
        items=items,
        category_breakdown=category_breakdown
    )


async def sync_card_invoice_transaction(
    db: AsyncSession,
    card_id: str,
    invoice_year: int,
    invoice_month: int
) -> Optional[Transaction]:
    """
    Mantém sincronizado o lançamento geral de fatura (is_invoice_payment = 1) no extrato de Lançamentos:
    - Se houver compras pendentes no ciclo, cria ou atualiza a transação com status PENDENTE e valor consolidado.
    - Se a fatura estiver totalmente liquidada, mantém o status CONCLUIDO e valor total pago.
    - Se todas as compras forem excluídas ou zeradas, remove o lançamento de fatura pendente.
    """
    card = await db.get(CreditCard, card_id)
    if not card or not invoice_year or not invoice_month:
        return None

    # Busca todas as despesas individuais da fatura
    items_query = select(Transaction).where(
        Transaction.credit_card_id == card.id,
        Transaction.invoice_year == invoice_year,
        Transaction.invoice_month == invoice_month,
        Transaction.is_invoice_payment == 0,
        Transaction.type == "DESPESA",
        Transaction.status != "CANCELADO"
    )
    items = (await db.execute(items_query)).scalars().all()

    total_cents = sum(item.amount_cents for item in items)
    pending_items = [item for item in items if item.status == "PENDENTE"]
    pending_cents = sum(item.amount_cents for item in pending_items)
    paid_items = [item for item in items if item.status == "CONCLUIDO"]
    paid_cents = sum(item.amount_cents for item in paid_items)

    dummy_purchase = date(invoice_year, invoice_month, 1)
    _, _, _, _, due_date_str = calculate_invoice_period_and_due_date(
        dummy_purchase, card.closing_day, card.due_day
    )

    desc = f"Fatura {card.name} - {invoice_month:02d}/{invoice_year}"
    legacy_desc = f"Pagamento Fatura {card.name} - {invoice_month:02d}/{invoice_year}"

    # Busca se já existe o lançamento de fatura
    inv_query = select(Transaction).where(
        Transaction.profile == card.profile,
        Transaction.credit_card_id == card.id,
        Transaction.is_invoice_payment == 1,
        Transaction.invoice_year == invoice_year,
        Transaction.invoice_month == invoice_month
    )
    existing_inv = (await db.execute(inv_query)).scalars().first()

    # Caso 1: Nenhuma compra neste ciclo
    if total_cents == 0:
        if existing_inv and existing_inv.status == "PENDENTE":
            await db.delete(existing_inv)
            await db.flush()
        return None

    # Resolve categoria padrão (busca categoria de fatura ou primeira de despesa)
    category_id = None
    if existing_inv and existing_inv.category_id:
        category_id = existing_inv.category_id
    else:
        cat_q = select(Category).where(
            Category.profile == card.profile,
            Category.type == "DESPESA"
        ).order_by(
            Category.name.ilike("%fatura%").desc(),
            Category.name.ilike("%cartão%").desc(),
            Category.name.asc()
        )
        cat_obj = (await db.execute(cat_q)).scalars().first()
        category_id = cat_obj.id if cat_obj else None

    # Caso 2: Todas as compras pagas
    if len(pending_items) == 0 and paid_cents > 0:
        if existing_inv:
            existing_inv.description = desc
            existing_inv.amount_cents = paid_cents
            existing_inv.status = "CONCLUIDO"
            existing_inv.due_date = due_date_str
            existing_inv.invoice_year = invoice_year
            existing_inv.invoice_month = invoice_month
            existing_inv.credit_card_id = card.id
            if not existing_inv.account_id and card.account_id:
                existing_inv.account_id = card.account_id
            existing_inv.sync_status = "PENDENTE"
            existing_inv.notes = f"Fatura consolidada do cartão {card.name} ({len(items)} compras)"
            await db.flush()
            return existing_inv
        else:
            inv_trans = Transaction(
                profile=card.profile,
                type="DESPESA",
                account_id=card.account_id,
                category_id=category_id,
                credit_card_id=card.id,
                invoice_year=invoice_year,
                invoice_month=invoice_month,
                description=desc,
                amount_cents=paid_cents,
                due_date=due_date_str,
                status="CONCLUIDO",
                sync_status="PENDENTE",
                is_invoice_payment=1,
                notes=f"Fatura consolidada do cartão {card.name} ({len(items)} compras)"
            )
            db.add(inv_trans)
            await db.flush()
            return inv_trans

    # Caso 3: Há compras pendentes (Fatura Aberta ou Parcialmente Paga)
    target_amount = pending_cents if paid_cents > 0 else total_cents
    if existing_inv:
        existing_inv.description = desc
        existing_inv.amount_cents = target_amount
        existing_inv.due_date = due_date_str
        existing_inv.invoice_year = invoice_year
        existing_inv.invoice_month = invoice_month
        existing_inv.credit_card_id = card.id
        if existing_inv.status != "CONCLUIDO":
            existing_inv.status = "PENDENTE"
        if not existing_inv.account_id and card.account_id:
            existing_inv.account_id = card.account_id
        existing_inv.sync_status = "PENDENTE"
        existing_inv.notes = f"Fatura consolidada do cartão {card.name} ({len(items)} compras)"
        await db.flush()
        return existing_inv
    else:
        inv_trans = Transaction(
            profile=card.profile,
            type="DESPESA",
            account_id=card.account_id,
            category_id=category_id,
            credit_card_id=card.id,
            invoice_year=invoice_year,
            invoice_month=invoice_month,
            description=desc,
            amount_cents=target_amount,
            due_date=due_date_str,
            status="PENDENTE",
            sync_status="PENDENTE",
            is_invoice_payment=1,
            notes=f"Fatura consolidada do cartão {card.name} ({len(items)} compras)"
        )
        db.add(inv_trans)
        await db.flush()
        return inv_trans


async def sync_all_card_invoices(
    db: AsyncSession,
    profile: Optional[str] = None
) -> None:
    """
    Sincroniza todos os ciclos de faturas existentes para todos os cartões cadastrados.
    """
    cards_query = select(CreditCard)
    if profile:
        cards_query = cards_query.where(CreditCard.profile == profile)
    cards = (await db.execute(cards_query)).scalars().all()

    for card in cards:
        distinct_query = (
            select(Transaction.invoice_year, Transaction.invoice_month)
            .where(
                Transaction.credit_card_id == card.id,
                Transaction.invoice_year.isnot(None),
                Transaction.invoice_month.isnot(None),
                Transaction.is_invoice_payment == 0,
                Transaction.status != "CANCELADO"
            )
            .distinct()
        )
        distinct_rows = (await db.execute(distinct_query)).all()
        for y, m in distinct_rows:
            await sync_card_invoice_transaction(db, card.id, y, m)
    
    await db.commit()


async def settle_card_invoice(
    db: AsyncSession,
    card: CreditCard,
    year: int,
    month: int,
    req: CreditCardInvoiceSettleRequest
) -> CreditCardInvoiceSettleResponse:
    """
    Executa a liquidação da fatura:
    1. Marca todos os lançamentos pendentes da fatura como CONCLUIDO
    2. Atualiza/Cria a saída de fatura consolidada na conta bancária informada
    """
    # 1. Valida conta bancária
    account = await db.get(Account, req.account_id)
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conta bancária de débito não encontrada."
        )

    # 2. Busca lançamentos pendentes desta fatura
    pending_query = select(Transaction).where(
        Transaction.credit_card_id == card.id,
        Transaction.invoice_year == year,
        Transaction.invoice_month == month,
        Transaction.is_invoice_payment == 0,
        Transaction.status == "PENDENTE",
        Transaction.type == "DESPESA"
    )
    pending_items = (await db.execute(pending_query)).scalars().all()

    if not pending_items:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Esta fatura não possui lançamentos pendentes para liquidação."
        )

    total_pending_cents = sum(t.amount_cents for t in pending_items)
    amount_to_settle = req.amount_cents if (req.amount_cents and req.amount_cents > 0) else total_pending_cents

    # 3. Dá baixa em todos os lançamentos da fatura
    for item in pending_items:
        item.status = "CONCLUIDO"
        item.payment_date = req.payment_date
        item.sync_status = "PENDENTE"

    # 4. Atualiza a transação consolidada de fatura
    inv_trans = await sync_card_invoice_transaction(db, card.id, year, month)
    if not inv_trans:
        # Fallback caso não existisse
        dummy_purchase = date(year, month, 1)
        _, _, _, _, due_str = calculate_invoice_period_and_due_date(
            dummy_purchase, card.closing_day, card.due_day
        )
        inv_trans = Transaction(
            profile=card.profile,
            type="DESPESA",
            account_id=req.account_id,
            category_id=req.category_id,
            credit_card_id=card.id,
            invoice_year=year,
            invoice_month=month,
            description=f"Fatura {card.name} - {month:02d}/{year}",
            amount_cents=amount_to_settle,
            due_date=due_str,
            payment_date=req.payment_date,
            status="CONCLUIDO",
            sync_status="PENDENTE",
            is_invoice_payment=1,
            notes=req.notes or f"Liquidação consolidada da fatura {month:02d}/{year} ({len(pending_items)} compras)"
        )
        db.add(inv_trans)

    inv_trans.status = "CONCLUIDO"
    inv_trans.payment_date = req.payment_date
    inv_trans.account_id = req.account_id
    if req.payment_method_id:
        inv_trans.payment_method_id = req.payment_method_id
    if req.category_id:
        inv_trans.category_id = req.category_id
    if req.notes:
        inv_trans.notes = req.notes
    inv_trans.amount_cents = amount_to_settle

    await db.commit()
    await db.refresh(inv_trans)

    return CreditCardInvoiceSettleResponse(
        card_id=card.id,
        month=month,
        year=year,
        total_settled_cents=amount_to_settle,
        settled_items_count=len(pending_items),
        bank_transaction_id=inv_trans.id,
        message=f"Fatura de {month:02d}/{year} liquidada com sucesso. Gerada saída de R$ {amount_to_settle / 100:.2f} na conta {account.name}."
    )


async def unsettle_card_invoice(
    db: AsyncSession,
    card: CreditCard,
    year: int,
    month: int
) -> dict:
    """
    Estorna/Reabre a fatura:
    1. Retorna os lançamentos para PENDENTE
    2. Reverte a fatura consolidada para status PENDENTE
    """
    items_query = select(Transaction).where(
        Transaction.credit_card_id == card.id,
        Transaction.invoice_year == year,
        Transaction.invoice_month == month,
        Transaction.is_invoice_payment == 0,
        Transaction.type == "DESPESA"
    )
    items = (await db.execute(items_query)).scalars().all()

    for item in items:
        item.status = "PENDENTE"
        item.payment_date = None
        item.sync_status = "PENDENTE"

    # Atualiza a transação consolidada de fatura de volta para PENDENTE
    inv_trans = await sync_card_invoice_transaction(db, card.id, year, month)
    if inv_trans:
        inv_trans.status = "PENDENTE"
        inv_trans.payment_date = None
        inv_trans.sync_status = "PENDENTE"

    await db.commit()
    return {
        "card_id": card.id,
        "month": month,
        "year": year,
        "message": f"Fatura de {month:02d}/{year} reaberta com sucesso. Lançamentos retornados para pendente."
    }
