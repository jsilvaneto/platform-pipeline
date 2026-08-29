# ADR 009: Reforma Executiva do Dashboard Analítico e Posição Patrimonial

## Status
Aceito

## Contexto
O painel geral inicial do Wallet apresentava apenas indicadores básicos de receitas e despesas com listagem simples de categorias. Havia necessidade de transformar o Dashboard em uma central analítica e de comando financeiro, com visibilidade imediata da posição patrimonial líquida, saldos individuais por conta e carteira, evolução histórica de 6 meses com taxa de poupança, diagnóstico estratégico 50-30-20 de essencialidade do gasto, monitoramento de tetos orçamentários (`Budgets`), timeline de compromissos da semana com baixa em 1 clique e distribuição por meio de pagamento.

## Decisão
1. **Modelos e Endpoint Consolidado (`/api/v1/dashboard/summary`)**:
   - `accounts_balances`: Saldos reais em centavos calculados por instituição financeira / carteira (`(Receitas + Transf. Recebidas) - (Despesas + Transf. Enviadas)`).
   - `net_worth_cents`: Posição patrimonial instantânea (`Total em Contas - Faturas Abertas de Cartão - Saldo Devedor em Dívidas`).
   - `historical_trend`: Série temporal dos últimos 6 meses com comparativo mensal de receitas, despesas, resultado líquido e taxa de poupança/margem operacional.
   - `nature_breakdown`: Diagnóstico da regra 50-30-20 baseado nas naturezas de categoria (`OBRIGATORIO ~50%`, `NECESSARIO ~30%`, `DESEJO ~20%`).
   - `budgets_summary`: Acompanhamento dinâmico de tetos de gastos mensais por categoria com status visual (*Normal*, *Atenção*, *Estourado*).
   - `upcoming_7_days`: Timeline de compromissos pendentes previstos para os próximos 7 dias.
   - `payment_methods_distribution`: Volume financeiro movimentado por instrumento (Pix, Boleto, Cartão de Crédito, Débito, Dinheiro).
2. **Interface do Usuário ([Dashboard.tsx](file:///home/jsilvaneto/projetos/wallet/frontend/src/pages/Dashboard.tsx))**:
   - **Header Executivo**: Navegador de meses com atalho rápido "Mês Atual" e botão de novo lançamento.
   - **Posição Patrimonial**: Card em degradê de Patrimônio Líquido + Cards de Contas, Faturas Abertas e Dívidas, com mini-carrossel de saldos individuais por conta.
   - **Fluxo de Caixa**: Cards de Realizado, Pendente e Projeção com taxa de poupança destacada.
   - **Gráfico Histórico Interativo**: Gráfico de colunas com barras duplas (Receita vs. Despesa) e linha de resultado líquido.
   - **Diagnóstico 50-30-20**: Termômetro de essencialidade com metas recomendadas e barras de progresso temáticas.
   - **Widgets Analíticos**: Maiores despesas, monitoramento de orçamentos, próximos 7 dias com quitação em 1 clique e formas de pagamento.

## Consequências
- **Positivas**:
  - Tomada de decisão financeira estratégica instantânea logo na tela de abertura.
  - Visão real da liquidez e do patrimônio consolidado sem misturar contas de PF e PJ.
  - Alinhamento total com a regra de isolamento estrito de perfis (`PESSOAL` e `EMPRESA`) e semântica de centavos inteiros.
- **Negativas**:
  - Nenhuma identificada.
