from typing import Any
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.deps import get_current_user
from app.database import get_db
from app.models.user import User
from app.schemas.attachment import AttachmentListResponse, AttachmentResponse
from app.services.attachment_service import AttachmentService

router = APIRouter(prefix="/attachments", tags=["Anexos"])


@router.post(
    "/upload",
    response_model=AttachmentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload e categorização de anexo",
)
async def upload_attachment(
    file: UploadFile = File(...),
    category: str = Form("COMPROVANTE_PAGAMENTO"),
    expense_id: str | None = Form(None),
    payment_id: str | None = Form(None),
    notes: str | None = Form(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AttachmentResponse:
    """Faz upload de comprovante, nota fiscal, boleto ou contrato vinculado a uma despesa ou parcela."""
    return await AttachmentService.upload_attachment(
        db=db,
        user_id=current_user.id,
        file=file,
        category=category,
        expense_id=expense_id if expense_id and expense_id.strip() else None,
        payment_id=payment_id if payment_id and payment_id.strip() else None,
        notes=notes if notes and notes.strip() else None,
    )


@router.get(
    "",
    response_model=AttachmentListResponse,
    summary="Listar anexos com filtros",
)
async def list_attachments(
    expense_id: str | None = None,
    payment_id: str | None = None,
    category: str | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AttachmentListResponse:
    """Lista todos os anexos do usuário logado, com filtros opcionais por despesa, parcela ou categoria."""
    return await AttachmentService.list_attachments(
        db=db,
        user_id=current_user.id,
        expense_id=expense_id,
        payment_id=payment_id,
        category=category,
    )


@router.get(
    "/{attachment_id}/preview",
    summary="Visualização inline de anexo (PDF ou imagem)",
)
async def preview_attachment(
    attachment_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> FileResponse:
    """Abre o anexo diretamente no navegador para pré-visualização imediata."""
    attachment = await AttachmentService.get_attachment(db, current_user.id, attachment_id)
    physical_path = AttachmentService.get_physical_path(attachment)

    return FileResponse(
        path=str(physical_path),
        media_type=attachment.content_type,
        content_disposition_type="inline",
    )


@router.get(
    "/{attachment_id}/download",
    summary="Download de anexo",
)
async def download_attachment(
    attachment_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> FileResponse:
    """Faz o download forçado do arquivo do anexo com o nome original."""
    attachment = await AttachmentService.get_attachment(db, current_user.id, attachment_id)
    physical_path = AttachmentService.get_physical_path(attachment)

    return FileResponse(
        path=str(physical_path),
        media_type=attachment.content_type,
        filename=attachment.original_filename,
        content_disposition_type="attachment",
    )


@router.delete(
    "/{attachment_id}",
    status_code=status.HTTP_200_OK,
    summary="Excluir anexo",
)
async def delete_attachment(
    attachment_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    """Remove o anexo do banco de dados e exclui o arquivo físico do disco."""
    await AttachmentService.delete_attachment(db, current_user.id, attachment_id)
    return {"message": "Anexo excluído com sucesso."}
