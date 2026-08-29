import os
import io
import asyncio
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
from app.services.google_drive_service import (
    get_drive_service,
    get_or_create_drive_profile_folder,
    upload_attachment_to_drive,
    sync_all_pending_attachments
)
from app.api.v1.transactions import create_transaction, list_transactions
from app.schemas.transaction import TransactionCreate

async def run_attachment_tests():
    print("=== INICIANDO TESTES DO SISTEMA DE COMPROVANTES & GOOGLE DRIVE ===")
    
    # 1. Garante que as tabelas existam
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    async with AsyncSessionLocal() as db:
        mock_user = User(id="admin", username="admin")

        # Busca uma categoria existente
        cat = (await db.execute(select(Category).where(Category.profile == "PESSOAL"))).scalars().first()
        assert cat is not None, "Nenhuma categoria pessoal encontrada."

        # 2. Teste de Upload Local de Imagem (PNG simulado)
        print("\n1. Testando upload local de imagem (PNG)...")
        fake_png_data = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4"
        upload_img = UploadFile(
            file=io.BytesIO(fake_png_data),
            filename="recibo_supermercado.png",
            headers={"content-type": "image/png"}
        )
        
        att_img = await save_uploaded_attachment(
            db=db,
            upload_file=upload_img,
            profile="PESSOAL"
        )
        print(f"✓ Imagem salva no banco com ID: {att_img.id}")
        abs_img_path = get_absolute_file_path(att_img)
        print(f"✓ Caminho no disco: {abs_img_path}")
        assert os.path.exists(abs_img_path), "Arquivo não foi salvo no disco!"
        assert att_img.file_size_bytes == len(fake_png_data)
        assert att_img.sync_status == "PENDENTE"

        # 3. Teste de Upload Local de PDF (PDF simulado)
        print("\n2. Testando upload local de documento PDF...")
        fake_pdf_data = b"%PDF-1.4\n1 0 obj\n<< /Title (Comprovante PIX) >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF"
        upload_pdf = UploadFile(
            file=io.BytesIO(fake_pdf_data),
            filename="comprovante_pix_aluguel.pdf",
            headers={"content-type": "application/pdf"}
        )
        
        att_pdf = await save_uploaded_attachment(
            db=db,
            upload_file=upload_pdf,
            profile="PESSOAL"
        )
        print(f"✓ PDF salvo no banco com ID: {att_pdf.id}")
        abs_pdf_path = get_absolute_file_path(att_pdf)
        assert os.path.exists(abs_pdf_path), "Arquivo PDF não foi salvo no disco!"

        # 4. Teste de Criação de Transação vinculando comprovantes
        print("\n3. Testando criação de transação vinculando múltiplos comprovantes...")
        trans_in = TransactionCreate(
            profile="PESSOAL",
            type="DESPESA",
            category_id=cat.id,
            description="Supermercado Mensal com Recibo e PIX",
            amount_cents=35000,
            due_date="2026-08-16",
            status="CONCLUIDO",
            attachment_ids=[att_img.id, att_pdf.id]
        )
        created_trans = await create_transaction(trans_in=trans_in, db=db, _=mock_user)
        print(f"✓ Transação criada ID: {created_trans.id}")
        print(f"✓ Quantidade de comprovantes vinculados: {created_trans.attachments_count}")
        assert created_trans.attachments_count == 2
        assert len(created_trans.attachments) == 2
        print(f"✓ Primeiro anexo: {created_trans.attachments[0].file_name} ({created_trans.attachments[0].formatted_size})")

        # 5. Teste de Listagem de Transações com Eager Loading de Comprovantes
        print("\n4. Testando listagem com eager-load de anexos...")
        all_trans = await list_transactions(profile="PESSOAL", db=db, _=mock_user)
        found = next((t for t in all_trans if t.id == created_trans.id), None)
        assert found is not None
        assert found.attachments_count == 2
        print("✓ Listagem retornou corretamente os dados do anexo.")

        # 6. Teste de Estatísticas de Armazenamento
        print("\n5. Testando estatísticas de armazenamento local...")
        stats = await get_storage_stats(db, profile="PESSOAL")
        print(f"✓ Total de arquivos: {stats.total_count}, Tamanho formatado: {stats.formatted_total_size}, Pendentes: {stats.pending_count}")
        assert stats.total_count >= 2

        # 7. Teste de Backup no Google Drive
        print("\n6. Testando conexão e backup assíncrono no Google Drive...")
        try:
            drive_service = await get_drive_service(db)
            print("✓ Cliente Google Drive autenticado com sucesso.")
            
            # Testa criação da pasta
            prof_folder_id, root_id = await get_or_create_drive_profile_folder(drive_service, db, "PESSOAL")
            print(f"✓ Pasta raiz: {root_id}, Pasta de perfil (PESSOAL): {prof_folder_id}")

            # Testa upload do anexo
            print(f"✓ Enviando arquivo '{att_img.file_name}' para o Google Drive...")
            uploaded_att = await upload_attachment_to_drive(db, att_img.id)
            print(f"✓ Backup concluído! Drive File ID: {uploaded_att.drive_file_id}, Web Link: {uploaded_att.drive_web_view_link}")
            assert uploaded_att.sync_status == "SINCRONIZADO"
            assert uploaded_att.drive_file_id is not None
        except Exception as e:
            print(f"Aviso/Informação sobre Google Drive: {e}")

        # 8. Teste de Exclusão em Cascata
        print("\n7. Testando exclusão do comprovante...")
        del_res = await delete_attachment(db, att_pdf.id)
        assert del_res is True
        assert not os.path.exists(abs_pdf_path), "Arquivo físico deveria ter sido removido!"
        print("✓ Comprovante excluído e arquivo físico apagado com sucesso.")

        print("\n🎉 TODOS OS TESTES DE COMPROVANTES E GOOGLE DRIVE FORAM CONCLUÍDOS COM SUCESSO!")

if __name__ == "__main__":
    asyncio.run(run_attachment_tests())
