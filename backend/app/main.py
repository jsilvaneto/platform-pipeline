from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select, func, text
from app.database import engine, Base, AsyncSessionLocal
import app.models
from app.models import User, Category, Account, PaymentMethod
from app.core.security import get_password_hash
from app.api.v1 import api_router

async def migrate_database_schema():
    """Garante que colunas novas como 'nature', 'attachment_type', 'payment_method_id' e 'credit_card_id' existam no banco SQLite."""
    async with engine.begin() as conn:
        try:
            # 1. Verifica colunas da tabela categories
            res = await conn.execute(text("PRAGMA table_info(categories)"))
            columns = [row[1] for row in res.fetchall()]
            if "nature" not in columns:
                await conn.execute(text("ALTER TABLE categories ADD COLUMN nature VARCHAR(20) DEFAULT 'NENHUM' NOT NULL"))

            # 2. Verifica colunas da tabela attachments
            res_att = await conn.execute(text("PRAGMA table_info(attachments)"))
            att_columns = [row[1] for row in res_att.fetchall()]
            if att_columns and "attachment_type" not in att_columns:
                await conn.execute(text("ALTER TABLE attachments ADD COLUMN attachment_type VARCHAR(30) DEFAULT 'COMPROVANTE' NOT NULL"))

            # 3. Verifica colunas e restrições da tabela transactions
            res_trans = await conn.execute(text("PRAGMA table_info(transactions)"))
            trans_columns = [row[1] for row in res_trans.fetchall()]
            if trans_columns:
                if "payment_method_id" not in trans_columns:
                    await conn.execute(text("ALTER TABLE transactions ADD COLUMN payment_method_id VARCHAR(36) REFERENCES payment_methods(id) ON DELETE SET NULL"))
                if "credit_card_id" not in trans_columns:
                    await conn.execute(text("ALTER TABLE transactions ADD COLUMN credit_card_id VARCHAR(36) REFERENCES credit_cards(id) ON DELETE SET NULL"))
                if "destination_account_id" not in trans_columns:
                    await conn.execute(text("ALTER TABLE transactions ADD COLUMN destination_account_id VARCHAR(36) REFERENCES accounts(id) ON DELETE SET NULL"))
                if "invoice_month" not in trans_columns:
                    await conn.execute(text("ALTER TABLE transactions ADD COLUMN invoice_month INTEGER"))
                if "invoice_year" not in trans_columns:
                    await conn.execute(text("ALTER TABLE transactions ADD COLUMN invoice_year INTEGER"))
                if "is_invoice_payment" not in trans_columns:
                    await conn.execute(text("ALTER TABLE transactions ADD COLUMN is_invoice_payment INTEGER DEFAULT 0 NOT NULL"))

                # 3.1 Verifica se o CHECK constraint da tabela transactions suporta TRANSFERENCIA
                res_sql = await conn.execute(text("SELECT sql FROM sqlite_master WHERE type='table' AND name='transactions'"))
                tbl_sql_row = res_sql.fetchone()
                if tbl_sql_row and tbl_sql_row[0] and "TRANSFERENCIA" not in tbl_sql_row[0]:
                    await conn.execute(text("PRAGMA foreign_keys = OFF"))
                    await conn.execute(text("""
                        CREATE TABLE transactions_new (
                            id VARCHAR(36) PRIMARY KEY,
                            profile VARCHAR(10) NOT NULL,
                            type VARCHAR(15) NOT NULL,
                            account_id VARCHAR(36) REFERENCES accounts(id) ON DELETE SET NULL,
                            destination_account_id VARCHAR(36) REFERENCES accounts(id) ON DELETE SET NULL,
                            credit_card_id VARCHAR(36) REFERENCES credit_cards(id) ON DELETE SET NULL,
                            category_id VARCHAR(36) REFERENCES categories(id) ON DELETE RESTRICT,
                            item_id VARCHAR(36) REFERENCES items(id) ON DELETE SET NULL,
                            contact_id VARCHAR(36) REFERENCES contacts(id) ON DELETE SET NULL,
                            debt_id VARCHAR(36) REFERENCES debts(id) ON DELETE SET NULL,
                            schedule_id VARCHAR(36) REFERENCES schedules(id) ON DELETE CASCADE,
                            payment_method_id VARCHAR(36) REFERENCES payment_methods(id) ON DELETE SET NULL,
                            invoice_month INTEGER,
                            invoice_year INTEGER,
                            is_invoice_payment INTEGER DEFAULT 0 NOT NULL,
                            installment_number INTEGER,
                            total_installments INTEGER,
                            description VARCHAR(255) NOT NULL,
                            amount_cents INTEGER NOT NULL,
                            due_date VARCHAR(10) NOT NULL,
                            payment_date VARCHAR(10),
                            status VARCHAR(20) DEFAULT 'PENDENTE' NOT NULL,
                            sync_status VARCHAR(20) DEFAULT 'PENDENTE' NOT NULL,
                            notes TEXT,
                            created_at VARCHAR(30) NOT NULL,
                            updated_at VARCHAR(30) NOT NULL,
                            CONSTRAINT chk_trans_profile CHECK (profile IN ('PESSOAL', 'EMPRESA')),
                            CONSTRAINT chk_trans_type CHECK (type IN ('RECEITA', 'DESPESA', 'TRANSFERENCIA')),
                            CONSTRAINT chk_trans_status CHECK (status IN ('PENDENTE', 'CONCLUIDO', 'CANCELADO')),
                            CONSTRAINT chk_trans_sync CHECK (sync_status IN ('PENDENTE', 'SINCRONIZADO'))
                        )
                    """))

                    # Atualiza lista de colunas após as alterações acima
                    res_trans_updated = await conn.execute(text("PRAGMA table_info(transactions)"))
                    current_trans_cols = [row[1] for row in res_trans_updated.fetchall()]
                    valid_cols = [
                        "id", "profile", "type", "account_id", "destination_account_id", "credit_card_id",
                        "category_id", "item_id", "contact_id", "debt_id", "schedule_id", "payment_method_id",
                        "invoice_month", "invoice_year", "is_invoice_payment", "installment_number", "total_installments",
                        "description", "amount_cents", "due_date", "payment_date", "status", "sync_status", "notes",
                        "created_at", "updated_at"
                    ]
                    cols_to_copy = [c for c in current_trans_cols if c in valid_cols]
                    cols_str = ", ".join(cols_to_copy)
                    await conn.execute(text(f"INSERT INTO transactions_new ({cols_str}) SELECT {cols_str} FROM transactions"))
                    await conn.execute(text("DROP TABLE transactions"))
                    await conn.execute(text("ALTER TABLE transactions_new RENAME TO transactions"))
                    await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_trans_profile_due ON transactions(profile, due_date)"))
                    await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_trans_status ON transactions(status)"))
                    await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_trans_sync ON transactions(sync_status)"))
                    await conn.execute(text("PRAGMA foreign_keys = ON"))

            # 4. Verifica colunas da tabela schedules
            res_sched = await conn.execute(text("PRAGMA table_info(schedules)"))
            sched_columns = [row[1] for row in res_sched.fetchall()]
            if sched_columns:
                if "account_id" not in sched_columns:
                    await conn.execute(text("ALTER TABLE schedules ADD COLUMN account_id VARCHAR(36) REFERENCES accounts(id) ON DELETE SET NULL"))
                if "payment_method_id" not in sched_columns:
                    await conn.execute(text("ALTER TABLE schedules ADD COLUMN payment_method_id VARCHAR(36) REFERENCES payment_methods(id) ON DELETE SET NULL"))
                if "credit_card_id" not in sched_columns:
                    await conn.execute(text("ALTER TABLE schedules ADD COLUMN credit_card_id VARCHAR(36) REFERENCES credit_cards(id) ON DELETE SET NULL"))

            # 5. Verifica colunas da tabela debts
            res_debts = await conn.execute(text("PRAGMA table_info(debts)"))
            debt_columns = [row[1] for row in res_debts.fetchall()]
            if debt_columns:
                if "contact_id" not in debt_columns:
                    await conn.execute(text("ALTER TABLE debts ADD COLUMN contact_id VARCHAR(36) REFERENCES contacts(id) ON DELETE SET NULL"))
        except Exception as e:
            print("Aviso na migração SQLite:", e)

