from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from typing import List, Optional
from datetime import datetime, timedelta

from app.database import get_db
from app.models import Transaction, Account, Category, Contact, PaymentMethod, User
from app.schemas.conciliation import (
    ConciliationParsedItem, ConciliationParseResponse,
    ConciliationImportRequest, ConciliationImportResponse
)
from app.services.conciliation_service import parse_ofx_content, parse_csv_content
from app.api.v1.deps import get_current_user

router = APIRouter(prefix="/conciliation", tags=["Conciliação Bancária PJ"])

@router.post("/parse", response_model=ConciliationParseResponse)
async def parse_statement_file(
    account_id: str = Form(..., description="Conta bancária de destino"),
    profile: str = Form(..., description="Perfil (Restrito a EMPRESA)"),
    file: UploadFile = File(..., description="Arquivo .ofx ou .csv"),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user)
):
    """
    Processa arquivos de extrato bancário (.ofx / .csv), realiza deduplicação
    inteligente contra transações existentes e sugere categorias por histórico.
    Recurso exclusivo para o perfil EMPRESA.
    """
    if profile != "EMPRESA":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A conciliação bancária de extratos está disponível exclusivamente para o perfil EMPRESA."
        )

    account = await db.get(Account, account_id)
    if not account or account.profile != "EMPRESA":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conta bancária PJ não encontrada.")

    # 1. Leitura do arquivo com fallback de encodings
    raw_bytes = await file.read()
    content_str = ""
    for enc in ["utf-8", "latin-1", "cp1252", "iso-8859-1"]:
        try:
            content_str = raw_bytes.decode(enc)
            break
        except Exception:
            continue

    if not content_str:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Não foi possível decodificar o arquivo de extrato.")

    # 2. Identificação do formato e extração
    filename_lower = (file.filename or "").lower()
    if filename_lower.endswith(".ofx") or "<OFX>" in content_str.upper() or "<STMTTRN>" in content_str.upper():
        raw_items = parse_ofx_content(content_str)
    else:
        raw_items = parse_csv_content(content_str)

    if not raw_items:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Nenhuma transação financeira válida foi encontrada no extrato enviado."
        )

    # 3. Carrega transações existentes da conta para deduplicação
    existing_trans_query = select(Transaction).where(
        Transaction.profile == "EMPRESA",
        Transaction.account_id == account_id
    )
    res = await db.execute(existing_trans_query)
    existing_transactions = res.scalars().all()

    # 4. Carrega categorias, contatos e histórico de lançamentos para auto-sugestão
    cat_res = await db.execute(select(Category).where(Category.profile == "EMPRESA"))
    categories = {c.id: c.name for c in cat_res.scalars().all()}

    con_res = await db.execute(select(Contact).where(Contact.profile == "EMPRESA"))
    contacts = {c.id: c.name for c in con_res.scalars().all()}

    hist_res = await db.execute(
        select(Transaction)
        .where(Transaction.profile == "EMPRESA", Transaction.category_id.isnot(None))
        .order_by(Transaction.created_at.desc())
        .limit(200)
    )
    history_transactions = hist_res.scalars().all()

    parsed_items: List[ConciliationParsedItem] = []
    total_income = 0
    total_expense = 0
    new_cnt = 0
    dup_cnt = 0

    for item in raw_items:
        amt = item["amount_cents"]
        item_date = item["date"]
        item_type = item["type"]
        desc = item["description"]

        if item_type == "RECEITA":
            total_income += amt
        else:
            total_expense += amt

        # Verificação de Duplicidade / Match
        match_status = "NOVO"
        matched_id: Optional[str] = None
        matched_desc: Optional[str] = None

        for ex in existing_transactions:
            if ex.amount_cents == amt and ex.type == item_type and ex.due_date == item_date:
                match_status = "DUPLICADO"
                matched_id = ex.id
                matched_desc = f"{ex.description} ({ex.due_date})"
                break
            elif ex.amount_cents == amt and ex.type == item_type:
                # Compara se a data é aproximada (+/- 2 dias)
                try:
                    d1 = datetime.strptime(item_date, "%Y-%m-%d").date()
                    d2 = datetime.strptime(ex.due_date, "%Y-%m-%d").date() if ex.due_date else None
                    if d2 and abs((d1 - d2).days) <= 2:
                        match_status = "POSSIVEL_CONCILIACAO"
                        matched_id = ex.id
                        matched_desc = f"{ex.description} ({ex.due_date})"
                except Exception:
                    pass

        if match_status == "DUPLICADO":
            dup_cnt += 1
        else:
            new_cnt += 1

        # Sugestão Inteligente de Categoria e Favorecido por Palavras-Chave
        sug_cat_id: Optional[str] = None
        sug_cat_name: Optional[str] = None
        sug_con_id: Optional[str] = None
        sug_con_name: Optional[str] = None
        sug_pm_id: Optional[str] = None

        desc_words = [w.lower() for w in desc.split() if len(w) > 3]
        for hist in history_transactions:
            if any(w in hist.description.lower() for w in desc_words):
                if hist.category_id and hist.category_id in categories:
                    sug_cat_id = hist.category_id
                    sug_cat_name = categories[hist.category_id]
                if hist.contact_id and hist.contact_id in contacts:
                    sug_con_id = hist.contact_id
                    sug_con_name = contacts[hist.contact_id]
                if hist.payment_method_id:
                    sug_pm_id = hist.payment_method_id
                break

        parsed_items.append(ConciliationParsedItem(
            id=item["id"],
            fitid=item.get("fitid"),
            date=item_date,
            description=desc,
            original_description=desc,
            amount_cents=amt,
            type=item_type,
            match_status=match_status, # type: ignore
            matched_transaction_id=matched_id,
            matched_transaction_description=matched_desc,
            suggested_category_id=sug_cat_id,
            suggested_category_name=sug_cat_name,
            suggested_contact_id=sug_con_id,
            suggested_contact_name=sug_con_name,
            suggested_payment_method_id=sug_pm_id,
            selected=(match_status != "DUPLICADO")
        ))

    return ConciliationParseResponse(
        account_id=account.id,
        account_name=account.name,
        total_parsed=len(parsed_items),
        total_income_cents=total_income,
        total_expense_cents=total_expense,
        new_count=new_cnt,
        duplicate_count=dup_cnt,
        items=parsed_items
    )

