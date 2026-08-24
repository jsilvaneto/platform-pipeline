# Wallet Mobile - Especificação Completa de Arquitetura & Implementação Android (Fase 2)

Este documento estabelece as diretrizes de arquitetura, contratos de dados, fluxos de telas, estratégias de sincronização offline-first e a estrutura de código recomendada para o desenvolvimento do aplicativo mobile nativo do **Wallet** no **Android Studio**.

---

## 1. Visão Geral do Aplicativo Mobile

O aplicativo mobile foi concebido como uma extensão ágil e "local-first" do ecossistema **Wallet**. Seu objetivo primordial é permitir que o usuário:
1. Registre despesas e receitas instantaneamente na rua com poucos toques (*Quick Entry*).
2. Tire fotos de comprovantes fiscais/recibos na hora e anexe às transações.
3. Consulte rapidamente seu saldo em contas, faturas de cartão de crédito e contas a vencer no dia.
4. Funcione **100% Offline** (persistindo em banco de dados local Room/SQLite) e sincronize de forma transparente e direta quando houver conexão via API REST.
5. Proteja o acesso por **Biometria** (impressão digital / reconhecimento facial).

---

## 2. Stack Tecnológica Recomendada (Android Studio)

| Componente | Tecnologia | Justificativa |
| :--- | :--- | :--- |
| **Linguagem** | **Kotlin 2.0+** | Padrão oficial Android, conciso, seguro contra nullabilidade e suporte nativo a Coroutines. |
| **Interface / UI** | **Jetpack Compose + Material 3** | UI declarativa moderna, suporte nativo a Dark Mode dinâmico, animações fluidas e alta produtividade. |
| **Persistência Local** | **Room (SQLite)** | Camada de abstração ORM com suporte a `Flow` e `suspend functions`, garantindo arquitetura offline-first. |
| **Cliente HTTP** | **Retrofit 2 + OkHttp 3** | Cliente REST assíncrono com interceptores de autenticação JWT Bearer e suporte a logs (HttpLoggingInterceptor). |
| **Serialização** | **Kotlinx Serialization** ou **Moshi** | Serialização JSON ultrarrápida, tipada e com suporte a null safety. |
| **Injeção de Dependência** | **Hilt (Dagger)** ou **Koin** | Gerenciamento de ciclo de vida e injeção de dependências em ViewModels, DAOs e Repositórios. |
| **Tarefas em Segundo Plano** | **WorkManager** | Sincronização offline em background confiável e com políticas de retry automático e restrições de rede (`NetworkType.CONNECTED`). |
| **Segurança & Biometria** | **AndroidX Biometric + EncryptedSharedPreferences** | Autenticação biométrica (`BiometricPrompt`) e armazenamento seguro de tokens JWT e configurações. |
| **Câmera & Comprovantes** | **CameraX** / `ActivityResultContracts.TakePicture` | Captura simplificada de fotos de notas fiscais e comprovantes. |

---

## 3. Arquitetura do Aplicativo (Clean Architecture + MVVM / MVI)

```mermaid
graph TD
    UI["UI Layer (Jetpack Compose Screens & Components)"] -->|Observe State / Send Events| VM["ViewModel Layer (StateFlow / UI State)"]
    VM -->|Execute Use Cases| Domain["Domain Layer (UseCases / Business Rules)"]
    Domain -->|Call Interfaces| Repo["Repository Layer (TransactionRepository, SyncRepository)"]
    Repo -->|Local Read/Write (Instantâneo)| Room["Local DataSource (Room SQLite DB)"]
    Repo -->|Remote Sync / REST (Background)| Retrofit["Remote DataSource (FastAPI REST Client)"]
    Retrofit -->|Bearer JWT| BackendFastAPI["Servidor Wallet (FastAPI :8000)"]
```

---

## 4. Modelagem de Dados Local (Room Entities & DTOs)

### 4.1 Regra Invariável: Valores Monetários em Centavos Inteiros
Assim como no backend, todo valor monetário no Android **DEVE** ser manipulado e persistido como `Long` ou `Int` representando centavos (`amount_cents`). Nunca utilize `Float` ou `Double` para cálculos ou armazenamento financeiro.
- `R$ 15,50` $\rightarrow$ `1550L`
- `R$ 1.250,00` $\rightarrow$ `125000L`

### 4.2 Entidades Principais do Room (`@Entity`)

