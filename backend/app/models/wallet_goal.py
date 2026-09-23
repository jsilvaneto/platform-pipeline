from datetime import datetime, timezone
import uuid
from sqlalchemy import String, BigInteger, Text, ForeignKey, CheckConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class WalletGoal(Base):
    """Metas de poupança e reservas financeiras sincronizadas da API Wallet."""
    __tablename__ = "goals"
    __table_args__ = (
        CheckConstraint(
            "state IN ('active', 'paused', 'reached')",
            name="chk_goal_state"
        ),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    name: Mapped[str] = mapped_column(String(150), nullable=False, index=True)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    
    target_amount_cents: Mapped[int] = mapped_column(BigInteger, nullable=False)
    initial_amount_cents: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)
    current_amount_cents: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)
    currency_code: Mapped[str] = mapped_column(String(10), default="BRL", nullable=False)

    desired_date: Mapped[str | None] = mapped_column(String(40), nullable=True, index=True)
    state: Mapped[str] = mapped_column(String(20), default="active", nullable=False)
    state_updated_at: Mapped[str | None] = mapped_column(String(40), nullable=True)

    created_at: Mapped[str] = mapped_column(String(40), default=lambda: datetime.now(timezone.utc).isoformat(), nullable=False)
    updated_at: Mapped[str] = mapped_column(
        String(40),
        default=lambda: datetime.now(timezone.utc).isoformat(),
        onupdate=lambda: datetime.now(timezone.utc).isoformat(),
        nullable=False
    )

    user = relationship("User", backref="goals", lazy="selectin")
