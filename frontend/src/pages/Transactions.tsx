import React, { useState, useEffect, useMemo } from "react";
import { useApp } from "../context/AppContext";
import { api } from "../api/client";
import { Transaction, Category, Contact, Account, PaymentMethod, CreditCard as CreditCardType, AttachmentType, ATTACHMENT_TYPES } from "../types";
import { formatCurrency, formatDateToBR } from "../utils/format";
import { TransactionModal } from "../components/TransactionModal";
import { AttachmentViewerModal } from "../components/AttachmentViewerModal";
import { ContactStatementModal } from "../components/ContactStatementModal";
import { FinancialReportModal } from "../components/FinancialReportModal";
import { BatchEditModal } from "../components/BatchEditModal";
import { ConciliationModal } from "../components/ConciliationModal";
import { 
  Plus, Check, Trash2, ArrowUpRight, ArrowDownRight, 
  Filter, AlertCircle, Search, X, Calendar, 
  ChevronLeft, ChevronRight, Clock, DollarSign, 
  Landmark, Tag, Users, CheckCircle2, RotateCcw, AlertTriangle, 
  Layers, Wallet, PiggyBank, CircleDollarSign, CreditCard, Paperclip, FileText, Pencil, Sparkles,
  ArrowRightLeft, ArrowRight, Printer, SlidersHorizontal, FileDown, FileSpreadsheet
} from "lucide-react";

type PeriodPreset = 
  | "MES_ATUAL"
  | "HOJE"
  | "ESTA_SEMANA"
  | "PROX_7_DIAS"
  | "PROX_30_DIAS"
  | "ANO_ATUAL"
  | "TODAS"
  | "CUSTOM";

type StatusFilterOption = "TODOS" | "PENDENTE" | "CONCLUIDO" | "ATRASADAS";
type TypeFilterOption = "TODOS" | "DESPESA" | "RECEITA" | "TRANSFERENCIA";

