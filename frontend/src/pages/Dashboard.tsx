import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  Wallet,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Plus,
  ArrowRight,
  Calendar,
  Sparkles,
  PieChart,
  ShieldCheck,
  BarChart3,
  TrendingUp,
  RotateCcw,
  Layers,
  X,
  Check,
  Loader2,
} from "lucide-react";
import { walletApi } from "../api/walletApi";
import {
  DashboardMetrics,
  UpcomingPayment,
  MonthlySpending,
  DailySpending,
  OverduePayment,
} from "../types";
import { formatCurrency, formatDate } from "../utils/format";
import { useAuth } from "../context/AuthContext";

interface DashboardProps {
  onNavigateToRegistros: () => void;
  onOpenNewExpenseModal: () => void;
}

const ESSENTIALITY_NAME_MAP: Record<string, { label: string; desc: string; color: string }> = {
  OBRIGATORIO: {
    label: "Obrigatório",
    desc: "Moradia, contas básicas essenciais",
    color: "#ef4444",
  },
  NECESSARIO: {
    label: "Necessário",
    desc: "Alimentação, transporte, saúde",
    color: "#f59e0b",
  },
  DESEJO: {
    label: "Desejo & Lazer",
    desc: "Restaurantes, compras, viagens",
    color: "#0284c7",
  },
  NENHUM: {
    label: "Geral",
    desc: "Sem classificação específica",
    color: "#6b7280",
  },
};

