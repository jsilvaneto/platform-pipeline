import React, { useState } from "react";
import { Category, Contact, Account, PaymentMethod, ProfileType } from "../types";
import { api } from "../api/client";
import { 
  X, Tag, Landmark, CreditCard, User as ContactIcon, 
  Calendar, FileText, Check, Loader2, SlidersHorizontal, AlertCircle
} from "lucide-react";

interface BatchEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  selectedCount: number;
  selectedIds: string[];
  categories: Category[];
  accounts: Account[];
  paymentMethods: PaymentMethod[];
  contacts: Contact[];
}

export const BatchEditModal: React.FC<BatchEditModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  selectedCount,
  selectedIds,
  categories,
  accounts,
  paymentMethods,
  contacts,
}) => {
  // Checkboxes indicando quais campos o usuário deseja atualizar
  const [updateCategory, setUpdateCategory] = useState(false);
  const [categoryId, setCategoryId] = useState("");

  const [updateAccount, setUpdateAccount] = useState(false);
  const [accountId, setAccountId] = useState("");

  const [updatePaymentMethod, setUpdatePaymentMethod] = useState(false);
  const [paymentMethodId, setPaymentMethodId] = useState("");

  const [updateContact, setUpdateContact] = useState(false);
  const [contactId, setContactId] = useState("");

  const [updateDueDate, setUpdateDueDate] = useState(false);
  const [dueDate, setDueDate] = useState("");

  const [updateNotes, setUpdateNotes] = useState(false);
  const [notes, setNotes] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const hasAnyFieldSelected = 
      updateCategory || updateAccount || updatePaymentMethod || 
      updateContact || updateDueDate || updateNotes;

    if (!hasAnyFieldSelected) {
      setError("Marque ao menos um campo para atualizar nos lançamentos selecionados.");
      return;
    }

    if (updateCategory && !categoryId) {
      setError("Selecione a categoria desejada.");
      return;
    }

    if (updateDueDate && !dueDate) {
      setError("Informe a nova data de vencimento.");
      return;
    }

    setLoading(true);

    try {
      const payload: any = {
        transaction_ids: selectedIds,
      };

      if (updateCategory) payload.category_id = categoryId;
      if (updateAccount) payload.account_id = accountId || null;
      if (updatePaymentMethod) payload.payment_method_id = paymentMethodId || null;
      if (updateContact) payload.contact_id = contactId || null;
      if (updateDueDate) payload.due_date = dueDate;
      if (updateNotes) payload.notes = notes || null;

      await api.post("/transactions/batch/update", payload);
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error("Erro na edição em lote:", err);
      setError(err.response?.data?.detail || "Falha ao aplicar alterações em lote.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100 leading-tight">
                Edição em Lote
              </h2>
              <p className="text-[11px] text-zinc-400">
                Atualize campos em <strong>{selectedCount}</strong> lançamento(s) selecionado(s)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {error && (
            <div className="p-3 text-xs font-medium bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/50 rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Marque os campos que você deseja alterar para todos os itens selecionados:
          </p>

          {/* 1. Categoria */}
          <div className={`p-3 rounded-xl border transition-all ${
            updateCategory 
              ? "bg-indigo-50/40 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-800" 
              : "bg-zinc-50/60 dark:bg-zinc-800/40 border-zinc-200 dark:border-zinc-800"
          }`}>
            <label className="flex items-center gap-2 cursor-pointer mb-2">
              <input
                type="checkbox"
                checked={updateCategory}
                onChange={(e) => setUpdateCategory(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 border-zinc-300 focus:ring-indigo-500 cursor-pointer"
              />
              <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-zinc-400" />
                Alterar Categoria
              </span>
            </label>
            {updateCategory && (
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-zinc-900 dark:text-zinc-100 font-medium"
              >
                <option value="">Selecione uma categoria...</option>
                {[...categories]
                  .sort((a, b) => a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" }))
                  .map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name} ({cat.type})
                    </option>
                  ))}
              </select>
            )}
          </div>

          {/* 2. Conta / Carteira */}
          <div className={`p-3 rounded-xl border transition-all ${
            updateAccount 
              ? "bg-indigo-50/40 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-800" 
              : "bg-zinc-50/60 dark:bg-zinc-800/40 border-zinc-200 dark:border-zinc-800"
          }`}>
            <label className="flex items-center gap-2 cursor-pointer mb-2">
              <input
                type="checkbox"
                checked={updateAccount}
                onChange={(e) => setUpdateAccount(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 border-zinc-300 focus:ring-indigo-500 cursor-pointer"
              />
              <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                <Landmark className="w-3.5 h-3.5 text-zinc-400" />
                Alterar Conta / Carteira
              </span>
            </label>
            {updateAccount && (
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-zinc-900 dark:text-zinc-100 font-medium"
              >
                <option value="">[Remover vínculo de conta ou selecione...]</option>
                {[...accounts]
                  .sort((a, b) => a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" }))
                  .map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({acc.type})
                    </option>
                  ))}
              </select>
            )}
          </div>

          {/* 3. Forma de Pagamento */}
          <div className={`p-3 rounded-xl border transition-all ${
            updatePaymentMethod 
              ? "bg-indigo-50/40 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-800" 
              : "bg-zinc-50/60 dark:bg-zinc-800/40 border-zinc-200 dark:border-zinc-800"
          }`}>
            <label className="flex items-center gap-2 cursor-pointer mb-2">
              <input
                type="checkbox"
                checked={updatePaymentMethod}
                onChange={(e) => setUpdatePaymentMethod(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 border-zinc-300 focus:ring-indigo-500 cursor-pointer"
              />
              <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-zinc-400" />
                Alterar Forma de Pagamento
              </span>
            </label>
            {updatePaymentMethod && (
              <select
                value={paymentMethodId}
                onChange={(e) => setPaymentMethodId(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-zinc-900 dark:text-zinc-100 font-medium"
              >
                <option value="">[Remover forma de pagto ou selecione...]</option>
                {[...paymentMethods]
                  .sort((a, b) => a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" }))
                  .map((pm) => (
                    <option key={pm.id} value={pm.id}>
                      {pm.name}
                    </option>
                  ))}
              </select>
            )}
          </div>

          {/* 4. Contato / Favorecido */}
          <div className={`p-3 rounded-xl border transition-all ${
            updateContact 
              ? "bg-indigo-50/40 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-800" 
              : "bg-zinc-50/60 dark:bg-zinc-800/40 border-zinc-200 dark:border-zinc-800"
          }`}>
            <label className="flex items-center gap-2 cursor-pointer mb-2">
              <input
                type="checkbox"
                checked={updateContact}
                onChange={(e) => setUpdateContact(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 border-zinc-300 focus:ring-indigo-500 cursor-pointer"
              />
              <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                <ContactIcon className="w-3.5 h-3.5 text-zinc-400" />
                Alterar Contato / Favorecido
              </span>
            </label>
            {updateContact && (
              <select
                value={contactId}
                onChange={(e) => setContactId(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-zinc-900 dark:text-zinc-100 font-medium"
              >
                <option value="">[Remover contato vinculado ou selecione...]</option>
                {[...contacts]
                  .sort((a, b) => a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" }))
                  .map((ct) => (
                    <option key={ct.id} value={ct.id}>
                      {ct.name} ({ct.type})
                    </option>
                  ))}
              </select>
            )}
          </div>

          {/* 5. Data de Vencimento */}
          <div className={`p-3 rounded-xl border transition-all ${
            updateDueDate 
              ? "bg-indigo-50/40 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-800" 
              : "bg-zinc-50/60 dark:bg-zinc-800/40 border-zinc-200 dark:border-zinc-800"
          }`}>
            <label className="flex items-center gap-2 cursor-pointer mb-2">
              <input
                type="checkbox"
                checked={updateDueDate}
                onChange={(e) => setUpdateDueDate(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 border-zinc-300 focus:ring-indigo-500 cursor-pointer"
              />
              <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                Alterar Data de Vencimento
              </span>
            </label>
            {updateDueDate && (
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-zinc-900 dark:text-zinc-100 font-mono font-medium"
              />
            )}
          </div>

          {/* 6. Observações */}
          <div className={`p-3 rounded-xl border transition-all ${
            updateNotes 
              ? "bg-indigo-50/40 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-800" 
              : "bg-zinc-50/60 dark:bg-zinc-800/40 border-zinc-200 dark:border-zinc-800"
          }`}>
            <label className="flex items-center gap-2 cursor-pointer mb-2">
              <input
                type="checkbox"
                checked={updateNotes}
                onChange={(e) => setUpdateNotes(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 border-zinc-300 focus:ring-indigo-500 cursor-pointer"
              />
              <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-zinc-400" />
                Alterar Observações / Notas
              </span>
            </label>
            {updateNotes && (
              <input
                type="text"
                placeholder="Novas observações..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-zinc-900 dark:text-zinc-100"
              />
            )}
          </div>

          {/* Footer */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl flex items-center gap-1.5 transition-all shadow-md shadow-indigo-600/20 cursor-pointer"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              <span>Aplicar em {selectedCount} Lançamento(s)</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
