# Changelog

Todas as alterações notáveis deste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Semantic Versioning](https://semver.org/lang/pt-BR/).

---

## [1.1.0] - 2026-09-10

### 🚀 Melhorias
- **Entidade de Itens Padronizados**: Implementação completa da entidade `Item` associada à categoria e com natureza/essencialidade explícita (`OBRIGATORIO`, `NECESSARIO`, `DESEJO`, `NENHUM`).
- **Padronização de Lançamentos & Centros de Custo**: Despesas vinculadas a itens para sanar disparidades de descrições manuais e possibilitar relatórios analíticos homogêneos.
- **Herança Automática Inteligente**: Ao selecionar um item padronizado no cadastro de despesa, a categoria e a essencialidade são preenchidas automaticamente.
- **Cadastro Rápido de Itens**: Criação de itens instantânea ("Novo Item") direto do formulário de despesa ou pela aba dedicada em Configurações.
- **Top Itens no Dashboard**: Ranking analítico e distribuição Pareto dos maiores centros de custo no ano com métricas percentuais e identificadores visuais.
- **Integridade Referencial Estrita**: Bloqueio de exclusão (`RESTRICT` / HTTP 409) de itens vinculados a lançamentos passados, incentivando a desativação lógica (`is_active = False`).
- **Sementeira Automática**: Geração automática de itens essenciais padrão por categoria para novos e existentes usuários.

---

## [1.0.1] - 2026-09-08

### 🚀 Melhorias
- **Sistema de Versionamento & Changelog**: Introdução de visualização interativa de notas de lançamento e histórico de versões diretamente pela interface web (Header, Rodapé e Configurações).
- **Indicador Visual de Versão Ativa**: Exibição da versão corrente do sistema com destaque visual e marcador de novidades não lidas (*pulse dot*).
- **Gestão Aprimorada em Configurações**: Adicionada edição em linha e visualização em tabela para Categorias e Formas de Pagamento.
- **Autenticação Resiliente**: Suporte a login sem distinção de maiúsculas/minúsculas (*case-insensitive*) no nome de usuário.
- **Métricas de Disco e Banco**: Inclusão do tamanho em disco do banco de dados e volumetria nos diagnósticos do sistema.

### 🛠️ Correções
- **Consistência de Senha**: Adicionado campo de confirmação obrigatória de senha na alteração de credenciais do usuário.
- **Distribuição de Centavos Residuais**: Ajuste no cálculo de parcelas ímpares garantindo precisão absoluta sem sobras decimais.
- **Tratamento de Sessão Expirada**: Redirecionamento amigável e limpeza de tokens inválidos no interceptor HTTP.

---

## [1.0.0] - 2026-09-01

### 🚀 Melhorias
- **Lançamento Oficial do Wallet**: Sistema robusto e de alta performance voltado exclusivamente para Gestão de Finanças Pessoais.
- **Integridade Monetária em Centavos**: Armazenamento e operações de valores monetários 100% em inteiros (`amount_cents`), eliminando erros de ponto flutuante.
- **Gestão de Despesas & Parcelamentos**: Suporte a compras à vista e parceladas com projeção automática de parcelas mensais (`Payment`).
- **Dashboard Financeiro Anual & Mensal**: Painel consolidado com fluxo financeiro por mês, métricas de saúde financeira e controle de gastos.
- **Categorias & Formas de Pagamento**: Cadastro customizável de categorias com cores, ícones e formas de pagamento (Pix, Cartão de Crédito, Débito, Dinheiro, Boleto).
- **Classificação por Essencialidade**: Categorização de despesas por necessidade (`OBRIGATORIO`, `NECESSARIO`, `DESEJO`, `NENHUM`).
- **Suporte Nativo a Temas**: Interface moderna desenvolvida com Tailwind CSS com alternância fluida entre Modo Claro e Modo Escuro.
- **Segurança & JWT**: Autenticação com tokens Bearer JWT (HS256) e hash seguro com bcrypt (12 rounds).
