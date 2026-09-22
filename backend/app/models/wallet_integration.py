from datetime import datetime, timezone
import uuid
from sqlalchemy import String, Boolean, Integer, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class WalletIntegration(Base):
    """Configurações e credenciais seguras da integração oficial com a API BudgetBakers Wallet."""
    __tablename__ = "wallet_integrations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    api_base_url: Mapped[str] = mapped_column(String(200), default="https://rest.budgetbakers.com/wallet", nullable=False)
    api_key_encrypted: Mapped[str | None] = mapped_column(Text, nullable=True)
    token_masked: Mapped[str | None] = mapped_column(String(50), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    
    last_sync_at: Mapped[str | None] = mapped_column(String(40), nullable=True)
    last_sync_rev: Mapped[int | None] = mapped_column(Integer, nullable=True)
    last_sync_status: Mapped[str] = mapped_column(String(20), default="PENDING", nullable=False)
    last_error_message: Mapped[str | None] = mapped_column(Text, nullable=True)

    rate_limit_remaining: Mapped[int | None] = mapped_column(Integer, default=300, nullable=True)
    rate_limit_limit: Mapped[int | None] = mapped_column(Integer, default=300, nullable=True)
    rate_limit_reset_at: Mapped[str | None] = mapped_column(String(40), nullable=True)

    created_at: Mapped[str] = mapped_column(String(40), default=lambda: datetime.now(timezone.utc).isoformat(), nullable=False)
    updated_at: Mapped[str] = mapped_column(
        String(40),
        default=lambda: datetime.now(timezone.utc).isoformat(),
        onupdate=lambda: datetime.now(timezone.utc).isoformat(),
        nullable=False
    )

    user = relationship("User", backref="wallet_integration", lazy="selectin")
