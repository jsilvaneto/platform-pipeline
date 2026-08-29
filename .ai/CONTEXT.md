# Wallet - Visão Geral do Produto e Contexto de Negócio (.ai/CONTEXT.md)

## 1. Filosofia e Visão do Produto
O **Wallet** é uma plataforma de gestão financeira pessoal e empresarial, projetada para proporcionar controle financeiro total, privacidade irrestrita, agilidade operacional e resiliência com baixa dependência de infraestrutura em nuvem de terceiros.

O sistema opera no modelo **Local-First / Offline-First**: roda com banco de dados embutido SQLite WAL no servidor (WSL2 / Linux / Docker) e possui sincronização direta e transparente com o aplicativo móvel nativo Android (Room Database), sem intermediários.

---

## 2. Perfis de Operação (PESSOAL e EMPRESA)
O sistema opera com isolamento rigoroso entre duas entidades financeiras:
- **`PESSOAL`**: Gestão das despesas da pessoa física e familiares (moradia, alimentação, saúde, lazer, investimentos, salários).
- **`EMPRESA`**: Gestão do fluxo de caixa PJ (receitas de clientes, despesas operacionais, fornecedores, folha/pró-labore, impostos fiscais como DAS/GPS).

### Regras Invariáveis dos Perfis:
1. Toda entidade transacional (contas, categorias, itens, contatos, dívidas, orçamentos, lançamentos e agendamentos) possui o campo `profile` obrigatório.
2. Não há mistura de dados em telas, relatórios de dashboard ou agregações financeiras entre os perfis.
3. A alternância de perfil na interface web e mobile é instantânea e altera todo o contexto operacional do usuário.

---

## 3. Modelo de Categorias, Subcategorias e Natureza
A categorização financeira do Wallet possui estrutura hierárquica em dois níveis:

### 3.1 Categorias Planas e Diretas
- Todas as categorias são entidades diretas de primeiro nível associadas ao perfil (`PESSOAL` ou `EMPRESA`) e ao tipo de fluxo (`RECEITA` ou `DESPESA`).

### 3.2 Natureza da Categoria (Essencialidade do Gasto)
Cada categoria possui uma classificação de essencialidade representada pelo enum `CategoryNature`:
- **`NENHUM`**: Neutro / sem classificação (aplicável a receitas ou categorias sem métrica de corte).
- **`OBRIGATORIO`**: Despesas fixas inegociáveis e compromissos legais (aluguel, condomínio, impostos, empréstimos, salários).
- **`NECESSARIO`**: Gastos essenciais do dia a dia com flexibilidade de consumo (alimentação básica, farmácia, transporte, combustível).
- **`DESEJO`**: Gastos discricionários e supérfluos (lazer, restaurantes, compras, viagens, streaming).

---

## 4. Itens Vinculados a Categorias
Os **Itens** representam produtos/serviços específicos e servem como aceleradores de lançamentos:
- Todo item pertence a um perfil e a uma categoria (`category_id`).
- Pode possuir um **valor padrão sugerido** (`default_amount_cents`).
- Ao selecionar um item na criação de um lançamento:
  1. A categoria correspondente é vinculada automaticamente.
  2. A descrição é pré-preenchida com o nome do item.
  3. O valor em R$ é sugerido caso haja valor padrão cadastrado.

---

## 5. Contas Bancárias vs. Formas de Pagamento
O Wallet separa explicitamente a instituição financeira/custódia do instrumento/meio utilizado para liquidar o lançamento:
- **`Contas / Carteiras` (`Account`)**: Representa onde o recurso está custodiado (ex: *Itaú*, *Nubank*, *Caixa Econômica*, *Carteira Física*, *XP Investimentos*).
- **`Formas de Pagamento` (`PaymentMethod`)**: Representa o instrumento/meio pelo qual o dinheiro trafega (ex: *Pix*, *Boleto*, *Cartão de Crédito*, *Cartão de Débito*, *Dinheiro Físico*, *Transferência Bancária*, *Débito Automático*).
- Ambas são opcionais e independentes nos lançamentos e agendamentos, permitindo análises combinadas e filtros precisos por meio de pagamento.

---

## 6. Gestão de Dívidas e Orçamentos
- **Dívidas (`Debt`)**: Controle de passivos com valor total, saldo devedor restante e barra de amortização progressiva.
- **Orçamentos (`Budget`)**: Definição de teto de gastos mensais por categoria de despesa, com cálculo do realizado no mês e alertas visuais de consumo (Normal, Atenção e Estourado).

---

## 7. Sincronização Direta Mobile & Arquitetura Offline-First (REST API + Room)
O ecossistema móvel do Wallet adota a arquitetura **Offline-First**:
- **Persistência Local (Room SQLite)**: O app Android opera 100% offline, permitindo lançamentos instantâneos na rua com latência zero ($< 10\text{ms}$).
- **Sincronização Direta com a API REST**: Quando há conexão ativa (Wi-Fi, 4G/5G, VPN ou Tailscale), o `SyncWorker` em segundo plano sincroniza diretamente com a API FastAPI:
  - **Push (`POST /api/v1/sync/mobile/push`)**: Envio em lote das transações criadas/alteradas offline.
  - **Pull (`GET /api/v1/sync/mobile/pull`)**: Download dos dados mestres e transações atualizadas.
  - **Comprovantes (`POST /api/v1/attachments/upload`)**: Upload direto das fotos de notas fiscais tiradas com a câmera do aparelho para o disco local do servidor.
- **Privacidade Total**: Eliminação de intermediários em nuvem (como Google Planilhas), mantendo os dados exclusivamente sob custódia do usuário.
