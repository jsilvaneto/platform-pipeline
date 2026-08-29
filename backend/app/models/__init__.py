import uuid
from datetime import datetime, timezone
from typing import Optional, List
from sqlalchemy import String, Integer, ForeignKey, Text, CheckConstraint, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base

def generate_uuid() -> str:
    return str(uuid.uuid4())

def now_utc_iso() -> str:
    return datetime.now(timezone.utc).isoformat()

# 1. Usuários
class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    username: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[str] = mapped_column(String(30), default=now_utc_iso, nullable=False)

# 2. Contas / Carteiras
class Account(Base):
    __tablename__ = "accounts"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    profile: Mapped[str] = mapped_column(String(10), nullable=False) # 'PESSOAL' ou 'EMPRESA'
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    type: Mapped[str] = mapped_column(String(30), nullable=False) # CORRENTE, POUPANCA, INVESTIMENTO, CAIXA
    created_at: Mapped[str] = mapped_column(String(30), default=now_utc_iso, nullable=False)

    __table_args__ = (
        CheckConstraint("profile IN ('PESSOAL', 'EMPRESA')", name="chk_account_profile"),
    )

# 2.1 Formas de Pagamento (Meio utilizado para pagar/receber: Pix, Boleto, Cartão, Dinheiro, etc.)
class PaymentMethod(Base):
    __tablename__ = "payment_methods"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    profile: Mapped[str] = mapped_column(String(10), nullable=False) # 'PESSOAL' ou 'EMPRESA'
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    created_at: Mapped[str] = mapped_column(String(30), default=now_utc_iso, nullable=False)

    __table_args__ = (
        CheckConstraint("profile IN ('PESSOAL', 'EMPRESA')", name="chk_payment_method_profile"),
    )

# 2.2 Cartões de Crédito (Gestão de limites, fechamento, vencimento e faturas)
class CreditCard(Base):
    __tablename__ = "credit_cards"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    profile: Mapped[str] = mapped_column(String(10), nullable=False) # 'PESSOAL' ou 'EMPRESA'
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    limit_cents: Mapped[int] = mapped_column(Integer, nullable=False) # Limite total em centavos
    closing_day: Mapped[int] = mapped_column(Integer, nullable=False) # Dia do fechamento (melhor dia de compra), 1 a 31
    due_day: Mapped[int] = mapped_column(Integer, nullable=False) # Dia do vencimento da fatura, 1 a 31
    color: Mapped[str] = mapped_column(String(30), default="emerald", nullable=False) # Cor de destaque (emerald, indigo, purple, rose, amber, sky, zinc)
    brand: Mapped[Optional[str]] = mapped_column(String(30), nullable=True) # MASTERCARD, VISA, ELO, AMEX, HIPERCARD, OUTRO
    account_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("accounts.id", ondelete="SET NULL"), nullable=True) # Conta padrão para pagamento da fatura
    created_at: Mapped[str] = mapped_column(String(30), default=now_utc_iso, nullable=False)

    account: Mapped[Optional["Account"]] = relationship("Account")

    __table_args__ = (
        CheckConstraint("profile IN ('PESSOAL', 'EMPRESA')", name="chk_credit_card_profile"),
        CheckConstraint("closing_day BETWEEN 1 AND 31", name="chk_credit_card_closing_day"),
        CheckConstraint("due_day BETWEEN 1 AND 31", name="chk_credit_card_due_day"),
    )

# 3. Categorias
class Category(Base):
    __tablename__ = "categories"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    profile: Mapped[str] = mapped_column(String(10), nullable=False)
    type: Mapped[str] = mapped_column(String(10), nullable=False) # 'RECEITA' ou 'DESPESA'
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    nature: Mapped[str] = mapped_column(String(20), default="NENHUM", nullable=False) # 'NENHUM', 'OBRIGATORIO', 'NECESSARIO', 'DESEJO'
    created_at: Mapped[str] = mapped_column(String(30), default=now_utc_iso, nullable=False)

    __table_args__ = (
        CheckConstraint("profile IN ('PESSOAL', 'EMPRESA')", name="chk_category_profile"),
        CheckConstraint("type IN ('RECEITA', 'DESPESA')", name="chk_category_type"),
        CheckConstraint("nature IN ('NENHUM', 'OBRIGATORIO', 'NECESSARIO', 'DESEJO')", name="chk_category_nature"),
    )