#### `TransactionEntity`
```kotlin
@Entity(
    tableName = "transactions",
    indices = [
        Index("profile"),
        Index("due_date"),
        Index("sync_status"),
        Index("status")
    ]
)
data class TransactionEntity(
    @PrimaryKey
    val id: String = UUID.randomUUID().toString(),
    val profile: String, // "PESSOAL" ou "EMPRESA"
    val type: String, // "DESPESA", "RECEITA", "TRANSFERENCIA"
    val description: String,
    val amountCents: Long,
    val dueDate: String, // "YYYY-MM-DD"
    val paymentDate: String? = null, // "YYYY-MM-DD"
    val status: String = "PENDENTE", // "PENDENTE", "CONCLUIDO", "CANCELADO"
    val categoryId: String? = null,
    val categoryName: String? = null,
    val accountId: String? = null,
    val accountName: String? = null,
    val destinationAccountId: String? = null,
    val destinationAccountName: String? = null,
    val paymentMethodId: String? = null,
    val paymentMethodName: String? = null,
    val creditCardId: String? = null,
    val creditCardName: String? = null,
    val contactId: String? = null,
    val contactName: String? = null,
    val itemId: String? = null,
    val notes: String? = null,
    val installmentNumber: Int? = null,
    val totalInstallments: Int? = null,
    val syncStatus: String = "PENDENTE", // "PENDENTE", "SINCRONIZADO", "ERRO"
    val localAttachmentPath: String? = null, // Caminho URI local da foto do comprovante
    val remoteAttachmentId: String? = null,
    val createdAt: String = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.US).format(Date()),
    val updatedAt: String = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.US).format(Date())
)
```

#### `CategoryEntity`
```kotlin
@Entity(tableName = "categories")
data class CategoryEntity(
    @PrimaryKey val id: String,
    val profile: String, // "PESSOAL" ou "EMPRESA"
    val name: String,
    val type: String, // "RECEITA" ou "DESPESA"
    val nature: String = "NENHUM" // "OBRIGATORIO", "NECESSARIO", "DESEJO", "NENHUM"
)
```

#### `AccountEntity` & `CreditCardEntity`
```kotlin
@Entity(tableName = "accounts")
data class AccountEntity(
    @PrimaryKey val id: String,
    val profile: String,
    val name: String,
    val type: String // "CORRENTE", "POUPANCA", "INVESTIMENTO", "CAIXA", "OUTRO"
)

@Entity(tableName = "credit_cards")
data class CreditCardEntity(
    @PrimaryKey val id: String,
    val profile: String,
    val name: String,
    val limitCents: Long,
    val usedLimitCents: Long = 0,
    val availableLimitCents: Long = 0,
    val closingDay: Int,
    val dueDay: Int,
    val color: String = "emerald",
    val brand: String? = "MASTERCARD",
    val accountId: String? = null
)
```

#### `PaymentMethodEntity` & `ItemEntity`
```kotlin
@Entity(tableName = "payment_methods")
data class PaymentMethodEntity(
    @PrimaryKey val id: String,
    val profile: String,
    val name: String,
    val type: String // "PIX", "BOLETO", "CARTAO_CREDITO", "CARTAO_DEBITO", "DINHEIRO", "TRANSFERENCIA", "DEBITO_AUTOMATICO", "OUTRO"
)

@Entity(tableName = "items")
data class ItemEntity(
    @PrimaryKey val id: String,
    val profile: String,
    val name: String,
    val categoryId: String,
    val defaultAmountCents: Long? = null
)
```

---

## 5. Contratos de API REST (FastAPI) para o Retrofit

### 5.1 Definição da Interface `WalletApiService`

```kotlin
interface WalletApiService {

    // 1. Autenticação
    @FormUrlEncoded
    @POST("api/v1/auth/login")
    suspend fun login(
        @Field("username") username: String,
        @Field("password") password: String
    ): AuthTokenResponse

    @GET("api/v1/auth/me")
    suspend fun getCurrentUser(): UserResponse

    // 2. Sincronização Direta Mobile (Push & Pull em Lote)
    @POST("api/v1/sync/mobile/push")
    suspend fun pushOfflineTransactions(
        @Body request: MobileSyncPushRequest
    ): MobileSyncPushResponse

    @GET("api/v1/sync/mobile/pull")
    suspend fun pullServerData(
        @Query("profile") profile: String,
        @Query("since") since: String? = null
    ): MobileSyncPullResponse

    @GET("api/v1/sync/status")
    suspend fun getSyncStatus(): SyncStatusResponse

    // 3. Upload de Comprovantes
    @Multipart
    @POST("api/v1/attachments/upload")
    suspend fun uploadAttachment(
        @Part file: MultipartBody.Part,
        @Query("profile") profile: String,
        @Query("attachment_type") attachmentType: String = "COMPROVANTE",
        @Query("transaction_id") transactionId: String? = null
    ): AttachmentResponse

    // 4. Dashboard & KPIs
    @GET("api/v1/dashboard/summary")
    suspend fun getDashboardSummary(
        @Query("profile") profile: String,
        @Query("month") month: Int? = null,
        @Query("year") year: Int? = null
    ): DashboardSummaryResponse
}
```

