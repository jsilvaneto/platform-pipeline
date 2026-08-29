import asyncio
import sys
import os
import io

sys.path.append(os.path.join(os.path.dirname(__file__), "..", "backend"))

from app.database import AsyncSessionLocal, engine, Base
from app.models import Account, Transaction, Category, User
from app.main import migrate_database_schema, seed_initial_data
from app.api.v1.conciliation import parse_statement_file, import_conciliated_transactions
from app.schemas.conciliation import ConciliationImportRequest, ConciliationImportItem
from starlette.datastructures import UploadFile
from fastapi import HTTPException
from sqlalchemy import select

SAMPLE_OFX = """OFXHEADER:100
DATA:OFXSGML
VERSION:102
SECURITY:NONE
ENCODING:USASCII
CHARSET:1252
COMPRESSION:NONE
OLDFILEUID:NONE
NEWFILEUID:NONE

<OFX>
<BANKMSGSRSV1>
<STMTTRNRS>
<STMTRS>
<CURDEF>BRL
<BANKTRANLIST>
<DTSTART>20260801
<DTEND>20260831
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20260810120000[-03:EST]
<TRNAMT>-350.00
<FITID>20260810001
<MEMO>PAGTO ENERGIA ELETRICA PJ
</STMTTRN>
<STMTTRN>
<TRNTYPE>CREDIT
<DTPOSTED>20260815120000[-03:EST]
<TRNAMT>12500.00
<FITID>20260815002
<MEMO>PIX RECEBIDO CLIENTE EMPRESARIAL
</STMTTRN>
</BANKTRANLIST>
</STMTRS>
</STMTTRNRS>
</BANKMSGSRSV1>
</OFX>
"""

SAMPLE_CSV = """Data;Histórico;Valor;Tipo
18/08/2026;PAGAMENTO FORNECEDOR PECAS;-850,00;D
20/08/2026;RECEBIMENTO CONTRATO CONSULTORIA;4500,00;C
"""

async def test_conciliation_feature():
    print("Iniciando testes de Conciliação Bancária PJ (OFX / CSV)...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    await migrate_database_schema()
    await seed_initial_data()

    async with AsyncSessionLocal() as db:
        fake_user = User(id="user-1", username="test")

        # 1. Pega ou cria uma conta EMPRESA
        acc_res = await db.execute(select(Account).where(Account.profile == "EMPRESA"))
        empresa_acc = acc_res.scalars().first()
        if not empresa_acc:
            empresa_acc = Account(profile="EMPRESA", name="Banco Inter PJ", type="CORRENTE")
            db.add(empresa_acc)
            await db.commit()
            await db.refresh(empresa_acc)

        # 2. Testa Bloqueio para Perfil PESSOAL
        try:
            ofx_file = UploadFile(filename="extrato.ofx", file=io.BytesIO(SAMPLE_OFX.encode("utf-8")))
            await parse_statement_file(
                account_id=empresa_acc.id,
                profile="PESSOAL",
                file=ofx_file,
                db=db,
                _=fake_user
            )
            assert False, "Deveria ter bloqueado conciliação para o perfil PESSOAL!"
        except HTTPException as e:
            assert e.status_code == 400
            print("✓ Bloqueio de perfil PESSOAL validado com sucesso (exclusivo para EMPRESA).")

        # 3. Parse do OFX para EMPRESA
        ofx_file = UploadFile(filename="extrato.ofx", file=io.BytesIO(SAMPLE_OFX.encode("utf-8")))
        parse_res = await parse_statement_file(
            account_id=empresa_acc.id,
            profile="EMPRESA",
            file=ofx_file,
            db=db,
            _=fake_user
        )
        print(f"✓ OFX parseado com sucesso: {parse_res.total_parsed} itens (Receitas: R$ {parse_res.total_income_cents/100:.2f}, Despesas: R$ {parse_res.total_expense_cents/100:.2f})")
        assert parse_res.total_parsed == 2
        assert parse_res.total_income_cents == 1250000
        assert parse_res.total_expense_cents == 35000

        # 4. Importa as transações do OFX
        import_res = await import_conciliated_transactions(
            payload=ConciliationImportRequest(
                account_id=empresa_acc.id,
                profile="EMPRESA",
                items=[
                    ConciliationImportItem(
                        date=item.date,
                        description=item.description,
                        amount_cents=item.amount_cents,
                        type=item.type,
                        status="CONCLUIDO"
                    )
                    for item in parse_res.items
                ]
            ),
            db=db,
            _=fake_user
        )
        print(f"✓ Importação de lote concluída: {import_res.imported_count} transações gravadas.")
        assert import_res.imported_count == 2

        # 5. Testa Deduplicação: envia o mesmo OFX novamente para verificar match_status == 'DUPLICADO'
        ofx_file_dup = UploadFile(filename="extrato.ofx", file=io.BytesIO(SAMPLE_OFX.encode("utf-8")))
        parse_dup_res = await parse_statement_file(
            account_id=empresa_acc.id,
            profile="EMPRESA",
            file=ofx_file_dup,
            db=db,
            _=fake_user
        )
        print(f"✓ Deduplicação validada: {parse_dup_res.duplicate_count} duplicados identificados.")
        assert parse_dup_res.duplicate_count == 2
        assert all(it.match_status == "DUPLICADO" for it in parse_dup_res.items)

        # 6. Parse do CSV
        csv_file = UploadFile(filename="extrato.csv", file=io.BytesIO(SAMPLE_CSV.encode("utf-8")))
        parse_csv_res = await parse_statement_file(
            account_id=empresa_acc.id,
            profile="EMPRESA",
            file=csv_file,
            db=db,
            _=fake_user
        )
        print(f"✓ CSV parseado com sucesso: {parse_csv_res.total_parsed} transações extraídas.")
        assert parse_csv_res.total_parsed == 2

    print("\n✓ TODOS OS TESTES DE CONCILIAÇÃO BANCÁRIA PJ PASSARAM COM SUCESSO!")

if __name__ == "__main__":
    asyncio.run(test_conciliation_feature())
