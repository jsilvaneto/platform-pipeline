import os
import re
import uuid
import shutil
from datetime import datetime, timezone
from typing import Optional, List, Tuple
from fastapi import UploadFile, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.models import Attachment, Transaction, generate_uuid, now_utc_iso
from app.schemas.attachment import AttachmentResponse, AttachmentStatsResponse
from app.services.system_service import get_config_value, set_config_value

# Diretório base padrão de armazenamento local
DEFAULT_ATTACHMENT_DIR = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "data", "attachments")
)

MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024 # 15 MB

ALLOWED_MIME_TYPES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "application/pdf": ".pdf",
    "image/heic": ".heic",
    "image/heif": ".heif",
}

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".pdf", ".heic", ".heif"}

def format_bytes(size_bytes: int) -> str:
    """Formata bytes para exibição humana (KB, MB, GB)."""
    if size_bytes < 1024:
        return f"{size_bytes} B"
    elif size_bytes < 1024 * 1024:
        return f"{size_bytes / 1024:.1f} KB"
    elif size_bytes < 1024 * 1024 * 1024:
        return f"{size_bytes / (1024 * 1024):.2f} MB"
    else:
        return f"{size_bytes / (1024 * 1024 * 1024):.2f} GB"

def sanitize_filename(name: str) -> str:
    """Sanitiza o nome do arquivo para segurança no sistema de arquivos."""
    clean = re.sub(r'[^a-zA-Z0-9_\.\-]', '_', name)
    return clean[:100]

def normalize_storage_path(path_str: str) -> str:
    """
    Normaliza caminhos informados pelo usuário, convertendo formatos Windows
    (ex: C:\\Users\\..., C:/Users/..., D:\\...) para caminhos compatíveis com Linux/WSL
    (/mnt/c/Users/..., /mnt/d/...) e tratando atalhos como '~'.
    """
    if not path_str or not path_str.strip():
        return ""

    clean = path_str.strip().strip("'\"")
    clean = clean.replace("\\", "/")

    win_drive_match = re.match(r"^([a-zA-Z]):/(.*)", clean)
    if win_drive_match and os.name != "nt":
        drive_letter = win_drive_match.group(1).lower()
        rest_of_path = win_drive_match.group(2)
        clean = f"/mnt/{drive_letter}/{rest_of_path}"

    return os.path.abspath(os.path.expanduser(clean))

async def get_storage_directory(db: AsyncSession) -> str:
    """Retorna o diretório ativo de armazenamento configurado ou o padrão."""
    custom_dir = await get_config_value(db, "storage_directory")
    if custom_dir and custom_dir.strip():
        normalized = normalize_storage_path(custom_dir)
        if normalized:
            return normalized
    return DEFAULT_ATTACHMENT_DIR

def is_directory_writable(dir_path: str) -> bool:
    """Verifica se o processo tem permissão de escrita no diretório."""
    try:
        os.makedirs(dir_path, exist_ok=True)
        test_file = os.path.join(dir_path, f".wallet_write_test_{uuid.uuid4().hex}.tmp")
        with open(test_file, "w") as f:
            f.write("wallet_ok")
        if os.path.exists(test_file):
            os.remove(test_file)
        return True
    except Exception:
        return False

def get_directory_free_space(dir_path: str) -> Optional[int]:
    """Retorna o espaço livre em bytes na partição do diretório."""
    try:
        check_path = dir_path
        while check_path and not os.path.exists(check_path):
            parent = os.path.dirname(check_path)
            if parent == check_path:
                break
            check_path = parent
        if os.path.exists(check_path):
            return shutil.disk_usage(check_path).free
    except Exception:
        pass
    return None

