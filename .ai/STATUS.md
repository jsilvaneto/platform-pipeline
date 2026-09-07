# Status do Projeto (STATUS.md)

Este documento registra o checklist de funcionalidades, fases de implementação e governança de releases.

---

## 🚀 Fases do Projeto

| Fase | Escopo | Status |
| :--- | :--- | :--- |
| **Fase 1: Fundação** | Arquitetura base, auth JWT, SQLite WAL e scaffold CRUD | **100% CONCLUÍDO** |
| **Fase 2: Domínio Específico** | Implementação das regras de negócio do novo projeto | **EM ANDAMENTO** |

---

## 📋 Checklist de Funcionalidades

### Fase 1: Fundação Full-Stack
- [x] Backend assíncrono em FastAPI com SQLAlchemy 2.0.
- [x] Banco de dados relacional PostgreSQL 16 com pool de conexões assíncrono (`asyncpg`).
- [x] Autenticação JWT completa (`/auth/login`, `/auth/register`, `/auth/me`).
- [x] Endpoint de Healthcheck com validação ativa do PostgreSQL (`/api/health` com `SELECT 1`).
- [x] Scaffold completo de entidade exemplo (`Item`) demonstrando Model, Schema, Service e API.
- [x] Frontend React 19 com Vite, TypeScript e Tailwind CSS.
- [x] Suporte nativo a Modo Claro e Modo Escuro (*Dark Mode*).
- [x] Cliente HTTP Axios com interceptor de tokens JWT e auto-logout 401.
- [x] Telas de Login, Dashboard com métricas e CRUD de Itens.
- [x] Dockerfiles e Compose para Produção e Desenvolvimento com PostgreSQL e Hot-Reload.
- [x] Script `./start.sh` com suporte a `--dev`, `--native` e `--stop`.
- [x] Arquitetura de 10 Skills para Agentes de IA em `.agents/` (`add-new-entity`, `api-testing-suite`, `contract-sync`, `database-migrations`, `database-ops`, `financial-domain-guard`, `run-and-test`, `security-guard`, `token-optimizer`, `ui-design-system`).
- [x] Manuais de Arquitetura completos para IA (`.ai/ARCHITECTURE.md`, `.ai/BACKEND_GUIDE.md`, `.ai/FRONTEND_GUIDE.md`).
- [x] Registro de Decisão Arquitetural (`ADR 002: Migração para PostgreSQL`).

### Fase 2: Domínio Específico (Finanças Pessoais)
- [x] Definição de escopo exclusivo para finanças pessoais (eliminação de suporte e perfis a empresas/PJ).
- [ ] Modelagem de Contas Financeiras Pessoais (carteiras, contas correntes, poupança).
- [ ] Modelagem de Categorias de Receitas e Despesas Pessoais.
- [ ] Registro e conciliação de Transações Financeiras (receitas, despesas, transferências entre contas).
- [ ] Planejamento financeiro pessoal (orçamentos mensais e metas de economia).
- [ ] Dashboard com indicadores financeiros pessoais (saldo total, despesas por categoria, fluxo mensal).
