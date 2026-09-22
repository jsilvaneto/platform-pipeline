from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.api.v1.deps import get_current_user
from app.models.user import User
from app.models.wallet_account import WalletAccount
from app.schemas.wallet_account import WalletAccountResponse

router = APIRouter(prefix="/accounts", tags=["Contas Bancárias & Carteiras"])


@router.get("", response_model=list[WalletAccountResponse])
async def list_accounts(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[WalletAccountResponse]:
    """Retorna todas as contas bancárias, cartões e investimentos do usuário."""
    query = (
        select(WalletAccount)
        .where(WalletAccount.user_id == current_user.id)
        .order_by(WalletAccount.name.asc())
    )
    result = await db.execute(query)
    accounts = result.scalars().all()
    return list(accounts)
