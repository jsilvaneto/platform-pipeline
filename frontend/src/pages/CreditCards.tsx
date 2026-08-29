import React, { useState, useEffect, useMemo } from "react";
import { useApp } from "../context/AppContext";
import { api } from "../api/client";
import { 
  CreditCard as CreditCardType, 
  CreditCardInvoiceDetail, 
  CreditCardInvoiceSummary, 
  Account, 
  PaymentMethod,
  Transaction,
  Category
} from "../types";
import { formatCurrency, formatDateToBR, getTodayBR, parseDateBRToISO } from "../utils/format";
import { TransactionModal } from "../components/TransactionModal";
import { AttachmentViewerModal } from "../components/AttachmentViewerModal";
import { 
  CreditCard as CreditCardIcon, Plus, ChevronLeft, ChevronRight, 
  Calendar, CheckCircle2, Clock, Landmark, 
  DollarSign, Loader2, RotateCcw, ShieldCheck, Tag, 
  Search, Pencil, Trash2, Paperclip, 
  Download, Layers, X
} from "lucide-react";

export const CreditCards: React.FC = () => {
  const { profile, hideValues, refreshSyncStatus } = useApp();

  // Estados principais
  const [cards, setCards] = useState<CreditCardType[]>([]);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [invoiceDetail, setInvoiceDetail] = useState<CreditCardInvoiceDetail | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCards, setLoadingCards] = useState(true);
  const [loadingInvoice, setLoadingInvoice] = useState(false);
  const [, setError] = useState<string | null>(null);

  // Busca e Filtro interno de compras da fatura
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("TODAS");

  // Modais
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<CreditCardType | null>(null);
  const [isSettleModalOpen, setIsSettleModalOpen] = useState(false);
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [transactionToEdit, setTransactionToEdit] = useState<Transaction | null>(null);
  const [selectedTransactionForAttachments, setSelectedTransactionForAttachments] = useState<Transaction | null>(null);
  const [isAttachmentModalOpen, setIsAttachmentModalOpen] = useState(false);

  // Estados do Formulário de Cartão (Criar / Editar)
  const [cardName, setCardName] = useState("");
  const [cardLimitStr, setCardLimitStr] = useState("");
  const [cardClosingDay, setCardClosingDay] = useState("10");
  const [cardDueDay, setCardDueDay] = useState("17");
  const [cardColor, setCardColor] = useState("purple");
  const [cardBrand, setCardBrand] = useState("MASTERCARD");
  const [cardAccountId, setCardAccountId] = useState("");
  const [savingCard, setSavingCard] = useState(false);
  const [cardFormError, setCardFormError] = useState<string | null>(null);

  // Estados do Formulário de Liquidação
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState("");
  const [paymentDateBR, setPaymentDateBR] = useState(getTodayBR());
  const [settleNotes, setSettleNotes] = useState("");
  const [settling, setSettling] = useState(false);
  const [settleError, setSettleError] = useState<string | null>(null);

  const monthNames = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  const month = currentDate.getMonth() + 1;
  const year = currentDate.getFullYear();

  // Helper de classes de tema para degradê dos cartões virtuais
  const getCardThemeClasses = (color: string) => {
    switch (color) {
      case "purple":
        return "from-purple-800 via-indigo-900 to-purple-950 border-purple-700/60 shadow-purple-950/40";
      case "indigo":
        return "from-indigo-800 via-blue-900 to-slate-950 border-indigo-700/60 shadow-indigo-950/40";
      case "rose":
        return "from-rose-800 via-pink-900 to-rose-950 border-rose-700/60 shadow-rose-950/40";
      case "amber":
        return "from-amber-700 via-orange-800 to-zinc-950 border-amber-600/60 shadow-amber-950/40";
      case "sky":
        return "from-sky-700 via-cyan-800 to-slate-950 border-sky-600/60 shadow-sky-950/40";
      case "zinc":
        return "from-zinc-800 via-zinc-900 to-black border-zinc-700/60 shadow-black/60";
      case "emerald":
      default:
        return "from-emerald-800 via-teal-900 to-emerald-950 border-emerald-700/60 shadow-emerald-950/40";
    }
  };

  // Carrega listagem de cartões
  const fetchCards = async (preferredCardId?: string) => {
    setLoadingCards(true);
    setError(null);
    try {
      const [cardsRes, accRes, pmRes, catRes] = await Promise.all([
        api.get<CreditCardType[]>("/credit-cards", { params: { profile } }),
        api.get<Account[]>("/accounts", { params: { profile } }),
        api.get<PaymentMethod[]>("/payment-methods", { params: { profile } }),
        api.get<Category[]>("/categories", { params: { profile } }),
      ]);

      setCards(cardsRes.data);
      setAccounts(accRes.data);
      setPaymentMethods(pmRes.data);
      setCategories(catRes.data);

      if (cardsRes.data.length > 0) {
        if (preferredCardId && cardsRes.data.some(c => c.id === preferredCardId)) {
          setSelectedCardId(preferredCardId);
        } else if (!selectedCardId || !cardsRes.data.some(c => c.id === selectedCardId)) {
          setSelectedCardId(cardsRes.data[0].id);
        }
      } else {
        setSelectedCardId(null);
        setInvoiceDetail(null);
      }
    } catch (err: any) {
      console.error("Erro ao carregar cartões:", err);
      setError(err.response?.data?.detail || "Erro ao carregar cartões de crédito.");
    } finally {
      setLoadingCards(false);
    }
  };

  useEffect(() => {
    fetchCards();
  }, [profile]);

  // Cartão Ativo
  const activeCard = useMemo(() => {
    return cards.find((c) => c.id === selectedCardId) || null;
  }, [cards, selectedCardId]);

  // Carrega detalhe da fatura do cartão ativo
  const fetchInvoiceDetail = async () => {
    if (!activeCard) return;
    setLoadingInvoice(true);
    try {
      const detailRes = await api.get<CreditCardInvoiceDetail>(`/credit-cards/${activeCard.id}/invoices/${year}/${month}`);
      setInvoiceDetail(detailRes.data);
    } catch (err: any) {
      console.error("Erro ao carregar detalhes da fatura:", err);
    } finally {
      setLoadingInvoice(false);
    }
  };

  useEffect(() => {
    if (activeCard) {
      fetchInvoiceDetail();
    }
  }, [activeCard, month, year]);

  // Totais Globais de Cartões
  const globalMetrics = useMemo(() => {
    let totalLimit = 0;
    let totalUsed = 0;
    let totalAvailable = 0;
    let totalCurrentInvoices = 0;

    cards.forEach((c) => {
      totalLimit += c.limit_cents;
      totalUsed += c.used_limit_cents;
      totalAvailable += c.available_limit_cents;
      totalCurrentInvoices += c.current_invoice_cents;
    });

    return {
      totalLimit,
      totalUsed,
      totalAvailable,
      totalCurrentInvoices,
      count: cards.length,
    };
  }, [cards]);

  // Compras filtradas na fatura ativa
  const filteredInvoiceItems = useMemo(() => {
    if (!invoiceDetail?.items) return [];
    return invoiceDetail.items.filter((item) => {
      const matchesSearch = 
        !searchQuery.trim() ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.contact_name && item.contact_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.notes && item.notes.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.amount_cents / 100).toString().includes(searchQuery);

      const matchesCat = categoryFilter === "TODAS" || item.category_id === categoryFilter;

      return matchesSearch && matchesCat;
    });
  }, [invoiceDetail, searchQuery, categoryFilter]);

  // Navegação de mês
  const handlePrevMonth = () => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleCurrentMonth = () => {
    setCurrentDate(new Date());
  };

  // Abrir Modal de Novo / Editar Cartão
  const handleOpenCardModal = (cardToEdit?: CreditCardType) => {
    setCardFormError(null);
    if (cardToEdit) {
      setEditingCard(cardToEdit);
      setCardName(cardToEdit.name);
      setCardLimitStr((cardToEdit.limit_cents / 100).toFixed(2).replace(".", ","));
      setCardClosingDay(String(cardToEdit.closing_day));
      setCardDueDay(String(cardToEdit.due_day));
      setCardColor(cardToEdit.color || "emerald");
      setCardBrand(cardToEdit.brand || "MASTERCARD");
      setCardAccountId(cardToEdit.account_id || "");
    } else {
      setEditingCard(null);
      setCardName("");
      setCardLimitStr("");
      setCardClosingDay("10");
      setCardDueDay("17");
      setCardColor("purple");
      setCardBrand("MASTERCARD");
      setCardAccountId(accounts.length > 0 ? accounts[0].id : "");
    }
    setIsCardModalOpen(true);
  };

  const handleSaveCard = async (e: React.FormEvent) => {
    e.preventDefault();
    setCardFormError(null);

    const limitFloat = parseFloat(cardLimitStr.replace(",", "."));
    if (isNaN(limitFloat) || limitFloat < 0) {
      setCardFormError("Informe um limite válido em R$.");
      return;
    }

    const cDay = parseInt(cardClosingDay, 10);
    const dDay = parseInt(cardDueDay, 10);
    if (isNaN(cDay) || cDay < 1 || cDay > 31 || isNaN(dDay) || dDay < 1 || dDay > 31) {
      setCardFormError("Os dias de fechamento e vencimento devem estar entre 1 e 31.");
      return;
    }

    setSavingCard(true);
    try {
      const payload = {
        profile,
        name: cardName.trim(),
        limit_cents: Math.round(limitFloat * 100),
        closing_day: cDay,
        due_day: dDay,
        color: cardColor,
        brand: cardBrand,
        account_id: cardAccountId || null,
      };

      if (editingCard) {
        await api.put(`/credit-cards/${editingCard.id}`, payload);
        await fetchCards(editingCard.id);
      } else {
        const res = await api.post<CreditCardType>("/credit-cards", payload);
        await fetchCards(res.data.id);
      }

      setIsCardModalOpen(false);
      refreshSyncStatus(false);
    } catch (err: any) {
      console.error("Erro ao salvar cartão:", err);
      setCardFormError(err.response?.data?.detail || "Erro ao salvar cartão de crédito.");
    } finally {
      setSavingCard(false);
    }
  };

  const handleDeleteCard = async (cardId: string) => {
    if (!confirm("Deseja realmente excluir este cartão de crédito? Os lançamentos permanecerão no banco sem vínculo.")) return;
    try {
      await api.delete(`/credit-cards/${cardId}`);
      await fetchCards();
      refreshSyncStatus(false);
    } catch (err: any) {
      console.error("Erro ao excluir cartão:", err);
      alert(err.response?.data?.detail || "Erro ao excluir cartão.");
    }
  };

  // Abrir Modal de Liquidação / Pagamento da Fatura
  const handleOpenSettleModal = () => {
    if (!activeCard || !invoiceDetail) return;
    setSettleError(null);

    // Pré-seleciona a conta padrão do cartão ou a primeira disponível
    if (activeCard.account_id) {
      setSelectedAccountId(activeCard.account_id);
    } else if (accounts.length > 0) {
      setSelectedAccountId(accounts[0].id);
    }

    // Pré-seleciona forma "Débito Automático" ou "Boleto" ou "Pix" se houver
    const defaultPm = paymentMethods.find((p) =>
      p.name.toLowerCase().includes("débito") ||
      p.name.toLowerCase().includes("boleto") ||
      p.name.toLowerCase().includes("pix")
    );
    if (defaultPm) setSelectedPaymentMethodId(defaultPm.id);

    setPaymentDateBR(getTodayBR());
    setSettleNotes(`Pagamento da fatura ${activeCard.name} - ${monthNames[month - 1]}/${year}`);
    setIsSettleModalOpen(true);
  };

  const handleConfirmSettle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCard || !selectedAccountId) {
      setSettleError("Selecione a conta bancária para débito do pagamento.");
      return;
    }

    setSettling(true);
    setSettleError(null);

    try {
      const isoPaymentDate = parseDateBRToISO(paymentDateBR);
      await api.post(`/credit-cards/${activeCard.id}/invoices/${year}/${month}/settle`, {
        account_id: selectedAccountId,
        payment_date: isoPaymentDate,
        payment_method_id: selectedPaymentMethodId || null,
        notes: settleNotes || null,
      });

      setIsSettleModalOpen(false);
      await fetchCards(activeCard.id);
      await fetchInvoiceDetail();
      refreshSyncStatus(false);
    } catch (err: any) {
      console.error("Erro ao liquidar fatura:", err);
      setSettleError(err.response?.data?.detail || "Falha ao liquidar fatura.");
    } finally {
      setSettling(false);
    }
  };

  const handleUnsettle = async () => {
    if (!activeCard) return;
    if (!confirm(`Deseja realmente reabrir a fatura de ${monthNames[month - 1]}/${year}? O lançamento de pagamento consolidado na conta bancária será excluído e as compras voltarão para o status PENDENTE.`)) {
      return;
    }

    try {
      await api.post(`/credit-cards/${activeCard.id}/invoices/${year}/${month}/unsettle`);
      await fetchCards(activeCard.id);
      await fetchInvoiceDetail();
      refreshSyncStatus(false);
    } catch (err: any) {
      console.error("Erro ao reabrir fatura:", err);
      alert(err.response?.data?.detail || "Falha ao reabrir fatura.");
    }
  };

  // Excluir Compra da Fatura
  const handleDeleteInvoiceItem = async (itemId: string) => {
    if (!confirm("Deseja realmente excluir esta compra do cartão?")) return;
    try {
      await api.delete(`/transactions/${itemId}`);
      await fetchCards(activeCard?.id);
      await fetchInvoiceDetail();
      refreshSyncStatus(false);
    } catch (err: any) {
      console.error("Erro ao excluir compra:", err);
      alert(err.response?.data?.detail || "Erro ao excluir compra.");
    }
  };

  // Editar Compra da Fatura
  const handleEditInvoiceItem = async (itemId: string) => {
    try {
      const res = await api.get<Transaction>(`/transactions/${itemId}`);
      setTransactionToEdit(res.data);
      setIsTransactionModalOpen(true);
    } catch (err) {
      console.error("Erro ao carregar dados da transação para edição:", err);
    }
  };

  // Exportar / Imprimir Fatura
  const handleExportCSV = () => {
    if (!invoiceDetail || !activeCard) return;
    const rows = [
      ["Data", "Descricao", "Categoria", "Contato", "Valor (R$)", "Status", "Parcela"],
      ...invoiceDetail.items.map((it) => [
        it.due_date,
        `"${it.description.replace(/"/g, '""')}"`,
        `"${it.category_name}"`,
        `"${it.contact_name || ""}"`,
        (it.amount_cents / 100).toFixed(2).replace(".", ","),
        it.status,
        it.total_installments ? `${it.installment_number || 1}/${it.total_installments}` : "À Vista"
      ])
    ];

    const csvContent = "data:text/csv;charset=utf-8," + rows.map((e) => e.join(";")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Fatura_${activeCard.name}_${month}_${year}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Executivo & Ações Principais */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-purple-600/10 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
              <CreditCardIcon className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight flex items-center gap-2">
                <span>Cartões de Crédito & Faturas</span>
                <span className="text-[10px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                  {profile}
                </span>
              </h1>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Acompanhe o consumo dos seus limites, faturas mensais e compras individuais agrupadas.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => handleOpenCardModal()}
            className="px-3.5 py-2 text-xs font-bold bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4 text-purple-500" />
            <span>Novo Cartão</span>
          </button>

          <button
            onClick={() => {
              setTransactionToEdit(null);
              setIsTransactionModalOpen(true);
            }}
            disabled={cards.length === 0}
            className="px-4 py-2 text-xs font-bold bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-xl shadow-lg shadow-purple-600/20 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Compra no Cartão</span>
          </button>
        </div>
      </div>

      {/* Faixa Superior de KPIs Globais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Limite Disponível Total */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block">
              Limite Disponível Total
            </span>
            <span className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 tracking-tight block">
              {formatCurrency(globalMetrics.totalAvailable, hideValues)}
            </span>
            <span className="text-[10px] text-zinc-400">
              Soma de todos os cartões ativos
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>

        {/* KPI 2: Limite Comprometido */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block">
              Limite Comprometido
            </span>
            <span className="text-xl font-bold font-mono text-purple-600 dark:text-purple-400 tracking-tight block">
              {formatCurrency(globalMetrics.totalUsed, hideValues)}
            </span>
            <span className="text-[10px] text-zinc-400">
              Parcelas e compras pendentes
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        {/* KPI 3: Total Faturas do Ciclo Atual */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block">
              Fatura Atual Consolidada
            </span>
            <span className="text-xl font-bold font-mono text-zinc-900 dark:text-zinc-100 tracking-tight block">
              {formatCurrency(globalMetrics.totalCurrentInvoices, hideValues)}
            </span>
            <span className="text-[10px] text-zinc-400">
              Gastos do ciclo em aberto
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        {/* KPI 4: Cartões Cadastrados */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block">
              Cartões Ativos
            </span>
            <span className="text-xl font-bold font-mono text-zinc-900 dark:text-zinc-100 tracking-tight block">
              {globalMetrics.count} {globalMetrics.count === 1 ? "Cartão" : "Cartões"}
            </span>
            <span className="text-[10px] text-zinc-400">
              Perfil {profile}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 flex items-center justify-center">
            <CreditCardIcon className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Seção Principal de Cartões Virtuais & Faturas */}
      {loadingCards ? (
        <div className="py-16 text-center text-xs text-zinc-400 flex items-center justify-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-purple-500" />
          <span>Carregando cartões de crédito...</span>
        </div>
      ) : cards.length === 0 ? (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-12 text-center space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-purple-50 dark:bg-purple-950/50 text-purple-500 flex items-center justify-center mx-auto">
            <CreditCardIcon className="w-8 h-8" />
          </div>
          <div className="max-w-md mx-auto space-y-1.5">
            <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
              Nenhum cartão de crédito cadastrado
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Cadastre seus cartões de crédito para ter controle rigoroso de limites, melhor dia de compra, fechamento e liquidação unificada de faturas.
            </p>
          </div>
          <button
            onClick={() => handleOpenCardModal()}
            className="px-4 py-2.5 text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white rounded-xl shadow-lg shadow-purple-600/25 transition-all inline-flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Cadastrar Meu Primeiro Cartão</span>
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Seletor / Carrossel de Cartões Virtuais */}
          <div>
            <div className="flex items-center justify-between mb-3 px-1">
              <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
                Selecione o Cartão para Gerenciar
              </span>
              <span className="text-xs text-zinc-400">
                Clique em um cartão para navegar por suas faturas
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {cards.map((c) => {
                const isSelected = c.id === selectedCardId;
                const usedPct = c.limit_cents > 0 
                  ? Math.min(100, Math.round((c.used_limit_cents / c.limit_cents) * 100))
                  : 0;

                return (
                  <div
                    key={c.id}
                    onClick={() => setSelectedCardId(c.id)}
                    className={`rounded-3xl p-4 transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between space-y-3.5 border ${
                      isSelected
                        ? "ring-2 ring-purple-500 dark:ring-purple-400 shadow-xl bg-white dark:bg-zinc-900 border-purple-400 dark:border-purple-600"
                        : "bg-white/80 dark:bg-zinc-900/80 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 shadow-sm hover:shadow-md"
                    }`}
                  >
                    {/* Visual Virtual Card */}
                    <div className={`p-4 rounded-2xl bg-gradient-to-br ${getCardThemeClasses(c.color)} border shadow-md relative overflow-hidden flex flex-col justify-between h-40 text-white`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CreditCardIcon className="w-4 h-4 text-white/80" />
                          <span className="text-xs font-bold tracking-wider uppercase truncate max-w-[140px]">
                            {c.name}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono font-extrabold px-2 py-0.5 rounded bg-white/15 border border-white/20">
                          {c.brand || "CARTÃO"}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 my-1">
                        <div>
                          <span className="text-[9px] text-white/70 block font-medium">Limite Total</span>
                          <span className="text-xs font-mono font-bold block truncate">
                            {formatCurrency(c.limit_cents, hideValues)}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-[9px] text-white/70 block font-medium">Disponível</span>
                          <span className="text-xs font-mono font-extrabold text-emerald-300 block truncate">
                            {formatCurrency(c.available_limit_cents, hideValues)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-white/90 border-t border-white/15 pt-1.5 font-medium">
                        <span>Melhor Dia: <strong>{c.closing_day}</strong></span>
                        <span>Vence: <strong>{c.due_day}</strong></span>
                      </div>
                    </div>

                    {/* Progress Bar & Details */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-[11px] font-medium text-zinc-500">
                        <span>Uso do Limite:</span>
                        <span className="font-mono font-bold text-zinc-700 dark:text-zinc-300">
                          {usedPct}% ({formatCurrency(c.used_limit_cents, hideValues)})
                        </span>
                      </div>

                      <div className="w-full h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-500 rounded-full ${
                            usedPct > 85 ? "bg-rose-500" : usedPct > 60 ? "bg-amber-500" : "bg-emerald-500"
                          }`}
                          style={{ width: `${usedPct}%` }}
                        />
                      </div>

                      {c.account_name && (
                        <p className="text-[10px] text-zinc-400 truncate flex items-center gap-1">
                          <Landmark className="w-3 h-3 shrink-0" />
                          <span>Débito em: {c.account_name}</span>
                        </p>
                      )}
                    </div>

                    {/* Card Actions Bar */}
                    <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800/80">
                      <span className={`text-[10px] font-bold ${isSelected ? "text-purple-600 dark:text-purple-400" : "text-zinc-400"}`}>
                        {isSelected ? "● Cartão Selecionado" : "Clique para ver faturas"}
                      </span>

                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleOpenCardModal(c)}
                          className="p-1.5 text-zinc-400 hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-950/40 rounded-lg transition-all"
                          title="Editar Cartão"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteCard(c.id)}
                          className="p-1.5 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-all"
                          title="Excluir Cartão"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Painel da Fatura do Cartão Selecionado */}
          {activeCard && (
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 rounded-3xl p-6 shadow-sm space-y-6">
              
              {/* Header da Fatura com Navegação Mês a Mês */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-zinc-100 dark:border-zinc-800 pb-5">
                {/* Month Navigator */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 rounded-xl p-1 shadow-inner">
                    <button
                      onClick={handlePrevMonth}
                      className="p-1.5 rounded-lg text-zinc-600 dark:text-zinc-400 hover:bg-white dark:hover:bg-zinc-700 hover:text-zinc-900 dark:hover:text-zinc-100 transition-all cursor-pointer"
                      title="Mês Anterior"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    
                    <button
                      onClick={handleCurrentMonth}
                      className="px-3 py-1 text-xs font-bold text-zinc-800 dark:text-zinc-200 hover:bg-white dark:hover:bg-zinc-700 rounded-lg transition-all cursor-pointer"
                    >
                      Mês Atual
                    </button>

                    <button
                      onClick={handleNextMonth}
                      className="p-1.5 rounded-lg text-zinc-600 dark:text-zinc-400 hover:bg-white dark:hover:bg-zinc-700 hover:text-zinc-900 dark:hover:text-zinc-100 transition-all cursor-pointer"
                      title="Próximo Mês"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  <div>
                    <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                      <span>Fatura {monthNames[month - 1]} de {year}</span>
                      {invoiceDetail && (
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${
                          invoiceDetail.status === "PAGA"
                            ? "bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800"
                            : invoiceDetail.status === "FECHADA"
                            ? "bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800"
                            : "bg-sky-100 dark:bg-sky-950/80 text-sky-700 dark:text-sky-300 border-sky-300 dark:border-sky-800"
                        }`}>
                          {invoiceDetail.status === "PAGA" && "✓ FATURA PAGA"}
                          {invoiceDetail.status === "FECHADA" && "● FATURA FECHADA"}
                          {invoiceDetail.status === "ABERTA" && "○ FATURA ABERTA"}
                        </span>
                      )}
                    </h2>
                    {invoiceDetail && (
                      <p className="text-xs text-zinc-400 flex items-center gap-3 pt-0.5">
                        <span>Período: <strong>{formatDateToBR(invoiceDetail.period_start)}</strong> até <strong>{formatDateToBR(invoiceDetail.period_end)}</strong></span>
                        <span>•</span>
                        <span>Vencimento: <strong className="text-zinc-700 dark:text-zinc-200">{formatDateToBR(invoiceDetail.due_date)}</strong></span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Invoice Action Buttons */}
                <div className="flex items-center flex-wrap gap-2.5">
                  <button
                    onClick={handleExportCSV}
                    disabled={!invoiceDetail || invoiceDetail.items_count === 0}
                    className="px-3 py-2 text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
                    title="Exportar compras para CSV"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>CSV</span>
                  </button>

                  {invoiceDetail?.status === "PAGA" ? (
                    <button
                      onClick={handleUnsettle}
                      className="px-3.5 py-2 text-xs font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/40 border border-amber-300 dark:border-amber-800 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Reabrir Fatura</span>
                    </button>
                  ) : (
                    <button
                      onClick={handleOpenSettleModal}
                      disabled={!invoiceDetail || invoiceDetail.remaining_cents <= 0}
                      className="px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl shadow-lg shadow-emerald-600/20 transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Liquidar / Pagar Fatura</span>
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setTransactionToEdit(null);
                      setIsTransactionModalOpen(true);
                    }}
                    className="px-3.5 py-2 text-xs font-bold bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/40 border border-purple-300 dark:border-purple-800 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Adicionar Compra</span>
                  </button>
                </div>
              </div>

              {/* Resumo da Fatura & Métricas Rápidas */}
              {loadingInvoice ? (
                <div className="py-12 text-center text-xs text-zinc-400 flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-purple-500" />
                  <span>Carregando detalhes da fatura...</span>
                </div>
              ) : invoiceDetail ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/70 dark:border-zinc-800 rounded-2xl p-4 space-y-1">
                      <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block">
                        Total da Fatura
                      </span>
                      <span className="text-2xl font-bold font-mono text-zinc-900 dark:text-zinc-100 tracking-tight block">
                        {formatCurrency(invoiceDetail.total_cents, hideValues)}
                      </span>
                      <span className="text-[11px] text-zinc-400">
                        {invoiceDetail.items_count} {invoiceDetail.items_count === 1 ? "compra lançada" : "compras lançadas"}
                      </span>
                    </div>

                    <div className="bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/70 dark:border-zinc-800 rounded-2xl p-4 space-y-1">
                      <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block">
                        Valor Pago
                      </span>
                      <span className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 tracking-tight block">
                        {formatCurrency(invoiceDetail.paid_cents, hideValues)}
                      </span>
                      <span className="text-[11px] text-zinc-400">
                        {invoiceDetail.status === "PAGA" ? "Totalmente liquidado" : "Pagamento parcial ou pendente"}
                      </span>
                    </div>

                    <div className="bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/70 dark:border-zinc-800 rounded-2xl p-4 space-y-1">
                      <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block">
                        Saldo Restante a Pagar
                      </span>
                      <span className={`text-2xl font-bold font-mono tracking-tight block ${
                        invoiceDetail.remaining_cents > 0 ? "text-purple-600 dark:text-purple-400" : "text-zinc-400"
                      }`}>
                        {formatCurrency(invoiceDetail.remaining_cents, hideValues)}
                      </span>
                      <span className="text-[11px] text-zinc-400">
                        {invoiceDetail.remaining_cents > 0 ? `Vencimento em ${formatDateToBR(invoiceDetail.due_date)}` : "Sem pendências"}
                      </span>
                    </div>
                  </div>

                  {/* Distribuição por Categoria na Fatura */}
                  {invoiceDetail.category_breakdown && invoiceDetail.category_breakdown.length > 0 && (
                    <div className="bg-zinc-50/60 dark:bg-zinc-800/30 border border-zinc-200/60 dark:border-zinc-800/60 rounded-2xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                          <Tag className="w-3.5 h-3.5 text-purple-500" />
                          <span>Distribuição de Gastos por Categoria nesta Fatura</span>
                        </span>
                        <span className="text-[11px] text-zinc-400">
                          {invoiceDetail.category_breakdown.length} categorias
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {invoiceDetail.category_breakdown.map((cb) => (
                          <div key={cb.category_id} className="space-y-1 bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl p-3">
                            <div className="flex items-center justify-between text-xs font-semibold">
                              <span className="text-zinc-800 dark:text-zinc-200 truncate">{cb.category_name}</span>
                              <span className="font-mono text-zinc-900 dark:text-zinc-100">{formatCurrency(cb.amount_cents, hideValues)}</span>
                            </div>
                            <div className="flex items-center justify-between text-[10px] text-zinc-400 font-medium">
                              <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden mr-2">
                                <div className="bg-purple-500 h-full rounded-full" style={{ width: `${cb.percentage}%` }} />
                              </div>
                              <span className="shrink-0">{cb.percentage}%</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Toolbar de Busca e Filtros de Compras */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                    <div className="flex items-center gap-2 flex-1 max-w-md">
                      <div className="relative w-full">
                        <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-2.5" />
                        <input
                          type="text"
                          placeholder="Buscar compra nesta fatura..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full pl-9 pr-3 py-1.5 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:border-purple-500 text-zinc-900 dark:text-zinc-100"
                        />
                        {searchQuery && (
                          <button
                            onClick={() => setSearchQuery("")}
                            className="absolute right-2.5 top-2 text-zinc-400 hover:text-zinc-600"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <select
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        className="px-3 py-1.5 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-700 dark:text-zinc-300 focus:outline-none focus:border-purple-500"
                      >
                        <option value="TODAS">Todas as Categorias</option>
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Tabela de Compras da Fatura */}
                  <div className="border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-zinc-50/80 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 font-bold uppercase tracking-wider">
                          <tr>
                            <th className="py-3 px-4">Data Registro</th>
                            <th className="py-3 px-4">Descrição da Compra</th>
                            <th className="py-3 px-4">Categoria</th>
                            <th className="py-3 px-4">Contato / Loja</th>
                            <th className="py-3 px-4 text-right">Valor</th>
                            <th className="py-3 px-4 text-center">Status</th>
                            <th className="py-3 px-4 text-center">Ações</th>
                          </tr>
                        </thead>

                        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60 font-medium">
                          {filteredInvoiceItems.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="py-10 text-center text-zinc-400 text-xs">
                                {searchQuery || categoryFilter !== "TODAS"
                                  ? "Nenhuma compra encontrada com os filtros informados."
                                  : "Nenhuma compra registrada nesta fatura."}
                              </td>
                            </tr>
                          ) : (
                            filteredInvoiceItems.map((item) => {
                              const isPaid = item.status === "CONCLUIDO";

                              return (
                                <tr 
                                  key={item.id}
                                  className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/40 transition-colors"
                                >
                                  {/* Data */}
                                  <td className="py-3 px-4 text-zinc-600 dark:text-zinc-400 whitespace-nowrap font-mono">
                                    {formatDateToBR(item.due_date)}
                                  </td>

                                  {/* Descrição & Parcelas */}
                                  <td className="py-3 px-4 text-zinc-900 dark:text-zinc-100">
                                    <div className="flex items-center gap-2">
                                      <span className="font-semibold">{item.description}</span>
                                      {item.total_installments && (
                                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 shrink-0">
                                          {item.installment_number || 1}/{item.total_installments}
                                        </span>
                                      )}
                                      {item.attachments_count && item.attachments_count > 0 ? (
                                        <button
                                          onClick={() => {
                                            setSelectedTransactionForAttachments({
                                              id: item.id,
                                              description: item.description,
                                              amount_cents: item.amount_cents,
                                              profile,
                                              type: "DESPESA",
                                              due_date: item.due_date,
                                              status: item.status,
                                              sync_status: "PENDENTE",
                                              created_at: item.created_at,
                                              attachments: item.attachments || []
                                            });
                                            setIsAttachmentModalOpen(true);
                                          }}
                                          className="p-1 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded transition-all flex items-center gap-0.5 text-[10px] font-bold"
                                          title="Ver comprovante da compra"
                                        >
                                          <Paperclip className="w-3 h-3" />
                                          <span>{item.attachments_count}</span>
                                        </button>
                                      ) : null}
                                    </div>
                                    {item.notes && (
                                      <p className="text-[10px] text-zinc-400 truncate max-w-xs">{item.notes}</p>
                                    )}
                                  </td>

                                  {/* Categoria */}
                                  <td className="py-3 px-4 whitespace-nowrap">
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-[11px] font-medium border border-zinc-200/80 dark:border-zinc-700">
                                      <Tag className="w-3 h-3 text-purple-500" />
                                      <span>{item.category_name}</span>
                                    </span>
                                  </td>

                                  {/* Contato / Loja */}
                                  <td className="py-3 px-4 text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
                                    {item.contact_name ? (
                                      <span>{item.contact_name}</span>
                                    ) : (
                                      <span className="text-zinc-400">-</span>
                                    )}
                                  </td>

                                  {/* Valor */}
                                  <td className="py-3 px-4 text-right whitespace-nowrap font-mono font-bold text-zinc-900 dark:text-zinc-100">
                                    {formatCurrency(item.amount_cents, hideValues)}
                                  </td>

                                  {/* Status */}
                                  <td className="py-3 px-4 text-center whitespace-nowrap">
                                    {isPaid ? (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold border border-emerald-200 dark:border-emerald-800">
                                        <CheckCircle2 className="w-3 h-3" /> Liquidada
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 text-[10px] font-bold border border-amber-200 dark:border-amber-800">
                                        <Clock className="w-3 h-3" /> Na Fatura
                                      </span>
                                    )}
                                  </td>

                                  {/* Ações */}
                                  <td className="py-3 px-4 text-center whitespace-nowrap">
                                    <div className="flex items-center justify-center gap-1">
                                      <button
                                        onClick={() => handleEditInvoiceItem(item.id)}
                                        className="p-1.5 text-zinc-400 hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-950/40 rounded-lg transition-all"
                                        title="Editar Compra"
                                      >
                                        <Pencil className="w-3.5 h-3.5" />
                                      </button>

                                      <button
                                        onClick={() => handleDeleteInvoiceItem(item.id)}
                                        className="p-1.5 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-all"
                                        title="Excluir Compra"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center text-xs text-zinc-400">
                  Selecione um mês para visualizar a fatura.
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* MODAL: CRIAR / EDITAR CARTÃO DE CRÉDITO */}
      {isCardModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-600/10 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                  <CreditCardIcon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                    {editingCard ? "Editar Cartão de Crédito" : "Novo Cartão de Crédito"}
                  </h3>
                  <p className="text-[11px] text-zinc-400">
                    Perfil {profile}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCardModalOpen(false)}
                className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCard} className="p-6 space-y-4">
              {cardFormError && (
                <div className="p-3 text-xs font-semibold text-rose-600 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl">
                  {cardFormError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Nome do Cartão
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Nubank Ultravioleta, Itaú Visa Signature..."
                  value={cardName}
                  onChange={(e) => setCardName(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:border-purple-500 text-zinc-900 dark:text-zinc-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Limite Total (R$)
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: 5000,00"
                  value={cardLimitStr}
                  onChange={(e) => setCardLimitStr(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:border-purple-500 text-zinc-900 dark:text-zinc-100 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5" title="Melhor dia de compra / corte">
                    Dia Fechamento (1-31)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    required
                    value={cardClosingDay}
                    onChange={(e) => setCardClosingDay(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:border-purple-500 text-zinc-900 dark:text-zinc-100 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5" title="Dia do vencimento da fatura">
                    Dia Vencimento (1-31)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    required
                    value={cardDueDay}
                    onChange={(e) => setCardDueDay(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:border-purple-500 text-zinc-900 dark:text-zinc-100 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Bandeira
                  </label>
                  <select
                    value={cardBrand}
                    onChange={(e) => setCardBrand(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:border-purple-500 text-zinc-900 dark:text-zinc-100"
                  >
                    <option value="MASTERCARD">Mastercard</option>
                    <option value="VISA">Visa</option>
                    <option value="ELO">Elo</option>
                    <option value="AMEX">American Express</option>
                    <option value="HIPERCARD">Hipercard</option>
                    <option value="OUTRO">Outro</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Tema Visual
                  </label>
                  <select
                    value={cardColor}
                    onChange={(e) => setCardColor(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:border-purple-500 text-zinc-900 dark:text-zinc-100 font-medium"
                  >
                    <option value="purple">Purple (Roxo / Nubank)</option>
                    <option value="emerald">Emerald (Verde)</option>
                    <option value="indigo">Indigo (Azul Escuro)</option>
                    <option value="rose">Rose (Vermelho)</option>
                    <option value="amber">Amber (Dourado / Laranja)</option>
                    <option value="sky">Sky (Azul Claro)</option>
                    <option value="zinc">Zinc (Black / Escuro)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Conta Bancária de Débito Padrão
                </label>
                <select
                  value={cardAccountId}
                  onChange={(e) => setCardAccountId(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:border-purple-500 text-zinc-900 dark:text-zinc-100"
                >
                  <option value="">Nenhuma (Selecionar na hora do pagamento)</option>
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({acc.type})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => setIsCardModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingCard}
                  className="px-5 py-2 text-xs font-bold bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-xl shadow-lg shadow-purple-600/20 transition-all flex items-center gap-1.5"
                >
                  {savingCard && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingCard ? "Salvar Alterações" : "Cadastrar Cartão"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: LIQUIDAR / PAGAR FATURA */}
      {isSettleModalOpen && activeCard && invoiceDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-600/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                    Liquidar Fatura de {monthNames[month - 1]}/{year}
                  </h3>
                  <p className="text-[11px] text-zinc-400">
                    {activeCard.name} • {formatCurrency(invoiceDetail.remaining_cents, hideValues)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsSettleModalOpen(false)}
                className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmSettle} className="p-6 space-y-4">
              {settleError && (
                <div className="p-3 text-xs font-semibold text-rose-600 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl">
                  {settleError}
                </div>
              )}

              <div className="p-3.5 bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/60 rounded-2xl space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-emerald-800 dark:text-emerald-300 font-semibold">Valor do Débito Consolidado:</span>
                  <span className="font-mono font-extrabold text-emerald-700 dark:text-emerald-400 text-sm">
                    {formatCurrency(invoiceDetail.remaining_cents, hideValues)}
                  </span>
                </div>
                <p className="text-[10px] text-emerald-700/80 dark:text-emerald-400/80">
                  Será gerada uma única saída bancária na tela de Lançamentos e todas as {invoiceDetail.items_count} compras da fatura serão baixadas.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5 flex items-center gap-1.5">
                  <Landmark className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Conta Bancária para Débito</span>
                </label>
                <select
                  required
                  value={selectedAccountId}
                  onChange={(e) => setSelectedAccountId(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:border-emerald-500 text-zinc-900 dark:text-zinc-100"
                >
                  <option value="">Selecione uma conta bancária...</option>
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({acc.type})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Data do Pagamento</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={paymentDateBR}
                    onChange={(e) => setPaymentDateBR(e.target.value)}
                    placeholder="DD/MM/AAAA"
                    className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:border-emerald-500 text-zinc-900 dark:text-zinc-100 font-mono text-center"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5 flex items-center gap-1.5">
                    <CreditCardIcon className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Forma de Pagto</span>
                  </label>
                  <select
                    value={selectedPaymentMethodId}
                    onChange={(e) => setSelectedPaymentMethodId(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:border-emerald-500 text-zinc-900 dark:text-zinc-100"
                  >
                    <option value="">Padrão / Automático</option>
                    {paymentMethods.map((pm) => (
                      <option key={pm.id} value={pm.id}>{pm.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Observações da Quitação
                </label>
                <input
                  type="text"
                  value={settleNotes}
                  onChange={(e) => setSettleNotes(e.target.value)}
                  placeholder="Ex: Pago via débito automático"
                  className="w-full px-3.5 py-2 text-xs bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:border-emerald-500 text-zinc-900 dark:text-zinc-100"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => setIsSettleModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={settling}
                  className="px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl shadow-lg shadow-emerald-600/20 transition-all flex items-center gap-1.5"
                >
                  {settling && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Confirmar Liquidação</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Transação (Criar / Editar Compra no Cartão) */}
      {isTransactionModalOpen && (
        <TransactionModal
          isOpen={isTransactionModalOpen}
          onClose={() => {
            setIsTransactionModalOpen(false);
            setTransactionToEdit(null);
          }}
          onSuccess={async () => {
            await fetchCards(activeCard?.id);
            await fetchInvoiceDetail();
            refreshSyncStatus(false);
          }}
          transactionToEdit={transactionToEdit}
          initialCreditCardId={activeCard?.id}
          initialType="DESPESA"
        />
      )}

      {/* Modal Visualizador de Anexos */}
      {isAttachmentModalOpen && selectedTransactionForAttachments && (
        <AttachmentViewerModal
          isOpen={isAttachmentModalOpen}
          onClose={() => {
            setIsAttachmentModalOpen(false);
            setSelectedTransactionForAttachments(null);
          }}
          attachments={selectedTransactionForAttachments.attachments || []}
          transactionTitle={selectedTransactionForAttachments.description || "Comprovantes da Compra"}
          transactionId={selectedTransactionForAttachments.id}
          profile={profile}
          onAttachmentsChanged={async () => {
            await fetchInvoiceDetail();
            refreshSyncStatus(false);
          }}
        />
      )}
    </div>
  );
};
