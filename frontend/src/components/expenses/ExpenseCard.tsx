import React from "react";
import {
  Tag,
  Repeat,
  Users,
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronUp,
  Edit2,
  Trash2,
} from "lucide-react";
import { Expense, Payment, EssentialityType, ExpenseStatus } from "../../types";
import { formatCurrency, formatDate } from "../../utils/format";
import { ExpenseInstallmentsTable } from "./ExpenseInstallmentsTable";

export const ESSENTIALITY_LABELS: Record<EssentialityType, { label: string; color: string }> = {
  OBRIGATORIO: {
    label: "Obrigatório",
    color: "bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800",
  },
  NECESSARIO: {
    label: "Necessário",
    color: "bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800",
  },
  DESEJO: {
    label: "Desejo",
    color: "bg-sky-100 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800",
  },
  NENHUM: {
    label: "Geral",
    color: "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700",
  },
};

interface ExpenseCardProps {
  expense: Expense;
  selectedMonth: string;
  isExpanded: boolean;
  onToggleExpand: (id: string) => void;
  installmentFilter: "ALL" | "PENDING" | "PAID";
  onSetInstallmentFilter: (filter: "ALL" | "PENDING" | "PAID") => void;
  onTogglePaymentStatus: (paymentId: string, currentStatus: ExpenseStatus) => void;
  onOpenEditModal: (expense: Expense) => void;
  onOpenEditPaymentModal: (expense: Expense, payment: Payment) => void;
  onDeleteExpense: (expenseId: string, description: string) => void;
  todayIsoDate: string;
}

export const ExpenseCard: React.FC<ExpenseCardProps> = ({
  expense,
  selectedMonth,
  isExpanded,
  onToggleExpand,
  installmentFilter,
  onSetInstallmentFilter,
  onTogglePaymentStatus,
  onOpenEditModal,
  onOpenEditPaymentModal,
  onDeleteExpense,
  todayIsoDate,
}) => {
  const isRecurring = expense.is_recurring;
  const isParcelado = expense.installments_count > 1 && !isRecurring;
  const essentialityCfg = ESSENTIALITY_LABELS[expense.essentiality];

  // Parcela relevante do mês selecionado
  const currentInstallment = expense.payments.find((p) =>
    p.due_date.startsWith(selectedMonth)
  );
  const singlePayment = isRecurring ? currentInstallment : expense.payments[0];

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden transition-all hover:border-zinc-300 dark:hover:border-zinc-700">
      {/* Linha Principal da Despesa */}
      <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start space-x-3.5">
          {/* Indicador de Categoria com Cor */}
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-white font-bold text-sm shadow-sm"
            style={{
              backgroundColor: expense.category?.color || "#6366f1",
            }}
          >
            <Tag className="w-5 h-5" />
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="font-semibold text-zinc-900 dark:text-zinc-100 text-base">
                {expense.description}
              </h4>

              {/* Tag Item Padronizado */}
              {expense.item && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  {expense.item.name}
                </span>
              )}

              {/* Tag Essencialidade */}
              <span
                className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${essentialityCfg.color}`}
              >
                {essentialityCfg.label}
              </span>

              {/* Tag Recorrência */}
              {expense.is_recurring && (
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 flex items-center space-x-0.5">
                  <Repeat className="w-2.5 h-2.5 inline mr-0.5" />
                  Recorrente
                </span>
              )}
            </div>

            {/* Metadados: Contato, Categoria, Forma de Pagamento, Data */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              {expense.contact && (
                <>
                  <span className="inline-flex items-center space-x-1 font-medium text-zinc-700 dark:text-zinc-300">
                    <Users className="w-3 h-3 text-zinc-400" />
                    <span>{expense.contact.name}</span>
                  </span>
                  <span>&bull;</span>
                </>
              )}
              <span>{expense.category?.name || "Sem categoria"}</span>
              <span>&bull;</span>
              <span>{expense.payment_method?.name || "Meio não especificado"}</span>
              <span>&bull;</span>
              <span>Vencimento: {formatDate(expense.due_date)}</span>
              {isParcelado && (
                <>
                  <span>&bull;</span>
                  <span className="font-medium text-blue-600 dark:text-blue-400">
                    {expense.installments_count} parcelas
                  </span>
                </>
              )}
            </div>

            {expense.notes && (
              <p className="text-xs text-zinc-400 dark:text-zinc-500 italic mt-1">
                "{expense.notes}"
              </p>
            )}
          </div>
        </div>

        {/* Lado Direito: Valores, Status e Ações */}
        <div className="flex items-center justify-between sm:justify-end space-x-4 pl-13 sm:pl-0">
          <div className="text-right">
            <span className="text-lg font-bold text-zinc-900 dark:text-zinc-100 block">
              {isParcelado && currentInstallment
                ? formatCurrency(currentInstallment.amount_cents)
                : isRecurring && currentInstallment
                ? formatCurrency(currentInstallment.amount_cents)
                : formatCurrency(expense.total_amount_cents)}
            </span>
            {isParcelado && (
              <span className="text-[11px] text-zinc-400 dark:text-zinc-500 block">
                Total: {formatCurrency(expense.total_amount_cents)}
              </span>
            )}
            {isRecurring && (
              <span className="text-[11px] text-blue-600 dark:text-blue-400 font-medium block">
                Recorrência Mensal
              </span>
            )}
          </div>

          {/* Ação Rápida de Pagamento para 1x ou Recorrência */}
          {!isParcelado && singlePayment ? (
            <div className="flex items-center space-x-1.5">
              <button
                onClick={() =>
                  onTogglePaymentStatus(singlePayment.id, singlePayment.status)
                }
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer ${
                  singlePayment.status === "CONCLUIDO"
                    ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-200"
                    : "bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 hover:bg-amber-200"
                }`}
              >
                {singlePayment.status === "CONCLUIDO" ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>Pago</span>
                  </>
                ) : (
                  <>
                    <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    <span>Pagar</span>
                  </>
                )}
              </button>
              {isRecurring && (
                <button
                  type="button"
                  onClick={() => onToggleExpand(expense.id)}
                  className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                  title={
                    isExpanded
                      ? "Ocultar detalhamento de 12 meses"
                      : "Ver histórico e projeção de 12 meses"
                  }
                >
                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              )}
            </div>
          ) : (
            <button
              onClick={() => onToggleExpand(expense.id)}
              className="px-3 py-1.5 rounded-xl text-xs font-medium bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 flex items-center space-x-1 cursor-pointer"
            >
              <span>Parcelas</span>
              {isExpanded ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>
          )}

          {/* Editar Despesa */}
          <button
            onClick={() => onOpenEditModal(expense)}
            className="p-1.5 text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
            title="Editar despesa"
          >
            <Edit2 className="w-4 h-4" />
          </button>

          {/* Excluir Despesa */}
          <button
            onClick={() => onDeleteExpense(expense.id, expense.description)}
            className="p-1.5 text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
            title="Excluir despesa"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Sub-tabela de Parcelas / Recorrência (Quando expandido) */}
      {(isParcelado || isRecurring) && isExpanded && (
        <ExpenseInstallmentsTable
          expense={expense}
          isRecurring={isRecurring}
          currentFilter={installmentFilter}
          onSetFilter={onSetInstallmentFilter}
          onEditPayment={onOpenEditPaymentModal}
          onTogglePaymentStatus={onTogglePaymentStatus}
          todayIsoDate={todayIsoDate}
        />
      )}
    </div>
  );
};
