import re
import csv
import io
import uuid
from datetime import datetime, date
from typing import List, Dict, Any, Optional, Tuple

def parse_date_str(raw_date: str) -> Optional[str]:
    """Converte strings de datas de extratos para o formato padrão YYYY-MM-DD."""
    if not raw_date:
        return None
    raw_date = raw_date.strip()
    
    # Formato OFX: YYYYMMDD ou YYYYMMDDHHMMSS...
    if re.match(r"^\d{8}", raw_date):
        try:
            dt = datetime.strptime(raw_date[:8], "%Y%m%d").date()
            return dt.isoformat()
        except Exception:
            pass

    # Formatos comuns: DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD
    patterns = [
        ("%d/%m/%Y", r"^\d{2}/\d{2}/\d{4}$"),
        ("%d-%m-%Y", r"^\d{2}-\d{2}-\d{4}$"),
        ("%Y-%m-%d", r"^\d{4}-\d{2}-\d{2}$"),
        ("%d/%m/%y", r"^\d{2}/\d{2}/\d{2}$"),
        ("%d-%m-%y", r"^\d{2}-\d{2}-\d{2}$"),
    ]
    for fmt, regex in patterns:
        if re.match(regex, raw_date):
            try:
                dt = datetime.strptime(raw_date, fmt).date()
                return dt.isoformat()
            except Exception:
                continue
    return None

def parse_amount_str_to_cents(raw_amt: str) -> Optional[Tuple[int, str]]:
    """
    Converte valor em string (ex: '-150.50', '1.250,00', '(50,00)') para centavos inteiros e tipo ('RECEITA' ou 'DESPESA').
    Retorna (amount_cents, type) ou None.
    """
    if not raw_amt:
        return None
    clean = raw_amt.strip().replace("R$", "").replace(" ", "")
    if not clean:
        return None

    is_negative = False
    if clean.startswith("-") or clean.endswith("-") or (clean.startswith("(") and clean.endswith(")")):
        is_negative = True
        clean = clean.replace("-", "").replace("(", "").replace(")", "")

    # Tratamento de pontuação brasileira vs americana
    if "," in clean and "." in clean:
        # Se vírgula for o separador decimal: ex 1.250,50
        if clean.rfind(",") > clean.rfind("."):
            clean = clean.replace(".", "").replace(",", ".")
        else: # 1,250.50
            clean = clean.replace(",", "")
    elif "," in clean:
        clean = clean.replace(",", ".")

    try:
        val_float = float(clean)
        if val_float < 0:
            is_negative = True
            val_float = abs(val_float)
        
        cents = int(round(val_float * 100))
        trans_type = "DESPESA" if is_negative else "RECEITA"
        return cents, trans_type
    except Exception:
        return None

def parse_ofx_content(content_str: str) -> List[Dict[str, Any]]:
    """Extrai transações de extratos bancários no formato OFX (SGML e XML)."""
    transactions = []

    # Encontra blocos <STMTTRN>...</STMTTRN> ou <STMTTRN> até o próximo <STMTTRN> ou </BANKTRANLIST>
    trn_blocks = re.findall(r"<STMTTRN>(.*?)(?=(?:<STMTTRN>|<\/BANKTRANLIST>|\Z))", content_str, re.DOTALL | re.IGNORECASE)

    for block in trn_blocks:
        def get_tag_value(tag_name: str) -> Optional[str]:
            m = re.search(rf"<{tag_name}>(?:([^<\r\n]+)(?:<\/{tag_name}>)?)?", block, re.IGNORECASE)
            if m and m.group(1):
                return m.group(1).strip()
            return None

        trntype = get_tag_value("TRNTYPE")
        dtposted = get_tag_value("DTPOSTED")
        trnamt = get_tag_value("TRNAMT")
        fitid = get_tag_value("FITID")
        memo = get_tag_value("MEMO") or get_tag_value("NAME") or "Transação Bancária"

        if not dtposted or not trnamt:
            continue

        dt_iso = parse_date_str(dtposted)
        amt_parsed = parse_amount_str_to_cents(trnamt)
        if not dt_iso or not amt_parsed:
            continue

        cents, inferred_type = amt_parsed
        if trntype:
            if trntype.upper() in ["CREDIT", "DEP", "INT", "DIRECTDEP"]:
                inferred_type = "RECEITA"
            elif trntype.upper() in ["DEBIT", "PAYMENT", "FEE", "SRVCHG", "POS", "CHECK", "ATM"]:
                inferred_type = "DESPESA"

        transactions.append({
            "id": str(uuid.uuid4()),
            "fitid": fitid,
            "date": dt_iso,
            "description": memo,
            "original_description": memo,
            "amount_cents": cents,
            "type": inferred_type,
        })

    return transactions

