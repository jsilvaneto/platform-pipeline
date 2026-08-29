# Changelog - Wallet

Todas as alterações notáveis neste projeto serão documentadas neste arquivo.

O formato é baseado no [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/),
e este projeto adere ao [Semantic Versioning](https://semver.org/lang/pt-BR/).

---

## [1.0.0] - 2026-08-29

### 🚀 Destaques da Release
- Primeira versão estável completa da plataforma **Wallet** (Monorepo com Backend FastAPI, Web App React 19, Módulo Nativo Android e Containerização Docker).
- Módulo completo de **Cartões de Crédito e Faturas** com deduplicação no dashboard, acompanhamento de limites e liquidação atômica.
- Arquitetura **Offline-First** com Room Database no Android e sincronização bidirecional em segundo plano via WorkManager.
- Suporte total a **Containerização com Docker & Docker Compose** (Nginx SPA Reverse Proxy + FastAPI SQLite WAL).

### ✨ Adicionado
- **Containerização & Deploy**:
  - `backend/Dockerfile` otimizado em Python 3.10-slim com healthcheck.
  - `frontend/Dockerfile` multi-stage com Nginx 1.27 Alpine e compressão Gzip.
  - `docker-compose.yml` e `docker-compose.dev.yml` para execução em produção e desenvolvimento.
  - Proxy reverso `/api/` no Nginx, eliminando problemas de CORS em produção.
- **Cartões de Crédito & Ciclo de Faturas**:
  - Tela dedicada `CreditCards.tsx` com KPIs globais, carrossel de cartões virtuais dinâmicos, navegador mês a mês e detalhamento de compras.
  - Ações de fatura: Liquidação com débito em conta bancária, Reabertura atômica, Adição rápida de compra e Exportação para CSV.
  - Dica inteligente de "Melhor Dia de Compra" no modal de novos lançamentos.
- **Monorepo & Mobile Android**:
  - Estrutura monorepo organizada: `backend/`, `frontend/`, `android/` e `.ai/`.
  - Módulo nativo Android em Kotlin 2.0+ com Jetpack Compose, Material 3, Room Database e Retrofit.
  - Regra de ouro de centavos inteiros (`amount_cents: Long / Int`) em todas as camadas.
  - Sincronização offline-first idempotente via `/api/v1/sync/mobile/pull` e `/api/v1/sync/mobile/push`.
- **Módulos Estratégicos**:
  - Dashboard Financeiro Interativo com KPIs patrimoniais, fluxo de caixa, orçamentos, metas e timeline.
  - Lançamentos com filtros avançados, naturezas de gasto (`OBRIGATORIO`, `NECESSARIO`, `DESEJO`, `NENHUM`), busca por texto e modal inteligente.
  - Planejamento Financeiro, Orçamentos por Categoria e Metas de Economia.
  - Central de Dívidas & Empréstimos com cálculo de amortização.
  - Relatórios e Extratos Bancários com exportação CSV.
  - Gestão de Anexos e Comprovantes Fiscais (`/api/v1/attachments`).
  - Importação de Extratos OFX e Sincronização Google Sheets.

### 🛡️ Governança & Documentação
- Histórico de 17 Decisões Arquiteturais registradas em `.ai/DECISIONS/` (ADR 001 a ADR 017).
- Contratos de API exportados em `.ai/openapi.json` e DDL em `.ai/schema.sql`.
- Diretrizes mandatórias de desenvolvimento consolidadas em `AGENTS.md`.

---

[1.0.0]: https://github.com/jsilvaneto/wallet/releases/tag/v1.0.0