# 4. Itens Vinculados a Categoria
class Item(Base):
    __tablename__ = "items"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    profile: Mapped[str] = mapped_column(String(10), nullable=False)
    category_id: Mapped[str] = mapped_column(String(36), ForeignKey("categories.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    default_amount_cents: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    created_at: Mapped[str] = mapped_column(String(30), default=now_utc_iso, nullable=False)

    category: Mapped["Category"] = relationship("Category")

    __table_args__ = (
        CheckConstraint("profile IN ('PESSOAL', 'EMPRESA')", name="chk_item_profile"),
    )

# 5. Contatos (Clientes, Fornecedores, etc.)
class Contact(Base):
    __tablename__ = "contacts"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    profile: Mapped[str] = mapped_column(String(10), nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    type: Mapped[str] = mapped_column(String(30), nullable=False) # CLIENTE, FORNECEDOR, COLABORADOR, FAVORECIDO, OUTRO
    document: Mapped[Optional[str]] = mapped_column(String(30), nullable=True) # CPF ou CNPJ
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[str] = mapped_column(String(30), default=now_utc_iso, nullable=False)

    __table_args__ = (
        CheckConstraint("profile IN ('PESSOAL', 'EMPRESA')", name="chk_contact_profile"),
    )

# 6. Dívidas / Passivos
class Debt(Base):
    __tablename__ = "debts"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    profile: Mapped[str] = mapped_column(String(10), nullable=False)
    contact_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("contacts.id", ondelete="SET NULL"), nullable=True)
    title: Mapped[str] = mapped_column(String(150), nullable=False)
    total_amount_cents: Mapped[int] = mapped_column(Integer, nullable=False)
    remaining_amount_cents: Mapped[int] = mapped_column(Integer, nullable=False)
    due_date: Mapped[Optional[str]] = mapped_column(String(10), nullable=True) # YYYY-MM-DD
    status: Mapped[str] = mapped_column(String(20), default="ATIVA", nullable=False) # ATIVA, QUITADA, CANCELADA
    created_at: Mapped[str] = mapped_column(String(30), default=now_utc_iso, nullable=False)

    __table_args__ = (
        CheckConstraint("profile IN ('PESSOAL', 'EMPRESA')", name="chk_debt_profile"),
        CheckConstraint("status IN ('ATIVA', 'QUITADA', 'CANCELADA')", name="chk_debt_status"),
    )

# 7. Planos Mestres de Pagamentos (Recorrentes ou Parcelados)
class Schedule(Base):
    __tablename__ = "schedules"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    profile: Mapped[str] = mapped_column(String(10), nullable=False)
    type: Mapped[str] = mapped_column(String(10), nullable=False) # RECEITA, DESPESA
    account_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("accounts.id", ondelete="SET NULL"), nullable=True)
    credit_card_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("credit_cards.id", ondelete="SET NULL"), nullable=True)
    category_id: Mapped[str] = mapped_column(String(36), ForeignKey("categories.id", ondelete="RESTRICT"), nullable=False)
    item_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("items.id", ondelete="SET NULL"), nullable=True)
    contact_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("contacts.id", ondelete="SET NULL"), nullable=True)
    debt_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("debts.id", ondelete="SET NULL"), nullable=True)
    payment_method_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("payment_methods.id", ondelete="SET NULL"), nullable=True)
    description: Mapped[str] = mapped_column(String(255), nullable=False)
    
    schedule_type: Mapped[str] = mapped_column(String(30), nullable=False) # RECORRENTE_CONTINUA, PARCELADA
    frequency: Mapped[str] = mapped_column(String(20), default="MENSAL", nullable=False)
    amount_cents: Mapped[int] = mapped_column(Integer, nullable=False)
    total_installments: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    start_date: Mapped[str] = mapped_column(String(10), nullable=False)
    due_day: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="ATIVO", nullable=False) # ATIVO, PAUSADO, FINALIZADO, CANCELADO
    created_at: Mapped[str] = mapped_column(String(30), default=now_utc_iso, nullable=False)

    category: Mapped["Category"] = relationship("Category")
    item: Mapped[Optional["Item"]] = relationship("Item")
    contact: Mapped[Optional["Contact"]] = relationship("Contact")
    debt: Mapped[Optional["Debt"]] = relationship("Debt")
    payment_method: Mapped[Optional["PaymentMethod"]] = relationship("PaymentMethod")
    credit_card: Mapped[Optional["CreditCard"]] = relationship("CreditCard")

    __table_args__ = (
        CheckConstraint("profile IN ('PESSOAL', 'EMPRESA')", name="chk_schedule_profile"),
        CheckConstraint("type IN ('RECEITA', 'DESPESA')", name="chk_schedule_type"),
        CheckConstraint("schedule_type IN ('RECORRENTE_CONTINUA', 'PARCELADA')", name="chk_schedule_kind"),
        CheckConstraint("frequency IN ('SEMANAL', 'MENSAL', 'TRIMESTRAL', 'SEMESTRAL', 'ANUAL')", name="chk_schedule_freq"),
        CheckConstraint("due_day BETWEEN 1 AND 31", name="chk_schedule_day"),
    )

