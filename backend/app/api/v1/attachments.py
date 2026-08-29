import os
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Query
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models import User, Attachment, Transaction
from app.api.v1.deps import get_current_user
from app.schemas.attachment import (
    AttachmentResponse,
    AttachmentUpdate,
    AttachmentStatsResponse,
    StorageDirectoryConfigRequest,
    StorageDirectoryConfigResponse,
    ProfileType,
    SyncStatusType,
    AttachmentType
)
from app.services.attachment_service import (
    save_uploaded_attachment,
    get_absolute_file_path,
    delete_attachment,
    get_storage_stats,
    enrich_attachment_schema,
    get_storage_directory,
    validate_and_set_storage_directory,
    reset_storage_directory,
    is_directory_writable,
    get_directory_free_space,
    format_bytes,
    DEFAULT_ATTACHMENT_DIR
)

router = APIRouter(prefix="/attachments", tags=["Anexos e Comprovantes"])

@router.post("/upload", response_model=AttachmentResponse, status_code=status.HTTP_201_CREATED)
async def upload_attachment(
    file: UploadFile = File(...),
    profile: ProfileType = Form(...),
    transaction_id: Optional[str] = Form(None),
    attachment_type: AttachmentType = Form("COMPROVANTE"),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user)
):
    """
    Realiza o upload imediato e seguro do comprovante para o diretório de armazenamento configurado (< 50ms).
    """
    attachment = await save_uploaded_attachment(
        db=db,
        upload_file=file,
        profile=profile,
        transaction_id=transaction_id,
        attachment_type=attachment_type
    )

    return enrich_attachment_schema(attachment)

@router.get("", response_model=List[AttachmentResponse])
async def list_attachments(
    profile: Optional[ProfileType] = Query(None, description="Filtrar por PESSOAL ou EMPRESA"),
    transaction_id: Optional[str] = Query(None, description="Filtrar por lançamento"),
    sync_status: Optional[SyncStatusType] = Query(None, description="Filtrar por status de sincronização"),
    attachment_type: Optional[AttachmentType] = Query(None, description="Filtrar por tipo de anexo"),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user)
):
    """Lista todos os anexos cadastrados com opções de filtro e URLs formatadas."""
    query = select(Attachment)
    if isinstance(profile, str) and profile:
        query = query.where(Attachment.profile == profile)
    if isinstance(transaction_id, str) and transaction_id:
        query = query.where(Attachment.transaction_id == transaction_id)
    if isinstance(sync_status, str) and sync_status:
        query = query.where(Attachment.sync_status == sync_status)
    if isinstance(attachment_type, str) and attachment_type:
        query = query.where(Attachment.attachment_type == attachment_type)

    query = query.order_by(Attachment.created_at.desc())
    attachments = (await db.execute(query)).scalars().all()

    return [enrich_attachment_schema(att) for att in attachments]

@router.get("/stats", response_model=AttachmentStatsResponse)
async def get_attachment_statistics(
    profile: Optional[ProfileType] = Query(None),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user)
):
    """Retorna métricas de armazenamento local e status do diretório."""
    return await get_storage_stats(db, profile)

@router.get("/storage-dir", response_model=StorageDirectoryConfigResponse)
async def get_storage_directory_info(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user)
):
    """Retorna informações detalhadas do diretório de armazenamento ativo."""
    active_dir = await get_storage_directory(db)
    is_custom = active_dir != DEFAULT_ATTACHMENT_DIR
    is_writable = is_directory_writable(active_dir)
    free_space = get_directory_free_space(active_dir)

    return StorageDirectoryConfigResponse(
        active_directory=active_dir,
        default_directory=DEFAULT_ATTACHMENT_DIR,
        is_custom=is_custom,
        is_writable=is_writable,
        free_space_bytes=free_space,
        formatted_free_space=format_bytes(free_space) if free_space is not None else None,
        migrated_count=0,
        message="Diretório de armazenamento consultado com sucesso."
    )

