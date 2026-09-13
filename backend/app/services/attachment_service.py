from datetime import datetime, timezone
from pathlib import Path
import re
from typing import Any
import uuid

from fastapi import HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.attachment import Attachment
from app.models.expense import Expense
from app.models.payment import Payment
from app.schemas.attachment import (
    AttachmentCategory,
    AttachmentListResponse,
    AttachmentResponse,
)
from app.services.storage_service import StorageService

MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024  # 15 MB
ALLOWED_EXTENSIONS = {".pdf", ".png", ".jpg", ".jpeg", ".webp"}
ALLOWED_CATEGORIES = {
    "COMPROVANTE_PAGAMENTO",
    "NOTA_FISCAL",
    "FATURA_BOLETO",
    "CONTRATO",
    "OUTRO",
}


class AttachmentService:
    """Serviço de gerenciamento de anexos, upload seguro, validação de tipos e ciclo de vida de arquivos."""

    @classmethod
    def _sanitize_filename(cls, filename: str) -> str:
        """Remove caracteres perigosos mantendo nome legível."""
        base_name = Path(filename).name
        cleaned = re.sub(r"[^a-zA-Z0-9_.-]", "_", base_name)
        return cleaned if cleaned and not cleaned.startswith(".") else f"arquivo_{uuid.uuid4().hex[:8]}"

    @classmethod
    def _to_response(cls, attachment: Attachment) -> AttachmentResponse:
        """Converte entidade Attachment em AttachmentResponse com tamanho formatado."""
        return AttachmentResponse(
            id=attachment.id,
            user_id=attachment.user_id,
            expense_id=attachment.expense_id,
            payment_id=attachment.payment_id,
            category=attachment.category,  # type: ignore[arg-type]
            original_filename=attachment.original_filename,
            content_type=attachment.content_type,
            file_size_bytes=attachment.file_size_bytes,
            file_size_pretty=StorageService.format_size(attachment.file_size_bytes),
            notes=attachment.notes,
            created_at=attachment.created_at,
            updated_at=attachment.updated_at,
        )

    @classmethod
    async def upload_attachment(
        cls,
        db: AsyncSession,
        user_id: str,
        file: UploadFile,
        category: str = "COMPROVANTE_PAGAMENTO",
        expense_id: str | None = None,
        payment_id: str | None = None,
        notes: str | None = None,
    ) -> AttachmentResponse:
        """Valida e persiste um anexo no disco e no banco de dados."""
        # 1. Validação de categoria
        if category not in ALLOWED_CATEGORIES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Categoria inválida. Categorias permitidas: {', '.join(sorted(ALLOWED_CATEGORIES))}",
            )

        # 2. Validação de extensão
        original_name = file.filename or "documento"
        ext = Path(original_name).suffix.lower()
        if ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Formato de arquivo não suportado ({ext}). Formatos permitidos: PDF, PNG, JPG, JPEG, WEBP.",
            )

        # 3. Validação de vínculos (Expense / Payment)
        target_expense_id = expense_id
        if payment_id:
            payment_res = await db.execute(
                select(Payment).where(Payment.id == payment_id, Payment.user_id == user_id)
            )
            payment = payment_res.scalar_one_or_none()
            if not payment:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Parcela de pagamento informada não foi encontrada ou não pertence ao usuário.",
                )
            if not target_expense_id:
                target_expense_id = payment.expense_id

        if target_expense_id:
            expense_res = await db.execute(
                select(Expense).where(Expense.id == target_expense_id, Expense.user_id == user_id)
            )
            expense = expense_res.scalar_one_or_none()
            if not expense:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Despesa informada não foi encontrada ou não pertence ao usuário.",
                )

        # 4. Leitura do arquivo com limite de tamanho
        file_bytes = await file.read()
        file_size = len(file_bytes)
        if file_size == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="O arquivo enviado está vazio.",
            )
        if file_size > MAX_FILE_SIZE_BYTES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Arquivo excede o tamanho máximo permitido de 15 MB.",
            )

        # 5. Organização do diretório e salvamento no disco
        sanitized_name = cls._sanitize_filename(original_name)
        now = datetime.now(timezone.utc)
        year_str = now.strftime("%Y")
        month_str = now.strftime("%m")
        unique_prefix = uuid.uuid4().hex[:12]
        stored_filename = f"{unique_prefix}_{sanitized_name}"
        relative_path = f"{category.lower()}/{year_str}/{month_str}/{stored_filename}"

        attachments_base = StorageService.get_attachments_dir()
        target_path = attachments_base / relative_path
        try:
            target_path.parent.mkdir(parents=True, exist_ok=True)
            target_path.write_bytes(file_bytes)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Falha ao gravar o anexo no diretório de armazenamento: {str(e)}",
            )

        # 6. Criação do registro no banco
        attachment = Attachment(
            user_id=user_id,
            expense_id=target_expense_id,
            payment_id=payment_id,
            category=category,
            original_filename=original_name,
            stored_relative_path=relative_path,
            content_type=file.content_type or "application/octet-stream",
            file_size_bytes=file_size,
            notes=notes.strip() if notes else None,
        )
        db.add(attachment)
        await db.commit()
        await db.refresh(attachment)

        return cls._to_response(attachment)

    @classmethod
    async def list_attachments(
        cls,
        db: AsyncSession,
        user_id: str,
        expense_id: str | None = None,
        payment_id: str | None = None,
        category: str | None = None,
    ) -> AttachmentListResponse:
        """Lista anexos filtrados por usuário, despesa, parcela ou categoria."""
        query = select(Attachment).where(Attachment.user_id == user_id)

        if expense_id:
            query = query.where(Attachment.expense_id == expense_id)
        if payment_id:
            query = query.where(Attachment.payment_id == payment_id)
        if category:
            query = query.where(Attachment.category == category)

        query = query.order_by(Attachment.created_at.desc())
        result = await db.execute(query)
        records = result.scalars().all()

        items = [cls._to_response(att) for att in records]
        return AttachmentListResponse(items=items, total=len(items))

    @classmethod
    async def get_attachment(
        cls,
        db: AsyncSession,
        user_id: str,
        attachment_id: str,
    ) -> Attachment:
        """Busca um anexo pelo ID garantindo pertencimento ao usuário."""
        query = select(Attachment).where(
            Attachment.id == attachment_id,
            Attachment.user_id == user_id,
        )
        result = await db.execute(query)
        attachment = result.scalar_one_or_none()
        if not attachment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Anexo não encontrado.",
            )
        return attachment

    @classmethod
    def get_physical_path(cls, attachment: Attachment) -> Path:
        """Resolve o caminho absoluto do arquivo no disco."""
        base_dir = StorageService.get_attachments_dir()
        physical_path = base_dir / attachment.stored_relative_path
        if not physical_path.is_file():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Arquivo físico não encontrado no diretório de armazenamento.",
            )
        return physical_path

    @classmethod
    async def delete_attachment(
        cls,
        db: AsyncSession,
        user_id: str,
        attachment_id: str,
    ) -> bool:
        """Exclui o registro no banco de dados e remove o arquivo físico do disco (resíduo zero)."""
        attachment = await cls.get_attachment(db, user_id, attachment_id)

        # Resolve o caminho antes de deletar o registro
        base_dir = StorageService.get_attachments_dir()
        physical_path = base_dir / attachment.stored_relative_path

        await db.delete(attachment)
        await db.commit()

        # Remove o arquivo do disco com resíduo zero
        if physical_path.is_file():
            try:
                physical_path.unlink(missing_ok=True)
            except Exception:
                pass

        return True