---

## 6. Fluxos de Telas & UX no Jetpack Compose

```
App Navigation
├── AuthNavGraph
│   ├── ConnectionSetupScreen (Configurar URL do servidor FastAPI / IP local / Host)
│   ├── LoginScreen (Usuário, Senha, Biometria)
│   └── BiometricPrompt (Desbloqueio rápido)
└── MainNavGraph (Bottom Navigation Bar)
    ├── HomeScreen (Dashboard, KPIs do mês, Saldo em contas, Cartões, Alertas de vencimento)
    ├── TransactionsScreen (Lista com busca, filtros de mês/status e toggle rápido de baixa)
    ├── QuickEntryBottomSheet / Screen (Lançamento ágil com valor em destaque, teclado numérico BRL, foto)
    ├── CreditCardsScreen (Faturas, limites e melhor dia de compra)
    └── SettingsScreen (Perfil ativo, status da sincronização, diretório e logout)
```

### 6.1 Detalhamento da Tela "Quick Entry" (Lançamento Rápido)
Esta é a tela mais importante do mobile:
1. **Input de Valor Gigante (Hero Component)**: Formatação instantânea em BRL (`R$ 0,00`) conforme o usuário digita no teclado numérico customizado.
2. **Chips de Tipo**: `Despesa` (padrão em vermelho), `Receita` (verde), `Transferência` (índigo).
3. **Seleção de Perfil**: Switch rápido `PESSOAL` | `EMPRESA`.
4. **Campo de Descrição**: Com auto-completar inteligente por `Itens` cadastrados.
5. **Seletor de Categoria**: Grid com ícones e cores por natureza (`Obrigatório`, `Necessário`, `Desejo`).
6. **Forma de Pagamento & Conta / Cartão**: Seleção em 1 toque (Pix, Dinheiro, Cartão Nubank, etc.).
7. **Botão de Câmera 📷**: Tira foto da nota/recibo que é salva localmente e colocada na fila de upload.
8. **Botão Salvar**: Salva instantaneamente no Room local (< 10ms) e despacha o `SyncWorker` em segundo plano.

---

## 7. Estratégia de Sincronização e Resiliência (Offline-First)

### 7.1 Cenário 1: Operação 100% Offline (Sem Conexão)
1. Ao criar uma transação no app, o item é gravado imediatamente no Room Database local com `syncStatus = "PENDENTE"` e UUID local (< 10ms).
2. Se o usuário tirou foto do comprovante com a câmera (CameraX), o arquivo é persistido no armazenamento interno do app (`context.filesDir/receipts/`) com `localAttachmentPath`.
3. O item aparece na lista do app imediatamente com um indicador visual de "Pendente de envio".

### 7.2 Cenário 2: Reconexão e Sincronização em Segundo Plano (WorkManager)
1. O **WorkManager** agenda uma tarefa periódica ou disparada por conectividade (`SyncWorker`):
   ```kotlin
   val constraints = Constraints.Builder()
       .setRequiredNetworkType(NetworkType.CONNECTED)
       .build()
   ```
2. Ao detectar conexão com o servidor FastAPI:
   - **Etapa 1 (Push)**: O worker consulta no Room todas as transações com `syncStatus == "PENDENTE"` e envia em lote via `POST /api/v1/sync/mobile/push`.
   - **Etapa 2 (Upload de Fotos)**: Para cada transação com foto local pendente, envia o arquivo binário via `POST /api/v1/attachments/upload` e atualiza `remoteAttachmentId`.
   - **Etapa 3 (Pull Delta)**: Executa `GET /api/v1/sync/mobile/pull?since={last_sync_timestamp}` para baixar novos cadastros (categorias, contas, etc.) e transações criadas na interface Web.
   - **Etapa 4 (Consolidação)**: Atualiza o status local no Room para `syncStatus = "SINCRONIZADO"`.

### 7.3 Resolução de Conflitos e Idempotência
- **Preservação de UUIDs**: Os UUIDs gerados no app mobile são preservados no SQLite do servidor, garantindo idempotência e evitando duplicações mesmo com múltiplas tentativas de retry do WorkManager.
- **Política Last-Write-Wins**: Em caso de edição simultânea, a data `updated_at` determina o estado final dos dados.

