from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from fastapi import HTTPException, status

from app.models import Contact, Transaction, Debt
from app.schemas.contact import ContactResponse, ContactSummary, ContactStatementResponse
from app.schemas.transaction import TransactionResponse
from app.schemas.debt import DebtResponse
from app.services.attachment_service import enrich_attachment_schema

def enrich_contact_transaction(trans: Transaction) -> TransactionResponse:
    """Serializa a transação para resposta incluindo anexos tipificados."""
    attachments_list = []
    if trans.attachments:
        attachments_list = [enrich_attachment_schema(att) for att in trans.attachments]
    
    resp = TransactionResponse.model_validate(trans)
    resp.attachments = attachments_list
    resp.attachments_count = len(attachments_list)
    return resp

async def get_contact_statement(db: AsyncSession, contact_id: str) -> ContactStatementResponse:
    """Calcula o extrato e histórico completo de movimentações da conta-corrente do contato."""
    # 1. Busca o contato
    contact_query = select(Contact).where(Contact.id == contact_id)
    contact_res = await db.execute(contact_query)
    contact = contact_res.scalar_one_or_none()
    if not contact:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Contato não encontrado."
        )

    # 2. Busca todas as transações vinculadas ao contato
    trans_query = (
        select(Transaction)
        .where(Transaction.contact_id == contact_id)
        .options(selectinload(Transaction.attachments))
        .order_by(Transaction.due_date.desc(), Transaction.created_at.desc())
    )
    trans_res = await db.execute(trans_query)
    transactions = trans_res.scalars().all()

    # 3. Busca todas as dívidas vinculadas ao contato
    debt_query = select(Debt).where(Debt.contact_id == contact_id).order_by(Debt.created_at.desc())
    debt_res = await db.execute(debt_query)
    debts = debt_res.scalars().all()

    # 4. Calcula métricas financeiras consolidadas (em centavos)
    total_paid_cents = 0
    total_received_cents = 0
    total_pending_pay_cents = 0
    total_pending_receive_cents = 0

    for t in transactions:
        if t.status == "CONCLUIDO":
            if t.type == "DESPESA":
                total_paid_cents += t.amount_cents
            elif t.type == "RECEITA":
                total_received_cents += t.amount_cents
        elif t.status == "PENDENTE":
            if t.type == "DESPESA":
                total_pending_pay_cents += t.amount_cents
            elif t.type == "RECEITA":
                total_pending_receive_cents += t.amount_cents

    net_realized_cents = total_received_cents - total_paid_cents
    net_pending_cents = total_pending_receive_cents - total_pending_pay_cents

    active_debts = [d for d in debts if d.status == "ATIVA"]
    total_debts_cents = sum(d.total_amount_cents for d in active_debts)
    remaining_debts_cents = sum(d.remaining_amount_cents for d in active_debts)

    summary = ContactSummary(
        total_paid_cents=total_paid_cents,
        total_received_cents=total_received_cents,
        total_pending_pay_cents=total_pending_pay_cents,
        total_pending_receive_cents=total_pending_receive_cents,
        net_realized_cents=net_realized_cents,
        net_pending_cents=net_pending_cents,
        total_debts_cents=total_debts_cents,
        remaining_debts_cents=remaining_debts_cents,
        transactions_count=len(transactions),
        debts_count=len(active_debts)
    )

    enriched_transactions = [enrich_contact_transaction(t) for t in transactions]
    debts_response = [DebtResponse.model_validate(d) for d in debts]

    return ContactStatementResponse(
        contact=ContactResponse.model_validate(contact),
        summary=summary,
        transactions=enriched_transactions,
        debts=debts_response
    )