# 8. Transações e Contas a Pagar/Receber / Transferências
class Transaction(Base):
    __tablename__ = "transactions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    profile: Mapped[str] = mapped_column(String(10), nullable=False)
    type: Mapped[str] = mapped_column(String(15), nullable=False) # RECEITA, DESPESA, TRANSFERENCIA
    account_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("accounts.id", ondelete="SET NULL"), nullable=True)
    destination_account_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("accounts.id", ondelete="SET NULL"), nullable=True) # Conta de destino (para transferências internas)
    credit_card_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("credit_cards.id", ondelete="SET NULL"), nullable=True)
    category_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("categories.id", ondelete="RESTRICT"), nullable=True)
    item_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("items.id", ondelete="SET NULL"), nullable=True)
    contact_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("contacts.id", ondelete="SET NULL"), nullable=True)
    debt_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("debts.id", ondelete="SET NULL"), nullable=True)
    schedule_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("schedules.id", ondelete="CASCADE"), nullable=True)
    payment_method_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("payment_methods.id", ondelete="SET NULL"), nullable=True)
    
    invoice_month: Mapped[Optional[int]] = mapped_column(Integer, nullable=True) # Mês de competência da fatura (1 a 12)
    invoice_year: Mapped[Optional[int]] = mapped_column(Integer, nullable=True) # Ano de competência da fatura (YYYY)
    is_invoice_payment: Mapped[int] = mapped_column(Integer, default=0, nullable=False) # 1 se for débito consolidado de liquidação de fatura

    installment_number: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    total_installments: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    description: Mapped[str] = mapped_column(String(255), nullable=False)
    amount_cents: Mapped[int] = mapped_column(Integer, nullable=False)
    due_date: Mapped[str] = mapped_column(String(10), nullable=False) # YYYY-MM-DD
    payment_date: Mapped[Optional[str]] = mapped_column(String(10), nullable=True) # YYYY-MM-DD
    status: Mapped[str] = mapped_column(String(20), default="PENDENTE", nullable=False) # PENDENTE, CONCLUIDO, CANCELADO
    sync_status: Mapped[str] = mapped_column(String(20), default="PENDENTE", nullable=False) # PENDENTE, SINCRONIZADO
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[str] = mapped_column(String(30), default=now_utc_iso, nullable=False)
    updated_at: Mapped[str] = mapped_column(String(30), default=now_utc_iso, onupdate=now_utc_iso, nullable=False)

    account: Mapped[Optional["Account"]] = relationship("Account", foreign_keys=[account_id])
    destination_account: Mapped[Optional["Account"]] = relationship("Account", foreign_keys=[destination_account_id])
    credit_card: Mapped[Optional["CreditCard"]] = relationship("CreditCard")
    category: Mapped[Optional["Category"]] = relationship("Category")
    item: Mapped[Optional["Item"]] = relationship("Item")
    contact: Mapped[Optional["Contact"]] = relationship("Contact")
    debt: Mapped[Optional["Debt"]] = relationship("Debt")
    schedule: Mapped[Optional["Schedule"]] = relationship("Schedule")
    payment_method: Mapped[Optional["PaymentMethod"]] = relationship("PaymentMethod")
    attachments: Mapped[List["Attachment"]] = relationship("Attachment", back_populates="transaction", cascade="all, delete-orphan")

    __table_args__ = (
        CheckConstraint("profile IN ('PESSOAL', 'EMPRESA')", name="chk_trans_profile"),
        CheckConstraint("type IN ('RECEITA', 'DESPESA', 'TRANSFERENCIA')", name="chk_trans_type"),
        CheckConstraint("status IN ('PENDENTE', 'CONCLUIDO', 'CANCELADO')", name="chk_trans_status"),
        CheckConstraint("sync_status IN ('PENDENTE', 'SINCRONIZADO')", name="chk_trans_sync"),
        Index("idx_trans_profile_due", "profile", "due_date"),
        Index("idx_trans_status", "status"),
        Index("idx_trans_sync", "sync_status"),
    )

