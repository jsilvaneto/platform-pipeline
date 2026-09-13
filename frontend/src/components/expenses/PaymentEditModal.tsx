import React, { useState, useEffect } from "react";
import { AlertCircle, Loader2, Receipt } from "lucide-react";
import { Modal } from "../Modal";
import { Expense, Payment } from "../../types";
import { formatDate } from "../../utils/format";
import { walletApi } from "../../api/walletApi";
import { AttachmentManagerModal } from "../attachments/AttachmentManagerModal";

interface PaymentEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPayment: Payment | null;
  selectedExpense: Expense | null;
  onSuccess: () => void;
}

export const PaymentEditModal: React.FC<PaymentEditModalProps> = ({
  isOpen,
  onClose,
  selectedPayment,
  selectedExpense,
  onSuccess,
}) => {
  const [amountStr, setAmountStr] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isAttachmentOpen, setIsAttachmentOpen] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen && selectedPayment) {
      setAmountStr((selectedPayment.amount_cents / 100).toFixed(2).replace(".", ","));
      setError(null);
    }
  }, [isOpen, selectedPayment]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPayment) return;

    const cleanAmount = amountStr.replace(/\./g, "").replace(",", ".");
    const parsedAmount = parseFloat(cleanAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError("Informe um valor válido maior que zero para a parcela.");
      return;
    }

    const amountCents = Math.round(parsedAmount * 100);
    setIsSubmitting(true);
    setError(null);
    try {
      await walletApi.updatePayment(selectedPayment.id, {
        amount_cents: amountCents,
      });
      onSuccess();
      onClose();
    } catch {
      setError("Erro ao atualizar o valor da parcela. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Editar Valor da Parcela" maxWidth="sm" zIndex="z-[60]">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Informações de Contexto da Parcela */}
        <div className="p-3 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/80 rounded-xl space-y-1.5 text-xs">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400">
            <span>Registro:</span>
            <span className="font-semibold text-zinc-800 dark:text-zinc-200 truncate max-w-[180px]">
              {selectedExpense?.description}
            </span>
          </div>
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400">
            <span>Parcela:</span>
            <span className="font-bold text-blue-600 dark:text-blue-400">
              Parcela {selectedPayment?.installment_number} de {selectedExpense?.installments_count}
            </span>
          </div>
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400">
            <span>Vencimento:</span>
            <span className="font-medium text-zinc-700 dark:text-zinc-300">
              {selectedPayment ? formatDate(selectedPayment.due_date) : ""}
            </span>
          </div>
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400">
            <span>Status:</span>
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                selectedPayment?.status === "CONCLUIDO"
                  ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300"
                  : "bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300"
              }`}
            >
              {selectedPayment?.status === "CONCLUIDO" ? "Paga" : "Pendente"}
            </span>
          </div>
        </div>

        {/* Aviso explicativo */}
        <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 rounded-xl text-xs text-blue-700 dark:text-blue-300 flex items-start space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            Esta alteração afetará <strong>apenas esta parcela</strong>. As demais parcelas do registro não serão alteradas e o valor total será sincronizado automaticamente.
          </span>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 rounded-xl text-xs text-rose-700 dark:text-rose-300">
            {error}
          </div>
        )}

        {/* Campo Novo Valor */}
        <div>
          <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
            Novo Valor da Parcela (R$) *
          </label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-zinc-400">
              R$
            </span>
            <input
              type="text"
              required
              autoFocus
              placeholder="0,00"
              value={amountStr}
              onChange={(e) => setAmountStr(e.target.value)}
              className="w-full pl-10 pr-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-bold text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-zinc-200 dark:border-zinc-800">
          <button
            type="button"
            onClick={() => setIsAttachmentOpen(true)}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 flex items-center space-x-1.5 transition-colors cursor-pointer"
            title="Ver ou anexar comprovante desta parcela"
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>Comprovantes ({selectedPayment?.attachments?.length || 0})</span>
          </button>

          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-sm shadow-blue-500/20 transition-all disabled:opacity-50 flex items-center space-x-2 cursor-pointer"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{isSubmitting ? "Salvando..." : "Salvar Parcela"}</span>
            </button>
          </div>
        </div>
      </form>

      {isAttachmentOpen && selectedPayment && (
        <AttachmentManagerModal
          isOpen={isAttachmentOpen}
          onClose={() => setIsAttachmentOpen(false)}
          title={`Comprovante - Parcela ${selectedPayment.installment_number} (${selectedExpense?.description})`}
          expenseId={selectedExpense?.id}
          paymentId={selectedPayment.id}
          defaultCategory="COMPROVANTE_PAGAMENTO"
        />
      )}
    </Modal>
  );
};
