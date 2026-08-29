import asyncio
import json
from app.database import AsyncSessionLocal
from app.models import SyncLog, SystemConfig
from app.services.google_sheets_service import (
    test_connection,
    process_mobile_queue,
    export_sqlite_to_sheets,
    get_sheets_service,
    ensure_all_sheets_exist,
    get_effective_spreadsheet_id,
    check_sync_pending_status
)
from sqlalchemy import select

async def inspect_and_test():
    async with AsyncSessionLocal() as session:
        print("=== 1. ÚLTIMOS 10 LOGS DE SINCRONIZAÇÃO ===")
        logs = (await session.execute(select(SyncLog).order_by(SyncLog.created_at.desc()).limit(10))).scalars().all()
        for log in logs:
            print(f"[{log.created_at}] Action: {log.action} | Status: {log.status} | Message: {log.message}")
            if log.details:
                print(f"   Details: {log.details[:300]}")

        print("\n=== 2. CONFIGURAÇÃO ATUAL ===")
        target_id = await get_effective_spreadsheet_id(session)
        print(f"Spreadsheet ID: {target_id}")

        print("\n=== 3. TESTANDO TEST_CONNECTION ===")
        try:
            test_res = await test_connection(session, target_id)
            print("Test connection result:", test_res)
        except Exception as e:
            print("ERRO em test_connection:", type(e), e)

        print("\n=== 4. TESTANDO CHECK_SYNC_PENDING_STATUS ===")
        try:
            status_res = await check_sync_pending_status(session, check_remote=True)
            print("Status result:", status_res.model_dump())
        except Exception as e:
            print("ERRO em check_sync_pending_status:", type(e), e)

        print("\n=== 5. TESTANDO EXPORT_SQLITE_TO_SHEETS ===")
        try:
            service = await get_sheets_service(session)
            ensure_all_sheets_exist(service, target_id)
            exported, counts = await export_sqlite_to_sheets(session, service, target_id)
            print(f"Export bem sucedido! Total: {exported}, counts: {counts}")
        except Exception as e:
            import traceback
            print("ERRO em export_sqlite_to_sheets:")
            traceback.print_exc()

        print("\n=== 6. TESTANDO PROCESS_MOBILE_QUEUE ===")
        try:
            service = await get_sheets_service(session)
            ensure_all_sheets_exist(service, target_id)
            imported, errors = await process_mobile_queue(session, service, target_id)
            print(f"Import da fila concluído! Importados: {imported}, erros: {errors}")
        except Exception as e:
            import traceback
            print("ERRO em process_mobile_queue:")
            traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(inspect_and_test())
