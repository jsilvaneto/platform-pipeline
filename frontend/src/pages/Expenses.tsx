import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Plus, ChevronLeft, ChevronRight, CreditCard, Loader2, AlertCircle } from "lucide-react";
import { walletApi } from "../api/walletApi";
import {
  Expense,
  Payment,
  Category,
  Item,
  Contact,
  PaymentMethod,
  EssentialityType,
  ExpenseStatus,
} from "../types";
import { ExpenseSummaryCards } from "../components/expenses/ExpenseSummaryCards";
import { ExpenseFilters } from "../components/expenses/ExpenseFilters";
import { ExpenseCard } from "../components/expenses/ExpenseCard";
import { ExpensePagination } from "../components/expenses/ExpensePagination";
import { ExpenseCreateModal } from "../components/expenses/ExpenseCreateModal";
import { ExpenseEditModal } from "../components/expenses/ExpenseEditModal";
import { PaymentEditModal } from "../components/expenses/PaymentEditModal";
import { QuickItemModal } from "../components/expenses/QuickItemModal";
import { QuickContactModal } from "../components/expenses/QuickContactModal";

interface ExpensesProps {
  isCreateModalOpenExternal?: boolean;
  onCloseCreateModalExternal?: () => void;
}

export const Expenses: React.FC<ExpensesProps> = ({
  isCreateModalOpenExternal = false,
  onCloseCreateModalExternal,
}) => {
  const today = useMemo(() => new Date(), []);
  const currentMonthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
  const todayIsoDate = today.toISOString().split("T")[0];

  // Filtros
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);
  const [statusFilter, setStatusFilter] = useState<ExpenseStatus | "ALL">("ALL");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [itemFilter, setItemFilter] = useState<string>("ALL");
  const [contactFilter, setContactFilter] = useState<string>("ALL");
  const [essentialityFilter, setEssentialityFilter] = useState<EssentialityType | "ALL">("ALL");

  // Paginação
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [totalItems, setTotalItems] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);

  // Dados
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Estados dos Modais
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState<boolean>(false);
  const [isQuickItemModalOpen, setIsQuickItemModalOpen] = useState<boolean>(false);
  const [isQuickContactModalOpen, setIsQuickContactModalOpen] = useState<boolean>(false);

  // Seleções para edição
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [selectedPaymentExpense, setSelectedPaymentExpense] = useState<Expense | null>(null);

  // Sanfona de parcelas e filtros de parcelas
  const [expandedExpenseIds, setExpandedExpenseIds] = useState<Set<string>>(new Set());
  const [installmentFilters, setInstallmentFilters] = useState<
    Record<string, "ALL" | "PENDING" | "PAID">
  >({});

  // Sincroniza abertura via prop externa
  useEffect(() => {
    if (isCreateModalOpenExternal) {
      setIsCreateModalOpen(true);
    }
  }, [isCreateModalOpenExternal]);

  // Carrega listas de apoio
  const loadAuxData = useCallback(async () => {
    try {
      const [cats, its, cts, pms] = await Promise.all([
        walletApi.getCategories(),
        walletApi.getItems(),
        walletApi.getContacts(),
        walletApi.getPaymentMethods(),
      ]);
      setCategories(cats);
      setItems(its);
      setContacts(cts);
      setPaymentMethods(pms);
    } catch {
      console.error("Erro ao carregar dados auxiliares.");
    }
  }, []);

  // Carrega despesas com paginação
  const fetchExpenses = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await walletApi.getPaginatedExpenses({
        month: selectedMonth,
        status: statusFilter === "ALL" ? undefined : statusFilter,
        category_id: categoryFilter === "ALL" ? undefined : categoryFilter,
        item_id: itemFilter === "ALL" ? undefined : itemFilter,
        contact_id: contactFilter === "ALL" ? undefined : contactFilter,
        essentiality: essentialityFilter === "ALL" ? undefined : essentialityFilter,
        page: currentPage,
        page_size: pageSize,
      });

      setExpenses(result.items);
      setTotalItems(result.total);
      setTotalPages(result.totalPages);
    } catch {
      setError("Erro ao carregar despesas. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  }, [
    selectedMonth,
    statusFilter,
    categoryFilter,
    itemFilter,
    contactFilter,
    essentialityFilter,
    currentPage,
    pageSize,
  ]);

  useEffect(() => {
    loadAuxData();
  }, [loadAuxData]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  // Navegação de Mês
  const handlePrevMonth = () => {
    const [y, m] = selectedMonth.split("-").map(Number);
    const prev = new Date(y, m - 2, 1);
    setSelectedMonth(`${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}`);
    setCurrentPage(1);
  };

  const handleNextMonth = () => {
    const [y, m] = selectedMonth.split("-").map(Number);
    const next = new Date(y, m, 1);
    setSelectedMonth(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`);
    setCurrentPage(1);
  };

  const monthFormatted = useMemo(() => {
    const [year, month] = selectedMonth.split("-").map(Number);
    const d = new Date(year, month - 1, 1);
    return d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  }, [selectedMonth]);

  // Cálculo de Métricas do Mês
  const currentMonthPayments = useMemo(() => {
    return expenses.flatMap((exp) =>
      exp.payments.filter((p) => p.due_date.startsWith(selectedMonth))
    );
  }, [expenses, selectedMonth]);

  const totalExpensesCents = useMemo(
    () => currentMonthPayments.reduce((acc, p) => acc + p.amount_cents, 0),
    [currentMonthPayments]
  );
  const totalPaidCents = useMemo(
    () =>
      currentMonthPayments
        .filter((p) => p.status === "CONCLUIDO")
        .reduce((acc, p) => acc + p.amount_cents, 0),
    [currentMonthPayments]
  );
  const totalPendingCents = useMemo(
    () =>
      currentMonthPayments
        .filter((p) => p.status === "PENDENTE")
        .reduce((acc, p) => acc + p.amount_cents, 0),
    [currentMonthPayments]
  );
  const currentMonthPendingCount = useMemo(
    () => currentMonthPayments.filter((p) => p.status === "PENDENTE").length,
    [currentMonthPayments]
  );

  // Ações de Registro
  const handleTogglePaymentStatus = async (paymentId: string, currentStatus: ExpenseStatus) => {
    const newStatus: ExpenseStatus = currentStatus === "CONCLUIDO" ? "PENDENTE" : "CONCLUIDO";
    try {
      await walletApi.updatePaymentStatus(paymentId, { status: newStatus });
      fetchExpenses();
    } catch {
      alert("Erro ao atualizar status da parcela.");
    }
  };

  const handleDeleteExpense = async (expenseId: string, description: string) => {
    if (!window.confirm(`Deseja realmente excluir o lançamento "${description}" e todas as suas parcelas?`)) {
      return;
    }
    try {
      await walletApi.deleteExpense(expenseId);
      fetchExpenses();
    } catch {
      alert("Erro ao excluir lançamento.");
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedExpenseIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSetInstallmentFilter = (expenseId: string, filter: "ALL" | "PENDING" | "PAID") => {
    setInstallmentFilters((prev) => ({ ...prev, [expenseId]: filter }));
  };

  const handleOpenEditModal = (expense: Expense) => {
    setEditingExpense(expense);
    setIsEditModalOpen(true);
  };

  const handleOpenEditPaymentModal = (expense: Expense, payment: Payment) => {
    setSelectedPayment(payment);
    setSelectedPaymentExpense(expense);
    setIsPaymentModalOpen(true);
  };

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
              className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 cursor-pointer"
              title="Mês Anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 text-sm font-semibold capitalize text-zinc-800 dark:text-zinc-200 min-w-[130px] text-center">
              {monthFormatted}
            </span>
            <button
              onClick={handleNextMonth}
              className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 cursor-pointer"
              title="Próximo Mês"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Botão Novo Registro */}
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-500 text-white font-medium px-4 py-2 rounded-xl text-sm shadow-sm shadow-blue-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Registro</span>
          </button>
        </div>
      </div>

      {/* Cards de Resumo Mensal */}
      <ExpenseSummaryCards
        totalExpensesCents={totalExpensesCents}
        totalPaidCents={totalPaidCents}
        totalPendingCents={totalPendingCents}
        currentMonthPaymentsCount={currentMonthPayments.length}
        currentMonthPendingCount={currentMonthPendingCount}
      />

      {/* Barra de Filtros */}
      <ExpenseFilters
        statusFilter={statusFilter}
        setStatusFilter={(val) => {
          setStatusFilter(val);
          setCurrentPage(1);
        }}
        categoryFilter={categoryFilter}
        setCategoryFilter={(val) => {
          setCategoryFilter(val);
          setCurrentPage(1);
        }}
        itemFilter={itemFilter}
        setItemFilter={(val) => {
          setItemFilter(val);
          setCurrentPage(1);
        }}
        contactFilter={contactFilter}
        setContactFilter={(val) => {
          setContactFilter(val);
          setCurrentPage(1);
        }}
        essentialityFilter={essentialityFilter}
        setEssentialityFilter={(val) => {
          setEssentialityFilter(val);
          setCurrentPage(1);
        }}
        categories={categories}
        items={items}
        contacts={contacts}
        totalCount={totalItems}
      />

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
            onClick={() => setIsCreateModalOpen(true)}
            className="mt-5 inline-flex items-center space-x-2 bg-blue-600 hover:bg-blue-500 text-white font-medium px-4 py-2 rounded-xl text-sm transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Adicionar Primeira Despesa</span>
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {expenses.map((expense) => (
            <ExpenseCard
              key={expense.id}
              expense={expense}
              selectedMonth={selectedMonth}
              isExpanded={expandedExpenseIds.has(expense.id)}
              onToggleExpand={toggleExpand}
              installmentFilter={installmentFilters[expense.id] || "ALL"}
              onSetInstallmentFilter={(filter) => handleSetInstallmentFilter(expense.id, filter)}
              onTogglePaymentStatus={handleTogglePaymentStatus}
              onOpenEditModal={handleOpenEditModal}
              onOpenEditPaymentModal={handleOpenEditPaymentModal}
              onDeleteExpense={handleDeleteExpense}
              todayIsoDate={todayIsoDate}
            />
          ))}

          {/* Paginação */}
          <ExpensePagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            pageSize={pageSize}
            onPageChange={(p) => setCurrentPage(p)}
            onPageSizeChange={(sz) => {
              setPageSize(sz);
              setCurrentPage(1);
            }}
          />
        </div>
      )}

      {/* Modal de Criação de Despesa */}
      <ExpenseCreateModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          if (onCloseCreateModalExternal) {
            onCloseCreateModalExternal();
          }
        }}
        categories={categories}
        items={items}
        contacts={contacts}
        paymentMethods={paymentMethods}
        onSuccess={fetchExpenses}
        onOpenQuickItemModal={() => setIsQuickItemModalOpen(true)}
        onOpenQuickContactModal={() => setIsQuickContactModalOpen(true)}
      />

      {/* Modal de Edição de Despesa */}
      <ExpenseEditModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingExpense(null);
        }}
        expense={editingExpense}
        categories={categories}
        items={items}
        contacts={contacts}
        paymentMethods={paymentMethods}
        onSuccess={fetchExpenses}
        onOpenQuickItemModal={() => setIsQuickItemModalOpen(true)}
        onOpenQuickContactModal={() => setIsQuickContactModalOpen(true)}
        onOpenEditPaymentModal={handleOpenEditPaymentModal}
        todayIsoDate={todayIsoDate}
      />

      {/* Modal de Edição de Parcela Individual */}
      <PaymentEditModal
        isOpen={isPaymentModalOpen}
        onClose={() => {
          setIsPaymentModalOpen(false);
          setSelectedPayment(null);
          setSelectedPaymentExpense(null);
        }}
        selectedPayment={selectedPayment}
        selectedExpense={selectedPaymentExpense}
        onSuccess={fetchExpenses}
      />

      {/* Modal Criação Rápida de Item */}
      <QuickItemModal
        isOpen={isQuickItemModalOpen}
        onClose={() => setIsQuickItemModalOpen(false)}
        categories={categories}
        onItemCreated={(newItem) => {
          setItems((prev) => [...prev, newItem]);
        }}
      />

      {/* Modal Criação Rápida de Contato */}
      <QuickContactModal
        isOpen={isQuickContactModalOpen}
        onClose={() => setIsQuickContactModalOpen(false)}
        onContactCreated={(newContact) => {
          setContacts((prev) => [...prev, newContact]);
        }}
      />
    </div>
  );
};
