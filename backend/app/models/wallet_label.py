from datetime import datetime, timezone
import uuid
from sqlalchemy import String, Boolean, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class WalletLabel(Base):
    """Etiquetas (Tags) multicritério para agrupamento e análise de transações."""
    __tablename__ = "labels"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    color: Mapped[str] = mapped_column(String(30), default="#64748b", nullable=False)
    is_archived: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[str] = mapped_column(String(40), default=lambda: datetime.now(timezone.utc).isoformat(), nullable=False)

    user = relationship("User", backref="labels", lazy="selectin")
