import React, { useState, useEffect, useMemo } from "react";
import { useApp } from "../context/AppContext";
import { api } from "../api/client";
import { 
  Contact, 
  ContactStatement, 
  Transaction, 
  Category, 
  Account, 
  PaymentMethod, 
  CreditCard as CreditCardType,
  AttachmentType,
  ATTACHMENT_TYPES 
} from "../types";
import { formatCurrency, formatDateToBR } from "../utils/format";
import { TransactionModal } from "./TransactionModal";
import { AttachmentViewerModal } from "./AttachmentViewerModal";
import { 
  X, Users, User as ContactIcon, Landmark, Tag, Calendar, 
  DollarSign, Clock, CheckCircle2, RotateCcw, AlertCircle, 
  Plus, Pencil, Search, Paperclip, Scale, Check, 
  ArrowUpRight, ArrowDownRight, CreditCard, Copy, 
  Loader2, Sparkles, Filter, FileText, ChevronRight,
  TrendingDown, TrendingUp, AlertTriangle, ShieldCheck
} from "lucide-react";

interface ContactStatementModalProps {
  isOpen: boolean;
  onClose: () => void;
  contact: Contact | null;
  onContactUpdated?: () => void;
}

export const ContactStatementModal: React.FC<ContactStatementModalProps> = ({
  isOpen,
  onClose,
  contact,
  onContactUpdated,
}) => {
  const { profile, hideValues, refreshSyncStatus } = useApp();

  const [statement, setStatement] = useState<ContactStatement | null>(null);
  const [categories, setCategories] = useState<Record<string, Category>>({});
  const [accounts, setAccounts] = useState<Record<string, Account>>({});
  const [paymentMethods, setPaymentMethods] = useState<Record<string, PaymentMethod>>({});
  const [creditCards, setCreditCards] = useState<Record<string, CreditCardType>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedDoc, setCopiedDoc] = useState(false);

  // Filtros internos do extrato
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"TODOS" | "DESPESA" | "RECEITA">("TODOS");
  const [statusFilter, setStatusFilter] = useState<"TODOS" | "PENDENTE" | "CONCLUIDO">("TODOS");

  // Modal de edição / criação de transação rápida
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [transactionToEdit, setTransactionToEdit] = useState<Transaction | null>(null);

  // Modal de Anexos
  const [selectedTransactionForAttachments, setSelectedTransactionForAttachments] = useState<Transaction | null>(null);
  const [isAttachmentModalOpen, setIsAttachmentModalOpen] = useState(false);

  // Carrega o extrato e dados complementares
  const fetchStatement = async () => {
    if (!contact) return;
    setLoading(true);
    setError(null);
    try {
      const [stmtRes, catRes, accRes, pmRes, cardRes] = await Promise.all([
        api.get<ContactStatement>(`/contacts/${contact.id}/statement`),
        api.get<Category[]>("/categories", { params: { profile } }),
        api.get<Account[]>("/accounts", { params: { profile } }),
        api.get<PaymentMethod[]>("/payment-methods", { params: { profile } }),
        api.get<CreditCardType[]>("/credit-cards", { params: { profile } }),
      ]);

      setStatement(stmtRes.data);

      const catMap: Record<string, Category> = {};
      catRes.data.forEach((c) => { catMap[c.id] = c; });
      setCategories(catMap);

      const accMap: Record<string, Account> = {};
      accRes.data.forEach((a) => { accMap[a.id] = a; });
      setAccounts(accMap);

      const pmMap: Record<string, PaymentMethod> = {};
      pmRes.data.forEach((p) => { pmMap[p.id] = p; });
      setPaymentMethods(pmMap);

      const cardMap: Record<string, CreditCardType> = {};
      cardRes.data.forEach((cd) => { cardMap[cd.id] = cd; });
      setCreditCards(cardMap);
    } catch (err: any) {
      console.error("Erro ao carregar extrato do contato:", err);
      setError(err.response?.data?.detail || "Erro ao carregar extrato do contato.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && contact) {
      fetchStatement();
    }
  }, [isOpen, contact, profile]);

  const handleCopyDoc = (doc: string) => {
    navigator.clipboard.writeText(doc);
    setCopiedDoc(true);
    setTimeout(() => setCopiedDoc(false), 2000);
  };

  const handleToggleStatus = async (t: Transaction) => {
    try {
      await api.patch(`/transactions/${t.id}/toggle-status`);
      await fetchStatement();
      if (onContactUpdated) onContactUpdated();
      refreshSyncStatus(false);
    } catch (err) {
      console.error("Erro ao alternar status do lançamento:", err);
    }
  };

  const handleOpenEdit = (t: Transaction) => {
    setTransactionToEdit(t);
    setIsTransactionModalOpen(true);
  };

  const handleOpenNew = () => {
    setTransactionToEdit(null);
    setIsTransactionModalOpen(true);
  };

  const handleTransactionSuccess = async () => {
    setIsTransactionModalOpen(false);
    setTransactionToEdit(null);
    await fetchStatement();
    if (onContactUpdated) onContactUpdated();
  };

  // Filtragem local dos lançamentos do contato
  const filteredTransactions = useMemo(() => {
    if (!statement) return [];
    return statement.transactions.filter((t) => {
      if (typeFilter !== "TODOS" && t.type !== typeFilter) return false;
      if (statusFilter !== "TODOS" && t.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const descMatch = t.description.toLowerCase().includes(q);
        const catMatch = t.category_id ? categories[t.category_id]?.name.toLowerCase().includes(q) : false;
        const notesMatch = t.notes && t.notes.toLowerCase().includes(q);
        const amountMatch = (t.amount_cents / 100).toString().includes(q);
        return descMatch || catMatch || notesMatch || amountMatch;
      }
      return true;
    });
  }, [statement, typeFilter, statusFilter, searchQuery, categories]);

  if (!isOpen || !contact) return null;

  const getContactBadgeColor = (type: string) => {
    switch (type) {
      case "FORNECEDOR":
        return "bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800";
      case "CLIENTE":
        return "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800";
      case "FUNCIONARIO":
        return "bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800";
      default:
        return "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700";
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Modal Header */}
        <div className="p-5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-gradient-to-r from-zinc-50 via-white to-zinc-50 dark:from-zinc-950/80 dark:via-zinc-900 dark:to-zinc-950/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/60 shadow-sm">
              <ContactIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                  {contact.name}
                </h2>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getContactBadgeColor(contact.type)}`}>
                  {contact.type}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-zinc-400 mt-0.5">
                <span>Extrato & Conta-Corrente Individual • {profile}</span>
                {contact.document && (
                  <>
                    <span>•</span>
                    <button
                      type="button"
                      onClick={() => handleCopyDoc(contact.document!)}
                      className="font-mono hover:text-indigo-600 dark:hover:text-indigo-400 transition-all flex items-center gap-1"
                      title="Copiar documento"
                    >
                      <span>Doc: {contact.document}</span>
                      {copiedDoc ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3 text-zinc-400" />}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenNew}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md shadow-emerald-600/20 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Novo Lançamento</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 flex-1 overflow-y-auto space-y-5">
          {loading && !statement ? (
            <div className="py-20 text-center text-zinc-400 flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
              <span className="text-xs">Carregando conta-corrente do contato...</span>
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs">
              {error}
            </div>
          ) : statement ? (
            <>
              {/* Financial Position KPI Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {/* Realized Flow (Pago / Recebido) */}
                <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-sm space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-zinc-400">Total Liquidado</span>
                    <span className="p-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </span>
                  </div>
                  <div className="text-base sm:text-lg font-bold font-mono text-zinc-900 dark:text-zinc-100">
                    {contact.type === "CLIENTE"
                      ? formatCurrency(statement.summary.total_received_cents, hideValues)
                      : formatCurrency(statement.summary.total_paid_cents, hideValues)}
                  </div>
                  <div className="text-[10px] text-zinc-400">
                    {contact.type === "CLIENTE" ? "Recebimentos Concluídos" : "Pagamentos Concluídos"}
                  </div>
                </div>

                {/* Pending Flow */}
                <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-sm space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-zinc-400">Total Pendente</span>
                    <span className="p-1 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400">
                      <Clock className="w-3.5 h-3.5" />
                    </span>
                  </div>
                  <div className="text-base sm:text-lg font-bold font-mono text-amber-600 dark:text-amber-400">
                    {contact.type === "CLIENTE"
                      ? formatCurrency(statement.summary.total_pending_receive_cents, hideValues)
                      : formatCurrency(statement.summary.total_pending_pay_cents, hideValues)}
                  </div>
                  <div className="text-[10px] text-zinc-400">
                    {contact.type === "CLIENTE" ? "A Receber em Aberto" : "A Pagar em Aberto"}
                  </div>
                </div>

                {/* Debts & Liabilities */}
                <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-sm space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-zinc-400">Saldo em Dívidas</span>
                    <span className="p-1 rounded-lg bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400">
                      <Scale className="w-3.5 h-3.5" />
                    </span>
                  </div>
                  <div className="text-base sm:text-lg font-bold font-mono text-purple-600 dark:text-purple-400">
                    {formatCurrency(statement.summary.remaining_debts_cents, hideValues)}
                  </div>
                  <div className="text-[10px] text-zinc-400">
                    {statement.summary.debts_count} dívida(s) ativa(s)
                  </div>
                </div>

                {/* Total Volume */}
                <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-sm space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-zinc-400">Volume Total</span>
                    <span className="p-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                      <FileText className="w-3.5 h-3.5" />
                    </span>
                  </div>
                  <div className="text-base sm:text-lg font-bold font-mono text-zinc-800 dark:text-zinc-200">
                    {statement.summary.transactions_count}
                  </div>
                  <div className="text-[10px] text-zinc-400">
                    Lançamentos registrados
                  </div>
                </div>
              </div>

              {/* Notes Banner if available */}
              {contact.notes && (
                <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/60 dark:border-zinc-800 text-xs text-zinc-600 dark:text-zinc-300 flex items-start gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold block text-[11px] text-zinc-400">Anotações / Dados Bancários / Chave PIX:</span>
                    <span>{contact.notes}</span>
                  </div>
                </div>
              )}

              {/* Debts Section (if any) */}
              {statement.debts.length > 0 && (
                <div className="space-y-2.5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                    <Scale className="w-3.5 h-3.5 text-purple-500" />
                    <span>Dívidas & Passivos Vinculados ({statement.debts.length})</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {statement.debts.map((d) => {
                      const paidCents = Math.max(0, d.total_amount_cents - d.remaining_amount_cents);
                      const pct = Math.min(100, Math.round((paidCents / d.total_amount_cents) * 100));

                      return (
                        <div
                          key={d.id}
                          className="p-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <h5 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">{d.title}</h5>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                              {d.status}
                            </span>
                          </div>

                          <div className="w-full h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-purple-500 rounded-full transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>

                          <div className="flex items-center justify-between text-[11px] font-mono">
                            <span className="text-zinc-400">Restante: <strong className="text-rose-600 dark:text-rose-400">{formatCurrency(d.remaining_amount_cents, hideValues)}</strong></span>
                            <span className="text-zinc-400">Total: {formatCurrency(d.total_amount_cents, hideValues)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Transactions Ledger & Filters */}
              <div className="space-y-3 pt-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 dark:border-zinc-800 pb-3">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
                      Extrato de Movimentações
                    </h4>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 font-mono font-bold">
                      {filteredTransactions.length}
                    </span>
                  </div>

                  {/* Filter Controls */}
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-2" />
                      <input
                        type="text"
                        placeholder="Buscar no extrato..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-8 pr-2.5 py-1 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-700 dark:text-zinc-300 w-36 sm:w-44 focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    {/* Type Filter */}
                    <div className="flex items-center bg-zinc-50 dark:bg-zinc-800 p-0.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-[11px]">
                      {(["TODOS", "DESPESA", "RECEITA"] as const).map((tp) => (
                        <button
                          key={tp}
                          onClick={() => setTypeFilter(tp)}
                          className={`px-2 py-0.5 rounded-md font-semibold transition-all ${
                            typeFilter === tp
                              ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm"
                              : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400"
                          }`}
                        >
                          {tp === "TODOS" ? "Todos" : tp === "DESPESA" ? "Despesas" : "Receitas"}
                        </button>
                      ))}
                    </div>

                    {/* Status Filter */}
                    <div className="flex items-center bg-zinc-50 dark:bg-zinc-800 p-0.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-[11px]">
                      {(["TODOS", "CONCLUIDO", "PENDENTE"] as const).map((st) => (
                        <button
                          key={st}
                          onClick={() => setStatusFilter(st)}
                          className={`px-2 py-0.5 rounded-md font-semibold transition-all ${
                            statusFilter === st
                              ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm"
                              : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400"
                          }`}
                        >
                          {st === "TODOS" ? "Todos" : st === "CONCLUIDO" ? "Liquidados" : "Pendentes"}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {filteredTransactions.length === 0 ? (
                  <div className="py-12 text-center text-xs text-zinc-400 bg-zinc-50 dark:bg-zinc-800/20 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800">
                    Nenhuma movimentação encontrada para este contato.
                  </div>
                ) : (
                  <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden divide-y divide-zinc-100 dark:divide-zinc-800">
                    {filteredTransactions.map((t) => {
                      const isCompleted = t.status === "CONCLUIDO";
                      const cat = t.category_id ? categories[t.category_id] : null;
                      const acc = t.account_id ? accounts[t.account_id] : null;
                      const pm = t.payment_method_id ? paymentMethods[t.payment_method_id] : null;
                      const card = t.credit_card_id ? creditCards[t.credit_card_id] : null;

                      return (
                        <div
                          key={t.id}
                          className="p-3.5 bg-white dark:bg-zinc-900 hover:bg-zinc-50/70 dark:hover:bg-zinc-800/40 transition-all flex items-center justify-between gap-3"
                        >
                          {/* Left: Checkbox toggle + Info */}
                          <div className="flex items-center gap-3 min-w-0">
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(t)}
                              className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all shrink-0 ${
                                isCompleted
                                  ? "bg-emerald-500 border-emerald-500 text-white shadow-sm"
                                  : "border-zinc-300 dark:border-zinc-600 hover:border-emerald-500 text-transparent"
                              }`}
                              title={isCompleted ? "Desmarcar / Reabrir" : "Marcar como Liquidado"}
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>

                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`text-xs font-bold truncate ${isCompleted ? "line-through text-zinc-400 dark:text-zinc-500" : "text-zinc-900 dark:text-zinc-100"}`}>
                                  {t.description}
                                </span>

                                {t.installment_number && t.total_installments && (
                                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 font-bold shrink-0">
                                    {t.installment_number}/{t.total_installments}
                                  </span>
                                )}

                                {t.attachments && t.attachments.length > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedTransactionForAttachments(t);
                                      setIsAttachmentModalOpen(true);
                                    }}
                                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100"
                                    title="Visualizar Comprovantes"
                                  >
                                    <Paperclip className="w-3 h-3" />
                                    <span>{t.attachments.length}</span>
                                  </button>
                                )}
                              </div>

                              <div className="flex items-center gap-2 text-[11px] text-zinc-400 mt-0.5 flex-wrap">
                                <span className="font-mono">
                                  {isCompleted && t.payment_date 
                                    ? `Pago em ${formatDateToBR(t.payment_date)}`
                                    : `Vence em ${formatDateToBR(t.due_date)}`}
                                </span>

                                {cat && (
                                  <>
                                    <span>•</span>
                                    <span className="text-zinc-600 dark:text-zinc-300 font-medium">{cat.name}</span>
                                  </>
                                )}

                                {card && (
                                  <>
                                    <span>•</span>
                                    <span className="text-purple-600 dark:text-purple-400 font-semibold">{card.name}</span>
                                  </>
                                )}

                                {acc && !card && (
                                  <>
                                    <span>•</span>
                                    <span>{acc.name}</span>
                                  </>
                                )}

                                {pm && !card && (
                                  <>
                                    <span>•</span>
                                    <span>{pm.name}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Right: Amount + Quick Edit */}
                          <div className="flex items-center gap-3 shrink-0">
                            <div className="text-right">
                              <span className={`text-xs font-mono font-bold block ${
                                t.type === "DESPESA"
                                  ? "text-rose-600 dark:text-rose-400"
                                  : "text-emerald-600 dark:text-emerald-400"
                              }`}>
                                {t.type === "DESPESA" ? "-" : "+"} {formatCurrency(t.amount_cents, hideValues)}
                              </span>
                              <span className={`text-[10px] font-semibold ${
                                isCompleted ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"
                              }`}>
                                {isCompleted ? "Liquidado" : "Pendente"}
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleOpenEdit(t)}
                              className="p-1.5 text-zinc-400 hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-950/40 rounded-lg transition-all"
                              title="Editar Lançamento"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>

      </div>

      {/* Modal de Criação / Edição de Transação */}
      {isTransactionModalOpen && (
        <TransactionModal
          isOpen={true}
          onClose={() => {
            setIsTransactionModalOpen(false);
            setTransactionToEdit(null);
          }}
          onSuccess={handleTransactionSuccess}
          transactionToEdit={transactionToEdit}
          initialContactId={statement?.contact?.id}
        />
      )}

      {/* Modal de Anexos */}
      {isAttachmentModalOpen && selectedTransactionForAttachments && (
        <AttachmentViewerModal
          isOpen={true}
          onClose={() => {
            setIsAttachmentModalOpen(false);
            setSelectedTransactionForAttachments(null);
          }}
          attachments={selectedTransactionForAttachments.attachments || []}
          transactionTitle={selectedTransactionForAttachments.description}
          transactionId={selectedTransactionForAttachments.id}
          profile={profile}
          onAttachmentsChanged={fetchStatement}
        />
      )}
    </div>
  );
};
