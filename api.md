Wallet by BudgetBakers — Base de Conhecimento da REST API
Documento de referência técnica para apoiar a construção/evolução do wallet-pipeline. Fontes: site oficial BudgetBakers, portal de referência da API, Help Center, e o spec OpenAPI completo (v1) exportado direto do Swagger UI.

1. Visão geral
A API cobre dois produtos com a mesma convenção: Wallet e Board. Este documento foca em Wallet.
Status: BETA. Sujeita a mudanças frequentes, inclusive breaking changes, até virar estável.
Disponível somente para contas Wallet Premium.
Existe também um MCP (Model Context Protocol) oficial, cobrindo os mesmos dados.
13 endpoints, cobrindo 8 recursos principais: Accounts, Records, Budgets, Categories, Labels, Goals, Standing Orders, Record Rules — mais um endpoint de estatísticas de uso da própria API.
2. Autenticação
Token de API pessoal, gerado em Settings → REST API no Wallet web app.
Authorization: Bearer <seu_token>
REST e MCP compartilham o mesmo limite de requisições.
3. Base URL
https://rest.budgetbakers.com/wallet
4. Paginação, filtros e parâmetros comuns
Presentes em praticamente todo endpoint GET:

Parâmetro	Descrição
limit	itens por página (1–200, padrão 30)
offset	itens a pular (padrão 0)
id	filtro por ID(s), até 30 separados por vírgula
createdAt / updatedAt	filtro por range de data (prefixos eq./gt./gte./lt./lte.)
agentHints	true inclui hints estruturados pra agentes de IA
withTotal	inclui contagem total de itens (custo extra)
sortBy	ex: -createdAt (desc) ou +createdAt (asc) — campos permitidos variam por endpoint
Filtros de texto: eq. (exato), contains. (contém, case-sensitive), contains-i. (case-insensitive). Até 2 combinados = AND. Filtros de range: eq. gt. gte. lt. lte.. Datas sem horário = dia inteiro em UTC.

5. Rate Limiting (Token Bucket) + Fair Use
Capacidade sustentada: 300 requisições/hora por cliente
Burst: absorvido por balde separado; escrita consome mais burst que leitura
REST e MCP dividem o mesmo orçamento
Excedeu → 429 + header Retry-After
Abuso sustentado (principalmente repetir requisição após 429) pode causar revogação do token
➡️ Pro pipeline: scheduler precisa respeitar backoff em 429.

6. Sincronização de dados
Sync inicial: ao gerar a primeira API key. Enquanto não termina, tudo retorna 409 com init_sync_in_progress.
Sync contínuo: sempre responde, mas mudanças recentes no app podem demorar. Headers:
Header	Descrição
X-Last-Data-Change-At	timestamp da última mudança
X-Last-Data-Change-Rev	contador de revisão — ótimo watermark pra sync incremental
X-Sync-In-Progress	true = pode haver mais mudanças chegando
7. Operações de escrita — envelope e limites de batch
Toda escrita (criar/patch/deletar) responde:

{
  "summary": { "total": 2, "succeeded": 1, "clientErrors": 1, "serverErrors": 0, "documentsWritten": 1 },
  "results": [
    { "inputIndex": 0, "id": "...", "success": true },
    { "inputIndex": 1, "id": "...", "success": false, "error": "...", "errorType": "client_error", "fields": ["name"] }
  ]
}
Batches não são atômicos. errorType: client_error (não adianta repetir igual) ou server_error (retryable).
documentsWritten ≠ succeeded (deduplicado; patch repetido sem mudança = sucesso sem escrita).
Status: 200 tudo certo, 207 parcial, 400/500 tudo falhou. ?validation=strict aborta tudo no 1º erro.
IDs duplicados no mesmo batch de patch = todas as ocorrências falham. Delete de id repetido/já deletado = idempotente.
Limites de batch confirmados (spec real):

Endpoint	Operação	Máx. itens por request
/accounts	PATCH	10
/accounts	POST	1 (objeto único, não array)
/budgets	PATCH	10
/categories	PATCH	10
/labels	PATCH	10
/records	POST	50
/records	PATCH	10
/{type}	DELETE	10 ids
8. Agent Hints
Array agentHints (REST: agentHints=true; MCP: sempre ativo). Tipos: pagination.has_more, result.partial_match, result.empty, transfer.mirror_failed, category.defaulted_unknown, budget.spent_netted, entre outros.

