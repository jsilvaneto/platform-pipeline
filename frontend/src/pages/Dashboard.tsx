import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  Wallet,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Clock,
  Sparkles,
  PieChart,
  ShieldCheck,
  ShieldAlert,
  BarChart3,
  Loader2,
  ChevronRight,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
} from "lucide-react";
import { walletApi } from "../api/walletApi";
import {
  FinancialOverviewResponse,
  HistoricalAnalyticsResponse,
  FutureAnalyticsResponse,
  CashFlowMonthly,
  DailyBalanceProjection,
} from "../types";
import { formatCurrency } from "../utils/format";

interface DashboardProps {
  onNavigateToRegistros: () => void;
  onOpenNewExpenseModal: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  onNavigateToRegistros,
}) => {
  const [activeTab, setActiveTab] = useState<"past" | "future">("past");
  const [overview, setOverview] = useState<FinancialOverviewResponse | null>(null);
  const [historical, setHistorical] = useState<HistoricalAnalyticsResponse | null>(null);
  const [future, setFuture] = useState<FutureAnalyticsResponse | null>(null);
  const [historyMonths, setHistoryMonths] = useState<number>(12);
  const [futureHorizonDays, setFutureHorizonDays] = useState<number>(90);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hoveredCashflow, setHoveredCashflow] = useState<CashFlowMonthly | null>(null);
  const [hoveredDay, setHoveredDay] = useState<DailyBalanceProjection | null>(null);

  const loadAllAnalytics = useCallback(async () => {
    setIsLoading(true);
    try {
      const [ov, hist, fut] = await Promise.all([
        walletApi.getFinancialOverview(),
        walletApi.getHistoricalAnalytics(historyMonths),
        walletApi.getFutureAnalytics(futureHorizonDays),
      ]);
      setOverview(ov);
      setHistorical(hist);
      setFuture(fut);
    } catch (err) {
      console.error("Erro ao carregar dados analíticos:", err);
    } finally {
      setIsLoading(false);
    }
  }, [historyMonths, futureHorizonDays]);

  useEffect(() => {
    loadAllAnalytics();
  }, [loadAllAnalytics]);

  const hasData = useMemo(() => {
    if (!overview) return false;
    return overview.total_accounts_count > 0 || overview.last_sync_at !== null;
  }, [overview]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-28 space-y-4">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
        <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
          Calculando inteligência financeira passada e futura...
        </span>
      </div>
    );
  }

  // Estado Vazio: Nenhum dado sincronizado ainda
  if (!hasData) {
    return (
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-10 text-center max-w-2xl mx-auto my-12 shadow-sm">
        <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto mb-5 shadow-inner">
          <Sparkles className="w-8 h-8" />
        </div>
        <h3 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
          Conecte sua API do Wallet
        </h3>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2.5 max-w-md mx-auto leading-relaxed">
          Para visualizar análises financeiras retrospectivas, fluxo de caixa e projeções preditivas,
          insira sua chave de API pessoal na aba de configurações.
        </p>
        <div className="mt-8">
          <button
            onClick={() => {
              // Redireciona para o menu de configurações
              window.location.hash = "#configuracoes";
            }}
            className="inline-flex items-center space-x-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-6 py-3 rounded-xl text-sm shadow-md shadow-blue-500/25 transition-all cursor-pointer"
          >
            <span>Configurar Integração da API</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  const netWorthCents = overview?.current_net_worth_cents ?? 0;
  const monthIncomeCents = overview?.current_month_income_cents ?? 0;
  const monthExpenseCents = overview?.current_month_expense_cents ?? 0;
  const monthBalanceCents = overview?.current_month_balance_cents ?? 0;
  const savingsRate = overview?.savings_rate_percent ?? 0;
  const projected30d = overview?.projected_30d_balance_cents ?? 0;
  const hasLiquidityRisk = overview?.liquidity_risk_detected ?? false;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Alerta de Iliquidez Preventiva (se detectado) */}
      {hasLiquidityRisk && future?.liquidity_alerts && future.liquidity_alerts.length > 0 && (
        <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-2xl p-4 sm:p-5 flex items-start space-x-3.5 text-rose-900 dark:text-rose-200">
          <ShieldAlert className="w-6 h-6 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-bold text-sm">
              Alerta Preventivo de Iliquidez Detectado!
            </h4>
            <p className="text-xs text-rose-700 dark:text-rose-300 mt-1 leading-relaxed">
              {future.liquidity_alerts[0].description}
            </p>
          </div>
          <button
            onClick={() => setActiveTab("future")}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white shrink-0 transition-colors"
          >
            Ver Simulação
          </button>
        </div>
      )}

      {/* Cabeçalho do Dashboard */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Painel de Inteligência Financeira
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
            Dados sincronizados da REST API oficial do BudgetBakers Wallet
          </p>
        </div>

        {/* Alternador de Modo: Passado vs Futuro */}
        <div className="flex items-center p-1 bg-zinc-100 dark:bg-zinc-800 rounded-2xl border border-zinc-200/80 dark:border-zinc-700/80 self-start sm:self-auto">
          <button
            onClick={() => setActiveTab("past")}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "past"
                ? "bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 shadow-sm"
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Diagnóstico Passado</span>
          </button>

          <button
            onClick={() => setActiveTab("future")}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "future"
                ? "bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 shadow-sm"
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Projeção Preditiva</span>
          </button>
        </div>
      </div>

      {/* Cards de Métricas Macro (KPIs Centrais) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Patrimônio Líquido */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 mb-2">
            <span>Patrimônio Líquido</span>
            <Wallet className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
            {formatCurrency(netWorthCents)}
          </div>
          <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-2 flex items-center gap-1.5">
            <span className="text-emerald-600 dark:text-emerald-400 font-medium">
              +{formatCurrency(historical?.net_worth.total_assets_cents ?? 0)}
            </span>
            <span>|</span>
            <span className="text-rose-600 dark:text-rose-400 font-medium">
              -{formatCurrency(historical?.net_worth.total_liabilities_cents ?? 0)}
            </span>
          </div>
        </div>

        {/* Card 2: Receitas do Mês */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 mb-2">
            <span>Receitas do Mês</span>
            <div className="w-6 h-6 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <ArrowUpRight className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 tracking-tight">
            {formatCurrency(monthIncomeCents)}
          </div>
          <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-2">
            Entradas realizadas no período
          </div>
        </div>

        {/* Card 3: Despesas do Mês */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 mb-2">
            <span>Despesas do Mês</span>
            <div className="w-6 h-6 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <ArrowDownRight className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-rose-600 dark:text-rose-400 tracking-tight">
            {formatCurrency(monthExpenseCents)}
          </div>
          <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-2 flex items-center justify-between">
            <span>Saldo: {formatCurrency(monthBalanceCents)}</span>
            <span className="font-semibold text-blue-600 dark:text-blue-400">
              Taxa: {savingsRate}%
            </span>
          </div>
        </div>

        {/* Card 4: Previsão de Liquidez (30 Dias) */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 mb-2">
            <span>Saldo Projetado (30d)</span>
            <Zap className={`w-4 h-4 ${hasLiquidityRisk ? "text-rose-500" : "text-amber-500"}`} />
          </div>
          <div
            className={`text-2xl font-bold tracking-tight ${
              projected30d < 0
                ? "text-rose-600 dark:text-rose-400"
                : "text-zinc-900 dark:text-zinc-100"
            }`}
          >
            {formatCurrency(projected30d)}
          </div>
          <div className="text-[11px] mt-2 flex items-center gap-1.5">
            {hasLiquidityRisk ? (
              <span className="text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Risco de Iliquidez
              </span>
            ) : (
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Liquidez Estável
              </span>
            )}
          </div>
        </div>
      </div>

      {/* CONTEÚDO: ABA 1 - DIAGNÓSTICO RETROSPECTIVO (PASSADO) */}
      {activeTab === "past" && (
        <div className="space-y-6">
          {/* Seletor de Janela Histórica */}
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-blue-600" />
              <span>Evolução do Fluxo de Caixa Realizado</span>
            </h3>
            <div className="flex items-center space-x-1.5 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl text-xs">
              {[6, 12, 24].map((m) => (
                <button
                  key={m}
                  onClick={() => setHistoryMonths(m)}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                    historyMonths === m
                      ? "bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 shadow-xs"
                      : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400"
                  }`}
                >
                  {m} meses
                </button>
              ))}
            </div>
          </div>

          {/* Gráfico de Barras: Fluxo de Caixa Mensal */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-xs">
            <div className="flex items-center justify-between mb-6">
              <div>
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                  Entradas vs Saídas Mês a Mês
                </span>
                <div className="flex items-center space-x-4 mt-1 text-xs">
                  <div className="flex items-center space-x-1.5">
                    <span className="w-3 h-3 rounded-sm bg-emerald-500" />
                    <span>Receitas</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <span className="w-3 h-3 rounded-sm bg-rose-500" />
                    <span>Despesas</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <span className="w-3 h-3 rounded-sm bg-blue-500" />
                    <span>Poupança Líquida</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Renderizador de Barras */}
            <div className="h-64 flex items-end justify-between gap-2 pt-6">
              {historical?.monthly_cash_flow.map((cf) => {
                const maxVal = Math.max(
                  ...historical.monthly_cash_flow.map((x) => Math.max(x.income_cents, x.expense_cents)),
                  1
                );
                const incHeight = Math.max(4, Math.round((cf.income_cents / maxVal) * 100));
                const expHeight = Math.max(4, Math.round((cf.expense_cents / maxVal) * 100));

                return (
                  <div
                    key={cf.period}
                    onMouseEnter={() => setHoveredCashflow(cf)}
                    onMouseLeave={() => setHoveredCashflow(null)}
                    className="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer"
                  >
                    <div className="w-full flex items-end justify-center gap-1 h-48">
                      <div
                        className="w-full max-w-[14px] bg-emerald-500 hover:bg-emerald-400 rounded-t transition-all duration-300"
                        style={{ height: `${incHeight}%` }}
                      />
                      <div
                        className="w-full max-w-[14px] bg-rose-500 hover:bg-rose-400 rounded-t transition-all duration-300"
                        style={{ height: `${expHeight}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 mt-2 truncate max-w-[36px]">
                      {cf.month_name}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Tooltip do Mês Selecionado */}
            {hoveredCashflow && (
              <div className="mt-4 p-3 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl border border-zinc-200 dark:border-zinc-700 flex flex-wrap items-center justify-between text-xs animate-in fade-in">
                <span className="font-bold">{hoveredCashflow.month_name}</span>
                <span className="text-emerald-600 font-semibold">
                  Receita: {formatCurrency(hoveredCashflow.income_cents)}
                </span>
                <span className="text-rose-600 font-semibold">
                  Despesa: {formatCurrency(hoveredCashflow.expense_cents)}
                </span>
                <span className="text-blue-600 font-bold">
                  Líquido: {formatCurrency(hoveredCashflow.net_savings_cents)} ({hoveredCashflow.savings_rate_percent}%)
                </span>
              </div>
            )}
          </div>

          {/* Grid de Análises: Essencialidade & Categorias */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Card: Essencialidade Real (Cardinalidade) */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <PieChart className="w-4 h-4 text-amber-500" />
                  <span>Raio-X de Gastos por Essencialidade</span>
                </h4>
                <span className="text-xs text-zinc-500">Cardinalidade Nativa</span>
              </div>

              <div className="space-y-3.5 pt-2">
                {historical?.by_essentiality.map((ess) => (
                  <div key={ess.cardinality} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: ess.color }}
                        />
                        <span>{ess.label}</span>
                      </span>
                      <span className="font-mono font-semibold text-zinc-900 dark:text-zinc-100">
                        {formatCurrency(ess.total_cents)} ({ess.percentage}%)
                      </span>
                    </div>
                    <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${ess.percentage}%`,
                          backgroundColor: ess.color,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Card: Top Categorias */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-blue-500" />
                  <span>Maiores Centros de Custo (Categorias)</span>
                </h4>
                <button
                  onClick={onNavigateToRegistros}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                >
                  Ver todos
                </button>
              </div>

              <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {historical?.top_categories.slice(0, 5).map((cat) => (
                  <div key={cat.category_id} className="py-2.5 flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-3">
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0"
                        style={{ backgroundColor: cat.color || "#6366f1" }}
                      >
                        {cat.name.slice(0, 1)}
                      </div>
                      <div>
                        <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                          {cat.name}
                        </div>
                        <div className="text-[10px] text-zinc-500 dark:text-zinc-400">
                          {cat.records_count} lançamentos &bull; {cat.group_name || "Geral"}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono font-bold text-zinc-900 dark:text-zinc-100">
                        {formatCurrency(cat.total_cents)}
                      </div>
                      <div className="text-[10px] text-zinc-500">
                        {cat.percentage}% do total
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Card: Conciliação Bancária */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center space-x-3.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h5 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  Taxa de Conciliação Bancária
                </h5>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {historical?.reconciliation.reconciled_count} de{" "}
                  {historical?.reconciliation.total_records} transações foram conferidas e validadas contra extratos
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                {historical?.reconciliation.reconciled_percent}%
              </div>
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider">
                Conferência Concluída
              </span>
            </div>
          </div>
        </div>
      )}

      {/* CONTEÚDO: ABA 2 - PROJEÇÃO PREDITIVA (FUTURO) */}
      {activeTab === "future" && (
        <div className="space-y-6">
          {/* Seletor de Horizonte de Projeção */}
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>Simulação de Saldo Futuro Dia a Dia (Previsão de Liquidez)</span>
            </h3>
            <div className="flex items-center space-x-1.5 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl text-xs">
              {[30, 60, 90, 180, 365].map((d) => (
                <button
                  key={d}
                  onClick={() => setFutureHorizonDays(d)}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                    futureHorizonDays === d
                      ? "bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 shadow-xs"
                      : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400"
                  }`}
                >
                  {d} dias
                </button>
              ))}
            </div>
          </div>

          {/* Gráfico de Linha / Curva de Saldo Previsto */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4 text-xs">
              <div>
                <span className="text-zinc-500">Saldo Líquido Atual:</span>
                <span className="font-bold text-zinc-900 dark:text-zinc-100 ml-1.5 font-mono">
                  {formatCurrency(future?.current_liquid_balance_cents ?? 0)}
                </span>
              </div>
              <div>
                <span className="text-zinc-500">Menor Saldo Previsto no Período:</span>
                <span
                  className={`font-bold ml-1.5 font-mono ${
                    (future?.projected_lowest_balance_cents ?? 0) < 0
                      ? "text-rose-600 dark:text-rose-400"
                      : "text-emerald-600 dark:text-emerald-400"
                  }`}
                >
                  {formatCurrency(future?.projected_lowest_balance_cents ?? 0)}
                  {future?.projected_lowest_date && ` (em ${future.projected_lowest_date})`}
                </span>
              </div>
            </div>

            {/* Visualizador de Linha de Simulação */}
            <div className="h-56 flex items-end justify-between gap-1 pt-4 overflow-x-auto pb-2">
              {future?.daily_projections.map((dp, idx) => {
                const isNegative = dp.is_negative;
                const hasMovement = dp.day_inflow_cents > 0 || dp.day_outflow_cents > 0;

                return (
                  <div
                    key={dp.date}
                    onMouseEnter={() => setHoveredDay(dp)}
                    onMouseLeave={() => setHoveredDay(null)}
                    className="flex-1 min-w-[8px] flex flex-col items-center h-full justify-end group cursor-pointer"
                  >
                    {hasMovement && (
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mb-1 group-hover:scale-150 transition-transform" />
                    )}
                    <div
                      className={`w-full rounded-t transition-all ${
                        isNegative
                          ? "bg-rose-500/80 hover:bg-rose-500"
                          : "bg-blue-600/80 hover:bg-blue-500"
                      }`}
                      style={{
                        height: `${Math.min(100, Math.max(10, Math.round((Math.abs(dp.projected_balance_cents) / Math.max(1, Math.abs(future.current_liquid_balance_cents))) * 50)))}%`,
                      }}
                    />
                    {idx % 10 === 0 && (
                      <span className="text-[9px] font-mono text-zinc-400 mt-1">
                        {dp.date.slice(5)}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Tooltip do Dia */}
            {hoveredDay && (
              <div className="p-3 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl border border-zinc-200 dark:border-zinc-700 flex flex-wrap items-center justify-between text-xs animate-in fade-in">
                <span className="font-bold">
                  {hoveredDay.date} ({hoveredDay.weekday})
                </span>
                <span className="text-emerald-600 font-semibold">
                  Entradas: +{formatCurrency(hoveredDay.day_inflow_cents)}
                </span>
                <span className="text-rose-600 font-semibold">
                  Saídas: -{formatCurrency(hoveredDay.day_outflow_cents)}
                </span>
                <span
                  className={`font-bold font-mono ${
                    hoveredDay.is_negative ? "text-rose-600" : "text-blue-600"
                  }`}
                >
                  Saldo Previsto: {formatCurrency(hoveredDay.projected_balance_cents)}
                </span>
              </div>
            )}
          </div>

          {/* Grid de Inteligência Futura: Metas de Poupança & Próximos Pagamentos */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Metas de Economia (Goals Radar) */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <Target className="w-4 h-4 text-emerald-500" />
                  <span>Radar de Metas de Economia</span>
                </h4>
                <span className="text-xs text-zinc-500">Estimativas Preditivas</span>
              </div>

              <div className="space-y-4">
                {future?.goals_projections.map((g) => (
                  <div key={g.goal_id} className="p-3.5 rounded-xl border border-zinc-100 dark:border-zinc-800 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-zinc-900 dark:text-zinc-100">
                        {g.name}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          g.is_on_track
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                            : "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300"
                        }`}
                      >
                        {g.is_on_track ? "No Prazo" : "Requer Atenção"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-zinc-500">
                      <span>{formatCurrency(g.current_amount_cents)}</span>
                      <span>Alvo: {formatCurrency(g.target_amount_cents)}</span>
                    </div>

                    <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, g.progress_percent)}%` }}
                      />
                    </div>

                    <div className="text-[11px] text-zinc-500 dark:text-zinc-400 flex items-center justify-between pt-1">
                      <span>Prazo Alvo: {g.desired_date || "Sem data"}</span>
                      {g.estimated_completion_date && (
                        <span className="text-blue-600 dark:text-blue-400 font-medium">
                          Conclusão estimada: {g.estimated_completion_date}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Próximos Pagamentos Agendados (Standing Orders) */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-500" />
                  <span>Próximos Pagamentos Programados</span>
                </h4>
                <span className="text-xs text-zinc-500">Próximos 30 dias</span>
              </div>

              <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {future?.upcoming_scheduled.slice(0, 6).map((item) => (
                  <div key={item.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-3">
                      <div
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: item.category_color }}
                      />
                      <div>
                        <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                          {item.name}
                        </div>
                        <div className="text-[10px] text-zinc-500 dark:text-zinc-400">
                          Vencimento: {item.due_date} &bull; {item.account_name}
                        </div>
                      </div>
                    </div>
                    <div className="font-mono font-bold text-rose-600 dark:text-rose-400">
                      -{formatCurrency(item.amount_cents)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