async def validate_and_set_storage_directory(
    db: AsyncSession,
    directory_path: str,
    migrate_files: bool = True
) -> Tuple[bool, str, int]:
    """
    Valida as permissões do novo diretório, migra arquivos existentes se solicitado
    e persiste a nova rota nas configurações do sistema.
    """
    if not directory_path or not directory_path.strip():
        return False, "O caminho do diretório não pode ser vazio.", 0

    clean_path = normalize_storage_path(directory_path)
    if not clean_path:
        return False, "Caminho de diretório inválido.", 0

    try:
        os.makedirs(clean_path, exist_ok=True)
    except Exception as e:
        return False, f"Não foi possível criar o diretório '{clean_path}': {e}", 0

    if not is_directory_writable(clean_path):
        return False, f"O diretório '{clean_path}' não possui permissões de gravação.", 0

    old_dir = await get_storage_directory(db)
    migrated_count = 0

    if migrate_files and os.path.exists(old_dir) and old_dir != clean_path:
        for root, _, files in os.walk(old_dir):
            for file in files:
                if file.startswith("."):
                    continue
                old_file_path = os.path.join(root, file)
                rel_path = os.path.relpath(old_file_path, old_dir)
                new_file_path = os.path.join(clean_path, rel_path)
                
                os.makedirs(os.path.dirname(new_file_path), exist_ok=True)
                if not os.path.exists(new_file_path):
                    shutil.copy2(old_file_path, new_file_path)
                    migrated_count += 1

    await set_config_value(db, "storage_directory", clean_path)
    return True, f"Diretório de armazenamento configurado para '{clean_path}' com sucesso!", migrated_count

async def reset_storage_directory(db: AsyncSession) -> str:
    """Restaura o diretório de armazenamento para o padrão do Wallet."""
    await set_config_value(db, "storage_directory", "")
    os.makedirs(DEFAULT_ATTACHMENT_DIR, exist_ok=True)
    return DEFAULT_ATTACHMENT_DIR

def enrich_attachment_schema(att: Attachment) -> AttachmentResponse:
    """Enriquece o schema de resposta com URLs úteis e tamanho formatado."""
    resp = AttachmentResponse.model_validate(att)
    resp.download_url = f"/api/v1/attachments/{att.id}/download"
    resp.file_url = f"/api/v1/attachments/{att.id}/file"
    resp.formatted_size = format_bytes(att.file_size_bytes)
    return resp

async def save_uploaded_attachment(
    db: AsyncSession,
    upload_file: UploadFile,
    profile: str,
    transaction_id: Optional[str] = None,
    attachment_type: str = "COMPROVANTE"
) -> Attachment:
    """
    Valida e salva o arquivo fisicamente no diretório de armazenamento ativo,
    persistindo os metadados na tabela attachments do SQLite.
    """
    if profile not in ("PESSOAL", "EMPRESA"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Perfil inválido. Deve ser 'PESSOAL' ou 'EMPRESA'."
        )

    valid_types = ("COMPROVANTE", "NOTA_FISCAL", "FATURA", "RECIBO", "CONTRATO", "OUTRO")
    clean_type = attachment_type.upper() if attachment_type else "COMPROVANTE"
    if clean_type not in valid_types:
        clean_type = "COMPROVANTE"

    orig_name = upload_file.filename or "comprovante.jpg"
    _, ext = os.path.splitext(orig_name.lower())
    
    mime = upload_file.content_type or "application/octet-stream"
    if ext not in ALLOWED_EXTENSIONS and mime not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Formato de arquivo não suportado ({ext}). Envie imagens (JPG, PNG, WEBP) ou PDFs."
        )

    contents = await upload_file.read()
    file_size = len(contents)

    if file_size <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="O arquivo enviado está vazio."
        )

    if file_size > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"O arquivo excede o limite máximo permitido de {format_bytes(MAX_FILE_SIZE_BYTES)}."
        )

    if transaction_id:
        trans = await db.get(Transaction, transaction_id)
        if not trans:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Lançamento com ID {transaction_id} não foi encontrado."
            )
        if trans.profile != profile:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="O perfil do anexo não coincide com o perfil do lançamento."
            )

    attachment_id = generate_uuid()
    clean_name = sanitize_filename(orig_name)
    now = datetime.now(timezone.utc)
    year_str = now.strftime("%Y")
    month_str = now.strftime("%m")

    # Diretório ativo configurado
    base_dir = await get_storage_directory(db)
    rel_subfolder = os.path.join(profile.lower(), year_str, month_str)
    folder_path = os.path.join(base_dir, rel_subfolder)
    os.makedirs(folder_path, exist_ok=True)

    disk_filename = f"{attachment_id}_{clean_name}"
    abs_file_path = os.path.join(folder_path, disk_filename)

    with open(abs_file_path, "wb") as f:
        f.write(contents)

    rel_file_path = os.path.join(rel_subfolder, disk_filename)

    attachment = Attachment(
        id=attachment_id,
        profile=profile,
        transaction_id=transaction_id,
        file_name=orig_name,
        file_path=rel_file_path,
        file_size_bytes=file_size,
        mime_type=mime,
        attachment_type=clean_type,
        sync_status="SINCRONIZADO",
        created_at=now.isoformat()
    )

    db.add(attachment)
    await db.commit()
    await db.refresh(attachment)

    return attachment

