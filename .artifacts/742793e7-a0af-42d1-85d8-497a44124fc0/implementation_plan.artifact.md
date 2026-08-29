# Plano de Implementação: Camada de Dados Local e Infraestrutura Android

Este plano descreve as etapas para configurar a infraestrutura básica do aplicativo Android, incluindo a modernização do gerenciamento de dependências e a expansão do banco de dados Room para suportar as regras de negócio do ecossistema **Wallet**.

## Proposta de Mudanças

### 1. Infraestrutura e Dependências (Gradle)
Modernizar o build do Android usando **Version Catalog (`libs.versions.toml`)** e adicionar suporte ao **Hilt** para Injeção de Dependência, essencial para uma arquitetura escalável e testável.

#### [NEW] [libs.versions.toml](file:///home/jsilvaneto/projetos/wallet/android/gradle/libs.versions.toml)
- Centralizar todas as versões e bibliotecas (Room, Retrofit, Hilt, Compose, WorkManager, CameraX).

#### [MODIFY] [build.gradle.kts (root)](file:///home/jsilvaneto/projetos/wallet/android/build.gradle.kts)
- Configurar os plugins via Version Catalog.
- Adicionar o plugin do Hilt.

#### [MODIFY] [build.gradle.kts (app)](file:///home/jsilvaneto/projetos/wallet/android/android/app/build.gradle.kts)
- Aplicar plugins e dependências usando `alias(libs.plugins...)` e `libs.xxx`.

---

### 2. Camada de Dados Local (Room Database)
Expandir o banco de dados local para refletir as entidades do backend e garantir o funcionamento **Offline-First**.

#### [NEW] Entidades em `data/local/entity/`
- **`CategoryEntity`**: Categorias com `profile` e `nature` (natureza do gasto).
- **`AccountEntity`**: Contas bancárias e carteiras.
- **`PaymentMethodEntity`**: Meios de pagamento (Pix, Cartão, Dinheiro).
- **`CreditCardEntity`**: Cartões de crédito com limites e datas de fechamento/vencimento.
- **`InvoiceEntity`**: Faturas de cartão para controle de gastos mensais.
- **`GoalEntity`**: Metas financeiras e objetivos.

#### [NEW] DAOs em `data/local/dao/`
- Criar DAOs para todas as novas entidades, seguindo o padrão de retornos `Flow` e `suspend functions`, sempre filtrando por `profile`.

#### [MODIFY] [WalletDatabase.kt](file:///home/jsilvaneto/projetos/wallet/android/app/src/main/java/com/wallet/app/data/local/WalletDatabase.kt)
- Registrar todas as novas entidades e DAOs.

---

### 3. Inicialização e Injeção de Dependência
Migrar a inicialização manual do banco de dados para o Hilt.

#### [NEW] `di/DatabaseModule.kt`
- Módulo Hilt para prover `WalletDatabase` e os DAOs em todo o aplicativo.

#### [MODIFY] [WalletApplication.kt](file:///home/jsilvaneto/projetos/wallet/android/app/src/main/java/com/wallet/app/WalletApplication.kt)
- Anotar com `@HiltAndroidApp`.

#### [MODIFY] [MainActivity.kt](file:///home/jsilvaneto/projetos/wallet/android/app/src/main/java/com/wallet/app/MainActivity.kt)
- Anotar com `@AndroidEntryPoint` e injetar o `TransactionDao` (preparando para uso de ViewModels).

---

## Plano de Verificação

### Testes Automatizados
- Executar `./gradlew assembleDebug` para garantir que o KSP gerou os códigos do Room e que o Hilt está configurado corretamente.

### Verificação Manual
- Validar se o aplicativo abre sem crashes.
- Verificar se as migrações do Room (fallback destructivo por enquanto) ocorrem corretamente ao adicionar novas entidades.
