# Guia de Configuração: Backup Automatizado e Armazenamento Local / Google Drive Desktop

Este documento descreve a arquitetura e a operação da rotina de **Backup Automatizado e Recuperação de Desastres (Disaster Recovery)** do banco PostgreSQL da aplicação **Wallet**, utilizando armazenamento direto no host (ex.: pasta sincronizada pelo **Google Drive para Desktop** no Windows via WSL).

---

## 1. Arquitetura da Solução

- **Armazenamento no Host / Google Drive Offline**: Os snapshots e anexos são salvos diretamente em diretórios do sistema host (ex.: `/mnt/c/Users/<seu-usuario>/drive/wallet/backups`), sincronizados pelo aplicativo oficial do Google Drive para Desktop no Windows.
- **Zero Dependência de Google Cloud APIs**: Elimina a necessidade de contas de serviço (Service Accounts), chaves de API, credenciais OAuth ou cotas restritas da API do Google Drive.
- **Dump Criptograficamente Seguro**: O utilitário gera snapshots binários customizados (`pg_dump -Fc`), preservando integridade referencial, constraints e dados sem locks de leitura.
- **Política de Retenção Configurável**: Purga automática baseada no número de dias configurado (padrão 30 dias), expurgando snapshots antigos do diretório para otimizar espaço em disco.
- **Interface Gráfica Integrada**: No painel web (**Configurações > Backup e Recuperação**), o usuário pode visualizar volumetria, disparar backups sob demanda, baixar dumps, excluir snapshots e restaurar bancos com confirmação de segurança.

---

## 2. Configuração dos Diretórios no Host

No painel de **Configurações** da aplicação (ou via API em `/api/v1/storage/config`), você pode configurar os caminhos absolutos:

1. **Diretório de Backups**:
   - Padrão WSL/Windows: `/mnt/c/Users/<seu-usuario>/drive/wallet/backups` (ou `/app/backups` interno)
2. **Diretório de Anexos**:
   - Padrão WSL/Windows: `/mnt/c/Users/<seu-usuario>/drive/wallet/storage` (ou `/app/storage` interno)
3. **Dias de Retenção de Backup**:
   - Padrão: `30` dias

> [!TIP]
> O sistema possui autodetecção inteligente de pastas do Google Drive instaladas no Windows através do mapeamento `/mnt/c/Users/*`. As sugestões aparecem automaticamente com um clique no painel de configurações.

---

## 3. Scripts de Linha de Comando

### 3.1. Gerar Backup Manual
Para executar um backup imediato via terminal no host/WSL:

```bash
./scripts/backup.sh
```

A saída exibirá:
1. Geração do snapshot binário PostgreSQL;
2. Validação do tamanho e integridade;
3. Expurgos de snapshots anteriores ao prazo de retenção.

### 3.2. Restauração (Disaster Recovery)
Para restaurar a partir de um arquivo `.dump`:

```bash
./scripts/restore.sh --file /caminho/do/arquivo.dump
# ou para restaurar o dump mais recente presente na pasta backups/
./scripts/restore.sh --latest
```

---

## 4. Agendamento Automático via Cron (Diário)

Para executar o backup diariamente às 03:00 da manhã no WSL:

```bash
crontab -e
```

Adicione a linha:
```cron
0 3 * * * /home/jsilvaneto/projetos/wallet/scripts/backup.sh >> /home/jsilvaneto/projetos/wallet/backups/backup.log 2>&1
```

