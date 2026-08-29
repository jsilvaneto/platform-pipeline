import asyncio
from sqlalchemy import select
from app.database import AsyncSessionLocal
from app.models import Attachment, SystemConfig
from app.services.google_drive_service import sync_all_pending_attachments, get_drive_service

async def check_errors():
    async with AsyncSessionLocal() as db:
        # 1. Verifica registros de comprovantes
        res = await db.execute(select(Attachment))
        attachments = res.scalars().all()
        print(f"Total de comprovantes no banco: {len(attachments)}")
        for a in attachments:
            print(f"- ID: {a.id}")
            print(f"  Nome: {a.file_name}")
            print(f"  Perfil: {a.profile}")
            print(f"  Status: {a.sync_status}")
            print(f"  Drive File ID: {a.drive_file_id}")
            print(f"  Erro de Sincronização: {a.sync_error}")

        # 2. Testa o sync diretamente e captura o erro exato
        print("\n--- Testando sync_all_pending_attachments ---")
        try:
            drive_res = await sync_all_pending_attachments(db)
            print(f"Resultado: {drive_res}")
        except Exception as e:
            print(f"Exceção capturada: {type(e).__name__}: {e}")

if __name__ == "__main__":
    asyncio.run(check_errors())
