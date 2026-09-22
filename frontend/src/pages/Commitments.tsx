import React, { useState, useEffect, useCallback } from "react";
import {
  Repeat,
  CreditCard,
  TrendingDown,
  PlayCircle,
  PauseCircle,
  ChevronDown,
  ChevronUp,
  Plus,
  Loader2,
  AlertCircle,
  CalendarClock,
  Layers,
  ShieldCheck,
  Target,
  PieChart,
  AlertTriangle,
} from "lucide-react";
import { walletApi } from "../api/walletApi";
import {
  CommitmentsSummary,
  RecurringCommitmentItem,
  FutureAnalyticsResponse,
} from "../types";
import { formatCurrency, formatDate } from "../utils/format";

interface CommitmentsProps {
  onOpenNewExpenseModal: () => void;
}

export const Commitments: React.FC<CommitmentsProps> = ({
  onOpenNewExpenseModal,
}) => {
  const [data, setData] = useState<CommitmentsSummary | null>(null);
  const [futureData, setFutureData] = useState<FutureAnalyticsResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"recurring" | "goals" | "budgets" | "installments">("recurring");
  const [expandedInstallmentIds, setExpandedInstallmentIds] = useState<Set<string>>(new Set());
  const [isTogglingId, setIsTogglingId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [summary, future] = await Promise.all([
        walletApi.getCommitmentsSummary(),
        walletApi.getFutureAnalytics(90).catch(() => null),
      ]);
      setData(summary);
      setFutureData(future);
    } catch {
      setError("Erro ao carregar dados de compromissos financeiros e previsões.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const toggleExpandInstallment = (id: string) => {
    setExpandedInstallmentIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleToggleRecurringStatus = async (item: RecurringCommitmentItem) => {
    setIsTogglingId(item.expense_id);
    try {
      await walletApi.toggleRecurringCommitment(item.expense_id);
      await loadData();
    } catch {
      alert("Erro ao alterar o status da despesa recorrente.");
    } finally {
      setIsTogglingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
          Consolidando compromissos financeiros e projeções...
        </span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-center py-16 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-8">
        <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
        <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
          {error || "Dados indisponíveis"}
        </h3>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
          Não foi possível sincronizar os compromissos. Tente recarregar.
        </p>
        <button
          onClick={loadData}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700 transition-colors"
        >
          Tentar Novamente
        </button>
      </div>
    );
  }

  // Cálculos para o gráfico de projeção de 12 meses
  const maxProjectionTotal = Math.max(
    ...data.monthly_projection.map((m) => m.total_cents),
    1
  );

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Cabeçalho da Página */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
              <CalendarClock className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                Compromissos Financeiros
              </h1>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Gestão centralizada de contas fixas recorrentes, assinaturas e compras parceladas com projeção de desoneração.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={onOpenNewExpenseModal}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Lançamento</span>
          </button>
        </div>
      </div>

      {/* Alerta Preditivo de Liquidez (Se houver risco de saldo negativo) */}
      {futureData?.liquidity_alerts && futureData.liquidity_alerts.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 flex items-start space-x-3 text-amber-900 dark:text-amber-200 shadow-2xs">
          <AlertTriangle className="w-5 h-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">
              Aviso Preventivo de Liquidez Futura
            </h4>
            {futureData.liquidity_alerts.map((al, idx) => (
              <p key={idx} className="text-xs text-amber-700 dark:text-amber-300">
                {al.title}: {al.description} (Déficit projetado: <strong>{formatCurrency(al.projected_deficit_cents)}</strong> em {formatDate(al.date_expected)})
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Cards de Métricas Principais */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Card 1: Custo Fixo Mensal */}
        <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Custo Fixo Recorrente
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Repeat className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-zinc-900 dark:text-zinc-100 block">
              {formatCurrency(data.fixed_monthly_total_cents)}
              <span className="text-xs font-medium text-zinc-400 ml-1">/mês</span>
            </span>
            <span className="text-xs text-zinc-500 dark:text-zinc-400 block mt-0.5">
              {data.active_recurring_count} ordens ou contas fixas ativas
            </span>
          </div>
        </div>

        {/* Card 2: Saldo Devedor Parcelado */}
        <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Saldo Parcelado / Dívidas
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-zinc-900 dark:text-zinc-100 block">
              {formatCurrency(data.total_installments_remaining_cents)}
            </span>
            <span className="text-xs text-zinc-500 dark:text-zinc-400 block mt-0.5">
              {data.active_installments_count} planos ou dívidas em andamento
            </span>
          </div>
        </div>

        {/* Card 3: Metas em Acompanhamento */}
        <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Metas Financeiras
            </span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Target className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-zinc-900 dark:text-zinc-100 block">
              {futureData?.goals_projections?.length || 0}
            </span>
            <span className="text-xs text-zinc-500 dark:text-zinc-400 block mt-0.5">
              Metas sincronizadas da Wallet
            </span>
          </div>
        </div>

        {/* Card 4: Orçamentos Ativos */}
        <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Orçamentos Monitorados
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <PieChart className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-zinc-900 dark:text-zinc-100 block">
              {futureData?.budgets_forecast?.length || 0}
            </span>
            <span className="text-xs text-zinc-500 dark:text-zinc-400 block mt-0.5">
              Categorias com limite de gastos
            </span>
          </div>
        </div>
      </div>


      {/* Seção de Projeção Visual dos Próximos 12 Meses (Linha de Alívio Financeiro) */}
      <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center space-x-2">
              <TrendingDown className="w-4 h-4 text-emerald-500" />
              <span>Projeção de Compromissos Futuros (Próximos 12 Meses)</span>
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Acompanhe o impacto do término das suas compras parceladas sobre o seu custo de vida.
            </p>
          </div>

          <div className="flex items-center space-x-4 text-xs font-medium self-start sm:self-center">
            <div className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-blue-500 inline-block" />
              <span className="text-zinc-600 dark:text-zinc-400">Contas Fixas / Recorrências</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-amber-500 inline-block" />
              <span className="text-zinc-600 dark:text-zinc-400">Parcelamentos Ativos</span>
            </div>
          </div>
        </div>

        {/* Gráfico de Barras Empilhadas */}
        <div className="pt-4">
          <div className="grid grid-cols-6 sm:grid-cols-12 gap-2 sm:gap-3 items-end h-44 border-b border-zinc-200 dark:border-zinc-800 pb-2">
            {data.monthly_projection.map((m, idx) => {
              const totalHeightPct = Math.round((m.total_cents / maxProjectionTotal) * 100);
              const recHeightPct =
                m.total_cents > 0 ? Math.round((m.recurring_cents / m.total_cents) * 100) : 0;
              const instHeightPct =
                m.total_cents > 0 ? Math.round((m.installments_cents / m.total_cents) * 100) : 0;

              return (
                <div key={m.month} className="flex flex-col items-center h-full justify-end group relative">
                  {/* Tooltip ao passar o mouse */}
                  <div className="absolute -top-14 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-[11px] rounded-lg px-2.5 py-1.5 shadow-lg whitespace-nowrap z-20">
                    <p className="font-bold">{m.month_name}</p>
                    <p>Total: {formatCurrency(m.total_cents)}</p>
                    <p className="text-[10px] opacity-80">
                      Fixos: {formatCurrency(m.recurring_cents)} • Parcelas: {formatCurrency(m.installments_cents)}
                    </p>
                  </div>

                  {/* Barra Empilhada */}
                  <div
                    className="w-full max-w-[28px] rounded-t-md overflow-hidden flex flex-col justify-end transition-all duration-300 group-hover:brightness-110"
                    style={{ height: `${Math.max(totalHeightPct, 6)}%` }}
                  >
                    {/* Parcela (Âmbar) no topo da barra */}
                    {m.installments_cents > 0 && (
                      <div
                        className="w-full bg-amber-500/90 transition-all"
                        style={{ height: `${instHeightPct}%` }}
                      />
                    )}
                    {/* Recorrência (Azul) na base da barra */}
                    {m.recurring_cents > 0 && (
                      <div
                        className="w-full bg-blue-600 dark:bg-blue-500 transition-all"
                        style={{ height: `${recHeightPct}%` }}
                      />
                    )}
                  </div>

                  {/* Rótulo do Mês */}
                  <span className={`text-[11px] font-semibold mt-2 ${idx === 0 ? "text-blue-600 dark:text-blue-400" : "text-zinc-500 dark:text-zinc-400"}`}>
                    {m.month_name}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Abas: Contas Fixas vs Metas vs Orçamentos vs Parcelamentos */}
      <div className="space-y-4">
        <div className="flex border-b border-zinc-200 dark:border-zinc-800 overflow-x-auto">
          <button
            onClick={() => setActiveTab("recurring")}
            className={`pb-3 px-5 text-sm font-semibold flex items-center space-x-2 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === "recurring"
                ? "border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400"
                : "border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"
            }`}
          >
            <Repeat className="w-4 h-4" />
            <span>Contas Fixas ({data.recurring_commitments.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("goals")}
            className={`pb-3 px-5 text-sm font-semibold flex items-center space-x-2 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === "goals"
                ? "border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400"
                : "border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"
            }`}
          >
            <Target className="w-4 h-4" />
            <span>Metas ({futureData?.goals_projections?.length || 0})</span>
          </button>

          <button
            onClick={() => setActiveTab("budgets")}
            className={`pb-3 px-5 text-sm font-semibold flex items-center space-x-2 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === "budgets"
                ? "border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400"
                : "border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"
            }`}
          >
            <PieChart className="w-4 h-4" />
            <span>Orçamentos ({futureData?.budgets_forecast?.length || 0})</span>
          </button>

          <button
            onClick={() => setActiveTab("installments")}
            className={`pb-3 px-5 text-sm font-semibold flex items-center space-x-2 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === "installments"
                ? "border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400"
                : "border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Parcelamentos ({data.installment_commitments.length})</span>
          </button>
        </div>

        {/* Conteúdo Aba 1: Recorrências */}
        {activeTab === "recurring" && (
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-800">
                  <tr>
                    <th className="py-3 px-4 text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                      Serviço / Conta Recorrente
                    </th>
                    <th className="py-3 px-4 text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                      Beneficiário / Contato
                    </th>
                    <th className="py-3 px-4 text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                      Vencimento
                    </th>
                    <th className="py-3 px-4 text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider text-right">
                      Valor Mensal
                    </th>
                    <th className="py-3 px-4 text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider text-center">
                      Status
                    </th>
                    <th className="py-3 px-4 text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider text-right">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 text-xs">
                  {data.recurring_commitments.map((item) => {
                    const isPaused = item.status === "CANCELADO";
                    const isToggling = isTogglingId === item.expense_id;

                    return (
                      <tr
                        key={item.expense_id}
                        className={`hover:bg-zinc-50/60 dark:hover:bg-zinc-800/30 transition-colors ${
                          isPaused ? "opacity-60" : ""
                        }`}
                      >
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="flex items-center space-x-3">
                            <span
                              className="w-3 h-3 rounded-full shrink-0"
                              style={{ backgroundColor: item.category_color || "#6366f1" }}
                            />
                            <div>
                              <span className="font-bold text-zinc-900 dark:text-zinc-100 text-sm block">
                                {item.description}
                              </span>
                              <div className="flex items-center space-x-2 text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                                <span>{item.item_name}</span>
                                <span>•</span>
                                <span>{item.category_name}</span>
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-zinc-600 dark:text-zinc-300 whitespace-nowrap">
                          {item.contact_name || "—"}
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="font-semibold text-zinc-800 dark:text-zinc-200 block">
                            Todo dia {String(item.due_day).padStart(2, "0")}
                          </span>
                          {item.next_due_date && (
                            <span className="text-[11px] text-zinc-400">
                              Próximo: {formatDate(item.next_due_date)}
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-right font-bold text-sm text-zinc-900 dark:text-zinc-100 whitespace-nowrap">
                          {formatCurrency(item.amount_cents)}
                        </td>

                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-medium border ${
                              !isPaused
                                ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700"
                            }`}
                          >
                            {!isPaused ? "Ativa" : "Pausada"}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-right whitespace-nowrap space-x-2">
                          <button
                            type="button"
                            disabled={isToggling}
                            onClick={() => handleToggleRecurringStatus(item)}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer inline-flex items-center text-xs font-semibold space-x-1 ${
                              !isPaused
                                ? "text-zinc-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                                : "text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                            }`}
                            title={!isPaused ? "Pausar recorrência" : "Reativar recorrência"}
                          >
                            {isToggling ? (
                              <Loader2 className="w-4 h-4 animate-spin text-zinc-400" />
                            ) : !isPaused ? (
                              <>
                                <PauseCircle className="w-4 h-4" />
                                <span className="hidden sm:inline">Pausar</span>
                              </>
                            ) : (
                              <>
                                <PlayCircle className="w-4 h-4" />
                                <span className="hidden sm:inline">Reativar</span>
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                    );
                  })}

                  {data.recurring_commitments.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-zinc-400 dark:text-zinc-500">
                        <Repeat className="w-8 h-8 mx-auto mb-2 opacity-40 text-zinc-400" />
                        <p className="font-semibold text-sm text-zinc-700 dark:text-zinc-300">
                          Nenhuma despesa fixa ou assinatura cadastrada
                        </p>
                        <p className="text-xs text-zinc-400 mt-1">
                          Ao cadastrar uma despesa com a opção "Despesa fixa recorrente", ela será exibida e projetada aqui.
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Conteúdo Aba 2: Metas Patrimoniais */}
        {activeTab === "goals" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(futureData?.goals_projections || []).map((goal) => {
              const isCompleted = goal.current_amount_cents >= goal.target_amount_cents;
              return (
                <div
                  key={goal.goal_id}
                  className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-2xs space-y-4 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center border border-purple-200 dark:border-purple-800">
                        <Target className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                          {goal.name}
                        </h4>
                        <span className="text-[11px] text-zinc-400">
                          {goal.desired_date ? `Alvo: ${formatDate(goal.desired_date)}` : "Sem prazo fixo"}
                        </span>
                      </div>
                    </div>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                        isCompleted
                          ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                          : goal.is_on_track
                          ? "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800"
                          : "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800"
                      }`}
                    >
                      {isCompleted ? "Conquistada" : goal.is_on_track ? "No Ritmo" : "Abaixo do Ritmo"}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                        {formatCurrency(goal.current_amount_cents)}
                      </span>
                      <span className="text-zinc-400">
                        Alvo: {formatCurrency(goal.target_amount_cents)}
                      </span>
                    </div>
                    <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isCompleted ? "bg-emerald-500" : "bg-purple-600 dark:bg-purple-500"
                        }`}
                        style={{ width: `${Math.min(100, goal.progress_percent)}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400 pt-0.5">
                      <span>{goal.progress_percent}% acumulado</span>
                      {goal.monthly_savings_needed_cents > 0 && (
                        <span>Necessário: {formatCurrency(goal.monthly_savings_needed_cents)}/mês</span>
                      )}
                    </div>
                  </div>

                  {goal.estimated_completion_date && !isCompleted && (
                    <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 text-[11px] text-zinc-500 dark:text-zinc-400 flex items-center justify-between">
                      <span>Previsão estimada:</span>
                      <strong className="text-zinc-800 dark:text-zinc-200">{formatDate(goal.estimated_completion_date)}</strong>
                    </div>
                  )}
                </div>
              );
            })}

            {(!futureData?.goals_projections || futureData.goals_projections.length === 0) && (
              <div className="col-span-full text-center py-12 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-8">
                <Target className="w-8 h-8 mx-auto mb-2 opacity-40 text-zinc-400" />
                <p className="font-semibold text-sm text-zinc-700 dark:text-zinc-300">
                  Nenhuma meta financeira ativa
                </p>
                <p className="text-xs text-zinc-400 mt-1">
                  Cadastre ou sincronize metas do Wallet para acompanhar o ritmo preditivo de conquista aqui.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Conteúdo Aba 3: Orçamentos por Categoria */}
        {activeTab === "budgets" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(futureData?.budgets_forecast || []).map((budget) => {
              const spentPct = budget.limit_cents > 0 ? Math.round((budget.spent_so_far_cents / budget.limit_cents) * 100) : 0;
              const isOver = budget.spent_so_far_cents > budget.limit_cents;
              return (
                <div
                  key={budget.budget_id}
                  className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-2xs space-y-4 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-200 dark:border-emerald-800">
                        <PieChart className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                          {budget.name}
                        </h4>
                        <span className="text-[11px] text-zinc-400">
                          {budget.days_remaining} dias restantes no ciclo
                        </span>
                      </div>
                    </div>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                        isOver
                          ? "bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800"
                          : budget.is_exceeded_projected
                          ? "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800"
                          : "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                      }`}
                    >
                      {isOver ? "Excedido" : budget.is_exceeded_projected ? "Risco de Estouro" : "Dentro do Teto"}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className={`font-semibold ${isOver ? "text-rose-600 dark:text-rose-400" : "text-zinc-900 dark:text-zinc-100"}`}>
                        Consumido: {formatCurrency(budget.spent_so_far_cents)}
                      </span>
                      <span className="text-zinc-400">
                        Teto: {formatCurrency(budget.limit_cents)}
                      </span>
                    </div>
                    <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isOver ? "bg-rose-500" : budget.is_exceeded_projected ? "bg-amber-500" : "bg-emerald-500"
                        }`}
                        style={{ width: `${Math.min(100, spentPct)}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400 pt-0.5">
                      <span>{spentPct}% do teto consumido</span>
                      <span>Disponível: {formatCurrency(budget.remaining_cents)}</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 text-[11px] text-zinc-500 dark:text-zinc-400 flex items-center justify-between">
                    <span>Ritmo diário de consumo:</span>
                    <strong className="text-zinc-800 dark:text-zinc-200">{formatCurrency(budget.burn_rate_daily_cents)}/dia</strong>
                  </div>
                </div>
              );
            })}

            {(!futureData?.budgets_forecast || futureData.budgets_forecast.length === 0) && (
              <div className="col-span-full text-center py-12 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-8">
                <PieChart className="w-8 h-8 mx-auto mb-2 opacity-40 text-zinc-400" />
                <p className="font-semibold text-sm text-zinc-700 dark:text-zinc-300">
                  Nenhum orçamento configurado
                </p>
                <p className="text-xs text-zinc-400 mt-1">
                  Defina orçamentos de gastos no app Wallet para monitorar o ritmo de consumo aqui.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Conteúdo Aba 4: Parcelamentos */}
        {activeTab === "installments" && (
          <div className="space-y-3">
            {data.installment_commitments.map((item) => {
              const isExpanded = expandedInstallmentIds.has(item.expense_id);
              const isSettled = item.remaining_installments === 0;

              return (
                <div
                  key={item.expense_id}
                  className={`bg-white dark:bg-zinc-900 border rounded-2xl overflow-hidden shadow-2xs transition-all ${
                    isSettled
                      ? "border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/20 dark:bg-emerald-950/10"
                      : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
                  }`}
                >
                  {/* Linha Principal do Parcelamento */}
                  <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start space-x-3.5">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-white font-bold text-sm shadow-sm"
                        style={{ backgroundColor: item.category_color || "#6366f1" }}
                      >
                        <CreditCard className="w-5 h-5" />
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <h4 className="font-bold text-base text-zinc-900 dark:text-zinc-100">
                            {item.description}
                          </h4>
                          {isSettled ? (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center space-x-1">
                              <ShieldCheck className="w-3 h-3 inline" />
                              <span>Quitado</span>
                            </span>
                          ) : (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                              Em andamento ({item.remaining_installments}x restantes)
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500 dark:text-zinc-400">
                          {item.contact_name && (
                            <span>Beneficiário: <strong className="text-zinc-700 dark:text-zinc-300">{item.contact_name}</strong></span>
                          )}
                          <span>•</span>
                          <span>{item.category_name}</span>
                          {item.last_due_date && (
                            <>
                              <span>•</span>
                              <span>Término previsto: <strong className="text-zinc-700 dark:text-zinc-300">{formatDate(item.last_due_date)}</strong></span>
                            </>
                          )}
                        </div>

                        {/* Barra de Progresso de Quitação */}
                        <div className="w-full sm:w-64 pt-1">
                          <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 mb-1">
                            <span>{item.paid_installments} de {item.total_installments} pagas</span>
                            <span>{item.progress_percentage}%</span>
                          </div>
                          <div className="w-full bg-zinc-200 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                            <div
                              className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                              style={{ width: `${item.progress_percentage}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Valores e Ações */}
                    <div className="flex items-center justify-between sm:justify-end space-x-5 pl-13 sm:pl-0">
                      <div className="text-right">
                        <span className="text-lg font-black text-zinc-900 dark:text-zinc-100 block">
                          {formatCurrency(item.remaining_amount_cents)}
                        </span>
                        <span className="text-[11px] text-zinc-400 block">
                          Total da compra: {formatCurrency(item.total_amount_cents)}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => toggleExpandInstallment(item.expense_id)}
                        className="px-3 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 rounded-xl text-xs font-semibold transition-colors flex items-center space-x-1.5 cursor-pointer"
                      >
                        <span>{isExpanded ? "Ocultar" : "Ver parcelas"}</span>
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* Detalhamento de Parcelas (Quando expandido) */}
                  {isExpanded && (
                    <div className="border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-950/50 p-4 sm:p-5 space-y-3 animate-fade-in">
                      <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider block">
                        Detalhamento das Parcelas deste Parcelamento
                      </span>

                      <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-white dark:bg-zinc-900 shadow-2xs">
                        <div className="max-h-60 overflow-y-auto overscroll-contain">
                          <table className="w-full text-left border-collapse">
                            <thead className="sticky top-0 bg-zinc-50/95 dark:bg-zinc-800/95 backdrop-blur-xs border-b border-zinc-200 dark:border-zinc-800 z-10">
                              <tr>
                                <th className="py-2.5 px-4 text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                                  Parcela
                                </th>
                                <th className="py-2.5 px-4 text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                                  Vencimento
                                </th>
                                <th className="py-2.5 px-4 text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider text-right">
                                  Valor
                                </th>
                                <th className="py-2.5 px-4 text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider text-center">
                                  Status
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 text-xs">
                              {item.payments.map((p) => {
                                const isPaid = p.status === "CONCLUIDO";

                                return (
                                  <tr key={p.id} className="hover:bg-zinc-50/60 dark:hover:bg-zinc-800/30 transition-colors">
                                    <td className="py-2.5 px-4 font-semibold text-zinc-800 dark:text-zinc-200 whitespace-nowrap">
                                      Parcela {String(p.installment_number).padStart(2, "0")}/{String(item.total_installments).padStart(2, "0")}
                                    </td>
                                    <td className="py-2.5 px-4 text-zinc-600 dark:text-zinc-300 whitespace-nowrap">
                                      {formatDate(p.due_date)}
                                    </td>
                                    <td className="py-2.5 px-4 text-right font-bold text-zinc-900 dark:text-zinc-100 whitespace-nowrap">
                                      {formatCurrency(p.amount_cents)}
                                    </td>
                                    <td className="py-2.5 px-4 text-center whitespace-nowrap">
                                      <span
                                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                                          isPaid
                                            ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                                            : "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800"
                                        }`}
                                      >
                                        {isPaid ? "Paga" : "Pendente"}
                                      </span>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {data.installment_commitments.length === 0 && (
              <div className="text-center py-12 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-8">
                <CreditCard className="w-8 h-8 mx-auto mb-2 opacity-40 text-zinc-400" />
                <p className="font-semibold text-sm text-zinc-700 dark:text-zinc-300">
                  Nenhum parcelamento registrado
                </p>
                <p className="text-xs text-zinc-400 mt-1">
                  Compras parceladas criadas no sistema serão listadas e monitoradas aqui.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
