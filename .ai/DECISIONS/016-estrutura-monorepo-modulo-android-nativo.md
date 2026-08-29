# ADR 016: Estrutura Monorepo e Módulo Android Nativo

## Data
2026-08-29

## Status
Aprovado e Implementado

## Contexto
O ecossistema **Wallet** foi concebido como uma plataforma financeira integrada, demandando múltiplos pontos de interação: uma interface web rica para desktop/tablets (gestão estratégica, relatórios e planejamento), um backend seguro e assíncrono para persistência central, e um aplicativo móvel nativo para entrada instantânea na rua (*Quick Entry*), fotos de comprovantes fiscais com a câmera, biometria e funcionamento 100% offline.

## Decisão
1. **Estrutura Modular Monorepo**:
   - `wallet/backend/`: Código Python 3.10+, FastAPI Assíncrono e banco de dados SQLite WAL com SQLAlchemy 2.0.
   - `wallet/frontend/`: Aplicação Web moderna em React 19, TypeScript, Vite e Tailwind CSS.
   - `wallet/android/`: Aplicativo nativo Android em Kotlin 2.0+, Jetpack Compose, Material 3 e persistência local Room (SQLite) com arquitetura Offline-First.
   - `wallet/.ai/`: Governança centralizada de contexto, contratos OpenAPI (`openapi.json`), DDL (`schema.sql`), histórico de decisões (ADRs) e especificações técnicas.

2. **Padrões de Integração e Regras Invariáveis**:
   - **Centavos Inteiros**: Todos os valores financeiros permanecem estritamente em centavos inteiros (`amount_cents: Long / Int`) em todas as três camadas (Kotlin, TypeScript, Python).
   - **Sincronização Offline-First**: O app nativo grava instantaneamente no banco Room local (`sync_status = "PENDENTE"`) e sincroniza em lote com o backend através dos endpoints `/api/v1/sync/mobile/pull` e `/api/v1/sync/mobile/push` orquestrados via `WorkManager`.
   - **Isolamento de Builds**: Configuração de `.gitignore` no root ignorando artefatos de compilação Gradle/Android (`.gradle/`, `build/`, `*.apk`, `*.aab`, `local.properties`).

## Consequências
- Organização clara, modular e desacoplada, permitindo desenvolvimento simultâneo de Web, Mobile e Backend.
- Suporte nativo ao Android Studio com Gradle KTS moderno.
- Centralização de regras de negócio e documentação viva no diretório `.ai/`.
