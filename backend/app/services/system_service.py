from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from app.models import SystemConfig, now_utc_iso

async def get_config_value(db: AsyncSession, key: str) -> Optional[str]:
    """Busca uma configuração do sistema no banco de dados SQLite."""
    res = await db.get(SystemConfig, key)
    if res and res.value:
        return res.value
    return None

async def set_config_value(db: AsyncSession, key: str, value: Optional[str]):
    """Define ou atualiza uma configuração do sistema no banco de dados SQLite."""
    config = await db.get(SystemConfig, key)
    if config:
        config.value = value
        config.updated_at = now_utc_iso()
    else:
        config = SystemConfig(key=key, value=value, updated_at=now_utc_iso())
        db.add(config)
    await db.commit()
