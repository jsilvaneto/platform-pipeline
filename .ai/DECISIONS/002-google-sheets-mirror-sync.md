# ADR 002: Estratégia de Espelhamento e Sincronização em Nuvem via Google Sheets API

## Status
**Aceito**

## Contexto
No modelo de operação com SQLite local, os dados primários residem no banco local. No entanto, os usuários necessitam de:
1. Uma cópia de backup / espelho em nuvem para visualização de relatórios analíticos em planilhas.
2. Uma forma de lançar despesas remotamente (ex: em trânsito no celular) sem expor o banco de dados local na internet pública.
3. Total controle sobre credenciais, com histórico de auditoria e logs de execução.

## Decisão
1. **Google Sheets como Ponte em Nuvem & Catálogo do App**: Utilizar a API oficial do Google Sheets (v4) com autenticação via Service Account OAuth2 (`credentials.json`).
2. **Separação de Papéis por 8 Abas Especializadas**:
   - **`Transacoes`**: Espelho analítico consolidado de receitas e despesas com metadados e IDs relacionais.
   - **`Categorias`**: Catálogo de categorias, subcategorias, fluxo e natureza de essencialidade.
   - **`Itens`**: Catálogo de itens vinculados a subcategorias e valores padrão para auto-preenchimento.
   - **`Contas`**: Contas bancárias e carteiras cadastradas.
   - **`Contatos`**: Clientes, fornecedores e favorecidos.
   - **`Dividas`**: Passivos, saldos devedores, credores e datas de vencimento.
   - **`Orcamentos`**: Tetos e limites mensais de gastos por categoria.
   - **`Fila_Mobile`**: Fila de entrada de lançamentos gerados no celular pelo app Android.
3. **Ações Direcionais Otimizadas em Lote**:
   - **Exportar (`/sync/export`)**: Envio unidirecional atômico SQLite -> Planilha (todas as 7 abas mestras e operacionais via `batchUpdate`).
   - **Importar (`/sync/import`)**: Leitura unidirecional e reconciliação da aba `Fila_Mobile` -> SQLite.
   - **Sincronização Completa (`/sync/full`)**: Importa a fila pendente e em seguida reexporta todas as abas consolidadas.
4. **Armazenamento Seguro de Credenciais e Auditoria Granular**:
   - As credenciais de serviço e o ID da planilha são persistidos na tabela `system_configs` do banco de dados local.
   - Cada operação gera um registro na tabela `sync_logs` com status (`SUCESSO`, `ERRO`), contagem de itens importados/exportados, quantitativo detalhado em JSON no campo `details` e timestamp ISO 8601.

## Consequências

### Positivas
- **Desacoplamento e Segurança**: O backend local não precisa expor portas públicas na internet. A comunicação é sempre originada pelo cliente local para a API do Google via HTTPS.
- **Transparência**: O usuário tem auditoria completa de cada sincronização na interface web em **Configurações &gt; Sincronização Nuvem**.
- **Flexibilidade**: O usuário pode visualizar suas finanças no Google Sheets em qualquer dispositivo sem comprometer a soberania dos dados do SQLite local.

### Negativas / Mitigações
- Limites de taxa de requisições da Google Sheets API (*rate limits*) — mitigados com processamento em lote (*batch update*).
