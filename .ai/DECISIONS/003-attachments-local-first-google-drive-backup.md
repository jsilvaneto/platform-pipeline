# ADR 003: Gestão de Comprovantes com Armazenamento Local-First e Backup Assíncrono no Google Drive

## Status
**Aceito** (2026-08-16)

## Contexto
O Wallet gerencia despesas e receitas pessoais e corporativas. O usuário necessita anexar fotos de cupons fiscais, recibos, comprovantes Pix e PDFs para auditoria e controle financeiro. Fazer upload síncrono para serviços de nuvem externos pode introduzir latência (1 a 5 segundos por anexo), lentidão na UI e falhas em momentos de instabilidade de rede ou quando a internet estiver offline.

## Decisão
Adotar uma arquitetura **Local-First** para anexos e comprovantes, complementada por **Backup Assíncrono no Google Drive**:

1. **Armazenamento Local Primário**:
   - Os arquivos enviados são sanitizados e gravados instantaneamente no disco local particionados por perfil, ano e mês: `data/attachments/{profile}/{ano}/{mes}/`.
   - O registro no SQLite WAL é criado com `sync_status = "PENDENTE"`.
   - O tempo de resposta para o usuário é inferior a 50ms.

2. **Backup Assíncrono no Google Drive (Google Drive API v3)**:
   - A rota dispara uma tarefa em segundo plano (`BackgroundTasks` do FastAPI) para enviar o arquivo ao Google Drive via Service Account configurada.
   - O Google Drive organiza os arquivos nas pastas `Wallet - Comprovantes / PESSOAL` e `Wallet - Comprovantes / EMPRESA`.
   - Ao concluir o upload no Drive, o registro local é atualizado com `sync_status = "SINCRONIZADO"`, `drive_file_id` e o link direto `drive_web_view_link`.

3. **Resiliência e Fallback Offline**:
   - Se o Google Drive estiver offline ou a API desabilitada, o arquivo permanece 100% íntegro e visualizável no armazenamento local.
   - O usuário pode forçar a sincronização de todos os comprovantes pendentes a qualquer momento através do botão geral de sincronização ou no painel de comprovantes na aba Sincronização Nuvem.

4. **Visualizador e Experiência do Usuário (Frontend)**:
   - Visualizador completo (`AttachmentViewerModal.tsx`) com suporte a lightbox de imagens (zoom/rotação), visualização embutida de PDFs e download direto.
   - Integração no fluxo de criação de lançamentos (`TransactionModal.tsx`) e indicador de clipe na tabela de transações (`Transactions.tsx`).

## Consequências
- **Positivas**:
  - Resposta instantânea no upload e na navegação de comprovantes sem bloqueio de rede.
  - Segurança e persistência duplicada (disco local + nuvem Google Drive).
  - Isolamento estrito entre os perfis `PESSOAL` e `EMPRESA` no Drive.
  - Baixo consumo de memória e streaming eficiente de arquivos com `FileResponse`.
- **Mitigações**:
  - Limite de tamanho por arquivo definido em 15MB para proteger o armazenamento do servidor.
  - Validação estrita de tipos MIME (`image/jpeg`, `image/png`, `image/webp`, `application/pdf`).
