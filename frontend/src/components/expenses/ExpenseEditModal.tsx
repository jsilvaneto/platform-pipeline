import React, { useState, useEffect } from "react";
import { Plus, ChevronDown, Edit2, Loader2 } from "lucide-react";
import { Modal } from "../Modal";
import {
  Category,
  Item,
  Contact,
  PaymentMethod,
  Expense,
  Payment,
  EssentialityType,
} from "../../types";
import { formatCurrency, formatDate } from "../../utils/format";
import { walletApi } from "../../api/walletApi";
import { ESSENTIALITY_LABELS } from "./ExpenseCard";

interface ExpenseEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  expense: Expense | null;
  categories: Category[];
  items: Item[];
  contacts: Contact[];
  paymentMethods: PaymentMethod[];
  onSuccess: () => void;
  onOpenQuickItemModal: (categoryId: string, nature: EssentialityType) => void;
  onOpenQuickContactModal: () => void;
  onOpenEditPaymentModal: (expense: Expense, payment: Payment) => void;
  todayIsoDate: string;
}

export const ExpenseEditModal: React.FC<ExpenseEditModalProps> = ({
  isOpen,
  onClose,
  expense,
  categories,
  items,
  contacts,
  paymentMethods,
  onSuccess,
  onOpenQuickItemModal,
  onOpenQuickContactModal,
  onOpenEditPaymentModal,
  todayIsoDate,
}) => {
  const [editItemId, setEditItemId] = useState<string>("");
  const [editContactId, setEditContactId] = useState<string>("");
  const [editDescription, setEditDescription] = useState<string>("");
  const [editAmountStr, setEditAmountStr] = useState<string>("");
  const [editIssueDate, setEditIssueDate] = useState<string>("");
  const [editDueDate, setEditDueDate] = useState<string>("");
  const [editCategoryId, setEditCategoryId] = useState<string>("");
  const [editPaymentMethodId, setEditPaymentMethodId] = useState<string>("");
  const [editEssentiality, setEditEssentiality] = useState<EssentialityType>("NECESSARIO");
  const [editIsRecurring, setEditIsRecurring] = useState<boolean>(false);
  const [editNotes, setEditNotes] = useState<string>("");

  const [showEditInstallmentsList, setShowEditInstallmentsList] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && expense) {
      setError(null);
      setShowEditInstallmentsList(false);
      setEditItemId(expense.item_id || "");
      setEditContactId(expense.contact_id || "");
      setEditDescription(expense.description);
      setEditAmountStr((expense.total_amount_cents / 100).toFixed(2).replace(".", ","));
      setEditIssueDate(expense.issue_date);
      setEditDueDate(expense.due_date);
      setEditCategoryId(expense.category_id || "");
      setEditPaymentMethodId(expense.payment_method_id || "");
      setEditEssentiality(expense.essentiality);
      setEditIsRecurring(expense.is_recurring);
      setEditNotes(expense.notes || "");
    }
  }, [isOpen, expense]);

  const handleSelectEditItem = (itemId: string) => {
    setEditItemId(itemId);
    const selected = items.find((it) => it.id === itemId);
    if (selected) {
      setEditCategoryId(selected.category_id);
      setEditEssentiality(selected.nature);
    }
  };

  const hasPaidInstallments = Boolean(
    expense &&
      expense.installments_count > 1 &&
      expense.payments.some((p) => p.status === "CONCLUIDO")
  );

  const currentSelectedEditItem = items.find((it) => it.id === editItemId);
  const currentSelectedEditCategory = categories.find((c) => c.id === editCategoryId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expense) return;

    if (!editItemId) {
      setError("Selecione um item padronizado obrigatório.");
      return;
    }
    if (!editContactId) {
      setError("Selecione um contato obrigatório.");
      return;
    }
    if (!editDescription.trim()) {
      setError("A descrição é obrigatória.");
      return;
    }

    const cleanAmount = editAmountStr.replace(/\./g, "").replace(",", ".");
    const parsedAmount = parseFloat(cleanAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError("Informe um valor válido maior que zero.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await walletApi.updateExpense(expense.id, {
        item_id: editItemId,
        contact_id: editContactId,
        description: editDescription.trim(),
        total_amount_cents: hasPaidInstallments ? undefined : Math.round(parsedAmount * 100),
        issue_date: editIssueDate,
        due_date: editDueDate,
        category_id: editCategoryId || null,
        payment_method_id: editPaymentMethodId || null,
        essentiality: editEssentiality,
        is_recurring: editIsRecurring,
        notes: editNotes.trim() || null,
      });
      onSuccess();
      onClose();
    } catch {
      setError("Erro ao atualizar lançamento. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Editar Lançamento" maxWidth="xl">
      <form onSubmit={handleSubmit} className="space-y-3.5">
        {error && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 rounded-xl text-xs text-rose-700 dark:text-rose-300">
            {error}
          </div>
        )}

        {/* Item Padronizado e Contato */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Item Padronizado *
              </label>
              <button
                type="button"
                onClick={() =>
                  onOpenQuickItemModal(editCategoryId || categories[0]?.id || "", editEssentiality)
                }
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center space-x-1 font-medium cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Novo Item</span>
              </button>
            </div>
            <select
              required
              value={editItemId}
              onChange={(e) => handleSelectEditItem(e.target.value)}
              className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3.5 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium truncate"
            >
              {items.length === 0 ? (
                <option value="">Nenhum item disponível</option>
              ) : (
                items
                  .filter((it) => it.is_active || it.id === editItemId)
                  .map((it) => (
                    <option key={it.id} value={it.id}>
                      {it.name} ({it.category?.name || "Sem categoria"})
                    </option>
                  ))
              )}
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Contato *
              </label>
              <button
                type="button"
                onClick={onOpenQuickContactModal}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center space-x-1 font-medium cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Novo Contato</span>
              </button>
            </div>
            <select
              required
              value={editContactId}
              onChange={(e) => setEditContactId(e.target.value)}
              className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3.5 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium truncate"
            >
              {contacts.length === 0 ? (
                <option value="">Nenhum contato disponível</option>
              ) : (
                contacts
                  .filter((ct) => ct.is_active || ct.id === editContactId)
                  .map((ct) => (
                    <option key={ct.id} value={ct.id}>
                      {ct.name} {ct.phone ? `(${ct.phone})` : ""}
                    </option>
                  ))
              )}
            </select>
          </div>
        </div>

        {/* Descrição */}
        <div>
          <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
            Descrição da Despesa *
          </label>
          <input
            type="text"
            required
            placeholder="Ex: Supermercado Mensal, Aluguel, Farmácia"
            value={editDescription}
            onChange={(e) => setEditDescription(e.target.value)}
            className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3.5 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Valor Total e Parcelamento */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Valor Total (R$) *
              </label>
              {hasPaidInstallments && (
                <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400">
                  Bloqueado (parcelas pagas)
                </span>
              )}
            </div>
            <input
              type="text"
              required
              disabled={hasPaidInstallments}
              placeholder="0,00"
              value={editAmountStr}
              onChange={(e) => setEditAmountStr(e.target.value)}
              className={`w-full border rounded-xl px-3.5 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                hasPaidInstallments
                  ? "bg-zinc-100 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700/60 text-zinc-500 cursor-not-allowed"
                  : "bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100"
              }`}
            />
            {hasPaidInstallments && (
              <span className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 block">
                Para alterar valores com parcelas pagas, expanda as parcelas ao lado.
              </span>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
              Estrutura de Parcelamento
            </label>
            <div className="bg-zinc-100/70 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/80 rounded-xl px-3.5 py-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-zinc-800 dark:text-zinc-200 text-xs">
                  {expense && expense.installments_count > 1
                    ? `${expense.installments_count} parcelas (${
                        expense.payments.filter((p) => p.status === "CONCLUIDO").length
                      } pagas)`
                    : "À vista (1 parcela)"}
                </span>
                {expense && expense.installments_count > 1 && (
                  <button
                    type="button"
                    onClick={() => setShowEditInstallmentsList((prev) => !prev)}
                    className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center space-x-1 ml-2 shrink-0 cursor-pointer"
                    title={
                      showEditInstallmentsList
                        ? "Ocultar lista de parcelas"
                        : "Ver / editar cada parcela individualmente"
                    }
                  >
                    <span>{showEditInstallmentsList ? "Ocultar" : "Ver parcelas"}</span>
                    <ChevronDown
                      className={`w-3.5 h-3.5 transition-transform duration-200 ${
                        showEditInstallmentsList ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Sub-tabela de Parcelas no Modal de Edição (se expandido) */}
        {expense && expense.installments_count > 1 && showEditInstallmentsList && (
          <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 bg-zinc-50/80 dark:bg-zinc-950/50 space-y-2 animate-fade-in">
            <div>
              <h4 className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                Parcelas deste Registro ({expense.installments_count})
              </h4>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Edite o valor de qualquer parcela individualmente sem alterar as outras.
              </p>
            </div>

            <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-white dark:bg-zinc-900 shadow-2xs">
              <div className="max-h-52 overflow-y-auto overscroll-contain">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 bg-zinc-50/95 dark:bg-zinc-800/95 backdrop-blur-xs border-b border-zinc-200 dark:border-zinc-800 z-10">
                    <tr>
                      <th className="py-2 px-3 text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                        Parcela
                      </th>
                      <th className="py-2 px-3 text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                        Vencimento
                      </th>
                      <th className="py-2 px-3 text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider text-right">
                        Valor
                      </th>
                      <th className="py-2 px-3 text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider text-center">
                        Status
                      </th>
                      <th className="py-2 px-3 text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider text-right">
                        Ação
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 text-xs">
                    {[...expense.payments]
                      .sort((a, b) => a.installment_number - b.installment_number)
                      .map((p) => {
                        const isPaid = p.status === "CONCLUIDO";
                        const isOverdue = !isPaid && p.due_date < todayIsoDate;

                        return (
                          <tr
                            key={p.id}
                            className="hover:bg-zinc-50/60 dark:hover:bg-zinc-800/30 transition-colors"
                          >
                            <td className="py-2 px-3 font-semibold text-zinc-800 dark:text-zinc-200 whitespace-nowrap">
                              Parcela {String(p.installment_number).padStart(2, "0")}/
                              {String(expense.installments_count).padStart(2, "0")}
                            </td>

                            <td className="py-2 px-3 whitespace-nowrap">
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

                            <td className="py-2 px-3 text-right font-bold text-zinc-900 dark:text-zinc-100 whitespace-nowrap">
                              {formatCurrency(p.amount_cents)}
                            </td>

                            <td className="py-2 px-3 text-center whitespace-nowrap">
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

                            <td className="py-2 px-3 text-right whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => onOpenEditPaymentModal(expense, p)}
                                className="px-2 py-1 bg-zinc-100 hover:bg-blue-50 text-zinc-700 hover:text-blue-600 dark:bg-zinc-800 dark:hover:bg-blue-950/60 dark:text-zinc-300 dark:hover:text-blue-400 rounded-lg text-xs font-semibold transition-colors inline-flex items-center space-x-1 cursor-pointer"
                                title="Editar valor apenas desta parcela"
                              >
                                <Edit2 className="w-3 h-3" />
                                <span>Editar</span>
                              </button>
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

        {/* Datas: Realização e Vencimento */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
              Data da Despesa *
            </label>
            <input
              type="date"
              required
              value={editIssueDate}
              onChange={(e) => setEditIssueDate(e.target.value)}
              className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3.5 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
              Data de Vencimento *
            </label>
            <input
              type="date"
              required
              value={editDueDate}
              onChange={(e) => setEditDueDate(e.target.value)}
              className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3.5 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Categoria Vinculada e Natureza da Despesa */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
              Categoria Vinculada
            </label>
            <div className="flex items-center space-x-2.5 bg-zinc-100/70 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/80 rounded-xl px-3.5 py-2 text-sm">
              <span
                className="w-3 h-3 rounded-full shrink-0 shadow-2xs"
                style={{
                  backgroundColor:
                    currentSelectedEditCategory?.color ||
                    currentSelectedEditItem?.category?.color ||
                    "#6366f1",
                }}
              />
              <span className="font-medium text-zinc-800 dark:text-zinc-200">
                {currentSelectedEditCategory?.name ||
                  currentSelectedEditItem?.category?.name ||
                  "Automática pelo item"}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
              Natureza da Despesa
            </label>
            <div className="flex items-center justify-between bg-zinc-100/70 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/80 rounded-xl px-3.5 py-2">
              {currentSelectedEditItem ? (
                <span
                  className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
                    ESSENTIALITY_LABELS[currentSelectedEditItem.nature]?.color || ""
                  }`}
                >
                  {ESSENTIALITY_LABELS[currentSelectedEditItem.nature]?.label ||
                    currentSelectedEditItem.nature}
                </span>
              ) : (
                <span className="text-xs text-zinc-400 dark:text-zinc-500">
                  Definida pelo item
                </span>
              )}
              <span className="text-[11px] text-zinc-400 dark:text-zinc-500">
                (automático do item)
              </span>
            </div>
          </div>
        </div>

        {/* Forma de Pagamento e Recorrência */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
              Forma de Pagamento
            </label>
            <select
              value={editPaymentMethodId}
              onChange={(e) => setEditPaymentMethodId(e.target.value)}
              className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3.5 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Sem forma definida</option>
              {paymentMethods.map((pm) => (
                <option key={pm.id} value={pm.id}>
                  {pm.name}
                </option>
              ))}
            </select>
          </div>

          <div className="pt-4">
            <label className="flex items-center space-x-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={editIsRecurring}
                onChange={(e) => setEditIsRecurring(e.target.checked)}
                className="rounded border-zinc-300 dark:border-zinc-700 text-blue-600 focus:ring-blue-500 w-4 h-4"
              />
              <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                Despesa fixa mensal contínua
              </span>
            </label>
          </div>
        </div>

        {/* Observações */}
        <div>
          <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
            Observações (Opcional)
          </label>
          <textarea
            rows={2}
            placeholder="Detalhes adicionais, comprovante ou observações"
            value={editNotes}
            onChange={(e) => setEditNotes(e.target.value)}
            className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3.5 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Botões do Rodapé */}
        <div className="flex items-center justify-end space-x-3 pt-3 border-t border-zinc-200 dark:border-zinc-800">
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
            <span>Salvar Alterações</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