async def seed_initial_data():
    async with AsyncSessionLocal() as session:
        # 1. Cria usuário admin se não houver usuários
        user_count = await session.scalar(select(func.count(User.id)))
        if user_count == 0:
            admin_user = User(
                username="admin",
                password_hash=get_password_hash("admin")
            )
            session.add(admin_user)

        # 2. Cria categorias padrão se não houver categorias
        cat_count = await session.scalar(select(func.count(Category.id)))
        if cat_count == 0:
            default_categories = [
                # Pessoal - Receitas
                Category(profile="PESSOAL", type="RECEITA", nature="NENHUM", name="Salário / Rendimentos"),
                Category(profile="PESSOAL", type="RECEITA", nature="NENHUM", name="Investimentos & Dividendos"),
                Category(profile="PESSOAL", type="RECEITA", nature="NENHUM", name="Outras Receitas"),
                # Pessoal - Despesas (com naturezas padrão)
                Category(profile="PESSOAL", type="DESPESA", nature="OBRIGATORIO", name="Moradia & Contas"),
                Category(profile="PESSOAL", type="DESPESA", nature="NECESSARIO", name="Alimentação & Supermercado"),
                Category(profile="PESSOAL", type="DESPESA", nature="NECESSARIO", name="Transporte & Combustível"),
                Category(profile="PESSOAL", type="DESPESA", nature="OBRIGATORIO", name="Saúde & Farmácia"),
                Category(profile="PESSOAL", type="DESPESA", nature="NECESSARIO", name="Educação"),
                Category(profile="PESSOAL", type="DESPESA", nature="DESEJO", name="Lazer & Entretenimento"),
                Category(profile="PESSOAL", type="DESPESA", nature="NENHUM", name="Transferência Interna"),
                # Empresa - Receitas
                Category(profile="EMPRESA", type="RECEITA", nature="NENHUM", name="Prestação de Serviços"),
                Category(profile="EMPRESA", type="RECEITA", nature="NENHUM", name="Venda de Produtos"),
                Category(profile="EMPRESA", type="RECEITA", nature="NENHUM", name="Rendimentos PJ"),
                Category(profile="EMPRESA", type="RECEITA", nature="NENHUM", name="Outras Receitas PJ"),
                # Empresa - Despesas (com naturezas padrão)
                Category(profile="EMPRESA", type="DESPESA", nature="NECESSARIO", name="Fornecedores & Insumos"),
                Category(profile="EMPRESA", type="DESPESA", nature="OBRIGATORIO", name="Salários & Pró-Labore"),
                Category(profile="EMPRESA", type="DESPESA", nature="OBRIGATORIO", name="Impostos & Tributos (DAS/GPS)"),
                Category(profile="EMPRESA", type="DESPESA", nature="NECESSARIO", name="Software & Infraestrutura"),
                Category(profile="EMPRESA", type="DESPESA", nature="NECESSARIO", name="Marketing & Comercial"),
                Category(profile="EMPRESA", type="DESPESA", nature="NENHUM", name="Outras Despesas PJ"),
                Category(profile="EMPRESA", type="DESPESA", nature="NENHUM", name="Transferência Interna"),
            ]
            session.add_all(default_categories)
        else:
            # Garante que a categoria Transferência Interna exista mesmo em bancos já existentes
            for prof in ["PESSOAL", "EMPRESA"]:
                t_cat = await session.scalar(
                    select(Category.id).where(Category.profile == prof, Category.name == "Transferência Interna")
                )
                if not t_cat:
                    session.add(Category(profile=prof, type="DESPESA", nature="NENHUM", name="Transferência Interna"))

        # 3. Cria contas padrão se não houver contas
        acc_count = await session.scalar(select(func.count(Account.id)))
        if acc_count == 0:
            default_accounts = [
                Account(profile="PESSOAL", name="Carteira / Dinheiro", type="CAIXA"),
                Account(profile="PESSOAL", name="Conta Corrente", type="CORRENTE"),
                Account(profile="EMPRESA", name="Conta PJ", type="CORRENTE"),
            ]
            session.add_all(default_accounts)

        # 4. Cria formas de pagamento padrão se não houver formas cadastradas
        pm_count = await session.scalar(select(func.count(PaymentMethod.id)))
        if pm_count == 0:
            standard_methods = [
                "Pix",
                "Boleto",
                "Cartão de Crédito",
                "Cartão de Débito",
                "Dinheiro Físico",
                "Transferência Bancária",
                "Débito Automático"
            ]
            default_pms = []
            for prof in ["PESSOAL", "EMPRESA"]:
                for name in standard_methods:
                    default_pms.append(PaymentMethod(profile=prof, name=name))
            session.add_all(default_pms)

        await session.commit()

@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    await migrate_database_schema()
    await seed_initial_data()
    async with AsyncSessionLocal() as session:
        from app.services.credit_card_service import sync_all_card_invoices
        await sync_all_card_invoices(session)
    yield
    await engine.dispose()

app = FastAPI(
    title="Wallet API",
    description="Sistema de Gestão Financeira",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)

@app.get("/api/health", tags=["Sistema"])
async def health_check():
    return {
        "status": "healthy",
        "database": "sqlite_wal",
        "app": "Wallet API"
    }
