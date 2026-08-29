import asyncio
from app.database import AsyncSessionLocal
from app.models import User
from app.api.v1.sync import (
    get_sync_pending_status,
    export_data_to_sheets,
    import_data_from_queue,
    trigger_full_sync,
    get_sync_configuration
)

async def run_validation():
    async with AsyncSessionLocal() as session:
        mock_user = User(id="admin", username="admin")

        print("1. Validando get_sync_pending_status...")
        status_res = await get_sync_pending_status(check_remote=True, db=session, _=mock_user)
        print("Status:", status_res.model_dump())

        print("\n2. Validando export_data_to_sheets...")
        export_res = await export_data_to_sheets(payload=None, db=session, _=mock_user)
        print("Export:", export_res.model_dump())
        assert export_res.success is True

        print("\n3. Validando import_data_from_queue...")
        import_res = await import_data_from_queue(payload=None, db=session, _=mock_user)
        print("Import:", import_res.model_dump())
        assert import_res.success is True

        print("\n4. Validando trigger_full_sync...")
        full_res = await trigger_full_sync(payload=None, db=session, _=mock_user)
        print("Full Sync:", full_res.model_dump())
        assert full_res.success is True

        print("\n5. Validando status pós-sync completo...")
        status_after = await get_sync_pending_status(check_remote=True, db=session, _=mock_user)
        print("Status após sync:", status_after.model_dump())
        assert status_after.pending_send == 0
        assert status_after.has_pending == (status_after.pending_receive > 0)

        print("\n🎉 TODAS AS ROTAS DA API DE SINCRONIZAÇÃO FORAM EXECUTADAS E VALIDADAS COM SUCESSO!")

if __name__ == "__main__":
    asyncio.run(run_validation())