@router.post("/import", response_model=ConciliationImportResponse, status_code=status.HTTP_201_CREATED)
async def import_conciliated_transactions(
    payload: ConciliationImportRequest,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user)
):
    """
    Grava os lançamentos conciliados e aprovados pelo usuário no banco de dados.
    Recurso exclusivo para o perfil EMPRESA.
    """
    if payload.profile != "EMPRESA":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A importação de conciliação bancária é restrita ao perfil EMPRESA."
        )

    account = await db.get(Account, payload.account_id)
    if not account or account.profile != "EMPRESA":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conta bancária PJ não encontrada.")

    created_ids = []
    total_cents = 0

    for item in payload.items:
        new_trans = Transaction(
            profile="EMPRESA",
            type=item.type,
            account_id=payload.account_id,
            category_id=item.category_id,
            contact_id=item.contact_id,
            payment_method_id=item.payment_method_id,
            description=item.description,
            amount_cents=item.amount_cents,
            due_date=item.date,
            payment_date=item.date if item.status == "CONCLUIDO" else None,
            status=item.status,
            notes=item.notes or "Importado via Conciliação Bancária OFX/CSV"
        )
        db.add(new_trans)
        await db.flush()
        created_ids.append(new_trans.id)
        total_cents += item.amount_cents

    await db.commit()

    return ConciliationImportResponse(
        imported_count=len(created_ids),
        total_amount_cents=total_cents,
        created_transaction_ids=created_ids
    )
