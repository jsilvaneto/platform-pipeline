from datetime import datetime, timezone
import uuid
from sqlalchemy import String, ForeignKey, CheckConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base

class PaymentMethod(Base):
    """Meios e formas de pagamento pessoais (Cartões, Pix, Dinheiro, Boleto)."""
    __tablename__ = "payment_methods"
    __table_args__ = (
        CheckConstraint(
            "type IN ('CARTAO_CREDITO', 'CARTAO_DEBITO', 'DINHEIRO', 'PIX', 'BOLETO', 'OUTRO')",
            name="chk_payment_method_type"
        ),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    type: Mapped[str] = mapped_column(String(30), default="OUTRO", nullable=False)
    created_at: Mapped[str] = mapped_column(String(40), default=lambda: datetime.now(timezone.utc).isoformat(), nullable=False)

    user = relationship("User", backref="payment_methods", lazy="selectin")
