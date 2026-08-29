# ADR 013: Backup Consolidado do Sistema em 1 Clique e Recuperação de Desastres

## Status
Aceito

## Contexto
O Wallet armazena todos os registros financeiros no banco de dados SQLite local (`wallet.db`) e os arquivos de comprovantes, notas fiscais, fotos e PDFs em um diretório particionado em disco (`attachments/`). Para garantir soberania total dos dados, segurança contra falhas de hardware e facilidade de portabilidade ou restauração, fazia-se necessário um mecanismo nativo de backup consolidado em 1 clique.

## Decisão
1. **Backend & Serviço de Snapshot ([backup_service.py](file:///home/jsilvaneto/projetos/wallet/backend/app/services/backup_service.py) e [system.py](file:///home/jsilvaneto/projetos/wallet/backend/app/api/v1/system.py))**:
   - `GET /api/v1/system/stats`: Retorna o tamanho do banco de dados, total de lançamentos, contas, contatos, comprovantes, tamanho em disco e carimbo do último backup.
   - `GET /api/v1/system/backup`:
     - Executa o comando `PRAGMA wal_checkpoint(TRUNCATE);` garantindo que todas as páginas do WAL estejam mescladas no arquivo principal `wallet.db`.
     - Compacta em um único arquivo `.ZIP` (compressão DEFLATE):
       1. O banco de dados íntegro `wallet.db`.
       2. Todos os comprovantes da pasta `attachments/`.
       3. Um arquivo `manifest.json` com metadados do sistema, versão e data de emissão.
     - Retorna o arquivo via `FileResponse` e agenda limpeza do arquivo temporário via `BackgroundTask`.
2. **Frontend ([Settings.tsx](file:///home/jsilvaneto/projetos/wallet/frontend/src/pages/Settings.tsx))**:
   - Menu lateral renomeado para "Comprovantes & Backups".
   - Card **Backup Completo do Sistema em 1 Clique (Disaster Recovery)** com estatísticas em tempo real e botão de download direto pelo navegador.

## Consequências
- **Positivas**:
  - Geração de backup integral em poucos segundos sem travar o banco de dados.
  - Segurança e autonomia para o usuário manter cópias offline seguras.
- **Negativas**:
  - Nenhuma identificada.
