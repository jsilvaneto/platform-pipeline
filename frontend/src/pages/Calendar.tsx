import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Flame,
  Plus,
  X,
  Repeat,
  Loader2,
  Check,
} from "lucide-react";
import { walletApi } from "../api/walletApi";
import {
  CalendarMonthResponse,
  CalendarDay,
  CalendarPaymentItem,
  ExpenseStatus,
} from "../types";
import { formatCurrency, formatDate } from "../utils/format";

interface CalendarProps {
  onOpenNewExpenseModal: () => void;
}

export const Calendar: React.FC<CalendarProps> = ({ onOpenNewExpenseModal }) => {
  const today = useMemo(() => new Date(), []);
  const currentMonthStr = useMemo(() => {
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
  }, [today]);

  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);
  const [data, setData] = useState<CalendarMonthResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null);
  const [filterStatus, setFilterStatus] = useState<"ALL" | "PENDING" | "PAID" | "OVERDUE">("ALL");
  const [isUpdatingPaymentId, setIsUpdatingPaymentId] = useState<string | null>(null);

  const fetchCalendar = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await walletApi.getCalendarMonth(selectedMonth);
      setData(res);
      // Se um dia estava selecionado, atualiza seus dados
      if (selectedDay) {
        const updated = res.days.find((d) => d.date === selectedDay.date);
        if (updated) setSelectedDay(updated);
      }
    } catch (err) {
      console.error("Erro ao carregar calendário:", err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedMonth, selectedDay]);

  useEffect(() => {
    fetchCalendar();
  }, [selectedMonth]);

  const handlePrevMonth = () => {
    const [y, m] = selectedMonth.split("-").map(Number);
    const prev = new Date(y, m - 2, 1);
    setSelectedMonth(`${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}`);
    setSelectedDay(null);
  };

  const handleNextMonth = () => {
    const [y, m] = selectedMonth.split("-").map(Number);
    const next = new Date(y, m, 1);
    setSelectedMonth(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`);
    setSelectedDay(null);
  };

  const handleToday = () => {
    setSelectedMonth(currentMonthStr);
    const todayStr = today.toISOString().split("T")[0];
    if (data) {
      const d = data.days.find((item) => item.date === todayStr);
      if (d) setSelectedDay(d);
    }
  };

  const handleTogglePayment = async (payment: CalendarPaymentItem) => {
    setIsUpdatingPaymentId(payment.payment_id);
    const nextStatus: ExpenseStatus = payment.status === "CONCLUIDO" ? "PENDENTE" : "CONCLUIDO";
    try {
      await walletApi.updatePaymentStatus(payment.payment_id, { status: nextStatus });
      // Recarrega o mês e atualiza a seleção
      const res = await walletApi.getCalendarMonth(selectedMonth);
      setData(res);
      if (selectedDay) {
        const updatedDay = res.days.find((d) => d.date === selectedDay.date);
        if (updatedDay) setSelectedDay(updatedDay);
      }
    } catch (err) {
      console.error("Erro ao atualizar parcela:", err);
      alert("Erro ao alterar status do pagamento.");
    } finally {
      setIsUpdatingPaymentId(null);
    }
  };

  // Filtragem de pagamentos em um dia de acordo com o filtro selecionado
  const filterPayments = (payments: CalendarPaymentItem[]): CalendarPaymentItem[] => {
    if (filterStatus === "PENDING") return payments.filter((p) => p.status === "PENDENTE");
    if (filterStatus === "PAID") return payments.filter((p) => p.status === "CONCLUIDO");
    if (filterStatus === "OVERDUE") return payments.filter((p) => p.is_overdue);
    return payments;
  };

  const formattedMonthLabel = useMemo(() => {
    if (!data) return "";
    return `${data.month_name} de ${data.year}`;
  }, [data]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Banner de Controles do Calendário */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-200 dark:border-blue-800">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              Calendário Financeiro
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Planejamento e visualização diária de vencimentos e desembolsos.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Seletor de Mês */}
          <div className="flex items-center bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-2xl px-1.5 py-1">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 transition-colors"
              title="Mês Anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 text-xs font-bold text-zinc-800 dark:text-zinc-200 min-w-[140px] text-center capitalize">
              {isLoading && !data ? "Carregando..." : formattedMonthLabel}
            </span>
            <button
              onClick={handleNextMonth}
              className="p-1.5 rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 transition-colors"
              title="Próximo Mês"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={handleToday}
            className="px-3 py-2 text-xs font-semibold rounded-2xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 transition-colors"
          >
            Mês Atual
          </button>

          <button
            onClick={onOpenNewExpenseModal}
            className="px-3.5 py-2 text-xs font-semibold rounded-2xl bg-blue-600 hover:bg-blue-500 text-white flex items-center space-x-1.5 shadow-sm shadow-blue-600/20 transition-all hover:scale-[1.02]"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Despesa</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Rápidos do Mês */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Total Previsto */}
        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xs">
          <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block">
            Total Previsto
          </span>
          <span className="text-xl font-black text-zinc-900 dark:text-zinc-100 mt-1 block">
            {formatCurrency(data?.total_cents || 0)}
          </span>
          <span className="text-[10px] text-zinc-400 mt-0.5 block">
            No mês selecionado
          </span>
        </div>

        {/* Quitado */}
        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xs">
          <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center space-x-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Já Quitado</span>
          </span>
          <span className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1 block">
            {formatCurrency(data?.paid_cents || 0)}
          </span>
          <span className="text-[10px] text-zinc-400 mt-0.5 block">
            {data && data.total_cents > 0
              ? `${Math.round((data.paid_cents / data.total_cents) * 100)}% liquidado`
              : "Sem pagamentos"}
          </span>
        </div>

        {/* A Pagar (Pendente) */}
        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xs">
          <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center space-x-1">
            <Clock className="w-3.5 h-3.5" />
            <span>A Pagar</span>
          </span>
          <span className="text-xl font-black text-amber-600 dark:text-amber-400 mt-1 block">
            {formatCurrency(data?.pending_cents || 0)}
          </span>
          <span className="text-[10px] text-zinc-400 mt-0.5 block">
            Pendências do mês
          </span>
        </div>

        {/* Em Atraso */}
        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xs">
          <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 uppercase tracking-wider flex items-center space-x-1">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Em Atraso</span>
          </span>
          <span
            className={`text-xl font-black mt-1 block ${
              (data?.overdue_cents || 0) > 0
                ? "text-rose-600 dark:text-rose-400"
                : "text-zinc-900 dark:text-zinc-100"
            }`}
          >
            {formatCurrency(data?.overdue_cents || 0)}
          </span>
          <span className="text-[10px] text-zinc-400 mt-0.5 block">
            {(data?.overdue_cents || 0) > 0 ? "Requer quitação" : "Nenhum atraso"}
          </span>
        </div>

        {/* Dia de Maior Desembolso (Pico) */}
        <div className="col-span-2 lg:col-span-1 p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xs">
          <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider flex items-center space-x-1">
            <Flame className="w-3.5 h-3.5" />
            <span>Dia de Pico</span>
          </span>
          <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mt-1 block truncate">
            {data?.peak_day ? formatDate(data.peak_day) : "—"}
          </span>
          <span className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5 block">
            {data?.peak_day_amount_cents
              ? `${formatCurrency(data.peak_day_amount_cents)} previstos`
              : "Sem lançamentos"}
          </span>
        </div>
      </div>

      {/* Barra de Filtros de Visualização da Grade */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center space-x-1.5">
          <span className="font-semibold text-zinc-500 dark:text-zinc-400 mr-1">Filtro:</span>
          <button
            onClick={() => setFilterStatus("ALL")}
            className={`px-3 py-1 rounded-xl font-medium transition-colors ${
              filterStatus === "ALL"
                ? "bg-blue-600 text-white shadow-2xs font-semibold"
                : "bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700"
            }`}
          >
            Todos
          </button>
          <button
            onClick={() => setFilterStatus("PENDING")}
            className={`px-3 py-1 rounded-xl font-medium transition-colors ${
              filterStatus === "PENDING"
                ? "bg-amber-600 text-white shadow-2xs font-semibold"
                : "bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700"
            }`}
          >
            Pendentes
          </button>
          <button
            onClick={() => setFilterStatus("OVERDUE")}
            className={`px-3 py-1 rounded-xl font-medium transition-colors ${
              filterStatus === "OVERDUE"
                ? "bg-rose-600 text-white shadow-2xs font-semibold"
                : "bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700"
            }`}
          >
            Atrasados
          </button>
          <button
            onClick={() => setFilterStatus("PAID")}
            className={`px-3 py-1 rounded-xl font-medium transition-colors ${
              filterStatus === "PAID"
                ? "bg-emerald-600 text-white shadow-2xs font-semibold"
                : "bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700"
            }`}
          >
            Quitados
          </button>
        </div>

        {/* Legenda de Cores */}
        <div className="flex items-center space-x-3 text-[11px] text-zinc-500 dark:text-zinc-400">
          <div className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span>Pago</span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span>A Vencer</span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
            <span>Atrasado</span>
          </div>
        </div>
      </div>

      {/* Grade Principal do Calendário */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl overflow-hidden shadow-sm">
        {/* Cabeçalho dos Dias da Semana */}
        <div className="grid grid-cols-7 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-800/50 text-center py-2.5 text-xs font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
          <div>Dom</div>
          <div>Seg</div>
          <div>Ter</div>
          <div>Qua</div>
          <div>Qui</div>
          <div>Sex</div>
          <div>Sáb</div>
        </div>

        {/* Células da Grade de Dias */}
        <div className="grid grid-cols-7 divide-x divide-y divide-zinc-200/80 dark:divide-zinc-800">
          {data?.days.map((day) => {
            const filteredDayPayments = filterPayments(day.payments);
            const hasPayments = filteredDayPayments.length > 0;
            const isSelected = selectedDay?.date === day.date;
            const dayPending = filteredDayPayments.filter((p) => p.status === "PENDENTE");
            const dayPaid = filteredDayPayments.filter((p) => p.status === "CONCLUIDO");
            const dayOverdue = filteredDayPayments.filter((p) => p.is_overdue);

            return (
              <div
                key={day.date}
                onClick={() => setSelectedDay(day)}
                className={`min-h-[105px] sm:min-h-[120px] p-2 flex flex-col justify-between transition-all cursor-pointer select-none relative group ${
                  !day.is_current_month
                    ? "bg-zinc-50/40 dark:bg-zinc-950/40 opacity-40 hover:opacity-75"
                    : "hover:bg-blue-50/30 dark:hover:bg-blue-950/20"
                } ${
                  isSelected
                    ? "ring-2 ring-blue-600 dark:ring-blue-500 bg-blue-50/40 dark:bg-blue-950/30 z-10"
                    : ""
                }`}
              >
                {/* Número do Dia e Indicadores de Status */}
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs font-bold flex items-center justify-center w-6 h-6 rounded-full transition-all ${
                      day.is_today
                        ? "bg-blue-600 text-white shadow-sm shadow-blue-600/30"
                        : isSelected
                        ? "bg-zinc-800 dark:bg-zinc-200 text-white dark:text-zinc-900"
                        : "text-zinc-700 dark:text-zinc-300 group-hover:text-blue-600 dark:group-hover:text-blue-400"
                    }`}
                  >
                    {day.day}
                  </span>

                  {/* Badges de Status do Dia */}
                  {hasPayments && (
                    <div className="flex items-center space-x-1">
                      {dayOverdue.length > 0 && (
                        <span
                          className="w-2 h-2 rounded-full bg-rose-500 ring-2 ring-rose-300 dark:ring-rose-900 animate-pulse"
                          title={`${dayOverdue.length} vencida(s)`}
                        />
                      )}
                      {dayPending.length > 0 && dayOverdue.length === 0 && (
                        <span
                          className="w-2 h-2 rounded-full bg-amber-500"
                          title={`${dayPending.length} pendente(s)`}
                        />
                      )}
                      {dayPaid.length > 0 && dayPending.length === 0 && (
                        <span
                          className="w-2 h-2 rounded-full bg-emerald-500"
                          title="Todas quitadas"
                        />
                      )}
                    </div>
                  )}
                </div>

                {/* Lista de Contas / Mini Cards no Dia */}
                <div className="space-y-1 my-1 overflow-hidden">
                  {filteredDayPayments.slice(0, 2).map((p) => {
                    const isConcluido = p.status === "CONCLUIDO";
                    return (
                      <div
                        key={p.payment_id}
                        className={`text-[10px] px-1.5 py-0.5 rounded truncate font-medium flex items-center justify-between gap-1 ${
                          p.is_overdue
                            ? "bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
                            : isConcluido
                            ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 line-through opacity-75"
                            : "bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200"
                        }`}
                      >
                        <span className="truncate flex items-center space-x-1">
                          {p.is_recurring && <Repeat className="w-2.5 h-2.5 shrink-0 text-blue-500 inline" />}
                          <span>{p.description}</span>
                        </span>
                        <span className="shrink-0 font-bold">
                          {formatCurrency(p.amount_cents)}
                        </span>
                      </div>
                    );
                  })}

                  {filteredDayPayments.length > 2 && (
                    <span className="text-[9px] text-zinc-400 dark:text-zinc-500 font-semibold block text-center">
                      +{filteredDayPayments.length - 2} mais
                    </span>
                  )}
                </div>

                {/* Total Financeiro do Dia */}
                <div className="text-right">
                  {hasPayments && (
                    <span
                      className={`text-[10px] font-bold ${
                        dayOverdue.length > 0
                          ? "text-rose-600 dark:text-rose-400"
                          : dayPaid.length === filteredDayPayments.length
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-zinc-700 dark:text-zinc-300"
                      }`}
                    >
                      {formatCurrency(day.total_cents)}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Drawer / Painel Lateral de Detalhes do Dia Selecionado */}
      {selectedDay && (
        <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 shadow-2xl p-6 flex flex-col justify-between animate-slide-left">
          <div className="space-y-5 overflow-y-auto pr-1">
            {/* Cabeçalho do Drawer */}
            <div className="flex items-center justify-between pb-4 border-b border-zinc-100 dark:border-zinc-800">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400 block">
                  {selectedDay.weekday_name}-feira
                </span>
                <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                  {formatDate(selectedDay.date)}
                </h3>
              </div>
              <button
                onClick={() => setSelectedDay(null)}
                className="p-2 rounded-xl text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Resumo do Dia */}
            <div className="grid grid-cols-3 gap-2.5 p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-800 text-xs">
              <div>
                <span className="text-zinc-400 text-[10px] block">Total do Dia</span>
                <strong className="text-zinc-900 dark:text-zinc-100 font-bold block mt-0.5">
                  {formatCurrency(selectedDay.total_cents)}
                </strong>
              </div>
              <div>
                <span className="text-emerald-600 dark:text-emerald-400 text-[10px] block">Pago</span>
                <strong className="text-emerald-600 dark:text-emerald-400 font-bold block mt-0.5">
                  {formatCurrency(selectedDay.paid_cents)}
                </strong>
              </div>
              <div>
                <span className="text-amber-600 dark:text-amber-400 text-[10px] block">Pendente</span>
                <strong className="text-amber-600 dark:text-amber-400 font-bold block mt-0.5">
                  {formatCurrency(selectedDay.pending_cents)}
                </strong>
              </div>
            </div>

            {/* Lista de Contas daquele Dia */}
            <div className="space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block">
                Lançamentos com Vencimento neste Dia ({selectedDay.payments.length})
              </span>

              {selectedDay.payments.length === 0 ? (
                <div className="py-12 text-center text-zinc-400 text-xs">
                  Nenhuma conta com vencimento nesta data.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {selectedDay.payments.map((p) => {
                    const isConcluido = p.status === "CONCLUIDO";
                    const isToggling = isUpdatingPaymentId === p.payment_id;

                    return (
                      <div
                        key={p.payment_id}
                        className={`p-3.5 rounded-2xl border transition-all ${
                          p.is_overdue
                            ? "border-rose-200 dark:border-rose-900/60 bg-rose-50/40 dark:bg-rose-950/20"
                            : isConcluido
                            ? "border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/20 dark:bg-emerald-950/10"
                            : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800/40"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center space-x-2.5">
                            <span
                              className="w-3 h-3 rounded-full shrink-0"
                              style={{ backgroundColor: p.category_color }}
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

                          <span className="text-sm font-black text-zinc-900 dark:text-zinc-100 shrink-0">
                            {formatCurrency(p.amount_cents)}
                          </span>
                        </div>

                        {/* Status e Botão de Ação Rápida */}
                        <div className="mt-3 pt-2.5 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                          <div className="flex items-center space-x-1.5">
                            {p.is_overdue && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 flex items-center space-x-1">
                                <AlertTriangle className="w-3 h-3 inline" />
                                <span>Em Atraso</span>
                              </span>
                            )}
                            {isConcluido && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center space-x-1">
                                <Check className="w-3 h-3 inline" />
                                <span>Quitado</span>
                              </span>
                            )}
                            {!isConcluido && !p.is_overdue && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                A Vencer
                              </span>
                            )}
                          </div>

                          {/* Botão de Baixa Rápida */}
                          <button
                            type="button"
                            disabled={isToggling}
                            onClick={() => handleTogglePayment(p)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer ${
                              isConcluido
                                ? "bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300"
                                : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-2xs shadow-emerald-600/20"
                            }`}
                          >
                            {isToggling ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : isConcluido ? (
                              <span>Desmarcar Pagamento</span>
                            ) : (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Pagar Agora</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800">
            <button
              onClick={onOpenNewExpenseModal}
              className="w-full py-2.5 rounded-2xl bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 text-xs font-semibold flex items-center justify-center space-x-1.5 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Adicionar Despesa neste Dia</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
