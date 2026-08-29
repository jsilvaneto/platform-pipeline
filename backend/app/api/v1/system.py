import os
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.background import BackgroundTask

from app.database import get_db
from app.models import User
from app.api.v1.deps import get_current_user
from app.schemas.system import SystemStatsResponse
from app.services.backup_service import get_system_stats, generate_system_backup_zip

router = APIRouter(prefix="/system", tags=["Sistema & Backups"])

def remove_temp_file(path: str):
    try:
        if os.path.exists(path):
            os.remove(path)
            parent_dir = os.path.dirname(path)
            if "wallet_backup_" in parent_dir:
                os.rmdir(parent_dir)
    except Exception as e:
        print(f"Erro ao remover arquivo temporário de backup: {e}")

@router.get("/stats", response_model=SystemStatsResponse)
async def get_system_statistics(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user)
):
    """Retorna métricas de saúde, tamanho do banco de dados e armazenamento em disco."""
    return await get_system_stats(db)

@router.get("/backup")
async def download_system_backup(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user)
):
    """
    Gera e faz o download de um arquivo .ZIP consolidado contendo o banco de dados
    SQLite (wallet.db), todos os anexos e comprovantes em disco e o manifesto do sistema.
    """
    zip_path, filename = await generate_system_backup_zip(db)
    
    if not os.path.exists(zip_path):
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Não foi possível gerar o pacote de backup do sistema."
        )

    return FileResponse(
        path=zip_path,
        media_type="application/zip",
        filename=filename,
        background=BackgroundTask(remove_temp_file, zip_path)
    )
