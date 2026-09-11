import React, { useState, useEffect, useCallback } from "react";
import {
  Users,
  Plus,
  Search,
  Phone,
  Mail,
  FileText,
  Clock,
  CheckCircle2,
  Calendar,
  AlertCircle,
  Edit2,
  Trash2,
  Loader2,
  Eye,
  ExternalLink,
} from "lucide-react";
import { walletApi } from "../api/walletApi";
import { Modal } from "../components/Modal";
import {
  Contact,
  ContactCreateInput,
  ContactUpdateInput,
  ContactSummaryResponse,
  Expense,
  ExpenseStatus,
} from "../types";
import { formatCurrency, formatDate } from "../utils/format";

export const Contacts: React.FC = () => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filtros
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");

  // Modais de Criação e Edição
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);

  // Form states
  const [formName, setFormName] = useState<string>("");
  const [formEmail, setFormEmail] = useState<string>("");
  const [formPhone, setFormPhone] = useState<string>("");
  const [formNotes, setFormNotes] = useState<string>("");
  const [formIsActive, setFormIsActive] = useState<boolean>(true);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Modal de Detalhes / Resumo e Pagamentos Planejados
  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [contactSummary, setContactSummary] = useState<ContactSummaryResponse | null>(null);
  const [contactExpenses, setContactExpenses] = useState<Expense[]>([]);
  const [isLoadingDetails, setIsLoadingDetails] = useState<boolean>(false);
  const [activeDetailTab, setActiveDetailTab] = useState<"planned" | "expenses">("planned");

  const loadContacts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await walletApi.getContacts({
        active_only: statusFilter === "ACTIVE" ? true : undefined,
        search: searchTerm.trim() || undefined,
      });
      // Se filtro for INACTIVE, filtra localmente
      if (statusFilter === "INACTIVE") {
        setContacts(data.filter((c) => !c.is_active));
      } else {
        setContacts(data);
      }
    } catch {
      setError("Não foi possível carregar os contatos. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  }, [searchTerm, statusFilter]);

  useEffect(() => {
    loadContacts();
  }, [loadContacts]);

  const loadContactDetails = async (contact: Contact) => {
    setSelectedContact(contact);
    setIsDetailModalOpen(true);
    setIsLoadingDetails(true);
    setActiveDetailTab("planned");
    try {
      const [summaryData, expensesData] = await Promise.all([
        walletApi.getContactSummary(contact.id),
        walletApi.getExpenses({ contact_id: contact.id }),
      ]);
      setContactSummary(summaryData);
      setContactExpenses(expensesData);
    } catch {
      alert("Erro ao carregar detalhes do contato.");
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const handleTogglePaymentStatus = async (paymentId: string, currentStatus: ExpenseStatus) => {
    const newStatus: ExpenseStatus = currentStatus === "CONCLUIDO" ? "PENDENTE" : "CONCLUIDO";
    try {
      await walletApi.updatePaymentStatus(paymentId, { status: newStatus });
      if (selectedContact) {
        const [summaryData, expensesData] = await Promise.all([
          walletApi.getContactSummary(selectedContact.id),
          walletApi.getExpenses({ contact_id: selectedContact.id }),
        ]);
        setContactSummary(summaryData);
        setContactExpenses(expensesData);
      }
      loadContacts();
    } catch {
      alert("Erro ao atualizar status do pagamento.");
    }
  };

  const handleOpenCreateModal = () => {
    setFormName("");
    setFormEmail("");
    setFormPhone("");
    setFormNotes("");
    setFormIsActive(true);
    setFormError(null);
    setIsCreateModalOpen(true);
  };

  const handleOpenEditModal = (contact: Contact) => {
    setEditingContact(contact);
    setFormName(contact.name);
    setFormEmail(contact.email || "");
    setFormPhone(contact.phone || "");
    setFormNotes(contact.notes || "");
    setFormIsActive(contact.is_active);
    setFormError(null);
    setIsEditModalOpen(true);
  };

  const handleCreateContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setFormError("O nome do contato é obrigatório.");
      return;
    }

    setIsSubmitting(true);
    setFormError(null);
    try {
      const payload: ContactCreateInput = {
        name: formName.trim(),
        email: formEmail.trim() || null,
        phone: formPhone.trim() || null,
        notes: formNotes.trim() || null,
        is_active: formIsActive,
      };
      await walletApi.createContact(payload);
      setIsCreateModalOpen(false);
      loadContacts();
    } catch {
      setFormError("Erro ao cadastrar contato. Verifique os dados informados.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingContact) return;
    if (!formName.trim()) {
      setFormError("O nome do contato é obrigatório.");
      return;
    }

    setIsSubmitting(true);
    setFormError(null);
    try {
      const payload: ContactUpdateInput = {
        name: formName.trim(),
        email: formEmail.trim() || null,
        phone: formPhone.trim() || null,
        notes: formNotes.trim() || null,
        is_active: formIsActive,
      };
      await walletApi.updateContact(editingContact.id, payload);
      setIsEditModalOpen(false);
      loadContacts();
      if (selectedContact && selectedContact.id === editingContact.id) {
        setSelectedContact({ ...selectedContact, ...payload, name: formName.trim() });
      }
    } catch {
      setFormError("Erro ao atualizar dados do contato.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteContact = async (contact: Contact) => {
    if (
      !window.confirm(
        `Tem certeza de que deseja excluir o contato "${contact.name}"? Se houver despesas vinculadas, o sistema não permitirá a exclusão.`
      )
    ) {
      return;
    }

    try {
      await walletApi.deleteContact(contact.id);
      loadContacts();
      if (selectedContact && selectedContact.id === contact.id) {
        setIsDetailModalOpen(false);
      }
    } catch (err: unknown) {
      const errorMsg =
        err && typeof err === "object" && "response" in err
          ? ((err as { response?: { data?: { detail?: string } } }).response?.data?.detail ??
            "Não foi possível excluir o contato.")
          : "Erro ao excluir contato. Pode haver lançamentos associados.";
      alert(errorMsg);
    }
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho da Página */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight flex items-center space-x-2.5">
            <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            <span>Contatos & Beneficiários</span>
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Gerencie contatos associados aos lançamentos e acompanhe pagamentos planejados.
          </p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-500 text-white font-medium px-4 py-2 rounded-xl text-sm shadow-sm shadow-blue-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" />
          <span>Novo Contato</span>
        </button>
      </div>

      {/* Barra de Busca e Filtros */}
      <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          {/* Busca por texto */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por nome, e-mail ou telefone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl pl-9 pr-3.5 py-1.5 text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Filtro Status */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as "ALL" | "ACTIVE" | "INACTIVE")}
            className="bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-medium px-3 py-2 text-zinc-700 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">Status: Todos</option>
            <option value="ACTIVE">Apenas Ativos</option>
            <option value="INACTIVE">Apenas Inativos</option>
          </select>
        </div>

        <span className="text-xs text-zinc-400 dark:text-zinc-500">
          {contacts.length} {contacts.length === 1 ? "contato cadastrado" : "contatos cadastrados"}
        </span>
      </div>

      {/* Lista de Contatos */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-16 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-2" />
          <span className="text-sm text-zinc-500 dark:text-zinc-400">Carregando contatos...</span>
        </div>
      ) : error ? (
        <div className="p-6 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-2xl text-center">
          <AlertCircle className="w-8 h-8 text-rose-500 mx-auto mb-2" />
          <p className="text-sm font-medium text-rose-700 dark:text-rose-300">{error}</p>
        </div>
      ) : contacts.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-8 shadow-sm">
          <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mx-auto mb-4 text-zinc-400">
            <Users className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            Nenhum contato encontrado
          </h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1 max-w-md mx-auto">
            Cadastre fornecedores, pessoas, prestadores de serviço ou mantenha o contato padrão Pessoal.
          </p>
          <button
            onClick={handleOpenCreateModal}
            className="mt-5 inline-flex items-center space-x-2 bg-blue-600 hover:bg-blue-500 text-white font-medium px-4 py-2 rounded-xl text-sm shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Cadastrar Contato</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {contacts.map((contact) => {
            const initials = contact.name
              .split(" ")
              .filter(Boolean)
              .slice(0, 2)
              .map((w) => w[0].toUpperCase())
              .join("");

            return (
              <div
                key={contact.id}
                className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 shadow-sm hover:border-zinc-300 dark:hover:border-zinc-700 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-blue-600/15 to-cyan-500/20 text-blue-600 dark:text-blue-400 font-bold text-sm flex items-center justify-center border border-blue-200/50 dark:border-blue-800/40">
                        {initials || "CT"}
                      </div>
                      <div>
                        <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 leading-tight">
                          {contact.name}
                        </h3>
                        <span
                          className={`inline-block mt-1 text-[10px] font-medium px-2 py-0.5 rounded-full border ${
                            contact.is_active
                              ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                              : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700"
                          }`}
                        >
                          {contact.is_active ? "Ativo" : "Inativo"}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => handleOpenEditModal(contact)}
                        className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                        title="Editar Contato"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteContact(contact)}
                        className="p-1.5 text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                        title="Excluir Contato"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Informações de Contato */}
                  <div className="mt-4 space-y-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                    {contact.email && (
                      <div className="flex items-center space-x-2">
                        <Mail className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                        <span className="truncate">{contact.email}</span>
                      </div>
                    )}
                    {contact.phone && (
                      <div className="flex items-center space-x-2">
                        <Phone className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                        <span>{contact.phone}</span>
                      </div>
                    )}
                    {contact.notes && (
                      <div className="flex items-start space-x-2 pt-1">
                        <FileText className="w-3.5 h-3.5 text-zinc-400 shrink-0 mt-0.5" />
                        <p className="text-zinc-600 dark:text-zinc-300 italic line-clamp-2">
                          "{contact.notes}"
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Botão para Acessar Detalhes e Planejados */}
                <div className="mt-5 pt-4 border-t border-zinc-100 dark:border-zinc-800/80">
                  <button
                    onClick={() => loadContactDetails(contact)}
                    className="w-full flex items-center justify-center space-x-2 bg-zinc-50 dark:bg-zinc-800 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-zinc-700 dark:text-zinc-300 hover:text-blue-600 dark:hover:text-blue-400 border border-zinc-200 dark:border-zinc-700 rounded-xl py-2 px-3 text-xs font-semibold transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Ver Lançamentos & Planejados</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Detalhes: Visão de Registros e Pagamentos Planejados */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title={selectedContact ? `Contato: ${selectedContact.name}` : "Detalhes do Contato"}
        maxWidth="2xl"
      >
        {isLoadingDetails ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-2" />
            <span className="text-sm text-zinc-500 dark:text-zinc-400">
              Carregando histórico e planejamentos...
            </span>
          </div>
        ) : selectedContact && contactSummary ? (
          <div className="space-y-6">
            {/* Metadados Básicos */}
            <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-600 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/60 p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-700/80">
              {selectedContact.email && (
                <div className="flex items-center space-x-1.5">
                  <Mail className="w-3.5 h-3.5 text-zinc-400" />
                  <span>{selectedContact.email}</span>
                </div>
              )}
              {selectedContact.phone && (
                <div className="flex items-center space-x-1.5">
                  <Phone className="w-3.5 h-3.5 text-zinc-400" />
                  <span>{selectedContact.phone}</span>
                </div>
              )}
              {selectedContact.notes && (
                <div className="flex items-center space-x-1.5">
                  <FileText className="w-3.5 h-3.5 text-zinc-400" />
                  <span className="italic">"{selectedContact.notes}"</span>
                </div>
              )}
            </div>

            {/* KPIs Financeiros do Contato */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-white dark:bg-zinc-800/80 p-4 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-2xs">
                <span className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                  Total em Despesas
                </span>
                <p className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mt-0.5">
                  {formatCurrency(contactSummary.total_expenses_cents)}
                </p>
                <span className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5 block">
                  {contactSummary.expenses_count} registros
                </span>
              </div>

              <div className="bg-white dark:bg-zinc-800/80 p-4 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-2xs">
                <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center space-x-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Total Já Pago</span>
                </span>
                <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                  {formatCurrency(contactSummary.total_paid_cents)}
                </p>
              </div>

              <div className="bg-white dark:bg-zinc-800/80 p-4 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-2xs">
                <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center space-x-1">
                  <Clock className="w-3 h-3" />
                  <span>Pendente / A Pagar</span>
                </span>
                <p className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-0.5">
                  {formatCurrency(contactSummary.total_pending_cents)}
                </p>
                <span className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5 block">
                  {contactSummary.planned_payments.length} parcelas pendentes
                </span>
              </div>
            </div>

            {/* Alternador de Abas: Pagamentos Planejados vs Histórico de Despesas */}
            <div className="flex border-b border-zinc-200 dark:border-zinc-700">
              <button
                onClick={() => setActiveDetailTab("planned")}
                className={`pb-2.5 px-4 text-xs font-semibold flex items-center space-x-2 border-b-2 transition-colors ${
                  activeDetailTab === "planned"
                    ? "border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400"
                    : "border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"
                }`}
              >
                <Calendar className="w-4 h-4" />
                <span>Pagamentos Planejados ({contactSummary.planned_payments.length})</span>
              </button>

              <button
                onClick={() => setActiveDetailTab("expenses")}
                className={`pb-2.5 px-4 text-xs font-semibold flex items-center space-x-2 border-b-2 transition-colors ${
                  activeDetailTab === "expenses"
                    ? "border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400"
                    : "border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"
                }`}
              >
                <ExternalLink className="w-4 h-4" />
                <span>Histórico de Lançamentos ({contactExpenses.length})</span>
              </button>
            </div>

            {/* Conteúdo da Aba 1: Pagamentos Planejados */}
            {activeDetailTab === "planned" && (
              <div>
                {contactSummary.planned_payments.length === 0 ? (
                  <div className="text-center py-8 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl border border-zinc-200 dark:border-zinc-700">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                    <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                      Nenhum pagamento pendente planejado para este contato.
                    </p>
                    <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5">
                      Todas as parcelas associadas a este contato já foram liquidadas.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                    {contactSummary.planned_payments.map((p) => (
                      <div
                        key={p.payment_id}
                        className="flex items-center justify-between p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-700/80 bg-zinc-50/70 dark:bg-zinc-800/60 hover:bg-white dark:hover:bg-zinc-800 transition-colors shadow-2xs"
                      >
                        <div className="flex items-center space-x-3">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: p.category_color || "#6366f1" }}
                          />
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="font-semibold text-xs text-zinc-900 dark:text-zinc-100">
                                {p.description}
                              </span>
                              <span className="text-[10px] font-medium px-2 py-0.2 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                {p.item_name}
                              </span>
                            </div>
                            <div className="flex items-center space-x-2 text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                              <span>Vencimento: {formatDate(p.due_date)}</span>
                              <span>&bull;</span>
                              <span>
                                Parcela {p.installment_number} de {p.installments_count}
                              </span>
                              {p.payment_method_name && (
                                <>
                                  <span>&bull;</span>
                                  <span>{p.payment_method_name}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-3">
                          <span className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                            {formatCurrency(p.amount_cents)}
                          </span>

                          <button
                            onClick={() => handleTogglePaymentStatus(p.payment_id, p.status)}
                            className="px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center space-x-1 bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 hover:bg-emerald-100 dark:hover:bg-emerald-950/80 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors"
                            title="Clique para liquidar parcela"
                          >
                            <Clock className="w-3 h-3" />
                            <span>Pagar</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Conteúdo da Aba 2: Histórico de Lançamentos */}
            {activeDetailTab === "expenses" && (
              <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                {contactExpenses.length === 0 ? (
                  <div className="text-center py-8 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl border border-zinc-200 dark:border-zinc-700">
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Nenhum lançamento registrado com este contato.
                    </p>
                  </div>
                ) : (
                  contactExpenses.map((exp) => (
                    <div
                      key={exp.id}
                      className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-700/80 bg-zinc-50/70 dark:bg-zinc-800/60 flex items-center justify-between shadow-2xs"
                    >
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-semibold text-xs text-zinc-900 dark:text-zinc-100">
                            {exp.description}
                          </span>
                          {exp.item && (
                            <span className="text-[10px] px-2 py-0.2 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                              {exp.item.name}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center space-x-2 text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                          <span>{exp.category?.name || "Sem categoria"}</span>
                          <span>&bull;</span>
                          <span>Data: {formatDate(exp.issue_date)}</span>
                          <span>&bull;</span>
                          <span>{exp.installments_count} parcela(s)</span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="font-bold text-sm text-zinc-900 dark:text-zinc-100 block">
                          {formatCurrency(exp.total_amount_cents)}
                        </span>
                        <span
                          className={`text-[10px] font-medium px-2 py-0.5 rounded-full inline-block mt-0.5 ${
                            exp.status === "CONCLUIDO"
                              ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300"
                              : "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300"
                          }`}
                        >
                          {exp.status}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        ) : null}
      </Modal>

      {/* Modal de Criação de Contato */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Novo Contato"
        maxWidth="md"
      >
        <form onSubmit={handleCreateContact} className="space-y-4">
          {formError && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 rounded-xl text-xs text-rose-700 dark:text-rose-300">
              {formError}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
              Nome do Contato *
            </label>
            <input
              type="text"
              required
              placeholder="Ex: Farmácia São Bento, Dr. Roberto, Companhia de Energia"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3.5 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                E-mail
              </label>
              <input
                type="email"
                placeholder="contato@exemplo.com"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3.5 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Telefone
              </label>
              <input
                type="text"
                placeholder="(00) 00000-0000"
                value={formPhone}
                onChange={(e) => setFormPhone(e.target.value)}
                className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3.5 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
              Observações
            </label>
            <textarea
              rows={2}
              placeholder="Informações adicionais, endereço ou anotações..."
              value={formNotes}
              onChange={(e) => setFormNotes(e.target.value)}
              className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3.5 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <div className="flex items-center space-x-2 pt-1">
            <input
              type="checkbox"
              id="create_is_active"
              checked={formIsActive}
              onChange={(e) => setFormIsActive(e.target.checked)}
              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800"
            />
            <label htmlFor="create_is_active" className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
              Contato Ativo (visível na seleção de lançamentos)
            </label>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-4 py-2 rounded-xl text-xs shadow-sm transition-all flex items-center space-x-1.5"
            >
              {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Salvar Contato</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal de Edição de Contato */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Editar Contato"
        maxWidth="md"
      >
        <form onSubmit={handleUpdateContact} className="space-y-4">
          {formError && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 rounded-xl text-xs text-rose-700 dark:text-rose-300">
              {formError}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
              Nome do Contato *
            </label>
            <input
              type="text"
              required
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3.5 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                E-mail
              </label>
              <input
                type="email"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3.5 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Telefone
              </label>
              <input
                type="text"
                value={formPhone}
                onChange={(e) => setFormPhone(e.target.value)}
                className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3.5 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
              Observações
            </label>
            <textarea
              rows={2}
              value={formNotes}
              onChange={(e) => setFormNotes(e.target.value)}
              className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3.5 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <div className="flex items-center space-x-2 pt-1">
            <input
              type="checkbox"
              id="edit_is_active"
              checked={formIsActive}
              onChange={(e) => setFormIsActive(e.target.checked)}
              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800"
            />
            <label htmlFor="edit_is_active" className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
              Contato Ativo (visível na seleção de lançamentos)
            </label>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => setIsEditModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-4 py-2 rounded-xl text-xs shadow-sm transition-all flex items-center space-x-1.5"
            >
              {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Atualizar Contato</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