async def get_absolute_file_path(db: AsyncSession, attachment: Attachment) -> str:
    """
    Retorna o caminho absoluto do arquivo no disco, verificando primeiro no diretório ativo
    e com fallback para o diretório padrão para máxima compatibilidade.
    """
    if os.path.isabs(attachment.file_path) and os.path.exists(attachment.file_path):
        return attachment.file_path

    active_dir = await get_storage_directory(db)
    active_path = os.path.join(active_dir, attachment.file_path)
    if os.path.exists(active_path):
        return active_path

    default_path = os.path.join(DEFAULT_ATTACHMENT_DIR, attachment.file_path)
    if os.path.exists(default_path):
        return default_path

    return active_path

async def delete_attachment(db: AsyncSession, attachment_id: str) -> bool:
    """Remove o anexo do banco e apaga o arquivo físico do disco."""
    att = await db.get(Attachment, attachment_id)
    if not att:
        return False

    abs_path = await get_absolute_file_path(db, att)
    if os.path.exists(abs_path):
        try:
            os.remove(abs_path)
        except Exception as e:
            print(f"Aviso ao remover arquivo local {abs_path}: {e}")

    await db.delete(att)
    await db.commit()
    return True

async def get_storage_stats(db: AsyncSession, profile: Optional[str] = None) -> AttachmentStatsResponse:
    """Calcula estatísticas de armazenamento e métricas do diretório local."""
    query = select(
        func.count(Attachment.id),
        func.coalesce(func.sum(Attachment.file_size_bytes), 0)
    )
    if profile:
        query = query.where(Attachment.profile == profile)

    total_count, total_size = (await db.execute(query)).one()

    status_query = select(Attachment.sync_status, func.count(Attachment.id))
    if profile:
        status_query = status_query.where(Attachment.profile == profile)
    status_query = status_query.group_by(Attachment.sync_status)
    
    status_counts = dict((await db.execute(status_query)).all())

    active_dir = await get_storage_directory(db)
    is_custom = active_dir != DEFAULT_ATTACHMENT_DIR
    is_writable = is_directory_writable(active_dir)
    free_space = get_directory_free_space(active_dir)

    return AttachmentStatsResponse(
        total_count=total_count or 0,
        total_size_bytes=int(total_size or 0),
        formatted_total_size=format_bytes(int(total_size or 0)),
        active_directory=active_dir,
        default_directory=DEFAULT_ATTACHMENT_DIR,
        is_custom_directory=is_custom,
        is_writable=is_writable,
        free_space_bytes=free_space,
        formatted_free_space=format_bytes(free_space) if free_space is not None else None,
        synced_count=status_counts.get("SINCRONIZADO", total_count or 0),
        pending_count=status_counts.get("PENDENTE", 0),
        error_count=status_counts.get("ERRO", 0),
    )