# 9. Orçamentos Mensais
class Budget(Base):
    __tablename__ = "budgets"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    profile: Mapped[str] = mapped_column(String(10), nullable=False)
    category_id: Mapped[str] = mapped_column(String(36), ForeignKey("categories.id", ondelete="CASCADE"), nullable=False)
    month: Mapped[int] = mapped_column(Integer, nullable=False)
    year: Mapped[int] = mapped_column(Integer, nullable=False)
    limit_amount_cents: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[str] = mapped_column(String(30), default=now_utc_iso, nullable=False)

    category: Mapped["Category"] = relationship("Category")

    __table_args__ = (
        CheckConstraint("profile IN ('PESSOAL', 'EMPRESA')", name="chk_budget_profile"),
        CheckConstraint("month BETWEEN 1 AND 12", name="chk_budget_month"),
    )

# 10. Metas Financeiras
class Goal(Base):
    __tablename__ = "goals"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    profile: Mapped[str] = mapped_column(String(10), nullable=False)
    title: Mapped[str] = mapped_column(String(150), nullable=False)
    target_amount_cents: Mapped[int] = mapped_column(Integer, nullable=False)
    current_amount_cents: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    target_date: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="EM_ANDAMENTO", nullable=False)
    created_at: Mapped[str] = mapped_column(String(30), default=now_utc_iso, nullable=False)

    __table_args__ = (
        CheckConstraint("profile IN ('PESSOAL', 'EMPRESA')", name="chk_goal_profile"),
        CheckConstraint("status IN ('EM_ANDAMENTO', 'CONCLUIDA', 'CANCELADA')", name="chk_goal_status"),
    )

# 11. Configurações do Sistema
class SystemConfig(Base):
    __tablename__ = "system_configs"

    key: Mapped[str] = mapped_column(String(100), primary_key=True)
    value: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    updated_at: Mapped[str] = mapped_column(String(30), default=now_utc_iso, nullable=False)

# 12. Histórico e Logs de Sincronização
class SyncLog(Base):
    __tablename__ = "sync_logs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    action: Mapped[str] = mapped_column(String(20), nullable=False) # 'EXPORT', 'IMPORT', 'FULL', 'TEST'
    status: Mapped[str] = mapped_column(String(20), nullable=False) # 'SUCESSO', 'ERRO', 'EM_ANDAMENTO'
    items_imported: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    items_exported: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    details: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[str] = mapped_column(String(30), default=now_utc_iso, nullable=False)

# 13. Anexos e Comprovantes (Recibos, Cupons, PDFs)
class Attachment(Base):
    __tablename__ = "attachments"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    profile: Mapped[str] = mapped_column(String(10), nullable=False) # 'PESSOAL' ou 'EMPRESA'
    transaction_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("transactions.id", ondelete="CASCADE"), nullable=True)
    
    file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    file_path: Mapped[str] = mapped_column(String(500), nullable=False)
    file_size_bytes: Mapped[int] = mapped_column(Integer, nullable=False)
    mime_type: Mapped[str] = mapped_column(String(100), nullable=False)
    attachment_type: Mapped[str] = mapped_column(String(30), default="COMPROVANTE", nullable=False) # COMPROVANTE, NOTA_FISCAL, FATURA, RECIBO, CONTRATO, OUTRO
    
    drive_file_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    drive_web_view_link: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    drive_folder_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    
    sync_status: Mapped[str] = mapped_column(String(20), default="PENDENTE", nullable=False) # PENDENTE, SINCRONIZADO, ERRO, LOCAL_ONLY
    sync_error: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[str] = mapped_column(String(30), default=now_utc_iso, nullable=False)
    synced_at: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)

    transaction: Mapped[Optional["Transaction"]] = relationship("Transaction", back_populates="attachments")

    __table_args__ = (
        CheckConstraint("profile IN ('PESSOAL', 'EMPRESA')", name="chk_attachment_profile"),
        CheckConstraint("sync_status IN ('PENDENTE', 'SINCRONIZADO', 'ERRO', 'LOCAL_ONLY')", name="chk_attachment_sync_status"),
        CheckConstraint("attachment_type IN ('COMPROVANTE', 'NOTA_FISCAL', 'FATURA', 'RECIBO', 'CONTRATO', 'OUTRO')", name="chk_attachment_type"),
        Index("idx_attachment_profile", "profile"),
        Index("idx_attachment_transaction", "transaction_id"),
        Index("idx_attachment_type", "attachment_type"),
        Index("idx_attachment_sync", "sync_status"),
    )


