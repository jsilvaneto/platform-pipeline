import os
import json
import zipfile
import shutil
import tempfile
from datetime import datetime, timezone
from typing import Tuple, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, text

from app.models import Transaction, Account, Category, Contact, Attachment, now_utc_iso
from app.schemas.system import SystemStatsResponse
from app.services.attachment_service import (
    get_storage_directory, format_bytes, DEFAULT_ATTACHMENT_DIR
)
from app.services.system_service import get_config_value, set_config_value
from app.database import DATA_DIR

DB_PATH = os.path.join(DATA_DIR, "wallet.db")

async def get_system_stats(db: AsyncSession) -> SystemStatsResponse:
    """Calcula estatísticas de tamanho de banco de dados, total de registros e arquivos em disco."""
    # 1. Tamanho do banco SQLite
    db_size = os.path.getsize(DB_PATH) if os.path.exists(DB_PATH) else 0

    # 2. Contagens de entidades
    t_count = (await db.execute(select(func.count(Transaction.id)))).scalar_one() or 0
    a_count = (await db.execute(select(func.count(Account.id)))).scalar_one() or 0
    c_count = (await db.execute(select(func.count(Category.id)))).scalar_one() or 0
    con_count = (await db.execute(select(func.count(Contact.id)))).scalar_one() or 0
    att_count = (await db.execute(select(func.count(Attachment.id)))).scalar_one() or 0

    # 3. Tamanho dos anexos em disco
    storage_dir = await get_storage_directory(db)
    att_size = 0
    if os.path.exists(storage_dir):
        for root, _, files in os.walk(storage_dir):
            for f in files:
                fp = os.path.join(root, f)
                if not f.startswith("."):
                    att_size += os.path.getsize(fp)

    total_size = db_size + att_size
    last_backup = await get_config_value(db, "last_backup_timestamp")

    return SystemStatsResponse(
        database_size_bytes=db_size,
        database_size_formatted=format_bytes(db_size),
        total_transactions=t_count,
        total_accounts=a_count,
        total_categories=c_count,
        total_contacts=con_count,
        total_attachments=att_count,
        attachments_size_bytes=att_size,
        attachments_size_formatted=format_bytes(att_size),
        total_backup_size_bytes=total_size,
        total_backup_size_formatted=format_bytes(total_size),
        last_backup_at=last_backup,
        database_path=DB_PATH,
        attachments_path=storage_dir,
        version="2.4.0"
    )

async def generate_system_backup_zip(db: AsyncSession) -> Tuple[str, str]:
    """
    Realiza checkpoint do banco SQLite (WAL) e gera um arquivo ZIP consolidado
    contendo o banco de dados 'wallet.db', todo o diretório de anexos e o manifesto.
    Retorna (caminho_absoluto_zip, nome_do_arquivo).
    """
    # 1. Força checkpoint truncado do WAL para sincronizar o arquivo wallet.db
    try:
        await db.execute(text("PRAGMA wal_checkpoint(TRUNCATE);"))
    except Exception as e:
        print(f"Aviso ao executar wal_checkpoint: {e}")

    now_dt = datetime.now()
    timestamp_str = now_dt.strftime("%Y%m%d_%H%M%S")
    zip_filename = f"wallet_backup_{timestamp_str}.zip"

    # Diretório temporário para empacotamento
    temp_dir = tempfile.mkdtemp(prefix="wallet_backup_")
    zip_path = os.path.join(temp_dir, zip_filename)

    storage_dir = await get_storage_directory(db)
    stats = await get_system_stats(db)

    # Cria o manifesto do backup
    manifest = {
        "app": "Wallet Financial System",
        "version": "2.4.0",
        "created_at": now_dt.isoformat(),
        "database_size_bytes": stats.database_size_bytes,
        "total_transactions": stats.total_transactions,
        "total_accounts": stats.total_accounts,
        "total_categories": stats.total_categories,
        "total_contacts": stats.total_contacts,
        "total_attachments": stats.total_attachments,
        "attachments_size_bytes": stats.attachments_size_bytes,
        "manifest_version": "1.0"
    }

    # 2. Cria o arquivo ZIP com compressão DEFLATE
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
        # A. Adiciona o banco SQLite wallet.db
        if os.path.exists(DB_PATH):
            zf.write(DB_PATH, arcname="wallet.db")

        # B. Adiciona manifesto
        zf.writestr("manifest.json", json.dumps(manifest, indent=2, ensure_ascii=False))

        # C. Adiciona anexos e comprovantes
        if os.path.exists(storage_dir):
            for root, _, files in os.walk(storage_dir):
                for file_name in files:
                    if file_name.startswith("."):
                        continue
                    abs_file = os.path.join(root, file_name)
                    rel_file = os.path.relpath(abs_file, storage_dir)
                    arcname = os.path.join("attachments", rel_file)
                    zf.write(abs_file, arcname=arcname)

    # 3. Registra timestamp do último backup gerado
    await set_config_value(db, "last_backup_timestamp", now_dt.strftime("%d/%m/%Y às %H:%M:%S"))

    return zip_path, zip_filename
