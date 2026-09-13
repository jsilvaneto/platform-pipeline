import React, { useState, useEffect, useMemo } from "react";
import { Plus, Repeat, Loader2 } from "lucide-react";
import { Modal } from "../Modal";
import {
  Category,
  Item,
  Contact,
  PaymentMethod,
  EssentialityType,
} from "../../types";
import { formatCurrency } from "../../utils/format";
import { walletApi } from "../../api/walletApi";
import { ESSENTIALITY_LABELS } from "./ExpenseCard";

interface ExpenseCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  items: Item[];
  contacts: Contact[];
  paymentMethods: PaymentMethod[];
  onSuccess: () => void;
  onOpenQuickItemModal: (categoryId: string, nature: EssentialityType) => void;
  onOpenQuickContactModal: () => void;
}

export const ExpenseCreateModal: React.FC<ExpenseCreateModalProps> = ({
  isOpen,
  onClose,
  categories,
  items,
  contacts,
  paymentMethods,
  onSuccess,
  onOpenQuickItemModal,
  onOpenQuickContactModal,
}) => {
  const today = useMemo(() => new Date(), []);
  const todayIsoDate = today.toISOString().split("T")[0];

  const [formItemId, setFormItemId] = useState<string>("");
  const [formContactId, setFormContactId] = useState<string>("");
  const [formDescription, setFormDescription] = useState<string>("");
  const [formAmountStr, setFormAmountStr] = useState<string>("");
  const [formIssueDate, setFormIssueDate] = useState<string>(todayIsoDate);
  const [formDueDate, setFormDueDate] = useState<string>(todayIsoDate);
  const [formCategoryId, setFormCategoryId] = useState<string>("");
  const [formPaymentMethodId, setFormPaymentMethodId] = useState<string>("");
  const [formEssentiality, setFormEssentiality] = useState<EssentialityType>("NECESSARIO");
  const [formInstallmentsStr, setFormInstallmentsStr] = useState<string>("1");
  const [formIsRecurring, setFormIsRecurring] = useState<boolean>(false);
  const [formNotes, setFormNotes] = useState<string>("");

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Inicializa valores ao abrir
  useEffect(() => {
    if (isOpen) {
      setFormError(null);
      setFormDescription("");
      setFormAmountStr("");
      setFormIssueDate(today.toISOString().split("T")[0]);
      setFormDueDate(today.toISOString().split("T")[0]);
      setFormInstallmentsStr("1");
      setFormIsRecurring(false);
      setFormNotes("");

      if (items.length > 0) {
        const firstItem = items[0];
        setFormItemId(firstItem.id);
        setFormCategoryId(firstItem.category_id);
        setFormEssentiality(firstItem.nature);
      } else {
        setFormItemId("");
        setFormCategoryId(categories[0]?.id || "");
        setFormEssentiality("NECESSARIO");
      }

      if (contacts.length > 0) {
        setFormContactId(contacts[0].id);
      } else {
        setFormContactId("");
      }

      if (paymentMethods.length > 0) {
        setFormPaymentMethodId(paymentMethods[0].id);
      } else {
        setFormPaymentMethodId("");
      }
    }
  }, [isOpen, items, contacts, categories, paymentMethods, today]);

  const handleSelectItem = (itemId: string) => {
    setFormItemId(itemId);
    const selected = items.find((it) => it.id === itemId);
    if (selected) {
      setFormCategoryId(selected.category_id);
      setFormEssentiality(selected.nature);
      if (!formDescription) {
        setFormDescription(selected.name);
      }
    }
  };

  const currentSelectedItem = items.find((it) => it.id === formItemId);
  const currentSelectedCategory = categories.find((c) => c.id === formCategoryId);

  const cleanAmountVal = formAmountStr.replace(/\./g, "").replace(",", ".");
  const currentAmountCents = Math.round((parseFloat(cleanAmountVal) || 0) * 100);
  const currentInstallmentsCount = parseInt(formInstallmentsStr, 10) || 1;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formItemId) {
      setFormError("Selecione um item padronizado obrigatório.");
      return;
    }
    if (!formContactId) {
      setFormError("Selecione um contato obrigatório.");
      return;
    }
    if (!formDescription.trim()) {
      setFormError("A descrição é obrigatória.");
      return;
    }

    const cleanAmount = formAmountStr.replace(/\./g, "").replace(",", ".");
    const parsedAmount = parseFloat(cleanAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setFormError("Informe um valor válido maior que zero.");
      return;
    }

    const installments = formIsRecurring ? 1 : parseInt(formInstallmentsStr, 10);
    if (!formIsRecurring && (isNaN(installments) || installments < 1 || installments > 120)) {
      setFormError("A quantidade de parcelas deve ser entre 1 e 120.");
      return;
    }

    setIsSubmitting(true);
    setFormError(null);
    try {
      await walletApi.createExpense({
        item_id: formItemId,
        contact_id: formContactId,
        description: formDescription.trim(),
        total_amount_cents: Math.round(parsedAmount * 100),
        issue_date: formIssueDate,
        due_date: formDueDate,
        category_id: formCategoryId || undefined,
        payment_method_id: formPaymentMethodId || undefined,
        essentiality: formEssentiality,
        installments_count: installments,
        is_recurring: formIsRecurring,
        notes: formNotes.trim() || null,
      });
      onSuccess();
      onClose();
    } catch {
      setFormError("Erro ao salvar despesa. Verifique os dados e tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Cadastrar Nova Despesa" maxWidth="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {formError && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 rounded-xl text-xs text-rose-700 dark:text-rose-300">
            {formError}
          </div>
        )}

        {/* Item Padronizado (Obrigatório) */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Item Padronizado *
            </label>
            <button
              type="button"
              onClick={() =>
                onOpenQuickItemModal(formCategoryId || categories[0]?.id || "", formEssentiality)
              }
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center space-x-1 font-medium cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Novo Item</span>
            </button>
          </div>
          <select
            required
            value={formItemId}
            onChange={(e) => handleSelectItem(e.target.value)}
            className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3.5 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
          >
            {items.length === 0 ? (
              <option value="">Nenhum item disponível (cadastre um novo item)</option>
            ) : (
              items
                .filter((it) => it.is_active || it.id === formItemId)
                .map((it) => (
                  <option key={it.id} value={it.id}>
                    {it.name} ({it.category?.name || "Sem categoria"} &bull;{" "}
                    {ESSENTIALITY_LABELS[it.nature]?.label || it.nature})
                  </option>
                ))
            )}
          </select>
        </div>

        {/* Contato (Obrigatório) */}
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
            value={formContactId}
            onChange={(e) => setFormContactId(e.target.value)}
            className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3.5 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
          >
            {contacts.length === 0 ? (
              <option value="">Nenhum contato disponível (cadastre um contato)</option>
            ) : (
              contacts
                .filter((ct) => ct.is_active || ct.id === formContactId)
                .map((ct) => (
                  <option key={ct.id} value={ct.id}>
                    {ct.name} {ct.phone ? `(${ct.phone})` : ""}
                  </option>
                ))
            )}
          </select>
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
            value={formDescription}
            onChange={(e) => setFormDescription(e.target.value)}
            className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3.5 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Valor Total e Parcelamento */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
              Valor Total (R$) *
            </label>
            <input
              type="text"
              required
              placeholder="0,00"
              value={formAmountStr}
              onChange={(e) => setFormAmountStr(e.target.value)}
              className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3.5 py-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            {formIsRecurring ? (
              <div className="bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-800/60 rounded-xl p-3 text-xs text-blue-800 dark:text-blue-300 space-y-1">
                <div className="flex items-center space-x-1.5 font-semibold">
                  <Repeat className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                  <span>Recorrência Mensal Contínua</span>
                </div>
                <p className="text-[11px] text-blue-700/80 dark:text-blue-300/80">
                  O valor mensal informado será projetado automaticamente para os próximos 12 meses, integrando-se aos relatórios e ao menu de Compromissos.
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Quantidade de Parcelas *
                  </label>
                  {currentInstallmentsCount > 1 && currentAmountCents > 0 ? (
                    <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400">
                      {currentInstallmentsCount}x de{" "}
                      {formatCurrency(
                        Math.round(currentAmountCents / currentInstallmentsCount)
                      )}
                    </span>
                  ) : (
                    <span className="text-[11px] text-zinc-400 dark:text-zinc-500">
                      À vista (1x)
                    </span>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <div className="relative flex-1">
                    <input
                      type="number"
                      min={1}
                      max={120}
                      required
                      value={formInstallmentsStr}
                      onChange={(e) => setFormInstallmentsStr(e.target.value)}
                      onBlur={() => {
                        const val = parseInt(formInstallmentsStr, 10);
                        if (isNaN(val) || val < 1) {
                          setFormInstallmentsStr("1");
                        } else if (val > 120) {
                          setFormInstallmentsStr("120");
                        } else {
                          setFormInstallmentsStr(String(val));
                        }
                      }}
                      placeholder="1"
                      className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3.5 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormInstallmentsStr("1")}
                    className={`px-3 py-2 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                      currentInstallmentsCount === 1
                        ? "bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800"
                        : "bg-zinc-50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-700"
                    }`}
                    title="Definir pagamento à vista em 1 parcela"
                  >
                    À vista
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Datas: Realização e Vencimento */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
              Data da Despesa *
            </label>
            <input
              type="date"
              required
              value={formIssueDate}
              onChange={(e) => setFormIssueDate(e.target.value)}
              className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3.5 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
              Data de Vencimento (1ª Parcela) *
            </label>
            <input
              type="date"
              required
              value={formDueDate}
              onChange={(e) => setFormDueDate(e.target.value)}
              className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3.5 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Categoria Vinculada e Natureza da Despesa (Automáticas do Item) */}
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
                    currentSelectedCategory?.color ||
                    currentSelectedItem?.category?.color ||
                    "#6366f1",
                }}
              />
              <span className="font-medium text-zinc-800 dark:text-zinc-200">
                {currentSelectedCategory?.name ||
                  currentSelectedItem?.category?.name ||
                  "Automática pelo item"}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
              Natureza da Despesa
            </label>
            <div className="flex items-center justify-between bg-zinc-100/70 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/80 rounded-xl px-3.5 py-2">
              {currentSelectedItem ? (
                <span
                  className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
                    ESSENTIALITY_LABELS[currentSelectedItem.nature]?.color || ""
                  }`}
                >
                  {ESSENTIALITY_LABELS[currentSelectedItem.nature]?.label ||
                    currentSelectedItem.nature}
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
              value={formPaymentMethodId}
              onChange={(e) => setFormPaymentMethodId(e.target.value)}
              className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3.5 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
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
                checked={formIsRecurring}
                onChange={(e) => setFormIsRecurring(e.target.checked)}
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
            value={formNotes}
            onChange={(e) => setFormNotes(e.target.value)}
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
            <span>Salvar Despesa</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
