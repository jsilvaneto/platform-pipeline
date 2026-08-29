import React, { useEffect, useState } from "react";
import { useApp } from "../context/AppContext";
import { api } from "../api/client";
import { DashboardSummary, UpcomingTransactionItem, Transaction } from "../types";
import { formatCurrency, formatDateToBR } from "../utils/format";
import { TransactionModal } from "../components/TransactionModal";
import { 
  ArrowUpRight, ArrowDownRight, AlertCircle, Clock, 
  TrendingUp, TrendingDown, CheckCircle2, ChevronLeft, ChevronRight,
  PieChart as PieChartIcon, Landmark, CreditCard, Wallet, PiggyBank,
  Sparkles, Target, Calendar, Check, ShieldCheck, AlertTriangle,
  ArrowRightLeft, Plus, ChevronDown, RefreshCw, BarChart3, Layers, ArrowRight
} from "lucide-react";

interface DashboardProps {
  onNavigateToPlanning?: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigateToPlanning }) => {
  const { profile, hideValues, refreshSyncStatus } = useApp();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);

  // Seleção de Mês e Ano
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());

  // Modal de Lançamentos
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  // Estado para liquidação rápida
  const [completingId, setCompletingId] = useState<string | null>(null);

  const monthNames = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear((prev) => prev - 1);
    } else {
      setSelectedMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear((prev) => prev + 1);
    } else {
      setSelectedMonth((prev) => prev + 1);
    }
  };

  const handleCurrentMonth = () => {
    const now = new Date();
    setSelectedMonth(now.getMonth() + 1);
    setSelectedYear(now.getFullYear());
  };

  const fetchSummary = async () => {
    setLoading(true);
    try {
      const res = await api.get("/dashboard/summary", {
        params: {
          profile,
          month: selectedMonth,
          year: selectedYear,
        },
      });
      setSummary(res.data);
    } catch (err) {
      console.error("Erro ao carregar dashboard:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, [profile, selectedMonth, selectedYear]);

  // Quitação Rápida em 1 Clique direto na timeline de próximos 7 dias
  const handleQuickComplete = async (item: UpcomingTransactionItem) => {
    setCompletingId(item.id);
    try {
      await api.patch(`/transactions/${item.id}/complete`);
      fetchSummary();
      refreshSyncStatus(false);
    } catch (err) {
      console.error("Erro na quitação rápida:", err);
    } finally {
      setCompletingId(null);
    }
  };

  const getAccountIcon = (type?: string) => {
    switch (type) {
      case "CORRENTE": return Landmark;
      case "POUPANCA": return PiggyBank;
      case "INVESTIMENTO": return TrendingUp;
      case "CAIXA": return Wallet;
      default: return Landmark;
    }
  };

  return (
    <div className="space-y-7 pb-10">
      
      {/* 1. TOP HEADER & NAVEGADOR DE PERÍODO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
              Painel Geral & Visão Executiva
            </h1>
            <span className="px-2.5 py-0.5 text-[10px] font-black rounded-md bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 uppercase tracking-wider">
              {profile}
            </span>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Posição patrimonial, fluxo de caixa consolidado, diagnóstico 50-30-20 e projeções
          </p>
        </div>

        {/* Controles de Mês & Ação Rápida */}
        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            onClick={handleCurrentMonth}
            className="px-3 py-2 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all shadow-sm cursor-pointer"
            title="Ir para o mês atual"
          >
            Mês Atual
          </button>

          <div className="flex items-center gap-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-1 shadow-sm">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 transition-all cursor-pointer"
              title="Mês Anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-bold px-3 text-zinc-800 dark:text-zinc-200 min-w-[130px] text-center font-mono">
              {monthNames[selectedMonth - 1]} / {selectedYear}
            </span>
            <button
              onClick={handleNextMonth}
              className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 transition-all cursor-pointer"
              title="Próximo Mês"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={() => {
              setEditingTransaction(null);
              setIsModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md shadow-emerald-600/20 transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Novo Lançamento</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-16 text-sm text-zinc-500 dark:text-zinc-400">
          <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mr-3"></div>
          Consolidando métricas e indicadores financeiros...
        </div>
      ) : !summary ? (
        <div className="p-12 text-center bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl">
          <p className="text-sm text-zinc-500">Nenhum dado encontrado para o período selecionado.</p>
        </div>
      ) : (
        <>
          {/* 2. BANNERS DE ALERTAS URGENTES */}
          {(summary.overdue_count > 0 || summary.due_today_count > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {summary.overdue_count > 0 && (
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-rose-500/15 via-rose-500/5 to-transparent border border-rose-200 dark:border-rose-900/60 rounded-2xl shadow-sm animate-fade-in">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-rose-500 text-white shadow-md shadow-rose-500/20 animate-pulse">
                      <AlertCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-rose-900 dark:text-rose-200">
                        {summary.overdue_count} {summary.overdue_count === 1 ? "conta atrasada requer atenção" : "contas atrasadas requerem atenção"}
                      </h4>
                      <p className="text-[11px] text-rose-700/80 dark:text-rose-400/80 mt-0.5">Vencidas e ainda não quitadas</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-black font-mono text-rose-600 dark:text-rose-300">
                      {formatCurrency(summary.overdue_amount_cents, hideValues)}
                    </span>
                  </div>
                </div>
              )}

              {summary.due_today_count > 0 && (
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-amber-500/15 via-amber-500/5 to-transparent border border-amber-200 dark:border-amber-900/60 rounded-2xl shadow-sm animate-fade-in">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-amber-500 text-white shadow-md shadow-amber-500/20">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-amber-900 dark:text-amber-200">
                        {summary.due_today_count} {summary.due_today_count === 1 ? "conta vence hoje" : "contas vencem hoje"}
                      </h4>
                      <p className="text-[11px] text-amber-700/80 dark:text-amber-400/80 mt-0.5">Previsão de quitação para hoje</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-black font-mono text-amber-600 dark:text-amber-300">
                      {formatCurrency(summary.due_today_amount_cents, hideValues)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 3. SEÇÃO: POSIÇÃO PATRIMONIAL & SALDOS DE CONTAS */}
          <div className="space-y-3.5">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-indigo-500" />
                <span>Posição Patrimonial & Saldos em Contas</span>
              </h2>
              <span className="text-[11px] text-zinc-400">
                Saldos reais liquidados
              </span>
            </div>

            {/* 4 Cards Principais de Patrimônio */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
              
              {/* Card Patrimônio Líquido */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-zinc-900 to-zinc-800 dark:from-zinc-900 dark:to-zinc-950 text-white border border-zinc-800 shadow-md space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                    Patrimônio Líquido
                  </span>
                  <Sparkles className="w-4 h-4 text-amber-400" />
                </div>
                <div className={`text-xl sm:text-2xl font-black font-mono tracking-tight ${
                  summary.net_worth_cents >= 0 ? "text-emerald-400" : "text-rose-400"
                }`}>
                  {formatCurrency(summary.net_worth_cents, hideValues)}
                </div>
                <p className="text-[10px] text-zinc-400 leading-tight">
                  Total em Contas - Faturas Abertas - Dívidas Ativas
                </p>
              </div>

              {/* Card Saldo em Contas */}
              <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    Saldo em Contas
                  </span>
                  <Landmark className="w-4 h-4 text-emerald-500" />
                </div>
                <div className="text-xl sm:text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400 tracking-tight">
                  {formatCurrency(summary.total_account_balance_cents, hideValues)}
                </div>
                <p className="text-[10px] text-zinc-400">
                  {summary.accounts_balances.length} conta(s) e carteira(s)
                </p>
              </div>

              {/* Card Faturas de Cartões */}
              <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    Faturas Abertas (Cartões)
                  </span>
                  <CreditCard className="w-4 h-4 text-indigo-500" />
                </div>
                <div className="text-xl sm:text-2xl font-black font-mono text-indigo-600 dark:text-indigo-400 tracking-tight">
                  {formatCurrency(summary.total_credit_card_invoices_cents, hideValues)}
                </div>
                <p className="text-[10px] text-zinc-400">
                  Despesas em cartão a liquidar
                </p>
              </div>

              {/* Card Dívidas Ativas */}
              <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    Saldo em Dívidas
                  </span>
                  <TrendingDown className="w-4 h-4 text-rose-500" />
                </div>
                <div className="text-xl sm:text-2xl font-black font-mono text-rose-600 dark:text-rose-400 tracking-tight">
                  {formatCurrency(summary.total_debts_remaining_cents, hideValues)}
                </div>
                <p className="text-[10px] text-zinc-400">
                  Passivos em amortização
                </p>
              </div>

            </div>

            {/* Mini-Carrossel de Saldos Individuais por Conta */}
            {summary.accounts_balances.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-1">
                {summary.accounts_balances.map((acc) => {
                  const AccIcon = getAccountIcon(acc.account_type);
                  return (
                    <div
                      key={acc.account_id}
                      className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-800/40 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all flex flex-col justify-between"
                    >
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <AccIcon className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                        <span className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 truncate">
                          {acc.account_name}
                        </span>
                      </div>
                      <span className={`text-xs font-bold font-mono ${
                        acc.balance_cents >= 0 ? "text-zinc-900 dark:text-zinc-100" : "text-rose-600 dark:text-rose-400"
                      }`}>
                        {formatCurrency(acc.balance_cents, hideValues)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 4. SEÇÃO: FLUXO DE CAIXA DO MÊS (KPIs) */}
          <div className="space-y-3.5">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-emerald-500" />
                <span>Fluxo de Caixa do Período ({monthNames[selectedMonth - 1]}/{selectedYear})</span>
              </h2>
              <span className="text-[11px] text-zinc-400">
                Taxa de Poupança: <strong className="text-emerald-600 dark:text-emerald-400 font-mono">{summary.savings_rate}%</strong>
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* Card 1: Realizado (Liquidado) */}
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    Realizado (Liquidado)
                  </span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-500 flex items-center gap-1">
                      <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500" /> Recebido:
                    </span>
                    <span className="font-semibold font-mono text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(summary.income_realized_cents, hideValues)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-500 flex items-center gap-1">
                      <ArrowDownRight className="w-3.5 h-3.5 text-rose-500" /> Pago:
                    </span>
                    <span className="font-semibold font-mono text-rose-600 dark:text-rose-400">
                      {formatCurrency(summary.expense_realized_cents, hideValues)}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Resultado Caixa:</span>
                    <span className={`text-sm font-bold font-mono ${
                      summary.net_realized_cents >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                    }`}>
                      {summary.net_realized_cents >= 0 ? "+" : ""}{formatCurrency(summary.net_realized_cents, hideValues)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Card 2: Pendente (A Vencer) */}
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    Pendente (A Vencer)
                  </span>
                  <Clock className="w-4 h-4 text-amber-500" />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-500 flex items-center gap-1">
                      <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500" /> A Receber:
                    </span>
                    <span className="font-semibold font-mono text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(summary.income_pending_cents, hideValues)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-500 flex items-center gap-1">
                      <ArrowDownRight className="w-3.5 h-3.5 text-rose-500" /> A Pagar:
                    </span>
                    <span className="font-semibold font-mono text-rose-600 dark:text-rose-400">
                      {formatCurrency(summary.expense_pending_cents, hideValues)}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Pendente Líquido:</span>
                    <span className="text-sm font-bold font-mono text-zinc-900 dark:text-zinc-100">
                      {formatCurrency(summary.net_pending_cents, hideValues)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Card 3: Projeção Final do Mês */}
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm space-y-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                      Projeção Final do Mês
                    </span>
                    <TrendingUp className="w-4 h-4 text-indigo-500" />
                  </div>
                  <span className="text-[11px] text-zinc-400 block mb-0.5">Saldo Final Estimado</span>
                  <div className={`text-xl font-black font-mono tracking-tight ${
                    summary.projected_net_cents >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                  }`}>
                    {summary.projected_net_cents >= 0 ? "+" : ""}{formatCurrency(summary.projected_net_cents, hideValues)}
                  </div>
                </div>

                <p className="text-[10px] text-zinc-400 leading-tight">
                  Realizado + Lançamentos previstos até o encerramento do mês.
                </p>
              </div>

            </div>
          </div>

          {/* 5. SEÇÃO: GRÁFICO HISTÓRICO & TENDÊNCIA (ÚLTIMOS 6 MESES) */}
          {summary.historical_trend && summary.historical_trend.length > 0 && (
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-500" />
                    <span>Evolução Histórica & Tendência (Últimos 6 Meses)</span>
                  </h3>
                  <p className="text-[11px] text-zinc-400">
                    Comparativo de receitas realizadas, despesas e resultado de caixa mensal
                  </p>
                </div>
                <div className="flex items-center gap-4 text-xs font-semibold">
                  <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                    <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500"></span> Receitas
                  </span>
                  <span className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400">
                    <span className="w-2.5 h-2.5 rounded-sm bg-rose-500"></span> Despesas
                  </span>
                </div>
              </div>

              {/* Gráfico Visual de Barras com Tailwind */}
              <div className="grid grid-cols-6 gap-2 sm:gap-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                {(() => {
                  const maxAmount = Math.max(
                    ...summary.historical_trend.map((h) => Math.max(h.income_realized_cents, h.expense_realized_cents)),
                    100000 // Fallback R$ 1.000
                  );

                  return summary.historical_trend.map((h, idx) => {
                    const incHeight = Math.min(100, Math.max(4, (h.income_realized_cents / maxAmount) * 100));
                    const expHeight = Math.min(100, Math.max(4, (h.expense_realized_cents / maxAmount) * 100));
                    const isSelected = h.month === selectedMonth && h.year === selectedYear;

                    return (
                      <div
                        key={h.label}
                        onClick={() => {
                          setSelectedMonth(h.month);
                          setSelectedYear(h.year);
                        }}
                        className={`p-2.5 rounded-xl border transition-all flex flex-col items-center justify-end cursor-pointer group ${
                          isSelected 
                            ? "bg-indigo-50/50 dark:bg-indigo-950/30 border-indigo-300 dark:border-indigo-800 shadow-sm" 
                            : "bg-zinc-50/60 dark:bg-zinc-800/20 border-zinc-100 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
                        }`}
                        title={`${h.label}: Receitas ${formatCurrency(h.income_realized_cents, hideValues)} | Despesas ${formatCurrency(h.expense_realized_cents, hideValues)}`}
                      >
                        {/* Colunas de Barras */}
                        <div className="h-28 w-full flex items-end justify-center gap-1.5 mb-2">
                          {/* Barra Receitas */}
                          <div
                            className="w-3.5 bg-emerald-500 rounded-t-md transition-all group-hover:bg-emerald-400"
                            style={{ height: `${incHeight}%` }}
                          />
                          {/* Barra Despesas */}
                          <div
                            className="w-3.5 bg-rose-500 rounded-t-md transition-all group-hover:bg-rose-400"
                            style={{ height: `${expHeight}%` }}
                          />
                        </div>

                        {/* Rótulo do Mês */}
                        <span className={`text-[11px] font-bold font-mono ${
                          isSelected ? "text-indigo-600 dark:text-indigo-400" : "text-zinc-600 dark:text-zinc-400"
                        }`}>
                          {h.label}
                        </span>

                        {/* Resultado Líquido */}
                        <span className={`text-[10px] font-bold font-mono mt-0.5 ${
                          h.net_realized_cents >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                        }`}>
                          {h.net_realized_cents >= 0 ? "+" : ""}{formatCurrency(h.net_realized_cents, hideValues)}
                        </span>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          )}

          {/* 6. SEÇÃO: DIAGNÓSTICO ESTRATÉGICO 50-30-20 (SAÚDE FINANCEIRA) */}
          {summary.nature_breakdown && summary.nature_breakdown.length > 0 && (
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <PieChartIcon className="w-4 h-4 text-indigo-500" />
                    <span>Diagnóstico de Essencialidade de Gastos (Regra 50-30-20)</span>
                  </h3>
                  <p className="text-[11px] text-zinc-400">
                    Análise da qualidade do gasto baseada na essencialidade das categorias
                  </p>
                </div>
                <div className="text-xs text-zinc-400">
                  Total Despesas: <strong className="text-zinc-800 dark:text-zinc-200 font-mono">{formatCurrency(summary.expense_realized_cents + summary.expense_pending_cents, hideValues)}</strong>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                {summary.nature_breakdown.filter(n => n.nature !== "NENHUM").map((nat) => {
                  let badgeColor = "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800";
                  if (nat.status === "EXCEDIDO") {
                    badgeColor = "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border-rose-200 dark:border-rose-800";
                  } else if (nat.status === "ATENCAO") {
                    badgeColor = "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border-amber-200 dark:border-amber-800";
                  }

                  let barColor = "bg-emerald-500";
                  if (nat.nature === "OBRIGATORIO") barColor = "bg-blue-500";
                  if (nat.nature === "NECESSARIO") barColor = "bg-amber-500";
                  if (nat.nature === "DESEJO") barColor = "bg-purple-500";

                  return (
                    <div
                      key={nat.nature}
                      className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-800/20 space-y-2.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                          {nat.nature_label}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badgeColor}`}>
                          Meta: ~{nat.target_percentage}%
                        </span>
                      </div>

                      <div className="flex items-baseline justify-between">
                        <span className="text-base font-bold font-mono text-zinc-900 dark:text-zinc-100">
                          {formatCurrency(nat.amount_cents, hideValues)}
                        </span>
                        <span className="text-xs font-bold font-mono text-zinc-600 dark:text-zinc-400">
                          {nat.percentage}%
                        </span>
                      </div>

                      <div className="w-full h-2 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                          style={{ width: `${Math.min(100, Math.max(0, nat.percentage))}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Banner de Atalho para Planejamento & Futuro */}
          {onNavigateToPlanning && (
            <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-indigo-500/10 border border-emerald-200 dark:border-emerald-900/60 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="p-3 rounded-2xl bg-emerald-500 text-white shadow-md shadow-emerald-500/20 shrink-0">
                  <Sparkles className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <span>Planejamento & Projeções Futuras (12 a 24 Meses)</span>
                    <span className="px-2 py-0.5 text-[10px] font-black rounded-md bg-emerald-600 text-white uppercase tracking-wider">Novo</span>
                  </h4>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    Projete seu fluxo de caixa futuro, simule cenários "What-If", calcule seu runway/fôlego financeiro e acompanhe suas metas.
                  </p>
                </div>
              </div>
              <button
                onClick={onNavigateToPlanning}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md shadow-emerald-600/20 transition-all self-start sm:self-auto shrink-0 cursor-pointer active:scale-95"
              >
                <span>Abrir Planejamento</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* 7. GRID DE WIDGETS ANALÍTICOS (ORÇAMENTOS, TOP CATEGORIAS, PRÓXIMOS 7 DIAS E MEIOS DE PAGTO) */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            
            {/* Widget: Maiores Despesas por Categoria */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <PieChartIcon className="w-4 h-4 text-emerald-500" />
                  <span>Maiores Despesas por Categoria</span>
                </h3>
                <span className="text-xs text-zinc-400 font-mono">
                  {summary.top_expense_categories.length} categorias
                </span>
              </div>

              {summary.top_expense_categories.length === 0 ? (
                <p className="text-xs text-zinc-400 py-6 text-center">Nenhuma despesa registrada no período.</p>
              ) : (
                <div className="space-y-3 pt-1">
                  {summary.top_expense_categories.map((cat) => (
                    <div key={cat.category_id} className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="font-semibold text-zinc-800 dark:text-zinc-200">{cat.category_name}</span>
                        <span className="font-mono text-zinc-600 dark:text-zinc-400">
                          {formatCurrency(cat.amount_cents, hideValues)} ({cat.percentage}%)
                        </span>
                      </div>
                      <div className="w-full h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, Math.max(0, cat.percentage))}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Widget: Monitoramento de Orçamentos (Budgets) */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <Target className="w-4 h-4 text-indigo-500" />
                  <span>Monitoramento de Orçamentos (Tetos)</span>
                </h3>
                <span className="text-xs text-zinc-400 font-mono">
                  {summary.budgets_summary.length} orçamento(s)
                </span>
              </div>

              {summary.budgets_summary.length === 0 ? (
                <div className="p-6 text-center text-xs text-zinc-400 space-y-1">
                  <p>Nenhum orçamento cadastrado para este mês.</p>
                  <p className="text-[11px] text-zinc-500">Defina tetos de gastos em Configurações &gt; Orçamentos & Metas.</p>
                </div>
              ) : (
                <div className="space-y-3 pt-1">
                  {summary.budgets_summary.map((b) => {
                    let badge = "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400";
                    let barColor = "bg-emerald-500";
                    if (b.status === "ESTOURADO") {
                      badge = "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400";
                      barColor = "bg-rose-500";
                    } else if (b.status === "ATENCAO") {
                      badge = "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400";
                      barColor = "bg-amber-500";
                    }

                    return (
                      <div key={b.budget_id} className="space-y-1.5 p-2 rounded-xl bg-zinc-50/50 dark:bg-zinc-800/20 border border-zinc-100 dark:border-zinc-800/60">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-zinc-800 dark:text-zinc-200">{b.category_name}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badge}`}>
                            {b.percentage}% consumido
                          </span>
                        </div>
                        <div className="flex justify-between text-[11px] font-mono text-zinc-500">
                          <span>Gasto: <strong>{formatCurrency(b.spent_amount_cents, hideValues)}</strong></span>
                          <span>Teto: {formatCurrency(b.limit_amount_cents, hideValues)}</span>
                        </div>
                        <div className="w-full h-2 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                            style={{ width: `${Math.min(100, Math.max(0, b.percentage))}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Widget: Próximos 7 Dias & Baixa Rápida */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-amber-500" />
                  <span>Próximos Compromissos (7 Dias)</span>
                </h3>
                <span className="text-xs text-zinc-400 font-mono">
                  {summary.upcoming_7_days.length} pendente(s)
                </span>
              </div>

              {summary.upcoming_7_days.length === 0 ? (
                <p className="text-xs text-zinc-400 py-6 text-center">Nenhum compromisso previsto para os próximos 7 dias.</p>
              ) : (
                <div className="divide-y divide-zinc-100 dark:divide-zinc-800 text-xs">
                  {summary.upcoming_7_days.map((item) => (
                    <div key={item.id} className="py-2.5 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <button
                          type="button"
                          onClick={() => handleQuickComplete(item)}
                          disabled={completingId === item.id}
                          className="w-5 h-5 rounded-lg border border-zinc-300 dark:border-zinc-700 hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 flex items-center justify-center transition-all shrink-0 cursor-pointer"
                          title="Dar baixa rápida (Quitar)"
                        >
                          <Check className="w-3.5 h-3.5 text-zinc-400 hover:text-emerald-600" />
                        </button>
                        <div className="truncate">
                          <p className="font-semibold text-zinc-800 dark:text-zinc-200 truncate">
                            {item.description}
                          </p>
                          <p className="text-[10px] text-zinc-400 font-mono">
                            Vencimento: {formatDateToBR(item.due_date)} {item.category_name ? `• ${item.category_name}` : ""}
                          </p>
                        </div>
                      </div>

                      <span className={`font-mono font-bold shrink-0 ${
                        item.type === "DESPESA" ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"
                      }`}>
                        {item.type === "DESPESA" ? "-" : "+"} {formatCurrency(item.amount_cents, hideValues)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Widget: Distribuição por Meio de Pagamento */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-purple-500" />
                  <span>Distribuição por Forma de Pagamento</span>
                </h3>
                <span className="text-xs text-zinc-400 font-mono">
                  {summary.payment_methods_distribution.length} meio(s)
                </span>
              </div>

              {summary.payment_methods_distribution.length === 0 ? (
                <p className="text-xs text-zinc-400 py-6 text-center">Nenhum meio de pagamento registrado no mês.</p>
              ) : (
                <div className="space-y-2.5 pt-1">
                  {summary.payment_methods_distribution.map((pm) => (
                    <div key={pm.name} className="flex items-center justify-between text-xs p-2 rounded-lg bg-zinc-50/60 dark:bg-zinc-800/20 border border-zinc-100 dark:border-zinc-800/60">
                      <div className="flex items-center gap-2 truncate">
                        <CreditCard className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                        <span className="font-semibold text-zinc-800 dark:text-zinc-200 truncate">{pm.name}</span>
                        <span className="text-[10px] text-zinc-400 font-mono">({pm.count} lançamentos)</span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-bold font-mono block text-zinc-900 dark:text-zinc-100">
                          {formatCurrency(pm.amount_cents, hideValues)}
                        </span>
                        <span className="text-[10px] text-zinc-400 font-mono">{pm.percentage}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Widget: Metas Financeiras & Reservas */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <Target className="w-4 h-4 text-emerald-500" />
                  <span>Metas Financeiras & Objetivos</span>
                </h3>
                <span className="text-xs text-zinc-400 font-mono">
                  {summary.goals_summary.length} meta(s)
                </span>
              </div>

              {summary.goals_summary.length === 0 ? (
                <div className="p-6 text-center text-xs text-zinc-400 space-y-1">
                  <p>Nenhuma meta financeira cadastrada.</p>
                  <p className="text-[11px] text-zinc-500">Defina objetivos em Configurações &gt; Metas Financeiras.</p>
                </div>
              ) : (
                <div className="space-y-3 pt-1">
                  {summary.goals_summary.map((g) => {
                    const isDone = g.status === "CONCLUIDA" || g.percentage >= 100;
                    return (
                      <div key={g.id} className="space-y-1.5 p-2 rounded-xl bg-zinc-50/50 dark:bg-zinc-800/20 border border-zinc-100 dark:border-zinc-800/60">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-zinc-800 dark:text-zinc-200">{g.title}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isDone 
                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                              : "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400"
                          }`}>
                            {isDone ? "✓ Atingida" : `${g.percentage}% acumulado`}
                          </span>
                        </div>
                        <div className="flex justify-between text-[11px] font-mono text-zinc-500">
                          <span>Acumulado: <strong>{formatCurrency(g.current_amount_cents, hideValues)}</strong></span>
                          <span>Alvo: {formatCurrency(g.target_amount_cents, hideValues)}</span>
                        </div>
                        <div className="w-full h-2 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${isDone ? "bg-emerald-500" : "bg-indigo-500"}`}
                            style={{ width: `${Math.min(100, g.percentage)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        </>
      )}

      {/* Modal de Lançamentos */}
      <TransactionModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingTransaction(null);
        }}
        onSuccess={() => {
          fetchSummary();
          refreshSyncStatus(false);
        }}
        transactionToEdit={editingTransaction}
      />
    </div>
  );
};
