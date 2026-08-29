# Plano de Implementação: Wallet Android Nativo (Full Feature Parity)

Este plano visa implementar 100% das funcionalidades da aplicação web no aplicativo Android, seguindo os padrões de arquitetura definidos no projeto.

## Matriz de Gaps Identificada

### 1. Dados e Persistência (Room)
- **Faltam Entidades**: `ContactEntity`, `ScheduleEntity`, `AttachmentEntity`, `BudgetEntity`, `SyncLogEntity`.
- **DAOs**: Necessário implementar DAOs para as novas entidades e enriquecer os existentes com queries de filtragem.

### 2. Rede e Sincronização
- **API Service**: Adicionar endpoints para Contatos, Orçamentos, Metas, Anexos e Backups.
- **Sincronização**: Implementar `SyncWorker` com WorkManager para operação Offline-First robusta.
- **Repositórios**: Criar camada de repositório para isolar Room e Retrofit.

### 3. Interface e Navegação
- **Navegação**: Implementar `AppNavigation` com Bottom Bar (5 abas).
- **Dashboard**: Gráficos analíticos (Natureza 50-30-20) e evolução histórica.
- **Transações**: Extrato completo, busca textual, filtros multi-critério e ações em lote.
- **Cartões**: Gestão de limites e ciclo de faturas (Fechar/Pagar/Reabrir).
- **Ajustes**: CRUD completo de cadastros mestres e conciliação bancária.

---

## Proposed Changes

### Core Infrastructure
#### [NEW] [ContactEntity.kt](file:///C:/Users/jsilvaneto/drive/new-drive/projeto/wallet/android/app/src/main/java/com/wallet/app/data/local/entity/ContactEntity.kt)
#### [NEW] [ScheduleEntity.kt](file:///C:/Users/jsilvaneto/drive/new-drive/projeto/wallet/android/app/src/main/java/com/wallet/app/data/local/entity/ScheduleEntity.kt)
#### [NEW] [AttachmentEntity.kt](file:///C:/Users/jsilvaneto/drive/new-drive/projeto/wallet/android/app/src/main/java/com/wallet/app/data/local/entity/AttachmentEntity.kt)
#### [NEW] [BudgetEntity.kt](file:///C:/Users/jsilvaneto/drive/new-drive/projeto/wallet/android/app/src/main/java/com/wallet/app/data/local/entity/BudgetEntity.kt)

#### [NEW] [TransactionRepository.kt](file:///C:/Users/jsilvaneto/drive/new-drive/projeto/wallet/android/app/src/main/java/com/wallet/app/data/repository/TransactionRepository.kt)
#### [NEW] [SyncWorker.kt](file:///C:/Users/jsilvaneto/drive/new-drive/projeto/wallet/android/app/src/main/java/com/wallet/app/worker/SyncWorker.kt)

### UI Layer
#### [NEW] [AppNavigation.kt](file:///C:/Users/jsilvaneto/drive/new-drive/projeto/wallet/android/app/src/main/java/com/wallet/app/ui/navigation/AppNavigation.kt)
#### [NEW] [MainScreen.kt](file:///C:/Users/jsilvaneto/drive/new-drive/projeto/wallet/android/app/src/main/java/com/wallet/app/ui/screens/MainScreen.kt)
#### [MODIFY] [MainActivity.kt](file:///C:/Users/jsilvaneto/drive/new-drive/projeto/wallet/android/app/src/main/java/com/wallet/app/MainActivity.kt) - Integrar navegação global.

---

## Cronograma de Execução

1. **Sprint 1: Core & Navigation**: Base de dados completa, Repositórios e Navegação Global.
2. **Sprint 2: Transactions & Credit Cards**: Extrato completo, formulário rico e faturas de cartão.
3. **Sprint 3: Dashboard & Planning**: Gráficos, Metas e Recorrências.
4. **Sprint 4: Settings & Master Data**: CRUDs de cadastros, Backup e Conciliação.

## Verification Plan

### Automated Tests
- Testes unitários de DAOs e Repositórios.
- Testes de UI para fluxos de navegação.

### Manual Verification
- Sincronização manual acionada pelo app.
- Registro de transação offline e verificação no backend após reconexão.
