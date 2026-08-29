import asyncio
import os
import sys
import uuid

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../backend")))

from app.database import AsyncSessionLocal
from app.services.mobile_sync_service import (
    get_sync_status,
    get_mobile_sync_pull,
    process_mobile_sync_push
)
from app.schemas.sync import MobileTransactionSyncItem

async def test_services_direct():
    async with AsyncSessionLocal() as db:
        print("1. Testando get_sync_status()...")
        status = await get_sync_status(db)
        print(f"   ✓ API Status: online={status.api_online}, db={status.database}, total_transactions={status.total_transactions}")
        assert status.api_online is True

        print("2. Testando process_mobile_sync_push()...")
        sample_uuid = str(uuid.uuid4())
        item = MobileTransactionSyncItem(
            id=sample_uuid,
            type="DESPESA",
            description="Teste Lançamento Offline Mobile Direct",
            amount_cents=7590, # R$ 75,90
            due_date="2026-08-24",
            status="PENDENTE",
            notes="Inserido offline via Room"
        )
        push_res = await process_mobile_sync_push(db, profile="PESSOAL", transactions_data=[item])
        print(f"   ✓ Push resultado: success={push_res.success}, inseridos={push_res.inserted_count}, synced_ids={push_res.synced_ids}")
        assert push_res.success is True
        assert push_res.inserted_count == 1
        assert sample_uuid in push_res.synced_ids

        print("3. Testando get_mobile_sync_pull()...")
        pull_res = await get_mobile_sync_pull(db, profile="PESSOAL")
        print(f"   ✓ Pull resultado: {len(pull_res.categories)} categorias, {len(pull_res.accounts)} contas, {len(pull_res.transactions)} transações")
        found = any(t.id == sample_uuid for t in pull_res.transactions)
        assert found, "Lançamento recém enviado deve estar presente no pull"

    print("\n✅ TODOS OS TESTES DIRETOS DO MOBILE_SYNC_SERVICE PASSARAM COM SUCESSO!")

if __name__ == "__main__":
    asyncio.run(test_services_direct())