export const Transactions: React.FC = () => {
  const { profile, hideValues, refreshSyncStatus } = useApp();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Record<string, Category>>({});
  const [contacts, setContacts] = useState<Record<string, Contact>>({});
  const [accounts, setAccounts] = useState<Record<string, Account>>({});
  const [paymentMethods, setPaymentMethods] = useState<Record<string, PaymentMethod>>({});
  const [creditCards, setCreditCards] = useState<Record<string, CreditCardType>>({});
  const [categoriesList, setCategoriesList] = useState<Category[]>([]);
  const [accountsList, setAccountsList] = useState<Account[]>([]);
  const [paymentMethodsList, setPaymentMethodsList] = useState<PaymentMethod[]>([]);
  const [creditCardsList, setCreditCardsList] = useState<CreditCardType[]>([]);
  const [contactsList, setContactsList] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados de Anexos / Comprovantes
  const [selectedTransactionForAttachments, setSelectedTransactionForAttachments] = useState<Transaction | null>(null);
  const [isAttachmentModalOpen, setIsAttachmentModalOpen] = useState(false);
  const [isConciliationModalOpen, setIsConciliationModalOpen] = useState(false);

  // Estado de Extrato de Contato
  const [selectedContactForStatement, setSelectedContactForStatement] = useState<Contact | null>(null);

  // Estados de Filtros
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>("MES_ATUAL");
  const [navDate, setNavDate] = useState<Date>(new Date());
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilterOption>("TODOS");
  const [typeFilter, setTypeFilter] = useState<TypeFilterOption>("TODOS");
  const [accountFilter, setAccountFilter] = useState<string>("TODAS");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>("TODAS");
  const [creditCardFilter, setCreditCardFilter] = useState<string>("TODOS");
  const [categoryFilter, setCategoryFilter] = useState<string>("TODAS");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  // Estados de Ações em Lote e Relatório
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBatchEditOpen, setIsBatchEditOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isBatchOperating, setIsBatchOperating] = useState(false);

  // Helper de formatação de data ISO local YYYY-MM-DD
  const formatISO = (d: Date): string => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const todayStr = useMemo(() => formatISO(new Date()), []);

  // Cálculo das datas inicial e final baseadas no Preset e NavDate
  const dateRange = useMemo(() => {
    if (periodPreset === "TODAS") {
      return { start: undefined, end: undefined };
    }

    if (periodPreset === "HOJE") {
      return { start: todayStr, end: todayStr };
    }

    if (periodPreset === "ESTA_SEMANA") {
      const now = new Date();
      const currentDay = now.getDay(); // 0 = Domingo
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - currentDay);
      const endOfWeek = new Date(now);
      endOfWeek.setDate(now.getDate() + (6 - currentDay));
      return { start: formatISO(startOfWeek), end: formatISO(endOfWeek) };
    }

    if (periodPreset === "PROX_7_DIAS") {
      const now = new Date();
      const end = new Date(now);
      end.setDate(now.getDate() + 7);
      return { start: todayStr, end: formatISO(end) };
    }

    if (periodPreset === "PROX_30_DIAS") {
      const now = new Date();
      const end = new Date(now);
      end.setDate(now.getDate() + 30);
      return { start: todayStr, end: formatISO(end) };
    }

    if (periodPreset === "ANO_ATUAL") {
      const year = navDate.getFullYear();
      return { start: `${year}-01-01`, end: `${year}-12-31` };
    }

    if (periodPreset === "CUSTOM") {
      return {
        start: customStartDate || undefined,
        end: customEndDate || undefined,
      };
    }

    // Default: MES_ATUAL ou Mês Navegado
    const year = navDate.getFullYear();
    const month = navDate.getMonth();
    const startOfMonth = new Date(year, month, 1);
    const endOfMonth = new Date(year, month + 1, 0);
    return { start: formatISO(startOfMonth), end: formatISO(endOfMonth) };
  }, [periodPreset, navDate, customStartDate, customEndDate, todayStr]);

  // Carregamento de dados
  const fetchData = async () => {
    setLoading(true);
    try {
      const [transRes, catRes, conRes, accRes, pmRes, cardsRes] = await Promise.all([
        api.get("/transactions", {
          params: {
            profile,
            status: statusFilter === "TODOS" || statusFilter === "ATRASADAS" ? undefined : statusFilter,
            type: typeFilter === "TODOS" ? undefined : typeFilter,
            start_due_date: statusFilter === "ATRASADAS" ? undefined : dateRange.start,
            end_due_date: statusFilter === "ATRASADAS" ? undefined : dateRange.end,
            account_id: accountFilter === "TODAS" ? undefined : accountFilter,
            payment_method_id: paymentMethodFilter === "TODAS" ? undefined : paymentMethodFilter,
            credit_card_id: creditCardFilter === "TODOS" ? undefined : creditCardFilter,
            category_id: categoryFilter === "TODAS" ? undefined : categoryFilter,
            is_overdue: statusFilter === "ATRASADAS" ? true : undefined,
          },
        }),
        api.get("/categories", { params: { profile } }),
        api.get("/contacts", { params: { profile } }),
        api.get("/accounts", { params: { profile } }),
        api.get("/payment-methods", { params: { profile } }),
        api.get("/credit-cards", { params: { profile } }),
      ]);

      setTransactions(transRes.data);
      setCategoriesList(catRes.data);
      setContactsList(conRes.data);
      setAccountsList(accRes.data);
      setPaymentMethodsList(pmRes.data);
      setCreditCardsList(cardsRes.data);

      const catMap: Record<string, Category> = {};
      catRes.data.forEach((c: Category) => {
        catMap[c.id] = c;
      });
      setCategories(catMap);

      const conMap: Record<string, Contact> = {};
      conRes.data.forEach((ct: Contact) => {
        conMap[ct.id] = ct;
      });
      setContacts(conMap);

      const accMap: Record<string, Account> = {};
      accRes.data.forEach((a: Account) => {
        accMap[a.id] = a;
      });
      setAccounts(accMap);

      const pmMap: Record<string, PaymentMethod> = {};
      pmRes.data.forEach((pm: PaymentMethod) => {
        pmMap[pm.id] = pm;
      });
      setPaymentMethods(pmMap);

      const cardMap: Record<string, CreditCardType> = {};
      cardsRes.data.forEach((c: CreditCardType) => {
        cardMap[c.id] = c;
      });
      setCreditCards(cardMap);
    } catch (err) {
      console.error("Erro ao carregar transações:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [profile, statusFilter, typeFilter, periodPreset, dateRange.start, dateRange.end, accountFilter, paymentMethodFilter, creditCardFilter, categoryFilter]);

  // Navegação de mês
  const handlePrevMonth = () => {
    setPeriodPreset("MES_ATUAL");
    setNavDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setPeriodPreset("MES_ATUAL");
    setNavDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleCurrentMonth = () => {
    setPeriodPreset("MES_ATUAL");
    setNavDate(new Date());
  };

  // Liquidação ou reabertura de transação (alternância de status)
  const handleToggleStatus = async (t: Transaction) => {
    try {
      await api.patch(`/transactions/${t.id}/toggle-status`);
      fetchData();
      refreshSyncStatus(false);
    } catch (err) {
      console.error("Erro ao alternar status da transação:", err);
    }
  };

  // Exclusão de transação
  const handleDelete = async (id: string) => {
    if (!confirm("Deseja realmente excluir esta transação?")) return;
    try {
      await api.delete(`/transactions/${id}`);
      fetchData();
      refreshSyncStatus(false);
    } catch (err) {
      console.error("Erro ao excluir:");
    }
  };

  // Reset total dos filtros
  const handleResetFilters = () => {
    setPeriodPreset("MES_ATUAL");
    setNavDate(new Date());
    setCustomStartDate("");
    setCustomEndDate("");
    setStatusFilter("TODOS");
    setTypeFilter("TODOS");
    setAccountFilter("TODAS");
    setPaymentMethodFilter("TODAS");
    setCreditCardFilter("TODOS");
    setCategoryFilter("TODAS");
    setSearchQuery("");
    setSelectedIds(new Set());
  };

  // Handlers de Ações em Lote
  const handleBatchComplete = async () => {
    if (selectedIds.size === 0) return;
    setIsBatchOperating(true);
    try {
      await api.post("/transactions/batch/complete", {
        transaction_ids: Array.from(selectedIds),
        payment_date: todayStr
      });
      setSelectedIds(new Set());
      fetchData();
      refreshSyncStatus(false);
    } catch (err) {
      console.error("Erro ao liquidar em lote:", err);
    } finally {
      setIsBatchOperating(false);
    }
  };

  const handleBatchUncomplete = async () => {
    if (selectedIds.size === 0) return;
    setIsBatchOperating(true);
    try {
      await api.post("/transactions/batch/uncomplete", {
        transaction_ids: Array.from(selectedIds)
      });
      setSelectedIds(new Set());
      fetchData();
      refreshSyncStatus(false);
    } catch (err) {
      console.error("Erro ao reabrir em lote:", err);
    } finally {
      setIsBatchOperating(false);
    }
  };

  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Deseja realmente excluir os ${selectedIds.size} lançamento(s) selecionado(s)?`)) return;
    setIsBatchOperating(true);
    try {
      await api.post("/transactions/batch/delete", {
        transaction_ids: Array.from(selectedIds)
      });
      setSelectedIds(new Set());
      fetchData();
      refreshSyncStatus(false);
    } catch (err) {
      console.error("Erro ao excluir em lote:", err);
    } finally {
      setIsBatchOperating(false);
    }
  };

  const isFiltered = useMemo(() => {
    return (
      periodPreset !== "MES_ATUAL" ||
      statusFilter !== "TODOS" ||
      typeFilter !== "TODOS" ||
      accountFilter !== "TODAS" ||
      paymentMethodFilter !== "TODAS" ||
      creditCardFilter !== "TODOS" ||
      categoryFilter !== "TODAS" ||
      searchQuery.trim() !== ""
    );
  }, [periodPreset, statusFilter, typeFilter, accountFilter, paymentMethodFilter, creditCardFilter, categoryFilter, searchQuery]);

  // Transações filtradas localmente apenas pelo searchQuery
  const filteredTransactions = useMemo(() => {
    if (!searchQuery.trim()) return transactions;
    const q = searchQuery.toLowerCase();
    return transactions.filter((t) => {
      const descMatch = t.description.toLowerCase().includes(q);
      const catMatch = t.category_id ? categories[t.category_id]?.name.toLowerCase().includes(q) : (t.type === "TRANSFERENCIA" && "transferência interna".includes(q));
      const contactMatch = t.contact_id && contacts[t.contact_id]?.name.toLowerCase().includes(q);
      const accMatch = (t.account_id && accounts[t.account_id]?.name.toLowerCase().includes(q)) ||
                       (t.destination_account_id && accounts[t.destination_account_id]?.name.toLowerCase().includes(q));
      const pmMatch = t.payment_method_id && paymentMethods[t.payment_method_id]?.name.toLowerCase().includes(q);
      const cardMatch = t.credit_card_id && creditCards[t.credit_card_id]?.name.toLowerCase().includes(q);
      const notesMatch = t.notes && t.notes.toLowerCase().includes(q);
      const amountMatch = (t.amount_cents / 100).toString().includes(q);

      return descMatch || catMatch || contactMatch || accMatch || pmMatch || cardMatch || notesMatch || amountMatch;
    });
  }, [transactions, searchQuery, categories, contacts, accounts, paymentMethods, creditCards]);

  // Controle de Seleção Múltipla
  const isAllSelected = filteredTransactions.length > 0 && filteredTransactions.every((t) => selectedIds.has(t.id));
  const isSomeSelected = filteredTransactions.some((t) => selectedIds.has(t.id)) && !isAllSelected;

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredTransactions.map((t) => t.id)));
    }
  };

  const handleToggleSelectOne = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  // Métricas calculadas
  const metrics = useMemo(() => {
    let incomeCents = 0;
    let expenseCents = 0;
    let overdueCount = 0;
    let overdueCents = 0;
    let dueTodayCount = 0;
    let pendingCount = 0;

    transactions.forEach((t) => {
      const isOverdue = t.status === "PENDENTE" && t.due_date < todayStr;
      const isDueToday = t.status === "PENDENTE" && t.due_date === todayStr;

      if (isOverdue) {
        overdueCount++;
        overdueCents += t.amount_cents;
      }
      if (isDueToday) {
        dueTodayCount++;
      }
      if (t.status === "PENDENTE") {
        pendingCount++;
      }
    });

    filteredTransactions.forEach((t) => {
      if (t.type === "RECEITA") {
        incomeCents += t.amount_cents;
      } else if (t.type === "DESPESA") {
        expenseCents += t.amount_cents;
      }
    });

    return {
      incomeCents,
      expenseCents,
      balanceCents: incomeCents - expenseCents,
      overdueCount,
      overdueCents,
      dueTodayCount,
      pendingCount,
    };
  }, [transactions, filteredTransactions, todayStr]);

  // Formatação do título do mês atual na navegação
  const formattedMonthTitle = useMemo(() => {
    const monthNames = [
      "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
      "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
    ];
    return `${monthNames[navDate.getMonth()]} de ${navDate.getFullYear()}`;
  }, [navDate]);

  // Ícone por tipo de conta
  const getAccountIcon = (type?: string) => {
    switch (type) {
      case "CORRENTE": return Landmark;
      case "POUPANCA": return PiggyBank;
      case "INVESTIMENTO": return CircleDollarSign;
      case "CAIXA": return Wallet;
      default: return CreditCard;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header com Título e Ação Principal */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
            Lançamentos
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Controle integrado de receitas, despesas, vencimentos e liquidações ({profile})
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {profile === "EMPRESA" && (
            <button
              onClick={() => setIsConciliationModalOpen(true)}
              className="flex items-center justify-center gap-2 px-3.5 py-2.5 text-xs font-bold bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-xl shadow-sm transition-all active:scale-95 cursor-pointer"
              title="Importar extrato bancário OFX ou CSV e conciliar"
            >
              <FileSpreadsheet className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Conciliação OFX/CSV</span>
            </button>
          )}

          <button
            onClick={() => setIsReportModalOpen(true)}
            className="flex items-center justify-center gap-2 px-3.5 py-2.5 text-xs font-bold bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-sm transition-all active:scale-95 cursor-pointer"
            title="Exportar Relatório Consolidado em PDF ou CSV"
          >
            <Printer className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Relatório / PDF</span>
          </button>

          <button
            onClick={() => {
              setEditingTransaction(null);
              setIsModalOpen(true);
            }}
            className="flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md shadow-emerald-600/20 transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Lançamento</span>
          </button>
        </div>
      </div>

      {/* BANNER DE ALERTA: CONTAS ATRASADAS (Se existirem) */}
      {metrics.overdueCount > 0 && statusFilter !== "ATRASADAS" && (
        <div className="p-4 bg-gradient-to-r from-rose-500/10 via-rose-500/5 to-amber-500/10 border border-rose-200 dark:border-rose-900/60 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-rose-500 text-white shadow-md shadow-rose-500/20 animate-pulse">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-rose-900 dark:text-rose-200 flex items-center gap-1.5">
                <span>{metrics.overdueCount} {metrics.overdueCount === 1 ? "conta atrasada requer atenção" : "contas atrasadas requerem atenção"}</span>
              </h4>
              <p className="text-[11px] text-rose-700 dark:text-rose-400 font-mono mt-0.5">
                Total pendente em atraso: {formatCurrency(metrics.overdueCents, hideValues)}
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              setPeriodPreset("TODAS");
              setStatusFilter("ATRASADAS");
            }}
            className="px-3.5 py-1.5 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-sm transition-all whitespace-nowrap self-start sm:self-auto"
          >
            Ver Todas as Atrasadas
          </button>
        </div>
      )}

      {/* CARDS DE RESUMO & ATALHOS INTELIGENTES (KPIs) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 xl:gap-4">
        {/* Receitas Filtradas */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 xl:p-5 shadow-sm space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-zinc-400">Receitas</span>
            <span className="p-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
              <ArrowUpRight className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-base xl:text-lg font-bold text-emerald-600 dark:text-emerald-400 font-mono">
            {formatCurrency(metrics.incomeCents, hideValues)}
          </div>
        </div>

        {/* Despesas Filtradas */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 xl:p-5 shadow-sm space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-zinc-400">Despesas</span>
            <span className="p-1 rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400">
              <ArrowDownRight className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-base xl:text-lg font-bold text-rose-600 dark:text-rose-400 font-mono">
            {formatCurrency(metrics.expenseCents, hideValues)}
          </div>
        </div>

        {/* Saldo Líquido do Período */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 xl:p-5 shadow-sm space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-zinc-400">Saldo Filtrado</span>
            <span className="p-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
              <DollarSign className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className={`text-base xl:text-lg font-bold font-mono ${
            metrics.balanceCents >= 0 
              ? "text-emerald-600 dark:text-emerald-400" 
              : "text-rose-600 dark:text-rose-400"
          }`}>
            {formatCurrency(metrics.balanceCents, hideValues)}
          </div>
        </div>

        {/* Atalhos Rápidos de Atrasadas / Hoje */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 xl:p-5 shadow-sm flex flex-col justify-between gap-1.5">
          <span className="text-[11px] font-semibold text-zinc-400">Atalhos de Urgência</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setPeriodPreset("TODAS");
                setStatusFilter("ATRASADAS");
              }}
              title="Filtrar contas atrasadas"
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all flex items-center gap-1 ${
                statusFilter === "ATRASADAS"
                  ? "bg-rose-600 text-white border-rose-600 shadow-sm"
                  : "bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800/50 hover:bg-rose-100"
              }`}
            >
              <AlertCircle className="w-3 h-3" />
              <span>{metrics.overdueCount} Atrasadas</span>
            </button>

            <button
              onClick={() => {
                setPeriodPreset("HOJE");
                setStatusFilter("PENDENTE");
              }}
              title="Filtrar contas com vencimento hoje"
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all flex items-center gap-1 ${
                periodPreset === "HOJE" && statusFilter === "PENDENTE"
                  ? "bg-amber-600 text-white border-amber-600 shadow-sm"
                  : "bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800/50 hover:bg-amber-100"
              }`}
            >
              <Clock className="w-3 h-3" />
              <span>{metrics.dueTodayCount} Hoje</span>
            </button>
          </div>
        </div>
      </div>

      {/* PAINEL DE CONTROLE DE PERÍODOS & NAVEGAÇÃO */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Navegador de Mês */}
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevMonth}
              title="Mês Anterior"
              className="p-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="px-3 py-1.5 bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-bold text-zinc-900 dark:text-zinc-100 min-w-[170px] text-center">
              {formattedMonthTitle}
            </div>

            <button
              onClick={handleNextMonth}
              title="Próximo Mês"
              className="p-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 transition-all"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <button
              onClick={handleCurrentMonth}
              title="Voltar para o Mês Atual"
              className="px-2.5 py-1.5 text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 transition-all"
            >
              Mês Atual
            </button>
          </div>

          {/* Atalhos Rápidos de Presets */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 lg:pb-0">
            {[
              { id: "MES_ATUAL", label: "Mês" },
              { id: "HOJE", label: "Hoje" },
              { id: "ESTA_SEMANA", label: "Esta Semana" },
              { id: "PROX_7_DIAS", label: "Próx. 7 Dias" },
              { id: "PROX_30_DIAS", label: "Próx. 30 Dias" },
              { id: "ANO_ATUAL", label: "Ano Todo" },
              { id: "TODAS", label: "Todas as Datas" },
              { id: "CUSTOM", label: "Personalizado" },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => setPeriodPreset(p.id as PeriodPreset)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  periodPreset === p.id
                    ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-sm"
                    : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/60 dark:border-zinc-800"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Inputs de Data Personalizada (quando selecionado CUSTOM) */}
        {periodPreset === "CUSTOM" && (
          <div className="p-3 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl border border-zinc-200 dark:border-zinc-800 flex flex-wrap items-center gap-3 animate-fade-in">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">De:</span>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-3 py-1.5 text-xs bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Até:</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-3 py-1.5 text-xs bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>
        )}
      </div>

      {/* BARRA DE BUSCA GLOBAL E FILTROS MULTI-CRITÉRIO */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Busca Textual Global */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Buscar por descrição, categoria, contato, conta, valor ou notas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-9 py-2 text-xs bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-zinc-900 dark:text-zinc-100 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Reset Filters */}
          {isFiltered && (
            <button
              onClick={handleResetFilters}
              className="px-3 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl border border-rose-200 dark:border-rose-800/50 flex items-center justify-center gap-1.5 transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Limpar Filtros</span>
            </button>
          )}
        </div>

        {/* Filtros Dropdowns & Pills */}
        <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-zinc-100 dark:border-zinc-800 text-xs">
          {/* Status Filter */}
          <div className="flex items-center gap-1 bg-zinc-50 dark:bg-zinc-800/60 p-1 rounded-xl border border-zinc-200/60 dark:border-zinc-800">
            <span className="text-[11px] font-bold text-zinc-400 px-1.5">Status:</span>
            {[
              { id: "TODOS", label: "Todos" },
              { id: "PENDENTE", label: "Abertas" },
              { id: "CONCLUIDO", label: "Liquidadas" },
              { id: "ATRASADAS", label: "Atrasadas" },
            ].map((st) => (
              <button
                key={st.id}
                onClick={() => setStatusFilter(st.id as StatusFilterOption)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                  statusFilter === st.id
                    ? st.id === "ATRASADAS"
                      ? "bg-rose-600 text-white shadow-sm"
                      : "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-sm"
                    : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>

          {/* Type Filter */}
          <div className="flex items-center gap-1 bg-zinc-50 dark:bg-zinc-800/60 p-1 rounded-xl border border-zinc-200/60 dark:border-zinc-800">
            <span className="text-[11px] font-bold text-zinc-400 px-1.5">Tipo:</span>
            {[
              { id: "TODOS", label: "Todos" },
              { id: "DESPESA", label: "Despesas" },
              { id: "RECEITA", label: "Receitas" },
              { id: "TRANSFERENCIA", label: "Transferências" },
            ].map((tp) => (
              <button
                key={tp.id}
                onClick={() => setTypeFilter(tp.id as TypeFilterOption)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                  typeFilter === tp.id
                    ? tp.id === "DESPESA"
                      ? "bg-rose-600 text-white shadow-sm"
                      : tp.id === "RECEITA"
                      ? "bg-emerald-600 text-white shadow-sm"
                      : tp.id === "TRANSFERENCIA"
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-sm"
                    : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                }`}
              >
                {tp.label}
              </button>
            ))}
          </div>

          {/* Account Filter */}
          {accountsList.length > 0 && (
            <select
              value={accountFilter}
              onChange={(e) => setAccountFilter(e.target.value)}
              className="px-3 py-1.5 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-800 dark:text-zinc-200 text-xs font-semibold focus:outline-none focus:border-emerald-500 font-medium"
            >
              <option value="TODAS">Todas as Contas</option>
              {[...accountsList]
                .sort((a, b) => a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" }))
                .map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({acc.type})
                  </option>
                ))}
            </select>
          )}

          {/* Payment Method Filter */}
          {paymentMethodsList.length > 0 && (
            <select
              value={paymentMethodFilter}
              onChange={(e) => setPaymentMethodFilter(e.target.value)}
              className="px-3 py-1.5 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-800 dark:text-zinc-200 text-xs font-semibold focus:outline-none focus:border-emerald-500 font-medium"
            >
              <option value="TODAS">Todas as Formas</option>
              {[...paymentMethodsList]
                .sort((a, b) => a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" }))
                .map((pm) => (
                  <option key={pm.id} value={pm.id}>
                    {pm.name}
                  </option>
                ))}
            </select>
          )}

          {/* Credit Card Filter */}
          {creditCardsList.length > 0 && (
            <select
              value={creditCardFilter}
              onChange={(e) => setCreditCardFilter(e.target.value)}
              className="px-3 py-1.5 bg-purple-50/50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/60 rounded-xl text-purple-900 dark:text-purple-200 text-xs font-semibold focus:outline-none focus:border-purple-500 font-medium"
            >
              <option value="TODOS">Todos os Cartões</option>
              {[...creditCardsList]
                .sort((a, b) => a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" }))
                .map((card) => (
                  <option key={card.id} value={card.id}>
                    {card.name}
                  </option>
                ))}
            </select>
          )}

          {/* Category Filter */}
          {categoriesList.length > 0 && (
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-1.5 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-800 dark:text-zinc-200 text-xs font-semibold focus:outline-none focus:border-emerald-500 font-medium"
            >
              <option value="TODAS">Todas as Categorias</option>
              {[...categoriesList]
                .sort((a, b) => a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" }))
                .map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name} ({cat.type})
                  </option>
                ))}
            </select>
          )}

          <div className="ml-auto text-[11px] text-zinc-400 font-medium font-mono">
            {filteredTransactions.length} {filteredTransactions.length === 1 ? "lançamento" : "lançamentos"}
          </div>
        </div>
      </div>

      {/* TABELA DE LANÇAMENTOS */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center p-12 text-sm text-zinc-500">
            <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mr-3"></div>
            Carregando lançamentos...
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mx-auto text-zinc-400">
              <Filter className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
              Nenhum lançamento encontrado para os filtros selecionados.
            </h3>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto">
              Ajuste os filtros de período, status ou clique em "Limpar Filtros" para visualizar os dados.
            </p>
            {isFiltered && (
              <button
                onClick={handleResetFilters}
                className="px-4 py-2 text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-xl transition-all"
              >
                Limpar Todos os Filtros
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-800/50 text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  <th className="py-3.5 px-3 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      ref={(el) => { if (el) el.indeterminate = isSomeSelected; }}
                      onChange={handleToggleSelectAll}
                      title="Selecionar / Desmarcar todos os lançamentos filtrados"
                      className="w-4 h-4 rounded text-emerald-600 border-zinc-300 dark:border-zinc-700 focus:ring-emerald-500 cursor-pointer"
                    />
                  </th>
                  <th className="py-3.5 px-3 xl:px-4 w-12 text-center">Status</th>
                  <th className="py-3.5 px-4 xl:px-6">Vencimento / Liquidação</th>
                  <th className="py-3.5 px-4 xl:px-6">Descrição</th>
                  <th className="py-3.5 px-4 xl:px-6">Categoria</th>
                  <th className="py-3.5 px-4 xl:px-6">Conta / Forma de Pgto</th>
                  <th className="py-3.5 px-4 xl:px-6">Contato</th>
                  <th className="py-3.5 px-4 xl:px-6 text-right">Valor</th>
                  <th className="py-3.5 px-4 xl:px-6 w-20 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60 text-xs">
                {filteredTransactions.map((t) => {
                  const isCompleted = t.status === "CONCLUIDO";
                  const isOverdue = !isCompleted && t.due_date < todayStr;
                  const isDueToday = !isCompleted && t.due_date === todayStr;

                  // Cálculo de dias de atraso
                  let daysDiff = 0;
                  if (isOverdue) {
                    const diffTime = Math.abs(new Date(todayStr).getTime() - new Date(t.due_date).getTime());
                    daysDiff = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                  }

                  const acc = t.account_id ? accounts[t.account_id] : null;
                  const AccIcon = getAccountIcon(acc?.type);

                  return (
                    <tr
                      key={t.id}
                      className={`hover:bg-zinc-50/70 dark:hover:bg-zinc-800/30 transition-colors ${
                        selectedIds.has(t.id) 
                          ? "bg-indigo-50/40 dark:bg-indigo-950/20" 
                          : isOverdue 
                          ? "bg-rose-50/30 dark:bg-rose-950/10" 
                          : ""
                      }`}
                    >
                      {/* Checkbox de Seleção Individual */}
                      <td className="py-3.5 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(t.id)}
                          onChange={() => handleToggleSelectOne(t.id)}
                          className="w-4 h-4 rounded text-emerald-600 border-zinc-300 dark:border-zinc-700 focus:ring-emerald-500 cursor-pointer"
                        />
                      </td>

                      {/* Status / Checkbox com Alternância e Desmarcação */}
                      <td className="py-3.5 px-3 xl:px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(t)}
                          title={
                            isCompleted
                              ? `${t.type === "RECEITA" ? "Recebido" : t.type === "TRANSFERENCIA" ? "Transferido" : "Pago"} em ${t.payment_date ? formatDateToBR(t.payment_date) : formatDateToBR(t.due_date)} • Clique para desmarcar e reabrir`
                              : `Pendente • Clique para marcar como ${t.type === "RECEITA" ? "Recebido" : t.type === "TRANSFERENCIA" ? "Concluído" : "Pago"}`
                          }
                          className={`p-1.5 rounded-lg border transition-all cursor-pointer group ${
                            isCompleted
                              ? "bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-700 text-emerald-600 dark:text-emerald-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 hover:border-rose-400 hover:text-rose-600"
                              : isOverdue
                              ? "border-rose-400 text-rose-500 hover:border-emerald-600 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 hover:scale-105"
                              : "border-zinc-300 dark:border-zinc-700 text-zinc-400 hover:border-emerald-600 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 hover:scale-105"
                          }`}
                        >
                          {isCompleted ? (
                            <>
                              <Check className="w-3.5 h-3.5 group-hover:hidden" />
                              <RotateCcw className="w-3.5 h-3.5 hidden group-hover:block" />
                            </>
                          ) : (
                            <Check className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100" />
                          )}
                        </button>
                      </td>

                      {/* Due Date & Action Date */}
                      <td className="py-3.5 px-4 xl:px-6 whitespace-nowrap">
                        {isCompleted ? (
                          <div>
                            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                              <span>{t.type === "RECEITA" ? "Recebido:" : t.type === "TRANSFERENCIA" ? "Efetivado:" : "Pago:"} {t.payment_date ? formatDateToBR(t.payment_date) : formatDateToBR(t.due_date)}</span>
                            </div>
                            <span className="text-[10px] text-zinc-400 font-mono mt-0.5 block">
                              Venc: {formatDateToBR(t.due_date)}
                            </span>
                          </div>
                        ) : (
                          <div>
                            <div className="font-mono font-semibold text-zinc-800 dark:text-zinc-200">
                              {formatDateToBR(t.due_date)}
                            </div>
                            {isOverdue && (
                              <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-rose-600 dark:text-rose-400 mt-0.5">
                                <AlertCircle className="w-3 h-3" /> Atrasado ({daysDiff}d)
                              </span>
                            )}
                            {isDueToday && (
                              <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400 mt-0.5">
                                <Clock className="w-3 h-3" /> Vence Hoje
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Description */}
                      <td className="py-3.5 px-4 xl:px-6">
                        <div className="flex items-center gap-2">
                          <span className={`p-1 rounded-md shrink-0 ${
                            t.type === "RECEITA"
                              ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400"
                              : t.type === "TRANSFERENCIA"
                              ? "bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400"
                              : "bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400"
                          }`}>
                            {t.type === "RECEITA" ? (
                              <ArrowUpRight className="w-3.5 h-3.5" />
                            ) : t.type === "TRANSFERENCIA" ? (
                              <ArrowRightLeft className="w-3.5 h-3.5" />
                            ) : (
                              <ArrowDownRight className="w-3.5 h-3.5" />
                            )}
                          </span>

                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className={`font-semibold ${isCompleted ? "line-through text-zinc-400 dark:text-zinc-500" : "text-zinc-900 dark:text-zinc-100"}`}>
                                {t.description}
                              </span>

                              {/* Parcela Tag */}
                              {t.installment_number && t.total_installments && (
                                <span className="text-[10px] font-mono px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded-md font-semibold">
                                  {t.installment_number}/{t.total_installments}
                                </span>
                              )}

                              {/* Badge Fatura de Cartão */}
                              {t.is_invoice_payment === 1 && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 shrink-0">
                                  <CreditCard className="w-3 h-3 text-purple-500" />
                                  <span>Fatura de Cartão</span>
                                </span>
                              )}

                              {/* Badge de Comprovantes / Anexos com Tooltip Discriminado */}
                              {t.attachments && t.attachments.length > 0 && (() => {
                                const count = t.attachments.length;
                                const typeCounts: Record<string, number> = {};
                                t.attachments.forEach((att) => {
                                  const tKey = att.attachment_type || "COMPROVANTE";
                                  typeCounts[tKey] = (typeCounts[tKey] || 0) + 1;
                                });
                                const breakdownStr = Object.entries(typeCounts)
                                  .map(([k, c]) => `${c} ${ATTACHMENT_TYPES[k as AttachmentType]?.shortLabel || k}`)
                                  .join(", ");
                                
                                return (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedTransactionForAttachments(t);
                                      setIsAttachmentModalOpen(true);
                                    }}
                                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-all cursor-pointer"
                                    title={`${count} anexo(s) (${breakdownStr}) - Clique para visualizar`}
                                  >
                                    <Paperclip className="w-3 h-3" />
                                    <span>{count}</span>
                                  </button>
                                );
                              })()}
                            </div>

                            {t.notes && (
                              <p className="text-[11px] text-zinc-400 mt-0.5 truncate">{t.notes}</p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3.5 px-4 xl:px-6 text-zinc-600 dark:text-zinc-300 font-medium whitespace-nowrap">
                        {t.type === "TRANSFERENCIA" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 text-[11px] font-bold border border-indigo-200 dark:border-indigo-800">
                            <ArrowRightLeft className="w-3 h-3 text-indigo-500" />
                            <span>Transferência Interna</span>
                          </span>
                        ) : (
                          (t.category_id && categories[t.category_id]?.name) || "-"
                        )}
                      </td>

                      {/* Account / Carteira & Forma de Pagamento / Cartão */}
                      <td className="py-3.5 px-4 xl:px-6 whitespace-nowrap">
                        {(() => {
                          if (t.type === "TRANSFERENCIA") {
                            const srcAcc = t.account_id ? accounts[t.account_id] : null;
                            const dstAcc = t.destination_account_id ? accounts[t.destination_account_id] : null;
                            const pm = t.payment_method_id ? paymentMethods[t.payment_method_id] : null;
                            return (
                              <div className="space-y-1">
                                <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                                  <span className="text-rose-600 dark:text-rose-400">{srcAcc?.name || "Origem"}</span>
                                  <ArrowRight className="w-3 h-3 text-zinc-400 shrink-0" />
                                  <span className="text-emerald-600 dark:text-emerald-400">{dstAcc?.name || "Destino"}</span>
                                </div>
                                {pm && (
                                  <div className="flex items-center gap-1 text-[10px] text-zinc-400 font-normal">
                                    <CreditCard className="w-3 h-3 text-zinc-400 shrink-0" />
                                    <span>Via {pm.name}</span>
                                  </div>
                                )}
                              </div>
                            );
                          }

                          const pm = t.payment_method_id ? paymentMethods[t.payment_method_id] : null;
                          const card = t.credit_card_id ? creditCards[t.credit_card_id] : null;
                          const isInvoicePay = t.is_invoice_payment === 1;

                          if (!acc && !pm && !card && !isInvoicePay) {
                            return <span className="text-zinc-400">-</span>;
                          }
                          return (
                            <div className="space-y-1">
                              {isInvoicePay && (
                                <div>
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-100 dark:bg-sky-950/80 text-sky-700 dark:text-sky-300 text-[10px] font-extrabold border border-sky-300 dark:border-sky-800">
                                    <CheckCircle2 className="w-3 h-3" /> Fatura Liquidada
                                  </span>
                                </div>
                              )}

                              {card && (
                                <div className="flex items-center gap-1 text-[11px] font-bold text-purple-700 dark:text-purple-300">
                                  <CreditCard className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                                  <span>{card.name}</span>
                                  {t.invoice_month && t.invoice_year && (
                                    <span className="text-[10px] text-purple-500 font-mono">
                                      ({String(t.invoice_month).padStart(2, "0")}/{t.invoice_year})
                                    </span>
                                  )}
                                </div>
                              )}

                              {acc && (
                                <div className="flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300 font-medium text-xs">
                                  <AccIcon className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                  <span>{acc.name}</span>
                                </div>
                              )}

                              {pm && !card && (
                                <div className="flex items-center gap-1 text-[11px] text-zinc-500 dark:text-zinc-400 font-normal">
                                  <CreditCard className="w-3 h-3 text-zinc-400 shrink-0" />
                                  <span>{pm.name}</span>
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </td>

                      {/* Contact */}
                      <td className="py-3.5 px-4 xl:px-6 text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
                        {(() => {
                          const con = t.contact_id ? contacts[t.contact_id] : null;
                          if (!con) return <span className="text-zinc-400">-</span>;
                          return (
                            <button
                              type="button"
                              onClick={() => setSelectedContactForStatement(con)}
                              className="inline-flex items-center gap-1.5 hover:text-indigo-600 dark:hover:text-indigo-400 font-medium group transition-all text-left"
                              title="Abrir Extrato / Conta-Corrente deste Contato"
                            >
                              <span>{con.name}</span>
                              <FileText className="w-3 h-3 text-zinc-400 group-hover:text-indigo-500 transition-colors" />
                            </button>
                          );
                        })()}
                      </td>

                      {/* Amount */}
                      <td className="py-3.5 px-4 xl:px-6 text-right whitespace-nowrap">
                        <span className={`font-mono font-bold text-sm ${
                          t.type === "DESPESA"
                            ? "text-rose-600 dark:text-rose-400"
                            : t.type === "RECEITA"
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-indigo-600 dark:text-indigo-400"
                        }`}>
                          {t.type === "DESPESA" ? "-" : t.type === "RECEITA" ? "+" : "⇄"} {formatCurrency(t.amount_cents, hideValues)}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 xl:px-6 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingTransaction(t);
                              setIsModalOpen(true);
                            }}
                            title="Editar Lançamento"
                            className="p-1.5 text-zinc-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-lg transition-all"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setSelectedTransactionForAttachments(t);
                              setIsAttachmentModalOpen(true);
                            }}
                            title={t.attachments && t.attachments.length > 0 ? "Visualizar Comprovantes" : "Anexar Comprovante"}
                            className={`p-1.5 rounded-lg transition-all ${
                              t.attachments && t.attachments.length > 0
                                ? "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/40"
                                : "text-zinc-400 hover:text-emerald-600 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                            }`}
                          >
                            <Paperclip className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDelete(t.id)}
                            title="Excluir Lançamento"
                            className="p-1.5 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Transaction Modal (Criar / Editar) */}
      <TransactionModal
        isOpen={isModalOpen}
        transactionToEdit={editingTransaction}
        onClose={() => {
          setIsModalOpen(false);
          setEditingTransaction(null);
        }}
        onSuccess={() => {
          fetchData();
          refreshSyncStatus(false);
        }}
      />

      {/* BARRA FLUTUANTE DE AÇÕES EM LOTE */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-zinc-900/95 dark:bg-zinc-800/95 text-white backdrop-blur-md px-4 py-3 rounded-2xl shadow-2xl border border-zinc-700/80 flex items-center gap-3 animate-fade-in max-w-[95vw] overflow-x-auto">
          <div className="flex items-center gap-2 pr-3 border-r border-zinc-700 shrink-0">
            <span className="text-xs font-bold bg-emerald-500 text-zinc-900 px-2 py-0.5 rounded-full font-mono">
              {selectedIds.size}
            </span>
            <span className="text-xs font-semibold text-zinc-200">
              {selectedIds.size === 1 ? "selecionado" : "selecionados"}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleBatchComplete}
              disabled={isBatchOperating}
              className="px-3 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
              title="Liquidar todos os selecionados"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Liquidar</span>
            </button>

            <button
              onClick={handleBatchUncomplete}
              disabled={isBatchOperating}
              className="px-3 py-1.5 text-xs font-bold bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded-xl flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
              title="Reabrir todos os selecionados para pendente"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reabrir</span>
            </button>

            <button
              onClick={() => setIsBatchEditOpen(true)}
              disabled={isBatchOperating}
              className="px-3 py-1.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
              title="Alterar categoria, conta, forma de pagamento, contato ou data em lote"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Editar Campos</span>
            </button>

            <button
              onClick={handleBatchDelete}
              disabled={isBatchOperating}
              className="px-3 py-1.5 text-xs font-bold bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white rounded-xl flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
              title="Excluir selecionados"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Excluir</span>
            </button>

            <button
              onClick={() => setSelectedIds(new Set())}
              className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-all ml-1 cursor-pointer"
              title="Desmarcar todos"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Modal de Lançamentos */}
      <TransactionModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingTransaction(null);
        }}
        onSuccess={() => {
          fetchData();
          refreshSyncStatus(false);
        }}
        transactionToEdit={editingTransaction}
      />

      {/* Modal de Edição em Lote */}
      <BatchEditModal
        isOpen={isBatchEditOpen}
        onClose={() => setIsBatchEditOpen(false)}
        onSuccess={() => {
          setSelectedIds(new Set());
          fetchData();
          refreshSyncStatus(false);
        }}
        selectedCount={selectedIds.size}
        selectedIds={Array.from(selectedIds)}
        categories={categoriesList}
        accounts={accountsList}
        paymentMethods={paymentMethodsList}
        contacts={contactsList}
      />

      {/* Modal de Relatório Financeiro Executivo / PDF */}
      <FinancialReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        profile={profile}
        periodTitle={formattedMonthTitle}
        transactions={filteredTransactions}
        categories={categories}
        accounts={accounts}
        paymentMethods={paymentMethods}
        contacts={contacts}
      />

      {/* Visualizador de Comprovantes & Lightbox */}
      <AttachmentViewerModal
        isOpen={isAttachmentModalOpen}
        onClose={() => {
          setIsAttachmentModalOpen(false);
          setSelectedTransactionForAttachments(null);
        }}
        attachments={selectedTransactionForAttachments?.attachments || []}
        transactionTitle={selectedTransactionForAttachments?.description || "Comprovantes do Lançamento"}
        transactionId={selectedTransactionForAttachments?.id}
        profile={profile}
        onAttachmentsChanged={() => {
          fetchData();
          refreshSyncStatus(false);
        }}
      />

      {/* Extrato / Conta-Corrente do Contato */}
      {selectedContactForStatement && (
        <ContactStatementModal
          isOpen={true}
          onClose={() => setSelectedContactForStatement(null)}
          contact={selectedContactForStatement}
          onContactUpdated={fetchData}
        />
      )}

      {/* Modal de Conciliação Bancária (Exclusivo EMPRESA) */}
      <ConciliationModal
        isOpen={isConciliationModalOpen}
        onClose={() => setIsConciliationModalOpen(false)}
        onSuccess={() => {
          fetchData();
          refreshSyncStatus(false);
        }}
        accounts={accountsList}
        categories={categoriesList}
        contacts={contactsList}
        paymentMethods={paymentMethodsList}
      />
    </div>
  );
};