def parse_csv_content(content_str: str) -> List[Dict[str, Any]]:
    """Extrai transações de extratos bancários no formato CSV."""
    transactions = []
    
    # Detecta delimitador (, ; ou \t)
    sample = content_str[:2048]
    delimiter = ";"
    if sample.count(",") > sample.count(";"):
        delimiter = ","
    elif sample.count("\t") > sample.count(";"):
        delimiter = "\t"

    reader = csv.reader(io.StringIO(content_str), delimiter=delimiter)
    rows = list(reader)
    if not rows:
        return []

    # Localiza índices de colunas procurando por nomes de cabeçalho
    date_col = -1
    desc_col = -1
    amt_col = -1
    debit_col = -1
    credit_col = -1

    header_row_idx = -1
    for idx, row in enumerate(rows[:10]):
        row_lower = [c.lower().strip() for c in row]
        for c_idx, col_name in enumerate(row_lower):
            if any(k in col_name for k in ["data", "dt", "date", "dia"]):
                date_col = c_idx
            if any(k in col_name for k in ["descri", "hist", "memo", "detalhe", "origem", "favorecido"]):
                desc_col = c_idx
            if any(k in col_name for k in ["valor", "amount", "quantia", "total"]):
                amt_col = c_idx
            if any(k in col_name for k in ["débito", "debito", "saida", "saída", "debit"]):
                debit_col = c_idx
            if any(k in col_name for k in ["crédito", "credito", "entrada", "credit"]):
                credit_col = c_idx

        if date_col != -1 and (amt_col != -1 or (debit_col != -1 and credit_col != -1)):
            header_row_idx = idx
            break

    # Se não identificou cabeçalho formal, adota colunas padrão 0: Data, 1: Descrição, 2: Valor
    start_row = header_row_idx + 1 if header_row_idx != -1 else 0
    if date_col == -1: date_col = 0
    if desc_col == -1: desc_col = 1 if len(rows[0]) > 1 else 0
    if amt_col == -1 and debit_col == -1: amt_col = 2 if len(rows[0]) > 2 else 1

    for row in rows[start_row:]:
        if not row or len(row) <= date_col:
            continue

        raw_date = row[date_col]
        dt_iso = parse_date_str(raw_date)
        if not dt_iso:
            continue

        raw_desc = row[desc_col] if len(row) > desc_col else "Transação Extrato"
        raw_desc = raw_desc.strip() or "Transação Extrato"

        cents = 0
        inferred_type = "DESPESA"

        if amt_col != -1 and len(row) > amt_col:
            amt_parsed = parse_amount_str_to_cents(row[amt_col])
            if not amt_parsed or amt_parsed[0] == 0:
                continue
            cents, inferred_type = amt_parsed
        elif debit_col != -1 and credit_col != -1:
            debit_str = row[debit_col] if len(row) > debit_col else ""
            credit_str = row[credit_col] if len(row) > credit_col else ""
            
            d_parsed = parse_amount_str_to_cents(debit_str)
            c_parsed = parse_amount_str_to_cents(credit_str)

            if c_parsed and c_parsed[0] > 0:
                cents = c_parsed[0]
                inferred_type = "RECEITA"
            elif d_parsed and d_parsed[0] > 0:
                cents = d_parsed[0]
                inferred_type = "DESPESA"
            else:
                continue
        else:
            continue

        transactions.append({
            "id": str(uuid.uuid4()),
            "fitid": None,
            "date": dt_iso,
            "description": raw_desc,
            "original_description": raw_desc,
            "amount_cents": cents,
            "type": inferred_type,
        })

    return transactions
