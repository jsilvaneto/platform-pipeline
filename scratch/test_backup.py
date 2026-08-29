import asyncio
import sys
import os
import zipfile

sys.path.append(os.path.join(os.path.dirname(__file__), "..", "backend"))

from app.database import AsyncSessionLocal, engine, Base
from app.models import User
from app.main import migrate_database_schema, seed_initial_data
from app.api.v1.system import get_system_statistics, download_system_backup

async def test_backup_feature():
    print("Iniciando testes de Backup do Sistema e Estatísticas...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    await migrate_database_schema()
    await seed_initial_data()

    async with AsyncSessionLocal() as db:
        fake_user = User(id="user-1", username="test")

        # 1. Teste de Estatísticas
        stats = await get_system_statistics(db=db, _=fake_user)
        print(f"✓ Estatísticas do Sistema:")
        print(f"  - Banco de Dados: {stats.database_size_formatted} ({stats.total_transactions} lançamentos)")
        print(f"  - Anexos/Comprovantes: {stats.attachments_size_formatted} ({stats.total_attachments} arquivos)")
        print(f"  - Total Consolidado: {stats.total_backup_size_formatted}")
        assert stats.database_size_bytes > 0
        assert stats.version == "2.4.0"

        # 2. Teste de Geração de Backup ZIP
        file_response = await download_system_backup(db=db, _=fake_user)
        zip_path = file_response.path
        print(f"✓ Pacote de backup ZIP gerado: {zip_path}")
        assert os.path.exists(zip_path), "Arquivo ZIP não foi gerado!"

        # 3. Inspeciona integridade do arquivo ZIP
        with zipfile.ZipFile(zip_path, "r") as zf:
            file_list = zf.namelist()
            print(f"✓ Conteúdo do ZIP: {file_list}")
            assert "wallet.db" in file_list, "wallet.db deve estar presente no ZIP!"
            assert "manifest.json" in file_list, "manifest.json deve estar presente no ZIP!"
            
            # Lê o manifesto
            manifest_data = zf.read("manifest.json").decode("utf-8")
            print(f"✓ Manifesto: {manifest_data}")
            assert "Wallet Financial System" in manifest_data

        # Executa background task para limpar arquivo temporário
        if file_response.background:
            await file_response.background()
        print("✓ Limpeza de arquivos temporários executada com sucesso.")

    print("\n✓ TODOS OS TESTES DE BACKUP DO SISTEMA PASSARAM COM SUCESSO!")

if __name__ == "__main__":
    asyncio.run(test_backup_feature())
