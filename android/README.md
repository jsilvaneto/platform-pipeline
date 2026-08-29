# Wallet Android - Aplicativo Mobile Nativo

Projeto mobile nativo do ecossistema **Wallet**, desenvolvido em **Kotlin**, **Jetpack Compose**, **Material 3** e arquitetura **Offline-First** com **Room Database**.

---

## 🛠️ Stack Tecnológica

- **Linguagem**: Kotlin 2.0+
- **Interface Declarativa**: Jetpack Compose + Material 3
- **Persistência Local (Offline)**: Room Database (SQLite local com centavos inteiros `amountCents: Long`)
- **Rede & Sincronização**: Retrofit 2 + OkHttp 3 + Kotlinx Serialization
- **Segundo Plano**: WorkManager para sincronização bidirecional em background (`/api/v1/sync/mobile/pull` e `/api/v1/sync/mobile/push`)
- **Segurança**: AndroidX Biometric (`BiometricPrompt`) + EncryptedSharedPreferences

---

## 🚀 Como Abrir e Executar no Android Studio

1. Abra o **Android Studio**.
2. Clique em **File > Open** e selecione a pasta:
   ```
   /home/jsilvaneto/projetos/wallet/android
   ```
3. Aguarde o **Gradle Sync** baixar as dependências e indexar o projeto.
4. Execute em um emulador Android (API 26+) ou em um dispositivo físico conectado via USB.

---

## 📡 Configuração de Conexão com o Backend

Por padrão, para testar com o backend local (`http://localhost:8000`), use no emulador Android o endereço especial:
```
http://10.0.2.2:8000
```
Ou, em dispositivo físico, aponte para o IP da sua máquina na rede local Wi-Fi.
