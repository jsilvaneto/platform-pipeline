import os
import sys
import io
import asyncio

# Adiciona backend ao sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../backend")))

from fastapi import UploadFile
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import AsyncSessionLocal, engine, Base
from app.models import User, Transaction, Category, Attachment
from app.services.attachment_service import (
    save_uploaded_attachment,
    delete_attachment,
    get_storage_stats,
    get_absolute_file_path,
    enrich_attachment_schema
)
from app.api.v1.attachments import update_attachment, list_attachments
from app.schemas.attachment import AttachmentUpdate
from app.api.v1.transactions import create_transaction, list_transactions
from app.schemas.transaction import TransactionCreate
from app.main import migrate_database_schema

async def run_attachment_type_tests():
    print("=== INICIANDO TESTES DE TIPIFICAÇÃO DE ANEXOS ===")
    
    # 1. Garante que as tabelas existam e executa migrações
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    await migrate_database_schema()
    
    async with AsyncSessionLocal() as db:
        mock_user = User(id="admin", username="admin")

        # Busca uma categoria existente
        cat = (await db.execute(select(Category).where(Category.profile == "PESSOAL"))).scalars().first()
        assert cat is not None, "Nenhuma categoria pessoal encontrada."

        # 2. Teste de Upload Local com tipo NOTA_FISCAL
        print("\n1. Testando upload de anexo com tipo NOTA_FISCAL...")
        fake_nf_data = b"%PDF-1.4\n<< /Title (Nota Fiscal Eletronica) >>\nendobj\n%%EOF"
        upload_nf = UploadFile(
            file=io.BytesIO(fake_nf_data),
            filename="danfe_nf_12345.pdf",
            headers={"content-type": "application/pdf"}
        )
        
        att_nf = await save_uploaded_attachment(
            db=db,
            upload_file=upload_nf,
            profile="PESSOAL",
            attachment_type="NOTA_FISCAL"
        )
        print(f"✓ Anexo salvo: ID {att_nf.id}, tipo: {att_nf.attachment_type}")
        assert att_nf.attachment_type == "NOTA_FISCAL"

        # 3. Teste de Upload Local com tipo FATURA
        print("\n2. Testando upload de anexo com tipo FATURA...")
        fake_fat_data = b"%PDF-1.4\n<< /Title (Fatura Cartao) >>\nendobj\n%%EOF"
        upload_fat = UploadFile(
            file=io.BytesIO(fake_fat_data),
            filename="fatura_cartao_agosto.pdf",
            headers={"content-type": "application/pdf"}
        )
        
        att_fat = await save_uploaded_attachment(
            db=db,
            upload_file=upload_fat,
            profile="PESSOAL",
            attachment_type="FATURA"
        )
        print(f"✓ Anexo salvo: ID {att_fat.id}, tipo: {att_fat.attachment_type}")
        assert att_fat.attachment_type == "FATURA"

        # 4. Teste de Upload com tipo padrão (COMPROVANTE)
        print("\n3. Testando upload com tipo padrão (COMPROVANTE)...")
        fake_pix_data = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4"
        upload_pix = UploadFile(
            file=io.BytesIO(fake_pix_data),
            filename="comprovante_pix.png",
            headers={"content-type": "image/png"}
        )
        
        att_pix = await save_uploaded_attachment(
            db=db,
            upload_file=upload_pix,
            profile="PESSOAL"
        )
        print(f"✓ Anexo salvo: ID {att_pix.id}, tipo padrão: {att_pix.attachment_type}")
        assert att_pix.attachment_type == "COMPROVANTE"

        # 5. Teste de alteração de tipo via PATCH
        print("\n4. Testando alteração de tipo via PATCH /attachments/{id}...")
        update_payload = AttachmentUpdate(attachment_type="RECIBO")
        updated_att = await update_attachment(
            attachment_id=att_pix.id,
            payload=update_payload,
            db=db,
            _=mock_user
        )
        print(f"✓ Tipo alterado com sucesso para: {updated_att.attachment_type}")
        assert updated_att.attachment_type == "RECIBO"

        # 6. Teste de Criação de Transação vinculando os 3 anexos
        print("\n5. Testando criação de lançamento com múltiplos anexos tipificados...")
        trans_in = TransactionCreate(
            profile="PESSOAL",
            type="DESPESA",
            category_id=cat.id,
            description="Compra de Equipamentos com NF, Fatura e Recibo",
            amount_cents=125000,
            due_date="2026-08-17",
            status="CONCLUIDO",
            attachment_ids=[att_nf.id, att_fat.id, att_pix.id]
        )
        created_trans = await create_transaction(trans_in=trans_in, db=db, _=mock_user)
        print(f"✓ Lançamento criado ID: {created_trans.id}")
        assert created_trans.attachments_count == 3
        types_in_trans = [a.attachment_type for a in created_trans.attachments]
        print(f"✓ Tipos vinculados na transação: {types_in_trans}")
        assert "NOTA_FISCAL" in types_in_trans
        assert "FATURA" in types_in_trans
        assert "RECIBO" in types_in_trans

        # 7. Teste de Listagem com Filtro por attachment_type
        print("\n6. Testando listagem filtrando por attachment_type...")
        nf_list = await list_attachments(
            profile="PESSOAL",
            attachment_type="NOTA_FISCAL",
            db=db,
            _=mock_user
        )
        print(f"✓ Total de Notas Fiscais encontradas: {len(nf_list)}")
        assert any(a.id == att_nf.id for a in nf_list)
        assert all(a.attachment_type == "NOTA_FISCAL" for a in nf_list)

        # 8. Limpeza dos anexos criados no teste
        print("\n7. Limpeza dos dados de teste...")
        await delete_attachment(db, att_nf.id)
        await delete_attachment(db, att_fat.id)
        await delete_attachment(db, att_pix.id)
        print("✓ Anexos de teste excluídos com sucesso.")

    await engine.dispose()
    print("\n🎉 TODOS OS TESTES DE TIPIFICAÇÃO DE ANEXOS PASSARAM COM 100% DE SUCESSO!")

if __name__ == "__main__":
    asyncio.run(run_attachment_type_tests())
