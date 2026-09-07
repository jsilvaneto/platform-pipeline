import React, { useEffect, useState, useCallback } from "react";
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
  CreditCard,
} from "lucide-react";
import { walletApi } from "../api/walletApi";
import { api } from "../api/client";
import { DashboardMetrics, UpcomingPayment } from "../types";
import { formatCurrency, formatDate } from "../utils/format";
import { useAuth } from "../context/AuthContext";

interface DashboardProps {
  onNavigateToRegistros: () => void;
  onOpenNewExpenseModal: () => void;
}

interface SystemHealth {
  status: string;
  database: string;
  version: string;
  environment: string;
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
    color: "#8b5cf6",
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
  const today = new Date();
  const currentMonthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;

  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchDashboardData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [metricsRes, healthRes] = await Promise.all([
        walletApi.getDashboardMetrics(selectedMonth),
        api.get<SystemHealth>("/health").then((r) => r.data).catch(() => null),
      ]);
      setMetrics(metricsRes);
      if (healthRes) setHealth(healthRes);
    } catch (err) {
      console.error("Erro ao carregar dados do dashboard:", err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedMonth]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handlePrevMonth = () => {
    const [y, m] = selectedMonth.split("-").map(Number);
    const prevDate = new Date(y, m - 2, 1);
    setSelectedMonth(`${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}`);
  };

  const handleNextMonth = () => {
    const [y, m] = selectedMonth.split("-").map(Number);
    const nextDate = new Date(y, m, 1);
    setSelectedMonth(`${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, "0")}`);
  };

  const handleQuickPay = async (paymentId: string) => {
    try {
      await walletApi.updatePaymentStatus(paymentId, { status: "CONCLUIDO" });
      fetchDashboardData();
    } catch {
      alert("Erro ao marcar parcela como paga.");
    }
  };

  const [yearNum, monthNum] = selectedMonth.split("-").map(Number);
  const monthDate = new Date(yearNum, monthNum - 1, 1);
  const monthFormatted = monthDate.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  const totalCents = metrics?.total_expenses_cents || 0;
  const paidCents = metrics?.total_paid_cents || 0;
  const pendingCents = metrics?.total_pending_cents || 0;
  const overdueCents = metrics?.total_overdue_cents || 0;

  const paidPercentage = totalCents > 0 ? Math.round((paidCents / totalCents) * 100) : 0;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Top Banner & Período */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-gradient-to-br from-indigo-900/20 via-indigo-600/10 to-transparent border border-indigo-200/50 dark:border-indigo-900/30">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 flex items-center space-x-1">
              <Sparkles className="w-3 h-3" />
              <span>Finanças Pessoais</span>
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 mt-2">
            Olá, {user?.username || "Usuário"} 👋
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-0.5">
            Acompanhe seu fluxo de despesas e contas a pagar com precisão em centavos.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Seletor de Mês */}
          <div className="flex items-center bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-2 py-1.5 shadow-sm">
            <button
              onClick={handlePrevMonth}
              className="p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 transition-colors"
              title="Mês Anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 text-sm font-semibold capitalize text-zinc-800 dark:text-zinc-200 min-w-[130px] text-center">
              {monthFormatted}
            </span>
            <button
              onClick={handleNextMonth}
              className="p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 transition-colors"
              title="Próximo Mês"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={onOpenNewExpenseModal}
            className="px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm flex items-center space-x-2 shadow-sm shadow-indigo-600/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            <span>Lançar Despesa</span>
          </button>
        </div>
      </div>

      {/* Grid de Cards KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Despesas Mês */}
        <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Despesas do Mês
            </span>
            <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mt-1">
              {isLoading ? "..." : formatCurrency(totalCents)}
            </div>
            <span className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5 block">
              Competência: {selectedMonth}
            </span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <Wallet className="w-5 h-5" />
          </div>
        </div>

        {/* Total Pago */}
        <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center space-x-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Total Quitado</span>
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
                {paidPercentage}% pago
              </span>
            </div>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        {/* Total a Pagar / Pendente */}
        <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center space-x-1">
              <Clock className="w-3.5 h-3.5" />
              <span>A Pagar (Pendente)</span>
            </span>
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">
              {isLoading ? "..." : formatCurrency(pendingCents)}
            </div>
            <span className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5 block">
              Vencimentos deste mês
            </span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        {/* Despesas Vencidas */}
        <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-rose-600 dark:text-rose-400 uppercase tracking-wider flex items-center space-x-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Vencidos Não Pagos</span>
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
              {overdueCents > 0 ? "Atenção necessária!" : "Nenhuma conta em atraso"}
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

      {/* Seção Central: Distribuição por Categoria e Essencialidade */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gastos por Categoria */}
        <div className="p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center space-x-2">
              <PieChart className="w-4 h-4 text-indigo-500" />
              <span>Despesas por Categoria</span>
            </h3>
            <button
              onClick={onNavigateToRegistros}
              className="text-xs text-indigo-600 dark:text-indigo-400 font-medium hover:underline flex items-center space-x-1"
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
              Nenhuma despesa categorizada neste mês.
            </div>
          )}
        </div>

        {/* Grau de Essencialidade (Saúde Financeira) */}
        <div className="p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-indigo-500" />
              <span>Saúde Financeira (Essencialidade)</span>
            </h3>
            <span className="text-xs text-zinc-400">Classificação pessoal</span>
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
                          {ess.percentage}% das despesas
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
              Sem dados de essencialidade para o período.
            </div>
          )}
        </div>
      </div>

      {/* Seção Inferior: Próximos Vencimentos & Status do Sistema */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Próximos Vencimentos */}
        <div className="lg:col-span-2 p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-indigo-500" />
              <span>Próximos Vencimentos a Pagar</span>
            </h3>
            <button
              onClick={onNavigateToRegistros}
              className="text-xs text-indigo-600 dark:text-indigo-400 font-medium hover:underline flex items-center space-x-1"
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
                        <span className="font-medium text-indigo-600 dark:text-indigo-400">
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
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 transition-colors flex items-center space-x-1"
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

        {/* Status da Infraestrutura & Banco */}
        <div className="p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center space-x-2">
              <CreditCard className="w-4 h-4 text-indigo-500" />
              <span>Infra & Integridade</span>
            </h3>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              PostgreSQL 16
            </span>
          </div>

          <div className="divide-y divide-zinc-100 dark:divide-zinc-800 text-sm">
            <div className="py-2.5 flex justify-between">
              <span className="text-zinc-500 dark:text-zinc-400">Armazenamento</span>
              <span className="font-medium text-emerald-600 dark:text-emerald-400">
                Centavos Inteiros
              </span>
            </div>
            <div className="py-2.5 flex justify-between">
              <span className="text-zinc-500 dark:text-zinc-400">Banco de Dados</span>
              <span className="font-mono text-zinc-800 dark:text-zinc-200">
                {health?.database || "PostgreSQL"}
              </span>
            </div>
            <div className="py-2.5 flex justify-between">
              <span className="text-zinc-500 dark:text-zinc-400">Status</span>
              <span className="font-medium text-emerald-600 capitalize">
                {health?.status || "Operacional"}
              </span>
            </div>
            <div className="py-2.5 flex justify-between">
              <span className="text-zinc-500 dark:text-zinc-400">App Version</span>
              <span className="font-mono text-zinc-800 dark:text-zinc-200">
                v{health?.version || "1.0.0"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
