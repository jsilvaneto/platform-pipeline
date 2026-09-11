import React, { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Filter,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Clock,
  Trash2,
  AlertCircle,
  Repeat,
  CreditCard,
  Tag,
  Loader2,
  Users,
} from "lucide-react";
import { walletApi } from "../api/walletApi";
import { Modal } from "../components/Modal";
import {
  Expense,
  Category,
  Item,
  Contact,
  PaymentMethod,
  ExpenseCreateInput,
  ItemCreateInput,
  ContactCreateInput,
  EssentialityType,
  ExpenseStatus,
} from "../types";
import { formatCurrency, formatDate } from "../utils/format";

interface ExpensesProps {
  isCreateModalOpenExternal?: boolean;
  onCloseCreateModalExternal?: () => void;
}

const ESSENTIALITY_LABELS: Record<EssentialityType, { label: string; color: string }> = {
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

export const Expenses: React.FC<ExpensesProps> = ({
  isCreateModalOpenExternal = false,
  onCloseCreateModalExternal,
}) => {
  const today = new Date();
  const currentMonthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;

  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);
  const [statusFilter, setStatusFilter] = useState<ExpenseStatus | "ALL">("ALL");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [itemFilter, setItemFilter] = useState<string>("ALL");
  const [contactFilter, setContactFilter] = useState<string>("ALL");
  const [essentialityFilter, setEssentialityFilter] = useState<EssentialityType | "ALL">("ALL");

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [expandedExpenseIds, setExpandedExpenseIds] = useState<Set<string>>(new Set());

  // Form states
  const [formItemId, setFormItemId] = useState<string>("");
  const [formContactId, setFormContactId] = useState<string>("");
  const [formDescription, setFormDescription] = useState<string>("");
  const [formAmountStr, setFormAmountStr] = useState<string>("");
  const [formIssueDate, setFormIssueDate] = useState<string>(today.toISOString().split("T")[0]);
  const [formDueDate, setFormDueDate] = useState<string>(today.toISOString().split("T")[0]);
  const [formCategoryId, setFormCategoryId] = useState<string>("");
  const [formPaymentMethodId, setFormPaymentMethodId] = useState<string>("");
  const [formEssentiality, setFormEssentiality] = useState<EssentialityType>("NECESSARIO");
  const [formInstallmentsStr, setFormInstallmentsStr] = useState<string>("1");
  const [formIsRecurring, setFormIsRecurring] = useState<boolean>(false);
  const [formNotes, setFormNotes] = useState<string>("");
  const [formError, setFormError] = useState<string | null>(null);

  // Quick Create Item states
  const [isQuickItemModalOpen, setIsQuickItemModalOpen] = useState<boolean>(false);
  const [quickItemName, setQuickItemName] = useState<string>("");
  const [quickItemCategoryId, setQuickItemCategoryId] = useState<string>("");
  const [quickItemNature, setQuickItemNature] = useState<EssentialityType>("NECESSARIO");
  const [isQuickSubmitting, setIsQuickSubmitting] = useState<boolean>(false);

  // Quick Create Contact states
  const [isQuickContactModalOpen, setIsQuickContactModalOpen] = useState<boolean>(false);
  const [quickContactName, setQuickContactName] = useState<string>("");
  const [quickContactPhone, setQuickContactPhone] = useState<string>("");
  const [isQuickContactSubmitting, setIsQuickContactSubmitting] = useState<boolean>(false);

  // Sincroniza abertura de modal disparada de fora (ex: atalhos do Dashboard)
  useEffect(() => {
    if (isCreateModalOpenExternal) {
      setIsModalOpen(true);
    }
  }, [isCreateModalOpenExternal]);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [expData, catData, itmData, pmData, ctData] = await Promise.all([
        walletApi.getExpenses({
          month: selectedMonth,
          status: statusFilter !== "ALL" ? statusFilter : undefined,
          category_id: categoryFilter !== "ALL" ? categoryFilter : undefined,
          item_id: itemFilter !== "ALL" ? itemFilter : undefined,
          contact_id: contactFilter !== "ALL" ? contactFilter : undefined,
          essentiality: essentialityFilter !== "ALL" ? essentialityFilter : undefined,
        }),
        walletApi.getCategories(),
        walletApi.getItems(),
        walletApi.getPaymentMethods(),
        walletApi.getContacts(),
      ]);
      setExpenses(expData);
      setCategories(catData);
      setItems(itmData);
      setPaymentMethods(pmData);
      setContacts(ctData);

      if (itmData.length > 0 && !formItemId) {
        const firstActive = itmData.find((it) => it.is_active) || itmData[0];
        if (firstActive) {
          setFormItemId(firstActive.id);
          setFormCategoryId(firstActive.category_id);
          setFormEssentiality(firstActive.nature);
        }
      } else if (catData.length > 0 && !formCategoryId) {
        setFormCategoryId(catData[0].id);
      }
      if (ctData.length > 0 && !formContactId) {
        const firstActiveContact = ctData.find((c) => c.is_active) || ctData[0];
        if (firstActiveContact) {
          setFormContactId(firstActiveContact.id);
        }
      }
      if (pmData.length > 0 && !formPaymentMethodId) {
        setFormPaymentMethodId(pmData[0].id);
      }
    } catch {
      setError("Não foi possível carregar as despesas. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  }, [selectedMonth, statusFilter, categoryFilter, itemFilter, contactFilter, essentialityFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handlePrevMonth = () => {
    const [y, m] = selectedMonth.split("-").map(Number);
    const prevDate = new Date(y, m - 2, 1);
    setSelectedMonth(`${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}`);
  };

  const handleNextMonth = () => {
    const [y, m] = selectedMonth.split("-").map(Number);
    const nextDate = new Date(y, m, 1);
    setSelectedMonth(`${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, "0")}`);
  };

  const toggleExpand = (expenseId: string) => {
    setExpandedExpenseIds((prev) => {
      const next = new Set(prev);
      if (next.has(expenseId)) {
        next.delete(expenseId);
      } else {
        next.add(expenseId);
      }
      return next;
    });
  };

  const handleTogglePaymentStatus = async (
    paymentId: string,
    currentStatus: ExpenseStatus
  ) => {
    const newStatus: ExpenseStatus = currentStatus === "CONCLUIDO" ? "PENDENTE" : "CONCLUIDO";
    try {
      await walletApi.updatePaymentStatus(paymentId, { status: newStatus });
      loadData();
    } catch {
      alert("Erro ao alterar o status do pagamento.");
    }
  };

  const handleDeleteExpense = async (expenseId: string, description: string) => {
    if (!window.confirm(`Tem certeza que deseja excluir a despesa "${description}" e todas as suas parcelas?`)) {
      return;
    }
    try {
      await walletApi.deleteExpense(expenseId);
      loadData();
    } catch {
      alert("Erro ao excluir a despesa.");
    }
  };

  // Conversão segura de texto monetário para centavos inteiros
  const parseAmountToCents = (valStr: string): number => {
    const cleanStr = valStr.replace(/[^\d,.-]/g, "").replace(",", ".");
    const valFloat = parseFloat(cleanStr);
    if (isNaN(valFloat) || valFloat <= 0) return 0;
    return Math.round(valFloat * 100);
  };

  const handleSelectItem = (itemId: string) => {
    setFormItemId(itemId);
    if (!itemId) return;
    const selectedItem = items.find((it) => it.id === itemId);
    if (selectedItem) {
      setFormCategoryId(selectedItem.category_id);
      setFormEssentiality(selectedItem.nature);
      if (!formDescription.trim()) {
        setFormDescription(selectedItem.name);
      }
    }
  };

  const handleQuickCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickItemName.trim()) return;
    const targetCatId = quickItemCategoryId || (categories.length > 0 ? categories[0].id : "");
    if (!targetCatId) return;

    setIsQuickSubmitting(true);
    try {
      const payload: ItemCreateInput = {
        name: quickItemName.trim(),
        category_id: targetCatId,
        nature: quickItemNature,
        is_active: true,
      };
      const created = await walletApi.createItem(payload);
      const updatedItems = await walletApi.getItems();
      setItems(updatedItems);
      handleSelectItem(created.id);
      setIsQuickItemModalOpen(false);
      setQuickItemName("");
    } catch {
      alert("Erro ao cadastrar novo item rápido.");
    } finally {
      setIsQuickSubmitting(false);
    }
  };

  const handleQuickCreateContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickContactName.trim()) return;

    setIsQuickContactSubmitting(true);
    try {
      const payload: ContactCreateInput = {
        name: quickContactName.trim(),
        phone: quickContactPhone.trim() || null,
        is_active: true,
      };
      const created = await walletApi.createContact(payload);
      const updatedContacts = await walletApi.getContacts();
      setContacts(updatedContacts);
      setFormContactId(created.id);
      setIsQuickContactModalOpen(false);
      setQuickContactName("");
      setQuickContactPhone("");
    } catch {
      alert("Erro ao cadastrar novo contato rápido.");
    } finally {
      setIsQuickContactSubmitting(false);
    }
  };

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formItemId) {
      setFormError("Selecione um item padronizado para a despesa.");
      return;
    }

    if (!formContactId) {
      setFormError("Selecione um contato para a despesa.");
      return;
    }

    const amountCents = parseAmountToCents(formAmountStr);
    if (amountCents <= 0) {
      setFormError("Informe um valor monetário válido maior que zero.");
      return;
    }
    if (!formDescription.trim()) {
      setFormError("A descrição da despesa é obrigatória.");
      return;
    }

    const parsedInstallments = parseInt(formInstallmentsStr, 10);
    if (isNaN(parsedInstallments) || parsedInstallments < 1 || parsedInstallments > 120) {
      setFormError("Informe uma quantidade de parcelas válida entre 1 e 120.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: ExpenseCreateInput = {
        description: formDescription.trim(),
        total_amount_cents: amountCents,
        issue_date: formIssueDate,
        due_date: formDueDate,
        item_id: formItemId,
        contact_id: formContactId,
        category_id: formCategoryId || null,
        payment_method_id: formPaymentMethodId || null,
        essentiality: formEssentiality,
        status: "PENDENTE",
        installments_count: parsedInstallments,
        is_recurring: formIsRecurring,
        notes: formNotes.trim() || null,
      };

      await walletApi.createExpense(payload);
      setIsModalOpen(false);
      if (onCloseCreateModalExternal) {
        onCloseCreateModalExternal();
      }
      // Limpa formulário preservando item inicial padrão se disponível
      const defaultItem = items.find((it) => it.is_active) || items[0];
      if (defaultItem) {
        setFormItemId(defaultItem.id);
        setFormCategoryId(defaultItem.category_id);
        setFormEssentiality(defaultItem.nature);
      } else {
        setFormItemId("");
      }
      const defaultContact = contacts.find((c) => c.is_active) || contacts[0];
      if (defaultContact) {
        setFormContactId(defaultContact.id);
      }
      setFormDescription("");
      setFormAmountStr("");
      setFormInstallmentsStr("1");
      setFormIsRecurring(false);
      setFormNotes("");
      loadData();
    } catch {
      setFormError("Erro ao salvar a despesa. Verifique os campos informados.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Totais do mês calculado a partir das parcelas do mês
  const currentMonthPayments = expenses.flatMap((exp) =>
    exp.payments.filter((p) => p.due_date.startsWith(selectedMonth))
  );
  const totalExpensesCents = currentMonthPayments.reduce((acc, p) => acc + p.amount_cents, 0);
  const totalPaidCents = currentMonthPayments
    .filter((p) => p.status === "CONCLUIDO")
    .reduce((acc, p) => acc + p.amount_cents, 0);
  const totalPendingCents = currentMonthPayments
    .filter((p) => p.status === "PENDENTE")
    .reduce((acc, p) => acc + p.amount_cents, 0);

  const [yearNum, monthNum] = selectedMonth.split("-").map(Number);
  const monthDate = new Date(yearNum, monthNum - 1, 1);
  const monthFormatted = monthDate.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  const currentSelectedItem = items.find((it) => it.id === formItemId);
  const currentSelectedCategory = categories.find(
    (c) => c.id === (currentSelectedItem?.category_id || formCategoryId)
  );
  const currentAmountCents = parseAmountToCents(formAmountStr);
  const currentInstallmentsCount = parseInt(formInstallmentsStr, 10) || 1;

  return (
    <div className="space-y-6">
      {/* Top Header & Month Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
            Registros
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Controle de despesas, contas a pagar e compras parceladas
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {/* Navegador de Mês */}
          <div className="flex items-center bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-2 py-1 shadow-sm">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
              title="Mês Anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 text-sm font-semibold capitalize text-zinc-800 dark:text-zinc-200 min-w-[130px] text-center">
              {monthFormatted}
            </span>
            <button
              onClick={handleNextMonth}
              className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
              title="Próximo Mês"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Botão Novo Registro */}
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-500 text-white font-medium px-4 py-2 rounded-xl text-sm shadow-sm shadow-blue-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Registro</span>
          </button>
        </div>
      </div>

      {/* Cards de Resumo Mensal */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
            Total Previsto no Mês
          </span>
          <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mt-1">
            {formatCurrency(totalExpensesCents)}
          </p>
          <span className="text-xs text-zinc-400 dark:text-zinc-500 mt-1 block">
            {currentMonthPayments.length} parcelas/lançamentos
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
              ? `${Math.round((totalPaidCents / totalExpensesCents) * 100)}% quitado`
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
            {currentMonthPayments.filter((p) => p.status === "PENDENTE").length} pendências no mês
          </span>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center space-x-2 text-zinc-500 dark:text-zinc-400 text-sm font-medium">
            <Filter className="w-4 h-4" />
            <span>Filtros:</span>
          </div>

          {/* Filtro Status */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as ExpenseStatus | "ALL")}
            className="bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs font-medium px-3 py-1.5 text-zinc-700 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">Status: Todos</option>
            <option value="PENDENTE">Apenas Pendentes</option>
            <option value="CONCLUIDO">Apenas Concluídos</option>
          </select>

          {/* Filtro Categoria */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs font-medium px-3 py-1.5 text-zinc-700 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">Categoria: Todas</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Filtro Item */}
          <select
            value={itemFilter}
            onChange={(e) => setItemFilter(e.target.value)}
            className="bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs font-medium px-3 py-1.5 text-zinc-700 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">Item: Todos</option>
            {items.map((it) => (
              <option key={it.id} value={it.id}>
                {it.name}
              </option>
            ))}
          </select>

          {/* Filtro Contato */}
          <select
            value={contactFilter}
            onChange={(e) => setContactFilter(e.target.value)}
            className="bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs font-medium px-3 py-1.5 text-zinc-700 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">Contato: Todos</option>
            {contacts.map((ct) => (
              <option key={ct.id} value={ct.id}>
                {ct.name}
              </option>
            ))}
          </select>

          {/* Filtro Essencialidade */}
          <select
            value={essentialityFilter}
            onChange={(e) => setEssentialityFilter(e.target.value as EssentialityType | "ALL")}
            className="bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs font-medium px-3 py-1.5 text-zinc-700 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">Essencialidade: Todas</option>
            <option value="OBRIGATORIO">Obrigatório</option>
            <option value="NECESSARIO">Necessário</option>
            <option value="DESEJO">Desejo</option>
            <option value="NENHUM">Geral</option>
          </select>
        </div>

        <span className="text-xs text-zinc-400 dark:text-zinc-500">
          {expenses.length} {expenses.length === 1 ? "despesa encontrada" : "despesas encontradas"}
        </span>
      </div>

      {/* Lista de Despesas */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-16 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-2" />
          <span className="text-sm text-zinc-500 dark:text-zinc-400">Carregando despesas...</span>
        </div>
      ) : error ? (
        <div className="p-6 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-2xl text-center">
          <AlertCircle className="w-8 h-8 text-rose-500 mx-auto mb-2" />
          <p className="text-sm font-medium text-rose-700 dark:text-rose-300">{error}</p>
        </div>
      ) : expenses.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-8 shadow-sm">
          <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mx-auto mb-4 text-zinc-400">
            <CreditCard className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            Nenhuma despesa registrada para este período
          </h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1 max-w-md mx-auto">
            Organize suas despesas, contas de consumo e compras parceladas clicando no botão abaixo.
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="mt-5 inline-flex items-center space-x-2 bg-blue-600 hover:bg-blue-500 text-white font-medium px-4 py-2 rounded-xl text-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Adicionar Primeira Despesa</span>
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {expenses.map((expense) => {
            const isExpanded = expandedExpenseIds.has(expense.id);
            const isParcelado = expense.installments_count > 1;
            const essentialityCfg = ESSENTIALITY_LABELS[expense.essentiality];

            // Parcela relevante do mês selecionado
            const currentInstallment = expense.payments.find((p) =>
              p.due_date.startsWith(selectedMonth)
            );
            const singlePayment = expense.payments[0];

            return (
              <div
                key={expense.id}
                className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden transition-all hover:border-zinc-300 dark:hover:border-zinc-700"
              >
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
                          : formatCurrency(expense.total_amount_cents)}
                      </span>
                      {isParcelado && (
                        <span className="text-[11px] text-zinc-400 dark:text-zinc-500 block">
                          Total: {formatCurrency(expense.total_amount_cents)}
                        </span>
                      )}
                    </div>

                    {/* Ação Rápida de Pagamento para 1x ou Detalhes para Parcelas */}
                    {!isParcelado && singlePayment ? (
                      <button
                        onClick={() =>
                          handleTogglePaymentStatus(singlePayment.id, singlePayment.status)
                        }
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-colors ${
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
                    ) : (
                      <button
                        onClick={() => toggleExpand(expense.id)}
                        className="px-3 py-1.5 rounded-xl text-xs font-medium bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 flex items-center space-x-1"
                      >
                        <span>Parcelas</span>
                        {isExpanded ? (
                          <ChevronUp className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5" />
                        )}
                      </button>
                    )}

                    {/* Excluir Despesa */}
                    <button
                      onClick={() => handleDeleteExpense(expense.id, expense.description)}
                      className="p-1.5 text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                      title="Excluir despesa"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Sub-tabela de Parcelas (Quando expandido) */}
                {isParcelado && isExpanded && (
                  <div className="bg-zinc-50/80 dark:bg-zinc-950/50 border-t border-zinc-200 dark:border-zinc-800 px-5 py-3 space-y-2">
                    <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block mb-2">
                      Detalhamento de Parcelas
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                      {expense.payments.map((p) => (
                        <div
                          key={p.id}
                          className="bg-white dark:bg-zinc-900 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 flex items-center justify-between shadow-2xs"
                        >
                          <div>
                            <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 block">
                              Parcela {p.installment_number}/{expense.installments_count}
                            </span>
                            <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                              Vence em: {formatDate(p.due_date)}
                            </span>
                          </div>

                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                              {formatCurrency(p.amount_cents)}
                            </span>
                            <button
                              onClick={() => handleTogglePaymentStatus(p.id, p.status)}
                              className={`p-1.5 rounded-lg text-xs font-medium transition-colors ${
                                p.status === "CONCLUIDO"
                                  ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300"
                                  : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:bg-amber-100 hover:text-amber-700"
                              }`}
                              title={p.status === "CONCLUIDO" ? "Desmarcar pagamento" : "Marcar como pago"}
                            >
                              <CheckCircle2
                                className={`w-4 h-4 ${
                                  p.status === "CONCLUIDO"
                                    ? "text-emerald-600 dark:text-emerald-400"
                                    : "text-zinc-400"
                                }`}
                              />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Nova Despesa */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          if (onCloseCreateModalExternal) {
            onCloseCreateModalExternal();
          }
        }}
        title="Cadastrar Nova Despesa"
        maxWidth="lg"
      >
        <form onSubmit={handleCreateExpense} className="space-y-4">
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
                onClick={() => {
                  setQuickItemCategoryId(formCategoryId || (categories[0]?.id ?? ""));
                  setQuickItemNature(formEssentiality);
                  setIsQuickItemModalOpen(true);
                }}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center space-x-1 font-medium"
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
                      {it.name} ({it.category?.name || "Sem categoria"} &bull; {ESSENTIALITY_LABELS[it.nature]?.label || it.nature})
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
                onClick={() => setIsQuickContactModalOpen(true)}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center space-x-1 font-medium"
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
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Quantidade de Parcelas *
                </label>
                {currentInstallmentsCount > 1 && currentAmountCents > 0 ? (
                  <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400">
                    {currentInstallmentsCount}x de {formatCurrency(Math.round(currentAmountCents / currentInstallmentsCount))}
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
                  className={`px-3 py-2 text-xs font-semibold rounded-xl border transition-all ${
                    currentInstallmentsCount === 1
                      ? "bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800"
                      : "bg-zinc-50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-700"
                  }`}
                  title="Definir pagamento à vista em 1 parcela"
                >
                  À vista
                </button>
              </div>
            </div>
          </div>

          {/* Datas: Realização e Vencimento */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Data da Despesa *
              </label>
              <div className="relative">
                <input
                  type="date"
                  required
                  value={formIssueDate}
                  onChange={(e) => setFormIssueDate(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3.5 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Data de Vencimento (1ª Parcela) *
              </label>
              <div className="relative">
                <input
                  type="date"
                  required
                  value={formDueDate}
                  onChange={(e) => setFormDueDate(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3.5 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
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
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 rounded-xl text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-sm shadow-blue-500/20 transition-all disabled:opacity-50 flex items-center space-x-2"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Salvar Despesa</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Criação Rápida de Item */}
      <Modal
        isOpen={isQuickItemModalOpen}
        onClose={() => setIsQuickItemModalOpen(false)}
        title="Novo Item Padronizado"
        maxWidth="md"
      >
        <form onSubmit={handleQuickCreateItem} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
              Nome do Item *
            </label>
            <input
              type="text"
              required
              placeholder="Ex: Arroz, Gasolina, Netflix, Aluguel"
              value={quickItemName}
              onChange={(e) => setQuickItemName(e.target.value)}
              className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3.5 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
              Categoria Vinculada *
            </label>
            <select
              value={quickItemCategoryId}
              onChange={(e) => setQuickItemCategoryId(e.target.value)}
              className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3.5 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
              Natureza do Item *
            </label>
            <select
              value={quickItemNature}
              onChange={(e) => setQuickItemNature(e.target.value as EssentialityType)}
              className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3.5 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="OBRIGATORIO">Obrigatório</option>
              <option value="NECESSARIO">Necessário</option>
              <option value="DESEJO">Desejo</option>
              <option value="NENHUM">Nenhum / Geral</option>
            </select>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-zinc-200 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => setIsQuickItemModalOpen(false)}
              className="px-4 py-2 rounded-xl text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isQuickSubmitting}
              className="px-5 py-2 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-sm shadow-blue-500/20 transition-all disabled:opacity-50 flex items-center space-x-2"
            >
              {isQuickSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Criar Item</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal de Criação Rápida de Contato */}
      <Modal
        isOpen={isQuickContactModalOpen}
        onClose={() => setIsQuickContactModalOpen(false)}
        title="Novo Contato Rápido"
        maxWidth="md"
      >
        <form onSubmit={handleQuickCreateContact} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
              Nome do Contato *
            </label>
            <input
              type="text"
              required
              placeholder="Ex: Farmácia São Bento, Dr. Roberto, Cemig"
              value={quickContactName}
              onChange={(e) => setQuickContactName(e.target.value)}
              className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3.5 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
              Telefone (Opcional)
            </label>
            <input
              type="text"
              placeholder="(00) 00000-0000"
              value={quickContactPhone}
              onChange={(e) => setQuickContactPhone(e.target.value)}
              className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3.5 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-zinc-200 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => setIsQuickContactModalOpen(false)}
              className="px-4 py-2 rounded-xl text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isQuickContactSubmitting}
              className="px-5 py-2 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-sm shadow-blue-500/20 transition-all disabled:opacity-50 flex items-center space-x-2"
            >
              {isQuickContactSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Criar Contato</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
