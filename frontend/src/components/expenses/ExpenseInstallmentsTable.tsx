import React, { useState } from "react";
import { CheckCircle2, Edit2, Receipt } from "lucide-react";
import { Expense, Payment, ExpenseStatus } from "../../types";
import { formatCurrency, formatDate } from "../../utils/format";
import { AttachmentManagerModal } from "../attachments/AttachmentManagerModal";

interface ExpenseInstallmentsTableProps {
  expense: Expense;
  isRecurring: boolean;
  currentFilter: "ALL" | "PENDING" | "PAID";
  onSetFilter: (filter: "ALL" | "PENDING" | "PAID") => void;
  onEditPayment: (expense: Expense, payment: Payment) => void;
  onTogglePaymentStatus: (paymentId: string, currentStatus: ExpenseStatus) => void;
  todayIsoDate: string;
}

export const ExpenseInstallmentsTable: React.FC<ExpenseInstallmentsTableProps> = ({
  expense,
  isRecurring,
  currentFilter,
  onSetFilter,
  onEditPayment,
  onTogglePaymentStatus,
  todayIsoDate,
}) => {
  const [selectedPaymentForAttachment, setSelectedPaymentForAttachment] = useState<Payment | null>(null);
  const sortedPayments = [...expense.payments].sort(
    (a, b) => a.installment_number - b.installment_number
  );
  const paidCount = sortedPayments.filter((p) => p.status === "CONCLUIDO").length;
  const totalCount = expense.installments_count || sortedPayments.length;
  const progressPercent = totalCount > 0 ? Math.round((paidCount / totalCount) * 100) : 0;
  const paidAmountCents = sortedPayments
    .filter((p) => p.status === "CONCLUIDO")
    .reduce((acc, p) => acc + p.amount_cents, 0);
  const remainingAmountCents = Math.max(0, expense.total_amount_cents - paidAmountCents);

  const displayedPayments = sortedPayments.filter((p) => {
    if (currentFilter === "PENDING") return p.status !== "CONCLUIDO";
    if (currentFilter === "PAID") return p.status === "CONCLUIDO";
    return true;
  });

  const formatCompetence = (dueDateStr: string): string => {
    const parts = dueDateStr.split("-");
    if (parts.length >= 2) {
      const year = parts[0];
      const monthIndex = parseInt(parts[1], 10) - 1;
      const monthNames = [
        "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
        "Jul", "Ago", "Set", "Out", "Nov", "Dez"
      ];
      if (monthIndex >= 0 && monthIndex < 12) {
        return `${monthNames[monthIndex]}/${year}`;
      }
    }
    return dueDateStr;
  };

  return (
    <div className="bg-zinc-50/80 dark:bg-zinc-950/50 border-t border-zinc-200 dark:border-zinc-800 px-4 sm:px-6 py-3.5 space-y-3">
      {/* Header com Resumo de Quitação e Filtros */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1.5">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">
              {isRecurring ? "Histórico & Previsão da Despesa Fixa" : "Detalhamento de Parcelas"}
            </span>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-zinc-200/80 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
              {isRecurring
                ? `${paidCount} de ${totalCount} meses pagos (${progressPercent}%)`
                : `${paidCount} de ${totalCount} pagas (${progressPercent}%)`}
            </span>
          </div>

          <div className="flex items-center space-x-3 text-xs text-zinc-500 dark:text-zinc-400">
            {isRecurring ? (
              <>
                <span>
                  Mensalidade:{" "}
                  <strong className="text-blue-600 dark:text-blue-400 font-semibold">
                    {formatCurrency(expense.total_amount_cents)}/mês
                  </strong>
                </span>
                <span>•</span>
                <span>
                  Total Pago no Período:{" "}
                  <strong className="text-emerald-600 dark:text-emerald-400 font-semibold">
                    {formatCurrency(paidAmountCents)}
                  </strong>
                </span>
              </>
            ) : (
              <>
                <span>
                  Pago:{" "}
                  <strong className="text-emerald-600 dark:text-emerald-400 font-semibold">
                    {formatCurrency(paidAmountCents)}
                  </strong>
                </span>
                <span>•</span>
                <span>
                  Restante:{" "}
                  <strong className="text-zinc-700 dark:text-zinc-300 font-semibold">
                    {formatCurrency(remainingAmountCents)}
                  </strong>
                </span>
              </>
            )}
          </div>

          {/* Barra de Progresso visual */}
          <div className="w-full sm:w-64 bg-zinc-200 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Filtros Rápidos (exibidos quando houver mais de 3 parcelas) */}
        {totalCount > 3 && (
          <div className="flex items-center space-x-1 bg-zinc-200/60 dark:bg-zinc-800/80 p-1 rounded-xl self-start sm:self-center">
            <button
              type="button"
              onClick={() => onSetFilter("ALL")}
              className={`px-2.5 py-1 text-xs rounded-lg transition-colors cursor-pointer ${
                currentFilter === "ALL"
                  ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-2xs font-semibold"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 font-medium"
              }`}
            >
              Todas ({totalCount})
            </button>
            <button
              type="button"
              onClick={() => onSetFilter("PENDING")}
              className={`px-2.5 py-1 text-xs rounded-lg transition-colors cursor-pointer ${
                currentFilter === "PENDING"
                  ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-2xs font-semibold"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 font-medium"
              }`}
            >
              Pendentes ({totalCount - paidCount})
            </button>
            <button
              type="button"
              onClick={() => onSetFilter("PAID")}
              className={`px-2.5 py-1 text-xs rounded-lg transition-colors cursor-pointer ${
                currentFilter === "PAID"
                  ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-2xs font-semibold"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 font-medium"
              }`}
            >
              Pagas ({paidCount})
            </button>
          </div>
        )}
      </div>

      {/* Tabela de Parcelas com Sticky Header e Scroll Vertical */}
      <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-white dark:bg-zinc-900 shadow-2xs">
        <div className="max-h-72 overflow-y-auto overscroll-contain">
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
                <th className="py-2.5 px-4 text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider text-right">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 text-xs">
              {displayedPayments.map((p) => {
                const isPaid = p.status === "CONCLUIDO";
                const isOverdue = !isPaid && p.due_date < todayIsoDate;

                return (
                  <tr
                    key={p.id}
                    className="hover:bg-zinc-50/60 dark:hover:bg-zinc-800/30 transition-colors"
                  >
                    <td className="py-2.5 px-4 font-semibold text-zinc-800 dark:text-zinc-200 whitespace-nowrap">
                      {isRecurring ? (
                        <span className="flex items-center space-x-1.5">
                          <span className="text-blue-600 dark:text-blue-400 font-bold">
                            {formatCompetence(p.due_date)}
                          </span>
                          <span className="text-[10px] text-zinc-400 font-normal">
                            (Mês {String(p.installment_number).padStart(2, "0")})
                          </span>
                        </span>
                      ) : (
                        `Parcela ${String(p.installment_number).padStart(2, "0")}/${String(totalCount).padStart(2, "0")}`
                      )}
                    </td>

                    <td className="py-2.5 px-4 whitespace-nowrap">
                      <span
                        className={
                          isOverdue
                            ? "text-rose-600 dark:text-rose-400 font-semibold"
                            : "text-zinc-600 dark:text-zinc-300"
                        }
                      >
                        {formatDate(p.due_date)}
                      </span>
                    </td>

                    <td className="py-2.5 px-4 text-right font-bold text-zinc-900 dark:text-zinc-100 whitespace-nowrap">
                      {formatCurrency(p.amount_cents)}
                    </td>

                    <td className="py-2.5 px-4 text-center whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                          isPaid
                            ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                            : isOverdue
                            ? "bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800"
                            : "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800"
                        }`}
                      >
                        {isPaid ? "Paga" : isOverdue ? "Atrasada" : "Pendente"}
                      </span>
                    </td>

                    <td className="py-2.5 px-4 text-right whitespace-nowrap space-x-1">
                      <button
                        type="button"
                        onClick={() => setSelectedPaymentForAttachment(p)}
                        className={`p-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer inline-flex items-center ${
                          p.attachments && p.attachments.length > 0
                            ? "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/50"
                            : "text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                        }`}
                        title={
                          p.attachments && p.attachments.length > 0
                            ? `Comprovante anexado (${p.attachments.length}) - clique para ver/gerenciar`
                            : "Anexar comprovante de pagamento desta parcela"
                        }
                      >
                        <Receipt className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onEditPayment(expense, p)}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer inline-flex items-center"
                        title="Editar valor desta parcela"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onTogglePaymentStatus(p.id, p.status)}
                        className={`p-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer inline-flex items-center ${
                          isPaid
                            ? "text-emerald-600 dark:text-emerald-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                            : "text-zinc-400 hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-950/50"
                        }`}
                        title={isPaid ? "Desmarcar pagamento" : "Marcar como pago"}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}

              {displayedPayments.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="py-6 text-center text-zinc-400 dark:text-zinc-500"
                  >
                    Nenhuma parcela encontrada para o filtro selecionado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Gerenciamento de Anexos da Parcela */}
      {selectedPaymentForAttachment && (
        <AttachmentManagerModal
          isOpen={true}
          onClose={() => setSelectedPaymentForAttachment(null)}
          title={`Comprovante - Parcela ${selectedPaymentForAttachment.installment_number} (${expense.description})`}
          expenseId={expense.id}
          paymentId={selectedPaymentForAttachment.id}
          defaultCategory="COMPROVANTE_PAGAMENTO"
        />
      )}
    </div>
  );
};
