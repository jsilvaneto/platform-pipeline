from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional

from app.database import get_db
from app.models import Contact, User
from app.schemas.contact import ContactCreate, ContactUpdate, ContactResponse, ContactStatementResponse
from app.services.contact_service import get_contact_statement
from app.api.v1.deps import get_current_user

router = APIRouter(prefix="/contacts", tags=["Contatos"])

@router.get("", response_model=List[ContactResponse])
async def list_contacts(
    profile: Optional[str] = Query(None, description="Filtrar por PESSOAL ou EMPRESA"),
    type: Optional[str] = Query(None, description="Filtrar por FORNECEDOR, CLIENTE, FUNCIONARIO, OUTRO"),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user)
):
    query = select(Contact)
    if profile:
        query = query.where(Contact.profile == profile)
    if type:
        query = query.where(Contact.type == type)
    query = query.order_by(Contact.name.asc())
    result = await db.execute(query)
    return result.scalars().all()

@router.post("", response_model=ContactResponse, status_code=status.HTTP_201_CREATED)
async def create_contact(
    contact_in: ContactCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user)
):
    new_contact = Contact(**contact_in.model_dump())
    db.add(new_contact)
    await db.commit()
    await db.refresh(new_contact)
    return new_contact

@router.get("/{contact_id}", response_model=ContactResponse)
async def get_contact(
    contact_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user)
):
    query = select(Contact).where(Contact.id == contact_id)
    result = await db.execute(query)
    contact = result.scalar_one_or_none()
    if not contact:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contato não encontrado")
    return contact

@router.get("/{contact_id}/statement", response_model=ContactStatementResponse)
async def get_statement_endpoint(
    contact_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user)
):
    """Retorna o extrato e histórico completo da conta-corrente do contato."""
    return await get_contact_statement(db, contact_id)

@router.put("/{contact_id}", response_model=ContactResponse)
async def update_contact(
    contact_id: str,
    contact_in: ContactUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user)
):
    query = select(Contact).where(Contact.id == contact_id)
    result = await db.execute(query)
    contact = result.scalar_one_or_none()
    if not contact:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contato não encontrado")
    
    update_data = contact_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(contact, field, value)
    
    await db.commit()
    await db.refresh(contact)
    return contact

@router.delete("/{contact_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_contact(
    contact_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user)
):
    query = select(Contact).where(Contact.id == contact_id)
    result = await db.execute(query)
    contact = result.scalar_one_or_none()
    if not contact:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contato não encontrado")
    
    await db.delete(contact)
    await db.commit()