export const Dashboard: React.FC<DashboardProps> = ({
  onNavigateToRegistros,
  onOpenNewExpenseModal,
}) => {
  const { user } = useAuth();
  const today = useMemo(() => new Date(), []);
  const currentYear = today.getFullYear();
  const currentMonthNumber = today.getMonth() + 1;
  const currentMonthStr = useMemo(() => {
    return `${currentYear}-${String(currentMonthNumber).padStart(2, "0")}`;
  }, [currentYear, currentMonthNumber]);

  // Modo de visualização: Anual ou Mensal
  const [viewMode, setViewMode] = useState<"annual" | "monthly">("annual");
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);

  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hoveredMonth, setHoveredMonth] = useState<MonthlySpending | null>(null);
  const [hoveredDay, setHoveredDay] = useState<DailySpending | null>(null);

  // Drawer de Regularização de Vencidos
  const [isOverdueDrawerOpen, setIsOverdueDrawerOpen] = useState<boolean>(false);
  const [isPayingOverdueId, setIsPayingOverdueId] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async () => {
    setIsLoading(true);
    try {
      const params =
        viewMode === "monthly"
          ? { month: selectedMonth }
          : { year: selectedYear };
      const metricsRes = await walletApi.getDashboardMetrics(params);
      setMetrics(metricsRes);
    } catch (err) {
      console.error("Erro ao carregar dados do dashboard:", err);
    } finally {
      setIsLoading(false);
    }
  }, [viewMode, selectedYear, selectedMonth]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Controles de Ano
  const handlePrevYear = () => {
    setSelectedYear((prev) => prev - 1);
  };
  const handleNextYear = () => {
    setSelectedYear((prev) => prev + 1);
  };
  const handleResetToCurrentYear = () => {
    setSelectedYear(currentYear);
  };

  // Controles de Mês
  const handlePrevMonth = () => {
    const [y, m] = selectedMonth.split("-").map(Number);
    const prev = new Date(y, m - 2, 1);
    setSelectedMonth(`${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}`);
  };
  const handleNextMonth = () => {
    const [y, m] = selectedMonth.split("-").map(Number);
    const next = new Date(y, m, 1);
    setSelectedMonth(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`);
  };
  const handleResetToCurrentMonth = () => {
    setSelectedMonth(currentMonthStr);
  };

  const formattedMonthLabel = useMemo(() => {
    const [y, m] = selectedMonth.split("-").map(Number);
    const d = new Date(y, m - 1, 1);
    return d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  }, [selectedMonth]);

  const handleQuickPay = async (paymentId: string) => {
    setIsPayingOverdueId(paymentId);
    try {
      await walletApi.updatePaymentStatus(paymentId, { status: "CONCLUIDO" });
      await fetchDashboardData();
    } catch {
      alert("Erro ao marcar parcela como paga.");
    } finally {
      setIsPayingOverdueId(null);
    }
  };

  const totalCents = metrics?.total_expenses_cents || 0;
  const paidCents = metrics?.total_paid_cents || 0;
  const pendingCents = metrics?.total_pending_cents || 0;
  const overdueCents = metrics?.total_overdue_cents || 0;

  const paidPercentage = totalCents > 0 ? Math.round((paidCents / totalCents) * 100) : 0;
  const monthlyAverageCents = Math.round(totalCents / 12);

  // Dados Anuais
  const monthlyData = metrics?.monthly_breakdown || [];
  const maxMonthTotalCents = useMemo(() => {
    if (monthlyData.length === 0) return 100;
    const maxVal = Math.max(...monthlyData.map((m) => m.total_cents));
    return maxVal > 0 ? maxVal : 100;
  }, [monthlyData]);

  const highestMonth = useMemo(() => {
    if (monthlyData.length === 0) return null;
    return [...monthlyData].sort((a, b) => b.total_cents - a.total_cents)[0];
  }, [monthlyData]);

  // Dados Mensais (Dias)
  const dailyData = metrics?.daily_breakdown || [];
  const maxDayTotalCents = useMemo(() => {
    if (dailyData.length === 0) return 100;
    const maxVal = Math.max(...dailyData.map((d) => d.total_cents));
    return maxVal > 0 ? maxVal : 100;
  }, [dailyData]);

  const highestDay = useMemo(() => {
    if (dailyData.length === 0) return null;
    return [...dailyData].sort((a, b) => b.total_cents - a.total_cents)[0];
  }, [dailyData]);

  const isCurrentYearActive = selectedYear === currentYear;
  const isCurrentMonthActive = selectedMonth === currentMonthStr;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Top Banner & Controles de Período (Anual vs Mensal) */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-6 rounded-3xl bg-gradient-to-br from-blue-900/20 via-blue-600/10 to-transparent border border-blue-200/50 dark:border-blue-900/30">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 flex items-center space-x-1">
              <Sparkles className="w-3 h-3" />
              <span>
                {viewMode === "annual" ? "Visão Anual Consolidada" : "Visão Mensal Operacional"}
              </span>
            </span>
            {(viewMode === "annual" ? isCurrentYearActive : isCurrentMonthActive) && (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                {viewMode === "annual" ? "Ano Atual" : "Mês Vigente"}
              </span>
            )}
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 mt-2">
            Olá, {user?.username || "Usuário"} 👋
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-0.5">
            {viewMode === "annual" ? (
              <>
                Acompanhe o balanço financeiro e a distribuição de despesas de todo o exercício de{" "}
                <strong className="text-blue-600 dark:text-blue-400 font-semibold">{selectedYear}</strong>.
              </>
            ) : (
              <>
                Acompanhe os vencimentos, liquidações e distribuição do mês de{" "}
                <strong className="text-blue-600 dark:text-blue-400 font-semibold capitalize">
                  {formattedMonthLabel}
                </strong>.
              </>
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Alternador de Modo: Anual vs Mensal */}
          <div className="flex items-center bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-1 shadow-sm">
            <button
              onClick={() => setViewMode("annual")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                viewMode === "annual"
                  ? "bg-blue-600 text-white shadow-2xs"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
              }`}
            >
              Visão Anual
            </button>
            <button
              onClick={() => setViewMode("monthly")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                viewMode === "monthly"
                  ? "bg-blue-600 text-white shadow-2xs"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
              }`}
            >
              Visão Mensal
            </button>
          </div>

          {/* Seletor de Período Dinâmico */}
          {viewMode === "annual" ? (
            <div className="flex items-center space-x-2">
              {!isCurrentYearActive && (
                <button
                  onClick={handleResetToCurrentYear}
                  className="px-2.5 py-2 rounded-2xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 text-xs font-semibold flex items-center space-x-1 transition-colors"
                  title="Voltar ao ano atual"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Ano Atual</span>
                </button>
              )}
              <div className="flex items-center bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-2 py-1.5 shadow-sm">
                <button
                  onClick={handlePrevYear}
                  className="p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 transition-colors cursor-pointer"
                  title="Ano Anterior"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-3 text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100 min-w-[80px] text-center">
                  Ano {selectedYear}
                </span>
                <button
                  onClick={handleNextYear}
                  className="p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 transition-colors cursor-pointer"
                  title="Próximo Ano"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              {!isCurrentMonthActive && (
                <button
                  onClick={handleResetToCurrentMonth}
                  className="px-2.5 py-2 rounded-2xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 text-xs font-semibold flex items-center space-x-1 transition-colors"
                  title="Voltar ao mês atual"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Mês Atual</span>
                </button>
              )}
              <div className="flex items-center bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-2 py-1.5 shadow-sm">
                <button
                  onClick={handlePrevMonth}
                  className="p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 transition-colors cursor-pointer"
                  title="Mês Anterior"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-3 text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100 min-w-[130px] text-center capitalize">
                  {formattedMonthLabel}
                </span>
                <button
                  onClick={handleNextMonth}
                  className="p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 transition-colors cursor-pointer"
                  title="Próximo Mês"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          <button
            onClick={onOpenNewExpenseModal}
            className="px-4 py-2 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs sm:text-sm flex items-center space-x-1.5 shadow-sm shadow-blue-600/20 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Lançar Despesa</span>
          </button>
        </div>
      </div>

      {/* Banner de Alerta Crítico: Contas em Atraso (Se houver) */}
      {overdueCents > 0 && (
        <div className="p-4 rounded-3xl bg-gradient-to-r from-rose-500/15 via-rose-500/10 to-transparent border border-rose-300/80 dark:border-rose-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-2xl bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 border border-rose-200 dark:border-rose-800">
              <AlertTriangle className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400">
                  Atenção Necessária
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-200/80 dark:bg-rose-900 text-rose-800 dark:text-rose-200">
                  {metrics?.overdue_payments?.length || 0} conta(s) em atraso
                </span>
              </div>
              <p className="text-xs text-zinc-700 dark:text-zinc-300 mt-0.5">
                Existem contas vencidas acumuladas totalizando{" "}
                <strong className="text-rose-600 dark:text-rose-400 font-bold">
                  {formatCurrency(overdueCents)}
                </strong>
                . Regularize os pagamentos para evitar multas e encargos.
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsOverdueDrawerOpen(true)}
            className="px-4 py-2 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs flex items-center space-x-2 shadow-sm transition-all shrink-0 cursor-pointer self-start sm:self-center"
          >
            <span>Ver e Regularizar Atrasos</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Grid de Cards KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Despesas */}
        <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              {viewMode === "annual" ? `Despesas em ${selectedYear}` : `Despesas (${formattedMonthLabel})`}
            </span>
            <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mt-1">
              {isLoading ? "..." : formatCurrency(totalCents)}
            </div>
            <span className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5 block">
              {viewMode === "annual"
                ? `Média mensal: ${formatCurrency(monthlyAverageCents)}`
                : "Total previsto no mês"}
            </span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <Wallet className="w-5 h-5" />
          </div>
        </div>

        {/* Total Quitado */}
        <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center space-x-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{viewMode === "annual" ? `Quitado em ${selectedYear}` : "Já Quitado no Mês"}</span>
            </span>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
              {isLoading ? "..." : formatCurrency(paidCents)}
            </div>
            <div className="mt-1.5 flex items-center space-x-2">
              <div className="w-20 bg-zinc-100 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${paidPercentage}%` }}
                />
              </div>
              <span className="text-[10px] text-zinc-500 font-medium">
                {paidPercentage}% quitado
              </span>
            </div>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        {/* Total a Pagar */}
        <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center space-x-1">
              <Clock className="w-3.5 h-3.5" />
              <span>{viewMode === "annual" ? `A Pagar (${selectedYear})` : "A Pagar no Mês"}</span>
            </span>
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">
              {isLoading ? "..." : formatCurrency(pendingCents)}
            </div>
            <span className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5 block">
              Compromissos pendentes
            </span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        {/* Despesas Vencidas (Cumulativo) */}
        <div
          onClick={() => overdueCents > 0 && setIsOverdueDrawerOpen(true)}
          className={`p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center justify-between transition-all ${
            overdueCents > 0 ? "cursor-pointer hover:border-rose-300 dark:hover:border-rose-800" : ""
          }`}
        >
          <div>
            <span className="text-xs font-medium text-rose-600 dark:text-rose-400 uppercase tracking-wider flex items-center space-x-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Em Atraso (Geral)</span>
            </span>
            <div
              className={`text-2xl font-bold mt-1 ${
                overdueCents > 0
                  ? "text-rose-600 dark:text-rose-400"
                  : "text-zinc-900 dark:text-zinc-100"
              }`}
            >
              {isLoading ? "..." : formatCurrency(overdueCents)}
            </div>
            <span className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5 block">
              {overdueCents > 0 ? "Clique para regularizar" : "Nenhuma pendência vencida"}
            </span>
          </div>
          <div
            className={`w-11 h-11 rounded-2xl flex items-center justify-center ${
              overdueCents > 0
                ? "bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 animate-pulse"
                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400"
            }`}
          >
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Seção Gráfica: Evolução Mensal (Ano) OU Evolução Diária (Mês) */}
      <div className="p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center space-x-2 text-base">
              <BarChart3 className="w-5 h-5 text-blue-500" />
              <span>
                {viewMode === "annual"
                  ? `Evolução Mensal de Despesas • Exercício ${selectedYear}`
                  : `Evolução Diária de Despesas • ${formattedMonthLabel}`}
              </span>
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              {viewMode === "annual"
                ? "Comparativo mês a mês dos 12 meses do ano com separação entre despesas quitadas e a pagar."
                : "Desembolsos distribuídos dia a dia ao longo do mês com destaque para dias de pico."}
            </p>
          </div>

          <div className="flex items-center space-x-4 text-xs">
            <div className="flex items-center space-x-1.5">
              <span className="w-3 h-3 rounded bg-emerald-500" />
              <span className="text-zinc-600 dark:text-zinc-400">Quitado</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-3 h-3 rounded bg-amber-500" />
              <span className="text-zinc-600 dark:text-zinc-400">A Pagar</span>
            </div>
          </div>
        </div>

        {/* Gráfico no Modo Anual (12 Barras) */}
        {viewMode === "annual" && (
          <div className="pt-4 pb-2">
            <div className="h-52 flex items-end justify-between gap-1.5 sm:gap-3 px-2">
              {monthlyData.map((m: MonthlySpending) => {
                const isThisMonth = isCurrentYearActive && m.month === currentMonthNumber;
                const heightPercent =
                  m.total_cents > 0 ? Math.max(Math.round((m.total_cents / maxMonthTotalCents) * 100), 8) : 4;
                const paidHeight =
                  m.total_cents > 0 ? Math.round((m.paid_cents / m.total_cents) * 100) : 0;
                const pendingHeight = 100 - paidHeight;

                return (
                  <div
                    key={m.month}
                    className="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer relative"
                    onMouseEnter={() => setHoveredMonth(m)}
                    onMouseLeave={() => setHoveredMonth(null)}
                  >
                    {/* Tooltip no Hover */}
                    {hoveredMonth?.month === m.month && (
                      <div className="absolute -top-20 z-20 bg-zinc-900 dark:bg-zinc-800 text-white text-xs rounded-xl px-3 py-2 shadow-xl border border-zinc-700 pointer-events-none whitespace-nowrap animate-fade-in flex flex-col items-center">
                        <span className="font-bold">{m.month_name} / {selectedYear}</span>
                        <span className="text-zinc-300">Total: {formatCurrency(m.total_cents)}</span>
                        <div className="flex space-x-2 text-[10px] mt-0.5">
                          <span className="text-emerald-400">Pago: {formatCurrency(m.paid_cents)}</span>
                          <span className="text-amber-400">Pendente: {formatCurrency(m.pending_cents)}</span>
                        </div>
                        <div className="w-2 h-2 bg-zinc-900 dark:bg-zinc-800 rotate-45 -mb-1 mt-1 border-r border-b border-zinc-700" />
                      </div>
                    )}

                    {/* Barra Vertical Estilizada */}
                    <div className="w-full max-w-[42px] flex flex-col justify-end h-full">
                      <div
                        style={{ height: `${heightPercent}%` }}
                        className={`w-full rounded-xl overflow-hidden flex flex-col justify-end transition-all duration-300 group-hover:brightness-110 ${
                          isThisMonth
                            ? "ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-zinc-900 shadow-md shadow-blue-500/20"
                            : ""
                        } ${m.total_cents === 0 ? "bg-zinc-100 dark:bg-zinc-800/60" : ""}`}
                      >
                        {m.total_cents > 0 && (
                          <>
                            {pendingHeight > 0 && (
                              <div
                                style={{ height: `${pendingHeight}%` }}
                                className="bg-amber-400 dark:bg-amber-500 transition-all duration-300"
                                title={`A Pagar: ${formatCurrency(m.pending_cents)}`}
                              />
                            )}
                            {paidHeight > 0 && (
                              <div
                                style={{ height: `${paidHeight}%` }}
                                className="bg-emerald-500 dark:bg-emerald-600 transition-all duration-300"
                                title={`Quitado: ${formatCurrency(m.paid_cents)}`}
                              />
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    {/* Rótulo do Mês e Indicador de Mês Atual */}
                    <div className="mt-2.5 flex flex-col items-center">
                      <span
                        className={`text-xs font-semibold ${
                          isThisMonth
                            ? "text-blue-600 dark:text-blue-400"
                            : "text-zinc-600 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-zinc-100"
                        }`}
                      >
                        {m.month_name}
                      </span>
                      {isThisMonth && (
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400 mt-0.5" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Gráfico no Modo Mensal (Dias do Mês) */}
        {viewMode === "monthly" && (
          <div className="pt-4 pb-2">
            <div className="h-52 flex items-end justify-between gap-1 sm:gap-1.5 px-1 overflow-x-auto">
              {dailyData.map((d: DailySpending) => {
                const isTodayDate = d.date === today.toISOString().split("T")[0];
                const heightPercent =
                  d.total_cents > 0 ? Math.max(Math.round((d.total_cents / maxDayTotalCents) * 100), 8) : 4;
                const paidHeight =
                  d.total_cents > 0 ? Math.round((d.paid_cents / d.total_cents) * 100) : 0;
                const pendingHeight = 100 - paidHeight;

                return (
                  <div
                    key={d.day}
                    className="flex-1 min-w-[18px] sm:min-w-[24px] flex flex-col items-center h-full justify-end group cursor-pointer relative"
                    onMouseEnter={() => setHoveredDay(d)}
                    onMouseLeave={() => setHoveredDay(null)}
                  >
                    {/* Tooltip no Hover */}
                    {hoveredDay?.day === d.day && (
                      <div className="absolute -top-20 z-20 bg-zinc-900 dark:bg-zinc-800 text-white text-xs rounded-xl px-3 py-2 shadow-xl border border-zinc-700 pointer-events-none whitespace-nowrap animate-fade-in flex flex-col items-center">
                        <span className="font-bold">Dia {d.day} ({d.weekday_name})</span>
                        <span className="text-zinc-300">Total: {formatCurrency(d.total_cents)}</span>
                        <div className="flex space-x-2 text-[10px] mt-0.5">
                          <span className="text-emerald-400">Pago: {formatCurrency(d.paid_cents)}</span>
                          <span className="text-amber-400">Pendente: {formatCurrency(d.pending_cents)}</span>
                        </div>
                        <div className="w-2 h-2 bg-zinc-900 dark:bg-zinc-800 rotate-45 -mb-1 mt-1 border-r border-b border-zinc-700" />
                      </div>
                    )}

                    {/* Barra Vertical Diária */}
                    <div className="w-full max-w-[20px] flex flex-col justify-end h-full">
                      <div
                        style={{ height: `${heightPercent}%` }}
                        className={`w-full rounded-md sm:rounded-lg overflow-hidden flex flex-col justify-end transition-all duration-300 group-hover:brightness-110 ${
                          isTodayDate
                            ? "ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-zinc-900 shadow-sm"
                            : ""
                        } ${d.total_cents === 0 ? "bg-zinc-100 dark:bg-zinc-800/40" : ""}`}
                      >
                        {d.total_cents > 0 && (
                          <>
                            {pendingHeight > 0 && (
                              <div
                                style={{ height: `${pendingHeight}%` }}
                                className="bg-amber-400 dark:bg-amber-500 transition-all duration-300"
                              />
                            )}
                            {paidHeight > 0 && (
                              <div
                                style={{ height: `${paidHeight}%` }}
                                className="bg-emerald-500 dark:bg-emerald-600 transition-all duration-300"
                              />
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    {/* Rótulo do Dia */}
                    <div className="mt-2 flex flex-col items-center">
                      <span
                        className={`text-[10px] font-semibold ${
                          isTodayDate
                            ? "text-blue-600 dark:text-blue-400 font-bold"
                            : "text-zinc-500 dark:text-zinc-400"
                        }`}
                      >
                        {d.day}
                      </span>
                      {isTodayDate && (
                        <span className="w-1 h-1 rounded-full bg-blue-600 dark:bg-blue-400" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Rodapé do Gráfico com Insights */}
        <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="flex items-center space-x-2 text-zinc-600 dark:text-zinc-400">
            <TrendingUp className="w-4 h-4 text-blue-500" />
            <span>
              {viewMode === "annual" ? (
                <>
                  Mês de Maior Gasto:{" "}
                  <strong className="text-zinc-900 dark:text-zinc-100">
                    {highestMonth && highestMonth.total_cents > 0
                      ? `${highestMonth.month_name} (${formatCurrency(highestMonth.total_cents)})`
                      : "Nenhum lançamento"}
                  </strong>
                </>
              ) : (
                <>
                  Dia de Maior Desembolso:{" "}
                  <strong className="text-zinc-900 dark:text-zinc-100">
                    {highestDay && highestDay.total_cents > 0
                      ? `Dia ${highestDay.day} (${formatCurrency(highestDay.total_cents)})`
                      : "Sem desembolsos"}
                  </strong>
                </>
              )}
            </span>
          </div>

          <div className="flex items-center space-x-2 text-zinc-600 dark:text-zinc-400 sm:justify-center">
            <span>
              {viewMode === "annual" ? (
                <>
                  Média Mensal:{" "}
                  <strong className="text-zinc-900 dark:text-zinc-100">
                    {formatCurrency(monthlyAverageCents)}/mês
                  </strong>
                </>
              ) : (
                <>
                  Total Previsto:{" "}
                  <strong className="text-zinc-900 dark:text-zinc-100">
                    {formatCurrency(totalCents)}
                  </strong>
                </>
              )}
            </span>
          </div>

          <div className="flex items-center space-x-2 text-zinc-600 dark:text-zinc-400 sm:justify-end">
            <span>
              Exercício:{" "}
              <strong className="text-blue-600 dark:text-blue-400 capitalize">
                {viewMode === "annual" ? `Ano ${selectedYear}` : formattedMonthLabel}
              </strong>
            </span>
          </div>
        </div>
      </div>

      {/* Seção Central: Distribuição por Categoria e Essencialidade */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gastos por Categoria */}
        <div className="p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center space-x-2">
              <PieChart className="w-4 h-4 text-blue-500" />
              <span>
                Despesas por Categoria ({viewMode === "annual" ? selectedYear : formattedMonthLabel})
              </span>
            </h3>
            <button
              onClick={onNavigateToRegistros}
              className="text-xs text-blue-600 dark:text-blue-400 font-medium hover:underline flex items-center space-x-1"
            >
              <span>Ver detalhes</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {metrics?.by_category && metrics.by_category.length > 0 ? (
            <div className="space-y-3 pt-2">
              {metrics.by_category.map((cat) => (
                <div key={cat.category_id || cat.category_name} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: cat.color }}
                      />
                      <span className="font-medium text-zinc-800 dark:text-zinc-200">
                        {cat.category_name}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                        {formatCurrency(cat.total_cents)}
                      </span>
                      <span className="text-zinc-400 text-[11px] w-10 text-right">
                        {cat.percentage}%
                      </span>
                    </div>
                  </div>

                  <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        backgroundColor: cat.color,
                        width: `${cat.percentage}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center text-zinc-400 text-xs">
              Nenhuma despesa categorizada no período selecionado.
            </div>
          )}
        </div>

        {/* Grau de Essencialidade */}
        <div className="p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-blue-500" />
              <span>
                Saúde Financeira ({viewMode === "annual" ? selectedYear : formattedMonthLabel})
              </span>
            </h3>
            <span className="text-xs text-zinc-400">Classificação no período</span>
          </div>

          {metrics?.by_essentiality && metrics.by_essentiality.length > 0 ? (
            <div className="space-y-4 pt-2">
              {metrics.by_essentiality.map((ess) => {
                const info = ESSENTIALITY_NAME_MAP[ess.essentiality] || ESSENTIALITY_NAME_MAP["NENHUM"];
                return (
                  <div
                    key={ess.essentiality}
                    className="p-3.5 rounded-2xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 block">
                          {info.label}
                        </span>
                        <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                          {info.desc}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 block">
                          {formatCurrency(ess.total_cents)}
                        </span>
                        <span className="text-[10px] text-zinc-400">
                          {ess.percentage}% do total
                        </span>
                      </div>
                    </div>

                    <div className="w-full bg-zinc-200 dark:bg-zinc-700 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          backgroundColor: info.color,
                          width: `${ess.percentage}%`,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-12 text-center text-zinc-400 text-xs">
              Sem dados de essencialidade no período.
            </div>
          )}
        </div>
      </div>

      {/* Seção: Top Itens de Despesa */}
      <div className="p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center space-x-2">
              <Layers className="w-4 h-4 text-indigo-500" />
              <span>
                Top Itens de Despesa ({viewMode === "annual" ? selectedYear : formattedMonthLabel})
              </span>
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Concentração dos maiores centros de custo
            </p>
          </div>
          <button
            onClick={onNavigateToRegistros}
            className="text-xs text-blue-600 dark:text-blue-400 font-medium hover:underline flex items-center space-x-1"
          >
            <span>Ver lançamentos</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {metrics?.by_item && metrics.by_item.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
            {metrics.by_item.slice(0, 8).map((item, idx) => {
              const natureInfo = ESSENTIALITY_NAME_MAP[item.nature] || ESSENTIALITY_NAME_MAP["NENHUM"];
              return (
                <div
                  key={item.item_id || `${item.item_name}-${idx}`}
                  className="p-3.5 rounded-2xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30 space-y-2 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center space-x-2.5">
                      <span className="w-6 h-6 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 text-xs font-bold flex items-center justify-center shrink-0 border border-indigo-200 dark:border-indigo-800">
                        {idx + 1}
                      </span>
                      <div>
                        <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 block">
                          {item.item_name}
                        </span>
                        <div className="flex items-center space-x-1.5 text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                          <span>{item.category_name}</span>
                          <span>&bull;</span>
                          <span
                            className="font-medium"
                            style={{ color: natureInfo.color }}
                          >
                            {natureInfo.label}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 block">
                        {formatCurrency(item.total_cents)}
                      </span>
                      <span className="text-[10px] text-zinc-400">
                        {item.percentage}%
                      </span>
                    </div>
                  </div>

                  <div className="w-full bg-zinc-200 dark:bg-zinc-700 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-500 dark:bg-indigo-400 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(item.percentage, 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-8 text-center text-zinc-400 text-xs">
            Nenhum item com despesas registradas no período.
          </div>
        )}
      </div>

      {/* Seção Inferior: Próximos Vencimentos a Pagar */}
      <div className="p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-blue-500" />
            <span>Próximos Vencimentos a Pagar</span>
          </h3>
          <button
            onClick={onNavigateToRegistros}
            className="text-xs text-blue-600 dark:text-blue-400 font-medium hover:underline flex items-center space-x-1"
          >
            <span>Ver todos os registros</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {metrics?.upcoming_payments && metrics.upcoming_payments.length > 0 ? (
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {metrics.upcoming_payments.map((item: UpcomingPayment) => (
              <div
                key={item.payment_id}
                className="py-3 flex items-center justify-between gap-3"
              >
                <div className="flex items-center space-x-3">
                  <div
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                  <div>
                    <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 block">
                      {item.description}
                    </span>
                    <div className="flex items-center space-x-2 text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                      <span>{item.category_name}</span>
                      <span>&bull;</span>
                      <span>Vence em: {formatDate(item.due_date)}</span>
                      <span>&bull;</span>
                      <span className="font-medium text-blue-600 dark:text-blue-400">
                        {item.installment_text}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                    {formatCurrency(item.amount_cents)}
                  </span>
                  <button
                    onClick={() => handleQuickPay(item.payment_id)}
                    className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 transition-colors flex items-center space-x-1 cursor-pointer"
                  >
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>Pagar</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-12 text-center text-zinc-400 text-xs">
            Nenhuma conta pendente nos próximos dias. Tudo em dia! 🎉
          </div>
        )}
      </div>

      {/* Drawer Lateral / Modal: Central de Regularização de Contas em Atraso */}
      {isOverdueDrawerOpen && (
        <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 shadow-2xl p-6 flex flex-col justify-between animate-slide-left">
          <div className="space-y-5 overflow-y-auto pr-1">
            {/* Cabeçalho do Drawer */}
            <div className="flex items-center justify-between pb-4 border-b border-zinc-100 dark:border-zinc-800">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center space-x-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Central de Regularização</span>
                </span>
                <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mt-0.5">
                  Contas em Atraso
                </h3>
              </div>
              <button
                onClick={() => setIsOverdueDrawerOpen(false)}
                className="p-2 rounded-xl text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Resumo do Passivo em Atraso */}
            <div className="p-4 rounded-2xl bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 flex items-center justify-between">
              <div>
                <span className="text-xs text-rose-800 dark:text-rose-300 font-medium block">
                  Total Acumulado em Atraso
                </span>
                <strong className="text-xl font-black text-rose-600 dark:text-rose-400 block mt-0.5">
                  {formatCurrency(overdueCents)}
                </strong>
              </div>
              <span className="text-xs font-bold px-2.5 py-1 rounded-xl bg-rose-200/70 dark:bg-rose-900 text-rose-800 dark:text-rose-200">
                {metrics?.overdue_payments?.length || 0} pendência(s)
              </span>
            </div>

            {/* Lista das Contas Vencidas */}
            <div className="space-y-3">
              {metrics?.overdue_payments && metrics.overdue_payments.length > 0 ? (
                metrics.overdue_payments.map((p: OverduePayment) => {
                  const isPaying = isPayingOverdueId === p.payment_id;

                  return (
                    <div
                      key={p.payment_id}
                      className="p-4 rounded-2xl border border-rose-200 dark:border-rose-900/60 bg-white dark:bg-zinc-800/40 shadow-2xs space-y-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center space-x-2.5">
                          <span
                            className="w-3 h-3 rounded-full shrink-0"
                            style={{ backgroundColor: p.color }}
                          />
                          <div>
                            <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100 block">
                              {p.description}
                            </span>
                            <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                              <span>{p.category_name}</span>
                              {p.contact_name && (
                                <>
                                  <span>•</span>
                                  <span>{p.contact_name}</span>
                                </>
                              )}
                              <span>•</span>
                              <span className="font-semibold text-blue-600 dark:text-blue-400">
                                {p.installment_text}
                              </span>
                            </div>
                          </div>
                        </div>

                        <span className="text-sm font-black text-rose-600 dark:text-rose-400 shrink-0">
                          {formatCurrency(p.amount_cents)}
                        </span>
                      </div>

                      {/* Faixa de Vencimento e Botão */}
                      <div className="pt-2.5 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                        <div className="flex items-center space-x-1.5">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                            Atrasado há {p.days_overdue} {p.days_overdue === 1 ? "dia" : "dias"}
                          </span>
                          <span className="text-[10px] text-zinc-400">
                            (Venceu: {formatDate(p.due_date)})
                          </span>
                        </div>

                        <button
                          disabled={isPaying}
                          onClick={() => handleQuickPay(p.payment_id)}
                          className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center space-x-1.5 shadow-2xs shadow-emerald-600/20 transition-all cursor-pointer"
                        >
                          {isPaying ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>Pagar Agora</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-12 text-center text-zinc-400 text-xs">
                  Nenhuma conta em atraso encontrada.
                </div>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800">
            <button
              onClick={() => setIsOverdueDrawerOpen(false)}
              className="w-full py-2.5 rounded-2xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 text-xs font-semibold transition-colors cursor-pointer"
            >
              Fechar Painel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