9. Endpoints — mapa completo
Path	Métodos	Observação
/v1/api/accounts	GET, POST, PATCH	criação restrita (ver §10)
/v1/api/budgets	GET, POST, PATCH	
/v1/api/categories	GET, PATCH	
/v1/api/categories/custom	POST	cria subcategoria vinculada a uma categoria-base
/v1/api/goals	GET apenas	metas de economia são somente leitura via API
/v1/api/labels	GET, POST, PATCH	
/v1/api/record-rules	GET apenas	regras de categorização automática, só leitura
/v1/api/records	GET, POST, PATCH	
/v1/api/standing-orders	GET apenas	pagamentos planejados, só leitura
/v1/api/standing-orders/items	GET apenas	ocorrências individuais de cada standing order
/v1/api/{type}	DELETE	genérico — type ∈ records, budgets, standing-orders, record-rules, categories, accounts, labels
/v1/api/{type}/references	GET	verifica se entidades (categories/records/accounts/labels) têm vínculos, até 20 ids
/v1/api/api-usage/stats	GET	estatísticas de uso do seu próprio token
⚠️ Nenhum endpoint de Debt existe na API. O menu "Dívidas" do app (empréstimos pessoais informais) não é exposto via REST/MCP — não tem como extrair essa informação automaticamente. Isso só reforça o que já conversamos: para o que o pipeline vai analisar, o caminho é modelar dívida formal como conta (Loan/Mortgage), que essa sim aparece no endpoint de Accounts.

10. Contas (Account) — detalhe importante sobre tipos
accountType (enum completo): General, Cash, CurrentAccount, CreditCard,
  SavingAccount, Bonus, Insurance, Investment, Loan, Mortgage, Overdraft
Mas nem todos são criáveis via API:

✅ Criáveis via POST: General, Cash, CurrentAccount, SavingAccount, Insurance
🔒 Somente leitura via API (só existem se criadas pelo app/bank-sync): CreditCard, Investment, Loan, Mortgage, Overdraft, Bonus
➡️ Isso muda um detalhe do nosso plano: a conta tipo "Mortgage" que vamos usar pra simular/aprender sobre a dívida formal precisa ser criada pelo app (mobile/web), não dá pra automatizar a criação dela via API. Depois de criada manualmente, aí sim o pipeline consegue ler o saldo e os registros dela normalmente pelo endpoint de Accounts/Records.

Campos de CreateAccountRequest (obrigatórios: name, accountType, currencyCode, initialBalance): bankAccountNumber, color (paleta fixa de nomes), excludeFromStats.

Campo de saldo (AccountBalance) é calculado, não bruto — inclui balanceMode (varia conforme tipo de conta/cartão de crédito/overdraft), currentBalance, creditBalance, creditLimit, availableCredit. Útil pro pipeline: não precisa recalcular saldo manualmente, a API já entrega a versão corrigida.

11. Registros (Record) — o coração do pipeline
Campos principais de leitura: id, accountId, accountName, amount (objeto {value, currencyCode}), convertedAmount, category (embutida), labels[], counterParty, note, place (geo), photos[], recordDate, recordType (income/expense, derivado do sinal do valor), recordState, source, transfer, createdAt, updatedAt.

recordState (importantíssimo pra nossa tag de verificação): reconciled (verificado contra extrato), cleared (processado pelo banco), uncleared (pendente), void (cancelado), waitForAssign (aguardando categorização).

💡 Achado direto pro nosso plano: o próprio Wallet já tem um estado nativo reconciled, que é exatamente o conceito da nossa tag "Verificado"! Vale avaliar se dá pra usar esse campo nativo do app em vez de (ou além d)a tag manual — ele já é filtrável na API (recordState=reconciled).

source: identifica quem criou o registro — android, ios, web, rest, mcp, backend (bank-sync/sistema), missing.

