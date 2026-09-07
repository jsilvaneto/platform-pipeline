# Wallet — Sistema de Gestão de Finanças Pessoais

Aplicação moderna e de alta performance voltada **100% para Finanças Pessoais**, com foco estrito em **Despesas e Pagamentos**, integridade monetária em centavos inteiros (`amount_cents: int`) e isolamento por usuário.

---

## 🏛️ Visão Geral da Arquitetura

- **Backend**: Python 3.10+ com **FastAPI**, **SQLAlchemy 2.0 Async**, banco de dados relacional **PostgreSQL 16** com pool de conexões gerenciado via `asyncpg`, validações de entrada e saída via **Pydantic v2** e autenticação JWT.
- **Domínio Financeiro**:
  - **Valores em Centavos**: Todos os cálculos e armazenamento de valores monetários utilizam inteiros (`amount_cents: int`), prevenindo perdas por imprecisão de ponto flutuante.
  - **Despesas & Parcelamentos**: Suporte a despesas à vista e compras parceladas com distribuição exata de centavos e geração de parcelas mensais (`Payment`).
  - **Categorias e Formas de Pagamento**: Gestão customizável com cores, ícones e auto-seeding de categorias padrão pessoais.
  - **Grau de Essencialidade**: Categorização por necessidade (`OBRIGATORIO`, `NECESSARIO`, `DESEJO`, `NENHUM`) para diagnóstico da saúde financeira.
- **Frontend**: **React 19**, **TypeScript** estrito (sem `any`), **Vite**, **Tailwind CSS** (suporte nativo a Modo Claro e Modo Escuro), ícones `lucide-react` e **Axios** com interceptor JWT.
- **Infraestrutura**: Docker multi-stage com Nginx Alpine (proxy reverso para `/api/`) e Docker Compose com PostgreSQL 16.
- **Agentes de IA**: Governança em `.ai/`, manual operacional em `AGENT_RULES.md` e repositório de skills em `.agents/skills/`.

---

## 📁 Estrutura do Projeto

```text
.
├── .agents/                 # Skills para Agentes de IA (financial-domain-guard, ui-design-system, etc.)
├── .ai/                     # Documentação de contexto e status (ARCHITECTURE, STATUS, CONTEXT)
├── backend/                 # API FastAPI assíncrona
│   ├── app/
│   │   ├── api/v1/          # Endpoints REST (auth, expenses, payments, categories, payment_methods, dashboard)
│   │   ├── core/            # Configurações e segurança (JWT, bcrypt, pydantic-settings)
│   │   ├── database.py      # Conexão PostgreSQL 16 (asyncpg pool) e AsyncSessionLocal
│   │   ├── models/          # Modelos declarativos SQLAlchemy 2.0 (Category, PaymentMethod, Expense, Payment, User)
│   │   ├── schemas/         # Schemas Pydantic v2 com ConfigDict
│   │   └── services/        # Serviços desacoplados (cálculos de parcelas, agregações financeiras)
│   ├── tests/               # Testes automatizados de domínio financeiro
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/                # SPA React 19 + TypeScript + Vite + Tailwind
│   ├── src/
│   │   ├── api/             # Cliente HTTP e módulo tipado walletApi
│   │   ├── components/      # Componentes UI (Header, Layout, Modal)
│   │   ├── context/         # AuthContext e ThemeContext
│   │   ├── pages/           # Telas do Wallet (Dashboard, Expenses, Categories, Login)
│   │   ├── types/           # Contratos TypeScript estritos
│   │   └── utils/           # Formatadores de moeda (formatCurrency em centavos) e datas
│   ├── Dockerfile
│   └── nginx.conf
├── docker-compose.yml       # Orquestração de produção
├── docker-compose.dev.yml   # Orquestração de desenvolvimento com hot-reload
├── start.sh                 # Script universal de inicialização
└── AGENT_RULES.md           # Manual operacional do projeto
```

---

## 🚀 Como Iniciar o Wallet

### 1. Configurar Variáveis de Ambiente
Copie o arquivo `.env.example` para `.env`:
```bash
cp .env.example .env
```

### 2. Inicialização Rápida (Script `./start.sh`)

| Modo | Comando | Descrição |
| :--- | :--- | :--- |
| **Produção (Docker)** | `./start.sh` | Constrói e sobe os containers em segundo plano (Backend + Nginx + Postgres). |
| **Desenvolvimento (Docker)** | `./start.sh --dev` | Sobe os containers com **Hot-Reload** ativo no Backend e Frontend. |
| **Modo Nativo (Local)** | `./start.sh --native` | Cria venv, instala dependências e executa Uvicorn + Vite sem Docker. |
| **Parar Serviços** | `./start.sh --stop` | Encerra os containers com segurança sem perder os dados. |

---

## 🧪 Testes Automatizados

Para executar os testes de validação de regras de negócio financeiras:
```bash
docker run --rm wallet-backend pytest tests/ -v
```

---

## 🔗 Endpoints do Sistema

- **Frontend (Web App)**: [http://localhost:5173](http://localhost:5173) (ou porta 80 em produção)
- **Documentação Swagger (Backend)**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **Health Check da Aplicação**: [http://localhost:8000/api/health](http://localhost:8000/api/health)
