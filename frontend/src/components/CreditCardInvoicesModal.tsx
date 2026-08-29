import React, { useState, useEffect } from "react";
import { useApp } from "../context/AppContext";
import { api } from "../api/client";
import { 
  CreditCard, 
  CreditCardInvoiceDetail, 
  CreditCardInvoiceSummary, 
  Account, 
  PaymentMethod 
} from "../types";
import { formatCurrency, formatDateToBR, getTodayBR, parseDateBRToISO } from "../utils/format";
import { 
  X, ChevronLeft, ChevronRight, CreditCard as CreditCardIcon, 
  CheckCircle2, Clock, AlertTriangle, Landmark, Calendar, 
  DollarSign, Loader2, ArrowRight, RotateCcw, ShieldCheck, Tag
} from "lucide-react";

interface CreditCardInvoicesModalProps {
  isOpen: boolean;
  onClose: () => void;
  card: CreditCard | null;
  onInvoiceUpdated?: () => void;
}

export const CreditCardInvoicesModal: React.FC<CreditCardInvoicesModalProps> = ({
  isOpen,
  onClose,
  card,
  onInvoiceUpdated,
}) => {
  const { profile, hideValues } = useApp();

  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [invoiceDetail, setInvoiceDetail] = useState<CreditCardInvoiceDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Estados de Liquidação / Pagamento
  const [isSettleModalOpen, setIsSettleModalOpen] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
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

  // Carrega faturas ao trocar de mês ou cartão
  const fetchInvoice = async () => {
    if (!card) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<CreditCardInvoiceDetail>(
        `/credit-cards/${card.id}/invoices/${year}/${month}`
      );
      setInvoiceDetail(res.data);
    } catch (err: any) {
      console.error("Erro ao carregar fatura:", err);
      setError(err.response?.data?.detail || "Erro ao carregar detalhes da fatura.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && card) {
      fetchInvoice();
    }
  }, [isOpen, card, month, year]);

  // Carrega contas e formas de pagamento ao abrir modal de liquidação
  const handleOpenSettleModal = async () => {
    setSettleError(null);
    try {
      const [accRes, pmRes] = await Promise.all([
        api.get<Account[]>("/accounts", { params: { profile } }),
        api.get<PaymentMethod[]>("/payment-methods", { params: { profile } }),
      ]);
      setAccounts(accRes.data);
      setPaymentMethods(pmRes.data);

      // Pré-seleciona a conta padrão do cartão ou a primeira disponível
      if (card?.account_id) {
        setSelectedAccountId(card.account_id);
      } else if (accRes.data.length > 0) {
        setSelectedAccountId(accRes.data[0].id);
      }

      // Pré-seleciona forma "Débito Automático" ou "Boleto" ou "Pix" se houver
      const defaultPm = pmRes.data.find(p => 
        p.name.toLowerCase().includes("débito") || 
        p.name.toLowerCase().includes("boleto") || 
        p.name.toLowerCase().includes("pix")
      );
      if (defaultPm) setSelectedPaymentMethodId(defaultPm.id);

      setPaymentDateBR(getTodayBR());
      setSettleNotes(`Pagamento da fatura ${card?.name} - ${monthNames[month - 1]}/${year}`);
      setIsSettleModalOpen(true);
    } catch (err) {
      console.error("Erro ao preparar liquidação:", err);
    }
  };

  const handleConfirmSettle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!card || !selectedAccountId) {
      setSettleError("Selecione a conta bancária para débito.");
      return;
    }

    setSettling(true);
    setSettleError(null);

    try {
      const isoPaymentDate = parseDateBRToISO(paymentDateBR);
      await api.post(`/credit-cards/${card.id}/invoices/${year}/${month}/settle`, {
        account_id: selectedAccountId,
        payment_date: isoPaymentDate,
        payment_method_id: selectedPaymentMethodId || null,
        notes: settleNotes || null,
      });

      setIsSettleModalOpen(false);
      await fetchInvoice();
      if (onInvoiceUpdated) onInvoiceUpdated();
    } catch (err: any) {
      console.error("Erro ao liquidar fatura:", err);
      setSettleError(err.response?.data?.detail || "Falha ao liquidar fatura.");
    } finally {
      setSettling(false);
    }
  };

  const handleUnsettle = async () => {
    if (!card) return;
    if (!confirm(`Deseja realmente reabrir a fatura de ${monthNames[month - 1]}/${year}? O lançamento de pagamento na conta bancária será removido.`)) {
      return;
    }

    setLoading(true);
    try {
      await api.post(`/credit-cards/${card.id}/invoices/${year}/${month}/unsettle`);
      await fetchInvoice();
      if (onInvoiceUpdated) onInvoiceUpdated();
    } catch (err: any) {
      console.error("Erro ao reabrir fatura:", err);
      alert(err.response?.data?.detail || "Erro ao reabrir fatura.");
    } finally {
      setLoading(false);
    }
  };

  const handlePrevMonth = () => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  if (!isOpen || !card) return null;

  const getCardThemeClasses = (color: string) => {
    switch (color) {
      case "purple":
        return "from-purple-900 via-indigo-900 to-zinc-950 border-purple-700/50 shadow-purple-900/30 text-purple-200";
      case "indigo":
        return "from-indigo-900 via-slate-900 to-zinc-950 border-indigo-700/50 shadow-indigo-900/30 text-indigo-200";
      case "rose":
        return "from-rose-900 via-zinc-900 to-zinc-950 border-rose-700/50 shadow-rose-900/30 text-rose-200";
      case "amber":
        return "from-amber-950 via-zinc-900 to-zinc-950 border-amber-700/50 shadow-amber-900/30 text-amber-200";
      case "sky":
        return "from-sky-900 via-slate-900 to-zinc-950 border-sky-700/50 shadow-sky-900/30 text-sky-200";
      case "zinc":
        return "from-zinc-800 via-zinc-900 to-zinc-950 border-zinc-700/50 shadow-zinc-900/30 text-zinc-200";
      default:
        return "from-emerald-950 via-zinc-900 to-zinc-950 border-emerald-700/50 shadow-emerald-900/30 text-emerald-200";
    }
  };

  const usedPct = card.limit_cents > 0 
    ? Math.min(100, Math.round((card.used_limit_cents / card.limit_cents) * 100))
    : 0;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Top Header */}
        <div className="p-5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60 shadow-sm">
              <CreditCardIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <span>Faturas do Cartão</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 font-semibold">
                  {card.name}
                </span>
              </h2>
              <p className="text-xs text-zinc-400">
                Fechamento dia {card.closing_day} • Vencimento dia {card.due_day}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Card Limits Banner */}
        <div className="p-5 border-b border-zinc-100 dark:border-zinc-800 bg-gradient-to-r from-zinc-50 via-white to-zinc-50 dark:from-zinc-950/60 dark:via-zinc-900 dark:to-zinc-950/60">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            {/* Virtual Card Graphic Card Mini */}
            <div className={`p-4 rounded-2xl bg-gradient-to-br ${getCardThemeClasses(card.color)} border shadow-md relative overflow-hidden flex flex-col justify-between h-28`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold tracking-wider uppercase text-white/90">{card.name}</span>
                <span className="text-[10px] font-mono font-extrabold px-2 py-0.5 rounded bg-white/10 text-white border border-white/10">
                  {card.brand || "CARTÃO"}
                </span>
              </div>
              <div className="flex items-end justify-between">
                <div>
                  <span className="text-[10px] text-white/60 block">Limite Total</span>
                  <span className="text-sm font-mono font-bold text-white">
                    {formatCurrency(card.limit_cents, hideValues)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-white/60 block">Melhor Dia</span>
                  <span className="text-xs font-bold text-white">Dia {card.closing_day}</span>
                </div>
              </div>
            </div>

            {/* Limits Progress Box */}
            <div className="md:col-span-2 space-y-2.5 p-3 rounded-2xl bg-zinc-100/50 dark:bg-zinc-800/40 border border-zinc-200/60 dark:border-zinc-800/80">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-500 font-medium">Uso do Limite Global:</span>
                <span className="font-mono font-bold text-zinc-800 dark:text-zinc-200">{usedPct}% utilizado</span>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-2.5 bg-zinc-200 dark:bg-zinc-700/60 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-500 rounded-full ${
                    usedPct > 85 ? "bg-rose-500" : usedPct > 60 ? "bg-amber-500" : "bg-emerald-500"
                  }`}
                  style={{ width: `${usedPct}%` }}
                />
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                <div>
                  <span className="text-[11px] text-zinc-400 block">Limite Comprometido:</span>
                  <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                    {formatCurrency(card.used_limit_cents, hideValues)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-zinc-400 block">Limite Disponível:</span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(card.available_limit_cents, hideValues)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Invoice Month Navigator */}
        <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-white dark:bg-zinc-900">
          <button
            onClick={handlePrevMonth}
            className="p-2 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-all flex items-center gap-1 text-xs font-semibold"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Mês Anterior</span>
          </button>

          <div className="text-center">
            <h3 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100">
              {monthNames[month - 1]} de {year}
            </h3>
            {invoiceDetail && (
              <p className="text-[11px] text-zinc-400">
                Compras de {formatDateToBR(invoiceDetail.period_start)} até {formatDateToBR(invoiceDetail.period_end)}
              </p>
            )}
          </div>

          <button
            onClick={handleNextMonth}
            className="p-2 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-all flex items-center gap-1 text-xs font-semibold"
          >
            <span className="hidden sm:inline">Próximo Mês</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Invoice Body / Items */}
        <div className="p-5 flex-1 overflow-y-auto space-y-5">
          {loading ? (
            <div className="py-16 text-center text-zinc-400 flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
              <span className="text-xs">Carregando fatura...</span>
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs">
              {error}
            </div>
          ) : invoiceDetail ? (
            <>
              {/* Invoice Summary Card */}
              <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-500 font-medium">Status da Fatura:</span>
                    {invoiceDetail.status === "PAGA" ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-100 dark:bg-sky-950/80 text-sky-700 dark:text-sky-300 border border-sky-300 dark:border-sky-800">
                        <CheckCircle2 className="w-3 h-3" /> Fatura Paga
                      </span>
                    ) : invoiceDetail.status === "FECHADA" ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                        <Clock className="w-3 h-3" /> Fechada • Aguardando Pagamento
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                        <ShieldCheck className="w-3 h-3" /> Fatura Aberta
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Vencimento previsto em: <strong className="text-zinc-800 dark:text-zinc-200">{formatDateToBR(invoiceDetail.due_date)}</strong>
                  </p>
                </div>

                <div className="flex flex-col sm:items-end gap-2">
                  <div className="text-right">
                    <span className="text-xs text-zinc-400 block">Total da Fatura</span>
                    <span className="text-xl sm:text-2xl font-mono font-extrabold text-zinc-900 dark:text-zinc-100">
                      {formatCurrency(invoiceDetail.total_cents, hideValues)}
                    </span>
                  </div>

                  {invoiceDetail.status !== "PAGA" && invoiceDetail.total_cents > 0 && (
                    <button
                      onClick={handleOpenSettleModal}
                      className="px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md shadow-emerald-600/20 transition-all flex items-center gap-1.5 self-start sm:self-auto"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Pagar / Liquidar Fatura</span>
                    </button>
                  )}

                  {invoiceDetail.status === "PAGA" && (
                    <button
                      onClick={handleUnsettle}
                      className="px-3 py-1.5 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-all flex items-center gap-1 self-start sm:self-auto"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Reabrir / Desfazer Pagamento</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center justify-between">
                  <span>Lançamentos da Fatura ({invoiceDetail.items.length})</span>
                </h4>

                {invoiceDetail.items.length === 0 ? (
                  <div className="py-10 text-center text-xs text-zinc-400 bg-zinc-50 dark:bg-zinc-800/20 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800">
                    Nenhuma compra registrada nesta fatura.
                  </div>
                ) : (
                  <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden divide-y divide-zinc-100 dark:divide-zinc-800">
                    {invoiceDetail.items.map((item) => (
                      <div
                        key={item.id}
                        className="p-3.5 bg-white dark:bg-zinc-900 hover:bg-zinc-50/70 dark:hover:bg-zinc-800/40 transition-all flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 shrink-0">
                            <Tag className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <h5 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">
                                {item.description}
                              </h5>
                              {item.installment_number && (
                                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 font-bold shrink-0">
                                  {item.installment_number}/{item.total_installments}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-zinc-400 mt-0.5">
                              <span>{formatDateToBR(item.due_date)}</span>
                              <span>•</span>
                              <span className="text-zinc-600 dark:text-zinc-300 font-medium">{item.category_name}</span>
                              {item.contact_name && (
                                <>
                                  <span>•</span>
                                  <span>{item.contact_name}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-xs font-mono font-bold text-zinc-900 dark:text-zinc-100 block">
                            {formatCurrency(item.amount_cents, hideValues)}
                          </span>
                          <span className={`text-[10px] font-semibold ${
                            item.status === "CONCLUIDO"
                              ? "text-sky-600 dark:text-sky-400"
                              : "text-amber-600 dark:text-amber-400"
                          }`}>
                            {item.status === "CONCLUIDO" ? "Liquidado" : "Pendente"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>

        {/* Modal de Liquidação / Pagamento da Fatura */}
        {isSettleModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden">
              <div className="p-5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-gradient-to-r from-emerald-50/50 via-white to-white dark:from-emerald-950/20 dark:via-zinc-900 dark:to-zinc-900">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 shadow-sm">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                      Liquidar Fatura de {monthNames[month - 1]}/{year}
                    </h3>
                    <p className="text-xs text-zinc-400">
                      Dá baixa em todos os lançamentos e gera uma saída única na conta
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsSettleModalOpen(false)}
                  className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleConfirmSettle} className="p-5 space-y-4">
                {settleError && (
                  <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs">
                    {settleError}
                  </div>
                )}

                <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/60 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-emerald-800 dark:text-emerald-300 font-medium block">Valor Total a Debitar:</span>
                    <span className="text-xl font-mono font-extrabold text-emerald-900 dark:text-emerald-100">
                      {invoiceDetail ? formatCurrency(invoiceDetail.remaining_cents || invoiceDetail.total_cents, hideValues) : "R$ 0,00"}
                    </span>
                  </div>
                  <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-200/70 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 font-bold">
                    {invoiceDetail?.items.length} itens
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1 flex items-center gap-1">
                    <Landmark className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Conta Bancária de Débito *</span>
                  </label>
                  <select
                    required
                    value={selectedAccountId}
                    onChange={(e) => setSelectedAccountId(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:border-emerald-500 text-zinc-900 dark:text-zinc-100"
                  >
                    <option value="">Selecione a conta...</option>
                    {[...accounts]
                      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" }))
                      .map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.name} ({acc.type})
                        </option>
                      ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                      <span>Data do Pagamento *</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="DD/MM/AAAA"
                      value={paymentDateBR}
                      onChange={(e) => setPaymentDateBR(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:border-emerald-500 text-zinc-900 dark:text-zinc-100"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1 flex items-center gap-1">
                      <CreditCardIcon className="w-3.5 h-3.5 text-zinc-400" />
                      <span>Forma de Pagamento</span>
                    </label>
                    <select
                      value={selectedPaymentMethodId}
                      onChange={(e) => setSelectedPaymentMethodId(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:border-emerald-500 text-zinc-900 dark:text-zinc-100"
                    >
                      <option value="">Nenhuma (Opcional)</option>
                      {[...paymentMethods]
                        .sort((a, b) => a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" }))
                        .map((pm) => (
                          <option key={pm.id} value={pm.id}>
                            {pm.name}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Observações
                  </label>
                  <input
                    type="text"
                    value={settleNotes}
                    onChange={(e) => setSettleNotes(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:border-emerald-500 text-zinc-900 dark:text-zinc-100"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setIsSettleModalOpen(false)}
                    className="px-4 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={settling}
                    className="px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg shadow-md shadow-emerald-600/20 transition-all flex items-center gap-1.5"
                  >
                    {settling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                    <span>Confirmar Pagamento</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