Criação (CreateRecordRequest, obrigatórios accountId, amount, recordDate): aceita categoryId, counterParty, labelIds[], note, place, recordState, e transfer (para lançar transferências entre contas, com pairingMode: new/existing/unpaired).

Patch (PatchRecordItem): todo campo omitido = sem alteração. labelIds aceita array (substitui tudo) ou objeto {add, remove} (parcial) — bom pra automatizar adição de labels sem sobrescrever as existentes. Existe também $clear pra resetar campos específicos (ex: ["note", "place"]").

Filtros úteis em /records: accountId, categoryId (com valor especial unknown), labelId, recordType, recordState (múltiplos, separados por vírgula), source, isTransfer, transferId, amount (range), convertTo (converte pra outra moeda na resposta).

12. Orçamentos (Budget)
Tipos: BUDGET_INTERVAL_WEEK/MONTH/YEAR, BUDGET_CUSTOM (exige startDate/endDate), BUDGET_ALL (legado, só leitura). Suporta limitOverrides (até 50) — mudanças de limite programadas por período, com histórico separado em pastLimitOverrides. spending (parâmetro de GET) controla profundidade dos dados de gasto retornados: none (padrão), current, current+2/5/10/25 (períodos futuros/passados adicionais).

13. Labels, Categorias e Standing Orders
Label: name, color, archived. Filtrável por recordId, budgetId, standingOrderId, recordRuleId — dá pra ver todo uso de uma tag específica.
Category: tem cardinality (none/must/need/want) — classificação nativa de necessidade vs desejo, e group (categoria-raiz, ex: "Food & Drinks"). Subcategorias custom se criam via /categories/custom, vinculadas a uma categoria-base (parentId).
Standing Order (pagamentos planejados): recurrenceRule em formato RRULE, dueDate, reminder (none/1_day/3_days/7_days/due_today), paymentCount. Cada ocorrência gerada vira um Standing Order Item (/standing-orders/items) com originalDate, alignedDate, paidDate, dismissed, recordIds[] — é aqui que dá pra rastrear se uma parcela específica já foi paga e qual registro ela gerou.
14. Metas (Goal) — só leitura
Campos: name, note, targetAmount, initialAmount, desiredDate, state (active/paused/reached), stateUpdatedAt. Sem endpoint de criação/edição — a meta de reserva financeira que você quer montar mais pra frente terá que ser criada no app; o pipeline só consegue ler o progresso.

15. Considerações específicas para o wallet-pipeline
Watermark de sync: usar X-Last-Data-Change-Rev em vez de só updatedAt/recordDate pro extractor incremental
Idempotência de escrita nativa (via documentsWritten) cobre o lado de escrita; a idempotência de carga no schema raw continua responsabilidade do pipeline
Tabela de junção de labels: confirmada como modelagem correta — Record, Budget, StandingOrder e RecordRule todos referenciam labelIds/labels[] como relação N:N
Dívidas pessoais (menu Debts) não são extraíveis via API — ficam fora do escopo do pipeline por enquanto, a menos que você as remodele como conta
Conta Mortgage/Loan não pode ser criada via API — criação continua manual no app; leitura via API funciona normalmente depois
recordState=reconciled é candidato a substituir/complementar nossa tag manual "Verificado" — vale decidir qual dos dois usar como fonte de verdade
Batch de criação de records é o maior (50 itens) — bom limite pra importações históricas em lote; patch e as demais escritas ficam em 10
16. Referências de terceiros
Cliente .NET (open-source, espelha o OpenAPI oficial): BudgetBakers.Wallet.Net
Integração Home Assistant (não oficial): ha-wallet — leitura e escrita reais (records, transfers, budgets, categorias, contas, labels)
17. Links de referência
Produto: https://budgetbakers.com/en/products/wallet/
REST API (visão geral): https://budgetbakers.com/en/products/wallet/integrations/rest-api/
Referência: https://rest.budgetbakers.com/wallet/reference
Swagger UI: https://rest.budgetbakers.com/wallet/openapi/ui
Help Center — Dívidas: https://support.budgetbakers.com/hc/en-us/articles/7149520322706
Help Center — Mortgage/financiamento: https://support.budgetbakers.com/hc/en-us/articles/16543490978194