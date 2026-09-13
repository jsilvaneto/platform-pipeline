# Guia de Configuração: Backup Automatizado e Disaster Recovery com Google Drive

Este documento descreve como configurar e operar a rotina de **Backup Automatizado e Recuperação de Desastres (Disaster Recovery)** do banco PostgreSQL da aplicação **Wallet** com armazenamento na nuvem via **Google Drive**.

---

## 1. Arquitetura da Solução

- **Dump Criptograficamente Seguro**: O utilitário [`scripts/backup.sh`](file:///home/jsilvaneto/projetos/wallet/scripts/backup.sh) gera um snapshot binário customizado (`pg_dump -Fc`), preservando integridade referencial, constraints e dados sem locks excessivos.
- **Sincronização em Nuvem**: O script [`scripts/backup_gdrive.py`](file:///home/jsilvaneto/projetos/wallet/scripts/backup_gdrive.py) autentica via **Google Cloud Service Account** (recomendado para servidores) ou OAuth e envia os dumps para uma pasta dedicada no seu Google Drive.
- **Política de Retenção e Purga Automática**: O script aplica rotação de arquivos mantendo os últimos **30 dias de backups** (configurável via `BACKUP_RETENTION_DAYS`), deletando snapshots mais antigos automaticamente para não esgotar o armazenamento do Drive.
- **Disaster Recovery**: O script [`scripts/restore.sh`](file:///home/jsilvaneto/projetos/wallet/scripts/restore.sh) permite listar, baixar e restaurar qualquer snapshot diretamente no banco de dados.

---

## 2. Passo a Passo: Configuração no Google Cloud Console

Para permitir que o servidor envie backups para o Google Drive sem intervenção humana:

### 2.1. Criar o Projeto e Ativar a API
1. Acesse o [Google Cloud Console](https://console.cloud.google.com/).
2. Crie um novo projeto (ex.: `Wallet-Backups`).
3. No menu lateral, acesse **APIs e Serviços** > **Biblioteca**.
4. Pesquise por **Google Drive API** e clique em **Ativar**.

### 2.2. Criar uma Conta de Serviço (Service Account)
1. Vá em **APIs e Serviços** > **Credenciais**.
2. Clique em **Criar Credenciais** > **Conta de Serviço**.
3. Dê um nome (ex.: `wallet-backup-bot`) e clique em **Criar e Continuar**.
4. Na tela seguinte, não é necessário atribuir papéis de IAM do Google Cloud. Conclua a criação.
5. Clique sobre a conta de serviço criada, vá na aba **Chaves** (Keys).
6. Clique em **Adicionar Chave** > **Criar nova chave** > Escolha o formato **JSON**.
7. O arquivo de chave será baixado no seu computador. Salve este arquivo na raiz do projeto com o nome `credentials.json` (ou configure o caminho no `.env`).

### 2.3. Criar a Pasta no seu Google Drive Pessoal
1. Acesse seu [Google Drive](https://drive.google.com/).
2. Crie uma pasta onde os backups serão guardados (ex.: `Wallet_Backups`).
3. Abra a pasta e copie o **Folder ID** na barra de endereços:
   - Exemplo: `https://drive.google.com/drive/folders/1aBcDeFgHiJkLmNoPqRsTuVwXyZ`
   - O ID é o código final: `1aBcDeFgHiJkLmNoPqRsTuVwXyZ`.
4. **IMPORTANTE**: Compartilhe a pasta com o e-mail da sua Conta de Serviço!
   - O e-mail da conta de serviço tem o formato: `wallet-backup-bot@<seu-projeto>.iam.gserviceaccount.com` (encontrado dentro do arquivo `credentials.json`).
   - Clique em **Compartilhar** na pasta e dê permissão de **Editor** para este e-mail.

---

## 3. Configuração das Variáveis de Ambiente

No seu arquivo `.env` (na raiz do repositório), adicione:

```env
# Configurações do Google Drive para Backup
GOOGLE_APPLICATION_CREDENTIALS=/home/jsilvaneto/projetos/wallet/credentials.json
GOOGLE_DRIVE_FOLDER_ID=1aBcDeFgHiJkLmNoPqRsTuVwXyZ
BACKUP_RETENTION_DAYS=30
```

> [!NOTE]
> O arquivo `credentials.json` já está listado no `.gitignore` do projeto para garantir que nenhuma chave privada seja versionada.

---

## 4. Teste Manual da Rotina de Backup

Para executar um backup imediato:

```bash
./scripts/backup.sh
```

A saída exibirá:
1. Geração do dump binário do PostgreSQL;
2. Conexão autenticada com o Google Drive;
3. Barra de progresso do upload;
4. Execução da política de retenção de 30 dias.

Para listar todos os backups disponíveis no Google Drive:

```bash
./scripts/restore.sh --list
```

---

## 5. Agendamento Automático via Cron (Diário)

Para que o backup seja executado automaticamente todos os dias às 03:00 da manhã:

1. Abra o editor de tarefas agendadas:
   ```bash
   crontab -e
   ```
2. Adicione a seguinte linha:
   ```cron
   0 3 * * * /home/jsilvaneto/projetos/wallet/scripts/backup.sh >> /home/jsilvaneto/projetos/wallet/backups/backup.log 2>&1
   ```

---

## 6. Procedimento de Restauração (Disaster Recovery)

Se for necessário recuperar os dados após uma falha de servidor ou desastre:

1. **Listar backups remotos**:
   ```bash
   ./scripts/restore.sh --list
   ```
2. **Restaurar um backup específico**:
   ```bash
   ./scripts/restore.sh --drive <FILE_ID_DO_DRIVE>
   ```
   *O script solicitará confirmação antes de sobrescrever o banco atual.*
