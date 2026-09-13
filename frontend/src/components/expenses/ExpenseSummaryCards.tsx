import React from "react";
import { CheckCircle2, Clock } from "lucide-react";
import { formatCurrency } from "../../utils/format";

interface ExpenseSummaryCardsProps {
  totalExpensesCents: number;
  totalPaidCents: number;
  totalPendingCents: number;
  currentMonthPaymentsCount: number;
  currentMonthPendingCount: number;
}

export const ExpenseSummaryCards: React.FC<ExpenseSummaryCardsProps> = ({
  totalExpensesCents,
  totalPaidCents,
  totalPendingCents,
  currentMonthPaymentsCount,
  currentMonthPendingCount,
}) => {
  const paidPercent =
    totalExpensesCents > 0 ? Math.round((totalPaidCents / totalExpensesCents) * 100) : 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
          Total Previsto no Mês
        </span>
        <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mt-1">
          {formatCurrency(totalExpensesCents)}
        </p>
        <span className="text-xs text-zinc-400 dark:text-zinc-500 mt-1 block">
          {currentMonthPaymentsCount} parcelas/lançamentos
        </span>
      </div>

      <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center space-x-1">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Total Já Pago</span>
        </span>
        <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
          {formatCurrency(totalPaidCents)}
        </p>
        <span className="text-xs text-zinc-400 dark:text-zinc-500 mt-1 block">
          {totalExpensesCents > 0
            ? `${paidPercent}% quitado`
            : "Nenhum valor no mês"}
        </span>
      </div>

      <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <span className="text-xs font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center space-x-1">
          <Clock className="w-3.5 h-3.5" />
          <span>A Pagar (Pendente)</span>
        </span>
        <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">
          {formatCurrency(totalPendingCents)}
        </p>
        <span className="text-xs text-zinc-400 dark:text-zinc-500 mt-1 block">
          {currentMonthPendingCount} pendências no mês
        </span>
      </div>
    </div>
  );
};