@router.post("/storage-dir", response_model=StorageDirectoryConfigResponse)
async def configure_storage_directory(
    payload: StorageDirectoryConfigRequest,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user)
):
    """Define um novo diretório de armazenamento e opcionalmente migra os comprovantes existentes."""
    success, message, migrated_count = await validate_and_set_storage_directory(
        db=db,
        directory_path=payload.directory_path,
        migrate_files=payload.migrate_existing
    )

    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=message
        )

    active_dir = await get_storage_directory(db)
    is_custom = active_dir != DEFAULT_ATTACHMENT_DIR
    is_writable = is_directory_writable(active_dir)
    free_space = get_directory_free_space(active_dir)

    return StorageDirectoryConfigResponse(
        active_directory=active_dir,
        default_directory=DEFAULT_ATTACHMENT_DIR,
        is_custom=is_custom,
        is_writable=is_writable,
        free_space_bytes=free_space,
        formatted_free_space=format_bytes(free_space) if free_space is not None else None,
        migrated_count=migrated_count,
        message=message
    )

@router.post("/storage-dir/reset", response_model=StorageDirectoryConfigResponse)
async def reset_storage_directory_endpoint(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user)
):
    """Restaura o diretório de armazenamento para o padrão original."""
    default_dir = await reset_storage_directory(db)
    is_writable = is_directory_writable(default_dir)
    free_space = get_directory_free_space(default_dir)

    return StorageDirectoryConfigResponse(
        active_directory=default_dir,
        default_directory=DEFAULT_ATTACHMENT_DIR,
        is_custom=False,
        is_writable=is_writable,
        free_space_bytes=free_space,
        formatted_free_space=format_bytes(free_space) if free_space is not None else None,
        migrated_count=0,
        message="Diretório de armazenamento restaurado para o padrão."
    )

@router.get("/{attachment_id}", response_model=AttachmentResponse)
async def get_attachment(
    attachment_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user)
):
    """Busca os metadados de um anexo específico."""
    att = await db.get(Attachment, attachment_id)
    if not att:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Comprovante não encontrado."
        )
    return enrich_attachment_schema(att)

@router.patch("/{attachment_id}", response_model=AttachmentResponse)
async def update_attachment(
    attachment_id: str,
    payload: AttachmentUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user)
):
    """Atualiza metadados do anexo, como o tipo de anexo ou nome de exibição."""
    att = await db.get(Attachment, attachment_id)
    if not att:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Comprovante não encontrado."
        )

    if payload.attachment_type is not None:
        att.attachment_type = payload.attachment_type
    if payload.file_name is not None and payload.file_name.strip():
        att.file_name = payload.file_name.strip()

    await db.commit()
    await db.refresh(att)

    return enrich_attachment_schema(att)

@router.get("/{attachment_id}/file")
async def preview_attachment_file(
    attachment_id: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Serve o arquivo binário com headers inline para exibição direta no navegador
    (fotos, recibos e PDFs).
    """
    att = await db.get(Attachment, attachment_id)
    if not att:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Comprovante não encontrado."
        )

    abs_path = await get_absolute_file_path(db, att)
    if not os.path.exists(abs_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Arquivo físico não encontrado no diretório: {abs_path}"
        )

    return FileResponse(
        path=abs_path,
        media_type=att.mime_type,
        headers={
            "Content-Disposition": f'inline; filename="{att.file_name}"',
            "Cache-Control": "public, max-age=86400"
        }
    )

@router.get("/{attachment_id}/download")
async def download_attachment_file(
    attachment_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Força o download direto do arquivo com o nome original."""
    att = await db.get(Attachment, attachment_id)
    if not att:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Comprovante não encontrado."
        )

    abs_path = await get_absolute_file_path(db, att)
    if not os.path.exists(abs_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Arquivo físico não encontrado no diretório."
        )

    return FileResponse(
        path=abs_path,
        media_type=att.mime_type,
        filename=att.file_name
    )

@router.delete("/{attachment_id}")
async def remove_attachment(
    attachment_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user)
):
    """Exclui o anexo do banco e apaga o arquivo físico do disco."""
    att = await db.get(Attachment, attachment_id)
    if not att:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Comprovante não encontrado."
        )

    success = await delete_attachment(db, attachment_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Falha ao remover comprovante do diretório."
        )

    return {"success": True, "message": "Comprovante removido com sucesso."}

