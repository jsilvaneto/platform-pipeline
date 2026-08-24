# ADR 015: Transição para Sincronização Mobile Offline-First Direta e Remoção do Google Sheets

## Status
**ACEITO** (Data: 2026-08-24)

## Contexto
Originalmente, o ecossistema Wallet possuía uma integração com o Google Sheets (e Google Drive) para espelhamento em nuvem de 8 abas e ingestão de uma fila móvel (`Fila_Mobile`). Embora funcional como cópia externa, essa abordagem introduzia:
1. Dependência de infraestrutura em nuvem de terceiros (Google Cloud Platform, Service Accounts, quotas de API e latências de rede).
2. Complexidade desnecessária na conciliação e manutenção de credenciais `.json` e IDs de planilhas.
3. Desalinhamento com a premissa fundamental de privacidade irrestrita e operação local-first rápida.

Com o amadurecimento do aplicativo nativo Android (Kotlin + Jetpack Compose + Room), definiu-se que o modelo ideal de mobilidade é o **100% Offline-First**, onde o aplicativo opera com persistência local primária e sincroniza diretamente com a API REST do Wallet quando houver conectividade.

## Decisão
1. **Remoção Total do Google Sheets e Google Drive**:
   - Exclusão dos serviços `google_sheets_service.py` e `google_drive_service.py`.
   - Remoção das bibliotecas `google-api-python-client`, `google-auth-httplib2` e `google-auth-oauthlib` do `requirements.txt`.
   - Remoção da aba `Fila_Mobile` e de toda a interface de gerenciamento de Service Accounts no frontend.

2. **Adoção do Protocolo de Sincronização Direta Mobile REST**:
   - Criação de endpoints REST dedicados no roteador `/api/v1/sync`:
     - `GET /api/v1/sync/status`: Diagnóstico operacional do servidor e integridade do banco SQLite WAL.
     - `POST /api/v1/sync/mobile/push`: Ingestão atômica de transações criadas offline, com preservação de UUIDs e upsert idempotente (*Last-Write-Wins*).
     - `GET /api/v1/sync/mobile/pull`: Download de dados mestres e lançamentos delta (`since=[ISO_TIMESTAMP]`).
     - `GET /api/v1/sync/logs` e `DELETE /api/v1/sync/logs`: Auditoria e histórico de sincronizações.
   - Upload de fotos de comprovantes diretamente para `POST /api/v1/attachments/upload` salvando no diretório local do servidor.

3. **Atualização da Interface Web (Frontend)**:
   - Substituição da aba "Sincronização Nuvem" pela aba executiva **"App Mobile & API"**.
   - Integração do componente modal [MobileAppGuideModal.tsx](file:///home/jsilvaneto/projetos/wallet/frontend/src/components/MobileAppGuideModal.tsx) com guia visual passo a passo para emulador Android e dispositivos físicos.
   - Atualização do indicador de status no [Header.tsx](file:///home/jsilvaneto/projetos/wallet/frontend/src/components/Header.tsx).

## Consequências

### Positivas
- **Latência Zero e Confiabilidade**: O usuário registra despesas na rua instantaneamente no banco Room SQLite do celular sem depender de sinal de internet.
- **Privacidade Máxima**: Nenhum dado financeiro trafega por servidores do Google ou provedores de nuvem de terceiros.
- **Arquitetura Mais Limpa**: Redução substancial de código complexo de conciliação de planilhas e eliminação de dependências pesadas no backend.
- **Resiliência de Rede**: O `WorkManager` no Android garante retry automático e sincronização em segundo plano assim que houver rede (Wi-Fi, 4G/5G ou VPN).

### Mitigações
- Para acesso remoto fora da rede Wi-Fi local de casa ou do escritório, o usuário pode utilizar soluções seguras de rede privada ponto a ponto como **Tailscale** ou **WireGuard** para conectar o aplicativo móvel ao backend FastAPI.
