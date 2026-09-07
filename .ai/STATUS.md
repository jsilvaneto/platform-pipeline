# Status do Projeto (STATUS.md)

Este documento registra o checklist de funcionalidades, fases de implementação e governança de releases do **Wallet**.

---

## 🚀 Fases do Projeto

| Fase | Escopo | Status |
| :--- | :--- | :--- |
| **Fase 1: Fundação** | Arquitetura base, auth JWT, PostgreSQL 16 e scaffold CRUD | **100% CONCLUÍDO** |
| **Fase 2: Despesas & Pagamentos** | Módulo de despesas pessoais, parcelamentos, meios de pagamento e dashboard | **100% CONCLUÍDO** |
| **Fase 3: Expansões Futuras** | Relatórios anuais, exportações e automações de recorrência | **PLANEJADO** |

---

## 📋 Checklist de Funcionalidades

### Fase 1: Fundação Full-Stack
- [x] Backend assíncrono em FastAPI com SQLAlchemy 2.0.
- [x] Banco de dados relacional PostgreSQL 16 com pool de conexões assíncrono (`asyncpg`).
- [x] Autenticação JWT completa (`/auth/login`, `/auth/register`, `/auth/me`).
- [x] Endpoint de Healthcheck com validação ativa do PostgreSQL (`/api/health` com `SELECT 1`).
- [x] Frontend React 19 com Vite, TypeScript e Tailwind CSS.
- [x] Suporte nativo a Modo Claro e Modo Escuro (*Dark Mode*).
- [x] Cliente HTTP Axios com interceptor de tokens JWT e auto-logout 401.
- [x] Dockerfiles e Compose para Produção e Desenvolvimento com PostgreSQL e Hot-Reload.
- [x] Script `./start.sh` com suporte a `--dev`, `--native` e `--stop`.
- [x] Arquitetura de Skills para Agentes de IA em `.agents/`.

### Fase 2: Domínio Específico (Wallet: Despesas e Pagamentos)
- [x] Remoção de entidades de boilerplate de exemplo (`Item`).
- [x] Modelagem relacional e APIs de **Categorias de Despesas** (`Category`) com auto-seed inteligente.
- [x] Modelagem relacional e APIs de **Formas de Pagamento** (`PaymentMethod`) com tipos suportados.
- [x] Modelagem relacional e APIs de **Despesas Pessoais** (`Expense`) com suporte a parcelas e recorrência.
- [x] Modelagem relacional e APIs de **Parcelas e Liquidação** (`Payment`) com divisão precisa de centavos.
- [x] Regra mandatória de valores inteiros em centavos (`amount_cents: int`) sem erros de ponto flutuante.
- [x] Endpoint consolidado de **Dashboard Financeiro** (`/api/v1/dashboard/metrics`) com KPIs e previsões.
- [x] Tela de **Despesas & Pagamentos** com filtros mensais, status, modal completo e ação de liquidação rápida.
- [x] Tela de **Categorias & Meios de Pagamento** para customização pelo usuário.
- [x] Tela de **Dashboard** com cards de KPIs, despesas por categoria, essencialidade e próximos vencimentos.
- [x] Suporte estrito a Dark Mode em todas as telas e componentes.
- [x] Suite de testes unitários de domínio financeiro (`backend/tests/test_financial_domain.py`).