---

## 8. Estrutura de Pacotes Sugerida para o Android Studio

```
app/src/main/java/com/wallet/app/
├── data/
│   ├── local/
│   │   ├── AppDatabase.kt
│   │   ├── dao/
│   │   │   ├── TransactionDao.kt
│   │   │   ├── CategoryDao.kt
│   │   │   ├── AccountDao.kt
│   │   │   └── CreditCardDao.kt
│   │   └── entity/
│   │       ├── TransactionEntity.kt
│   │       └── ...
│   ├── remote/
│   │   ├── WalletApiService.kt
│   │   ├── AuthInterceptor.kt
│   │   └── dto/
│   │       ├── TransactionDto.kt
│   │       └── ...
│   └── repository/
│       ├── TransactionRepositoryImpl.kt
│       ├── MasterDataRepositoryImpl.kt
│       └── AuthRepositoryImpl.kt
├── domain/
│   ├── model/
│   │   ├── Transaction.kt
│   │   ├── Category.kt
│   │   └── Profile.kt
│   ├── repository/
│   │   ├── TransactionRepository.kt
│   │   └── AuthRepository.kt
│   └── usecase/
│       ├── SaveQuickTransactionUseCase.kt
│       ├── SyncPendingTransactionsUseCase.kt
│       └── GetDashboardSummaryUseCase.kt
├── ui/
│   ├── theme/
│   │   ├── Color.kt
│   │   ├── Theme.kt (Dark/Light Material 3)
│   │   └── Type.kt
│   ├── components/
│   │   ├── CurrencyInputVisualTransformation.kt
│   │   ├── AmountHeroCard.kt
│   │   ├── CategoryChipGrid.kt
│   │   └── AttachmentCaptureButton.kt
│   ├── navigation/
│   │   ├── NavGraph.kt
│   │   └── Screen.kt
│   ├── home/
│   │   ├── HomeScreen.kt
│   │   └── HomeViewModel.kt
│   ├── entry/
│   │   ├── QuickEntryScreen.kt
│   │   └── QuickEntryViewModel.kt
│   ├── transactions/
│   │   ├── TransactionsScreen.kt
│   │   └── TransactionsViewModel.kt
│   ├── creditcards/
│   │   ├── CreditCardsScreen.kt
│   │   └── CreditCardsViewModel.kt
│   └── settings/
│       ├── SettingsScreen.kt
│       └── SettingsViewModel.kt
├── worker/
│   └── SyncWorker.kt
└── WalletApplication.kt
```

---

## 9. Permissões Necessárias (`AndroidManifest.xml`)

```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android">

    <!-- Conectividade -->
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />

    <!-- Biometria -->
    <uses-permission android:name="android.permission.USE_BIOMETRIC" />

    <!-- Câmera para comprovantes fiscais -->
    <uses-feature android:name="android.hardware.camera" android:required="false" />
    <uses-permission android:name="android.permission.CAMERA" />

    <!-- Notificações de contas a vencer (Android 13+) -->
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />

    <application
        android:name=".WalletApplication"
        android:allowBackup="true"
        android:usesCleartextTraffic="true" <!-- Permitir HTTP para testes locais na rede WiFi -->
        android:theme="@style/Theme.WalletApp">
        ...
    </application>
</manifest>
```

---

## 10. Checklist de Inicialização no Android Studio

Ao abrir o **Android Studio**:
- [ ] Criar novo projeto: **Empty Compose Activity** (Material 3).
- [ ] Configurar `compileSdk = 35`, `minSdk = 26` (Android 8.0+), `targetSdk = 35`.
- [ ] Adicionar dependências no `libs.versions.toml`:
  - `androidx-room-runtime`, `androidx-room-compiler`, `androidx-room-ktx`
  - `retrofit`, `retrofit-converter-kotlinx-serialization` (ou moshi)
  - `okhttp-logging-interceptor`
  - `androidx-work-runtime-ktx`
  - `androidx-biometric`
  - `androidx-navigation-compose`
  - `coil-compose` (para exibição de fotos de comprovantes)
  - `hilt-android`, `hilt-compiler` (ou Koin)
- [ ] Configurar a URL base da API apontando para o IP da máquina local ou emulador (no emulador Android padrão, `http://10.0.2.2:8000/`).
- [ ] Implementar a tela de `QuickEntryScreen` com persistência local no Room.
- [ ] Testar a sincronização assíncrona com o backend FastAPI.
