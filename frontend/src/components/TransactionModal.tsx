import React, { useState, useEffect, useRef } from "react";
import { useApp } from "../context/AppContext";
import { api } from "../api/client";
import { Category, Contact, Item, Account, PaymentMethod, CreditCard as CreditCardType, Attachment, Transaction, TransactionType, AttachmentType, ATTACHMENT_TYPES } from "../types";
import { formatCurrency, getTodayBR, maskDateBR, parseDateBRToISO, formatDateToBR } from "../utils/format";
import { 
  X, Calendar, DollarSign, Tag, User as ContactIcon, FileText, 
  Package, Landmark, Paperclip, Upload, Image as ImageIcon, 
  CheckCircle2, Loader2, Pencil, Clock, Check, ChevronDown, CreditCard, Sparkles,
  ArrowRightLeft, ArrowRight
} from "lucide-react";

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  transactionToEdit?: Transaction | null;
  initialCreditCardId?: string;
  initialContactId?: string;
  initialType?: TransactionType;
  initialMode?: Mode;
}

type Mode = "UNICO" | "PARCELADO" | "RECORRENTE";

export const TransactionModal: React.FC<TransactionModalProps> = ({ 
  isOpen, 
  onClose, 
  onSuccess,
  transactionToEdit,
  initialCreditCardId,
  initialContactId,
  initialType,
  initialMode
}) => {
  const { profile } = useApp();
  const isEditing = !!transactionToEdit;

  const datePickerRef = useRef<HTMLInputElement>(null);
  const paymentDatePickerRef = useRef<HTMLInputElement>(null);
  const attachmentInputRef = useRef<HTMLInputElement>(null);

  const [mode, setMode] = useState<Mode>("UNICO");
  const [type, setType] = useState<TransactionType>("DESPESA");
  const [status, setStatus] = useState<"PENDENTE" | "CONCLUIDO">("PENDENTE");
  const [itemId, setItemId] = useState("");
  const [description, setDescription] = useState("");
  const [amountStr, setAmountStr] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [accountId, setAccountId] = useState("");
  const [destinationAccountId, setDestinationAccountId] = useState("");
  const [paymentMethodId, setPaymentMethodId] = useState("");
  const [creditCardId, setCreditCardId] = useState("");
  const [contactId, setContactId] = useState("");
  const [dueDateStr, setDueDateStr] = useState<string>(getTodayBR());
  const [paymentDateStr, setPaymentDateStr] = useState<string>("");
  const [installments, setInstallments] = useState("2");
  const [dueDay, setDueDay] = useState(String(new Date().getDate()));
  const [notes, setNotes] = useState("");
  const [uploadedAttachments, setUploadedAttachments] = useState<Attachment[]>([]);
  const [selectedUploadType, setSelectedUploadType] = useState<AttachmentType>("COMPROVANTE");
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);

  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [creditCards, setCreditCards] = useState<CreditCardType[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cardHint, setCardHint] = useState<string | null>(null);

  const handleOpenDatePicker = (ref: React.RefObject<HTMLInputElement | null>) => {
    if (ref.current) {
      if (typeof ref.current.showPicker === "function") {
        try {
          ref.current.showPicker();
        } catch {
          ref.current.focus();
        }
      } else {
        ref.current.focus();
      }
    }
  };

  // Inicialização de campos ao abrir ou mudar a transação em edição
  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    setCardHint(null);

    if (transactionToEdit) {
      // Modo Edição: Pré-carrega todos os campos do lançamento existente
      setType(transactionToEdit.type);
      setMode("UNICO");
      setDescription(transactionToEdit.description || "");
      setAmountStr((transactionToEdit.amount_cents / 100).toFixed(2).replace(".", ","));
      setCategoryId(transactionToEdit.category_id || "");
      setItemId(transactionToEdit.item_id || "");
      setAccountId(transactionToEdit.account_id || "");
      setDestinationAccountId(transactionToEdit.destination_account_id || "");
      setPaymentMethodId(transactionToEdit.payment_method_id || "");
      setCreditCardId(transactionToEdit.credit_card_id || "");
      setContactId(transactionToEdit.contact_id || "");
      setDueDateStr(formatDateToBR(transactionToEdit.due_date));
      setStatus(transactionToEdit.status === "CONCLUIDO" ? "CONCLUIDO" : "PENDENTE");
      setPaymentDateStr(transactionToEdit.payment_date ? formatDateToBR(transactionToEdit.payment_date) : "");
      setNotes(transactionToEdit.notes || "");
      setUploadedAttachments(transactionToEdit.attachments || []);
    } else {
      // Modo Criação: Reseta para valores padrão
      setDueDateStr(getTodayBR());
      setPaymentDateStr("");
      setStatus("PENDENTE");
      setMode(initialMode || "UNICO");
      setType(initialType || "DESPESA");
      setDescription("");
      setAmountStr("");
      setItemId("");
      setCategoryId("");
      setAccountId("");
      setDestinationAccountId("");
      setPaymentMethodId("");
      setCreditCardId(initialCreditCardId || "");
      setContactId(initialContactId || "");
      setNotes("");
      setUploadedAttachments([]);
    }
  }, [isOpen, transactionToEdit, initialCreditCardId, initialContactId, initialType, initialMode]);

  // Carrega listas gerais (contatos, contas, formas de pagamento, cartões)
  useEffect(() => {
    if (!isOpen) return;

    const loadGeneralDependencies = async () => {
      try {
        const [conRes, accRes, pmRes, cardsRes] = await Promise.all([
          api.get("/contacts", { params: { profile } }),
          api.get("/accounts", { params: { profile } }),
          api.get("/payment-methods", { params: { profile } }),
          api.get("/credit-cards", { params: { profile } }),
        ]);
        setContacts(conRes.data);
        setAccounts(accRes.data);
        setPaymentMethods(pmRes.data);
        setCreditCards(cardsRes.data);
      } catch (err) {
        console.error("Erro ao carregar listas gerais:", err);
      }
    };

    loadGeneralDependencies();
  }, [isOpen, profile]);

  // Carrega categorias e itens filtrados pelo tipo selecionado
  useEffect(() => {
    if (!isOpen) return;

    const loadTypeFilteredDependencies = async () => {
      try {
        const catParams = type === "TRANSFERENCIA" ? { profile } : { profile, type };
        const itemParams = type === "TRANSFERENCIA" ? { profile } : { profile, type };
        const [catRes, itemRes] = await Promise.all([
          api.get("/categories", { params: catParams }),
          api.get("/items", { params: itemParams }),
        ]);
        setCategories(catRes.data);
        setItems(itemRes.data);

        // Se estiver criando e não tiver categoria selecionada, define a primeira categoria
        if (!transactionToEdit && catRes.data.length > 0) {
          setCategoryId((prev) => {
            if (!prev || !catRes.data.some((c: Category) => c.id === prev)) {
              return catRes.data[0].id;
            }
            return prev;
          });
        }
      } catch (err) {
        console.error("Erro ao carregar categorias e itens:", err);
      }
    };

    loadTypeFilteredDependencies();
  }, [isOpen, profile, type, transactionToEdit]);

  if (!isOpen) return null;

  const handleCardChange = (cardId: string) => {
    setCreditCardId(cardId);
    if (!cardId) {
      setCardHint(null);
      return;
    }
    const card = creditCards.find((c) => c.id === cardId);
    if (!card) return;

    if (!paymentMethodId) {
      const pmCard = paymentMethods.find((p) => p.name.toLowerCase().includes("crédito") || p.name.toLowerCase().includes("cartão"));
      if (pmCard) setPaymentMethodId(pmCard.id);
    }

    if (card.account_id && !accountId) {
      setAccountId(card.account_id);
    }

    const isoDate = parseDateBRToISO(dueDateStr);
    if (isoDate) {
      const [y, m, d] = isoDate.split("-").map(Number);
      let invMonth = m;
      let invYear = y;
      const isAfterClosing = d >= card.closing_day;
      if (isAfterClosing) {
        const totM = m;
        invYear = y + Math.floor(totM / 12);
        invMonth = (totM % 12) + 1;
      }

      let dueYear = invYear;
      let dueMonth = invMonth;
      if (card.due_day < card.closing_day) {
        const totM = invMonth;
        dueYear = invYear + Math.floor(totM / 12);
        dueMonth = (totM % 12) + 1;
      }
      const daysInMonth = new Date(dueYear, dueMonth, 0).getDate();
      const actualDueDay = Math.min(card.due_day, daysInMonth);
      const computedDueISO = `${dueYear}-${String(dueMonth).padStart(2, "0")}-${String(actualDueDay).padStart(2, "0")}`;
      const computedDueBR = formatDateToBR(computedDueISO);

      if (isAfterClosing) {
        setCardHint(`✨ Melhor dia de compra: compra após o fechamento (dia ${card.closing_day}). Entrará na fatura de ${String(invMonth).padStart(2, "0")}/${invYear} com vencimento em ${computedDueBR}. Esta compra fica organizada na tela de Cartões & Faturas.`);
      } else {
        setCardHint(`Fatura de ${String(invMonth).padStart(2, "0")}/${invYear} (vencimento em ${computedDueBR}). Esta compra fica organizada na tela de Cartões & Faturas.`);
      }
    }
  };

  useEffect(() => {
    if (initialCreditCardId && creditCards.length > 0) {
      handleCardChange(initialCreditCardId);
    }
  }, [initialCreditCardId, creditCards]);

  const handleAttachmentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploadingAttachment(true);
    setError(null);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const formData = new FormData();
      formData.append("file", file);
      formData.append("profile", profile);
      formData.append("attachment_type", selectedUploadType);

      try {
        const res = await api.post<Attachment>("/attachments/upload", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        setUploadedAttachments((prev) => [...prev, res.data]);
      } catch (err: any) {
        setError(err.response?.data?.detail || `Erro ao carregar anexo ${file.name}`);
      }
    }

    setIsUploadingAttachment(false);
    if (attachmentInputRef.current) attachmentInputRef.current.value = "";
  };

  const handleUpdateAttachmentType = async (attachmentId: string, newType: AttachmentType) => {
    try {
      const res = await api.patch<Attachment>(`/attachments/${attachmentId}`, {
        attachment_type: newType,
      });
      setUploadedAttachments((prev) =>
        prev.map((a) => (a.id === attachmentId ? res.data : a))
      );
    } catch (err: any) {
      console.error("Erro ao atualizar tipo de anexo:", err);
    }
  };

  const handleRemoveAttachment = async (attachmentId: string) => {
    try {
      await api.delete(`/attachments/${attachmentId}`);
      setUploadedAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
    } catch {
      setUploadedAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
    }
  };

  const handleItemSelect = (selectedItemId: string) => {
    setItemId(selectedItemId);
    if (!selectedItemId) return;

    const found = items.find((it) => it.id === selectedItemId);
    if (found) {
      setCategoryId(found.category_id);
      if (!description.trim()) {
        setDescription(found.name);
      }
      if (found.default_amount_cents && found.default_amount_cents > 0 && !amountStr.trim()) {
        setAmountStr((found.default_amount_cents / 100).toFixed(2).replace(".", ","));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const amountFloat = parseFloat(amountStr.replace(",", "."));
    if (isNaN(amountFloat) || amountFloat <= 0) {
      setError("Informe um valor válido maior que zero.");
      setLoading(false);
      return;
    }

    if (!description.trim()) {
      setError("Informe uma descrição para o lançamento.");
      setLoading(false);
      return;
    }

    if (!categoryId && type !== "TRANSFERENCIA") {
      setError("Selecione ou crie uma categoria antes de prosseguir.");
      setLoading(false);
      return;
    }

    const amountCents = Math.round(amountFloat * 100);

    const isoDueDate = parseDateBRToISO(dueDateStr);
    if (!isoDueDate) {
      setError("Informe uma data de vencimento válida no formato dd/mm/aaaa.");
      setLoading(false);
      return;
    }

    const isoPaymentDate = status === "CONCLUIDO" 
      ? (paymentDateStr ? parseDateBRToISO(paymentDateStr) : isoDueDate) 
      : null;

    if (type === "TRANSFERENCIA") {
      if (!accountId || !destinationAccountId) {
        setError("Selecione a conta de origem e a conta de destino para a transferência.");
        setLoading(false);
        return;
      }
      if (accountId === destinationAccountId) {
        setError("A conta de origem e a conta de destino não podem ser iguais.");
        setLoading(false);
        return;
      }
    }

    try {
      if (isEditing && transactionToEdit) {
        // Modo Edição: Executa PUT
        await api.put(`/transactions/${transactionToEdit.id}`, {
          type,
          description: description.trim(),
          amount_cents: amountCents,
          category_id: type === "TRANSFERENCIA" ? null : (categoryId || null),
          item_id: type === "TRANSFERENCIA" ? null : (itemId || null),
          account_id: accountId || null,
          destination_account_id: type === "TRANSFERENCIA" ? (destinationAccountId || null) : null,
          payment_method_id: paymentMethodId || null,
          credit_card_id: type === "TRANSFERENCIA" ? null : (creditCardId || null),
          contact_id: type === "TRANSFERENCIA" ? null : (contactId || null),
          due_date: isoDueDate,
          status,
          payment_date: isoPaymentDate,
          notes: notes.trim() || null,
          attachment_ids: uploadedAttachments.map((a) => a.id),
        });
      } else {
        // Modo Criação: Executa POST
        if (mode === "UNICO" || type === "TRANSFERENCIA") {
          await api.post("/transactions", {
            profile,
            type,
            description: description.trim(),
            amount_cents: amountCents,
            category_id: type === "TRANSFERENCIA" ? null : (categoryId || null),
            item_id: type === "TRANSFERENCIA" ? null : (itemId || null),
            account_id: accountId || null,
            destination_account_id: type === "TRANSFERENCIA" ? (destinationAccountId || null) : null,
            payment_method_id: paymentMethodId || null,
            credit_card_id: type === "TRANSFERENCIA" ? null : (creditCardId || null),
            contact_id: type === "TRANSFERENCIA" ? null : (contactId || null),
            due_date: isoDueDate,
            notes: notes.trim() || null,
            status,
            payment_date: isoPaymentDate,
            attachment_ids: uploadedAttachments.map((a) => a.id),
          });
        } else {
          await api.post("/schedules", {
            profile,
            type,
            description: description.trim(),
            amount_cents: amountCents,
            category_id: categoryId,
            item_id: itemId || null,
            account_id: accountId || null,
            payment_method_id: paymentMethodId || null,
            credit_card_id: creditCardId || null,
            contact_id: contactId || null,
            schedule_type: mode === "PARCELADO" ? "PARCELADA" : "RECORRENTE_CONTINUA",
            frequency: "MENSAL",
            total_installments: mode === "PARCELADO" ? (parseInt(installments, 10) || 2) : null,
            start_date: isoDueDate,
            due_day: parseInt(dueDay, 10) || new Date().getDate(),
          });
        }
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.detail || "Falha ao salvar alterações no lançamento.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-xl xl:max-w-2xl shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl ${isEditing ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400" : "bg-zinc-100 dark:bg-zinc-800 text-emerald-500"}`}>
              {isEditing ? <Pencil className="w-5 h-5" /> : <DollarSign className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100 leading-tight">
                {isEditing ? "Editar Lançamento" : "Novo Lançamento"}
              </h2>
              <p className="text-[11px] text-zinc-400">
                {isEditing ? "Atualize os dados e comprovantes do lançamento selecionado" : `Cadastre uma nova receita ou despesa no perfil ${profile}`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="p-3 text-xs font-medium bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/50 rounded-lg">
              {error}
            </div>
          )}

          {/* Type Selector (Despesa vs Receita vs Transferência) */}
          <div className="grid grid-cols-3 gap-2 p-1 bg-zinc-100 dark:bg-zinc-800/80 rounded-xl border border-zinc-200/80 dark:border-zinc-700/60">
            <button
              type="button"
              onClick={() => setType("DESPESA")}
              className={`py-2 text-xs font-bold rounded-lg transition-all ${
                type === "DESPESA"
                  ? "bg-rose-600 text-white shadow-sm"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
              }`}
            >
              Despesa (A Pagar)
            </button>
            <button
              type="button"
              onClick={() => setType("RECEITA")}
              className={`py-2 text-xs font-bold rounded-lg transition-all ${
                type === "RECEITA"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
              }`}
            >
              Receita (A Receber)
            </button>
            <button
              type="button"
              onClick={() => {
                setType("TRANSFERENCIA");
                setMode("UNICO");
                if (status === "PENDENTE") setStatus("CONCLUIDO");
              }}
              className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                type === "TRANSFERENCIA"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
              }`}
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              <span>Transferência</span>
            </button>
          </div>

          {/* Status Switcher (Apenas no Modo Edição) */}
          {isEditing && (
            <div className="space-y-1.5 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800">
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Status da Transação
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setStatus("PENDENTE")}
                  className={`py-2 px-3 text-xs font-bold rounded-lg border transition-all flex items-center justify-center gap-2 ${
                    status === "PENDENTE"
                      ? "bg-amber-500 text-white border-amber-600 shadow-sm"
                      : "bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700/60"
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Pendente</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStatus("CONCLUIDO");
                    if (!paymentDateStr) setPaymentDateStr(dueDateStr || getTodayBR());
                  }}
                  className={`py-2 px-3 text-xs font-bold rounded-lg border transition-all flex items-center justify-center gap-2 ${
                    status === "CONCLUIDO"
                      ? "bg-emerald-600 text-white border-emerald-700 shadow-sm"
                      : "bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700/60"
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Liquidado / Concluído</span>
                </button>
              </div>
            </div>
          )}

          {/* Mode Selector (Apenas em Modo de Criação e para Receitas/Despesas) */}
          {!isEditing && type !== "TRANSFERENCIA" && (
            <div className="grid grid-cols-3 gap-2">
              {(["UNICO", "PARCELADO", "RECORRENTE"] as Mode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={`py-2 text-xs font-semibold rounded-lg border transition-all ${
                    mode === m
                      ? "border-zinc-900 dark:border-zinc-100 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-sm"
                      : "border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                  }`}
                >
                  {m === "UNICO" ? "Único" : m === "PARCELADO" ? "Parcelado" : "Recorrente"}
                </button>
              ))}
            </div>
          )}

          {/* Item Selector (Apenas para Receitas e Despesas) */}
          {type !== "TRANSFERENCIA" && items.length > 0 && (
            <div className="p-3 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/70 dark:border-emerald-900/50 rounded-xl space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Item do Catálogo</span>
                </label>
                {itemId && (
                  <button
                    type="button"
                    onClick={() => setItemId("")}
                    className="text-[10px] text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 underline"
                  >
                    Desvincular item
                  </button>
                )}
              </div>
              <select
                value={itemId}
                onChange={(e) => handleItemSelect(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white dark:bg-zinc-800 border border-emerald-200 dark:border-emerald-800/80 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium text-zinc-900 dark:text-zinc-100"
              >
                <option value="">[Preenchimento manual ou selecione um item]</option>
                {[...categories]
                  .sort((a, b) => a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" }))
                  .map((cat) => {
                    const catItems = items
                      .filter((it) => it.category_id === cat.id)
                      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" }));
                    if (catItems.length === 0) return null;

                    return (
                      <optgroup key={cat.id} label={`${cat.name} (${cat.type})`}>
                        {catItems.map((it) => (
                          <option key={it.id} value={it.id}>
                            {it.name} {it.default_amount_cents && it.default_amount_cents > 0 ? `— R$ ${(it.default_amount_cents / 100).toFixed(2).replace(".", ",")}` : ""}
                          </option>
                        ))}
                      </optgroup>
                    );
                  })}
              </select>
            </div>
          )}

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" />
              <span>Descrição</span>
            </label>
            <input
              type="text"
              required
              placeholder="Ex: Aluguel, Supermercado, Fatura..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2 text-sm bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-zinc-900 dark:text-zinc-100"
            />
          </div>

          {/* Amount & Due Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5 flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5" />
                <span>{mode === "PARCELADO" ? "Valor Parcela (R$)" : "Valor (R$)"}</span>
              </label>
              <input
                type="text"
                required
                placeholder="0,00"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-mono text-zinc-900 dark:text-zinc-100"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>{mode === "UNICO" ? "Vencimento" : "1º Vencimento"}</span>
                </label>
                <span className="text-[10px] text-zinc-400 font-mono">dd/mm/aaaa</span>
              </div>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="dd/mm/aaaa"
                  value={dueDateStr}
                  onChange={(e) => {
                    const masked = maskDateBR(e.target.value);
                    setDueDateStr(masked);
                    const parsedIso = parseDateBRToISO(masked);
                    if (parsedIso) {
                      const dayNum = parseInt(masked.split("/")[0], 10);
                      if (!isNaN(dayNum) && dayNum >= 1 && dayNum <= 31) {
                        setDueDay(String(dayNum));
                      }
                    }
                  }}
                  maxLength={10}
                  className="w-full pl-3.5 pr-10 py-2 text-sm bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-mono text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
                />
                <button 
                  type="button"
                  onClick={() => handleOpenDatePicker(datePickerRef)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-zinc-400 hover:text-emerald-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-all flex items-center justify-center cursor-pointer"
                  title="Abrir calendário para escolher data de vencimento"
                >
                  <Calendar className="w-4 h-4 pointer-events-none" />
                </button>
                <input
                  ref={datePickerRef}
                  type="date"
                  tabIndex={-1}
                  aria-hidden="true"
                  value={parseDateBRToISO(dueDateStr) || ""}
                  onChange={(e) => {
                    if (e.target.value) {
                      const br = formatDateToBR(e.target.value);
                      setDueDateStr(br);
                      const dayNum = parseInt(br.split("/")[0], 10);
                      if (!isNaN(dayNum) && dayNum >= 1 && dayNum <= 31) {
                        setDueDay(String(dayNum));
                      }
                    }
                  }}
                  className="absolute opacity-0 pointer-events-none w-0 h-0 bottom-0 right-0 overflow-hidden"
                />
              </div>
            </div>
          </div>

          {/* Payment Date (Quando Liquidado) */}
          {status === "CONCLUIDO" && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5" />
                  <span>Data de Pagamento / Liquidação</span>
                </label>
                <span className="text-[10px] text-zinc-400 font-mono">dd/mm/aaaa</span>
              </div>
              <div className="relative">
                <input
                  type="text"
                  placeholder="dd/mm/aaaa"
                  value={paymentDateStr}
                  onChange={(e) => setPaymentDateStr(maskDateBR(e.target.value))}
                  maxLength={10}
                  className="w-full pl-3.5 pr-10 py-2 text-sm bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-300 dark:border-emerald-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-mono text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
                />
                <button 
                  type="button"
                  onClick={() => handleOpenDatePicker(paymentDatePickerRef)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-emerald-600 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 rounded-md transition-all flex items-center justify-center cursor-pointer"
                  title="Abrir calendário para escolher data de pagamento"
                >
                  <Calendar className="w-4 h-4 pointer-events-none" />
                </button>
                <input
                  ref={paymentDatePickerRef}
                  type="date"
                  tabIndex={-1}
                  aria-hidden="true"
                  value={parseDateBRToISO(paymentDateStr) || ""}
                  onChange={(e) => {
                    if (e.target.value) {
                      setPaymentDateStr(formatDateToBR(e.target.value));
                    }
                  }}
                  className="absolute opacity-0 pointer-events-none w-0 h-0 bottom-0 right-0 overflow-hidden"
                />
              </div>
            </div>
          )}

          {/* Installment Controls */}
          {!isEditing && mode === "PARCELADO" && (
            <div className="grid grid-cols-2 gap-3 p-3 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl border border-zinc-200 dark:border-zinc-800">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Nº de Parcelas
                </label>
                <input
                  type="number"
                  min="2"
                  max="120"
                  value={installments}
                  onChange={(e) => setInstallments(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-md focus:outline-none focus:border-emerald-500 font-mono text-zinc-900 dark:text-zinc-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Dia do Mês
                </label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={dueDay}
                  onChange={(e) => setDueDay(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-md focus:outline-none focus:border-emerald-500 font-mono text-zinc-900 dark:text-zinc-100"
                />
              </div>
            </div>
          )}

          {/* Recurrent Controls */}
          {!isEditing && mode === "RECORRENTE" && (
            <div className="p-3 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl border border-zinc-200 dark:border-zinc-800">
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Dia Fixo de Vencimento todo Mês (1 a 31)
              </label>
              <input
                type="number"
                min="1"
                max="31"
                value={dueDay}
                onChange={(e) => setDueDay(e.target.value)}
                className="w-full px-3 py-1.5 text-sm bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-md focus:outline-none focus:border-emerald-500 font-mono text-zinc-900 dark:text-zinc-100"
              />
            </div>
          )}

          {/* Category, Account & Contact OR Dedicated Transfer Section */}
          {type === "TRANSFERENCIA" ? (
            <div className="space-y-3 p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200/70 dark:border-indigo-900/50 animate-fade-in">
              <div className="flex items-center gap-2 text-xs font-bold text-indigo-900 dark:text-indigo-200">
                <ArrowRightLeft className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>Transferência Interna de Saldo entre Contas Próprias</span>
              </div>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Debita a conta de origem e credita a de destino sem inflar as receitas e despesas operacionais.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5 flex items-center gap-1.5">
                    <Landmark className="w-3.5 h-3.5 text-rose-500" />
                    <span>Conta de Origem (Saída / Débito) *</span>
                  </label>
                  <select
                    required
                    value={accountId}
                    onChange={(e) => {
                      const newSrc = e.target.value;
                      setAccountId(newSrc);
                      const srcObj = accounts.find((a) => a.id === newSrc);
                      const dstObj = accounts.find((a) => a.id === destinationAccountId);
                      if (srcObj && dstObj && (!description || description.startsWith("Transferência:"))) {
                        setDescription(`Transferência: ${srcObj.name} → ${dstObj.name}`);
                      }
                    }}
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-zinc-900 dark:text-zinc-100 font-medium"
                  >
                    <option value="">Selecione a conta de saída...</option>
                    {[...accounts]
                      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" }))
                      .map((acc) => (
                        <option key={acc.id} value={acc.id} disabled={acc.id === destinationAccountId}>
                          {acc.name} ({acc.type === "CORRENTE" ? "Corrente" : acc.type === "POUPANCA" ? "Poupança" : acc.type === "INVESTIMENTO" ? "Investimento" : acc.type === "CAIXA" ? "Caixa" : "Outro"})
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5 flex items-center gap-1.5">
                    <Landmark className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Conta de Destino (Entrada / Crédito) *</span>
                  </label>
                  <select
                    required
                    value={destinationAccountId}
                    onChange={(e) => {
                      const newDst = e.target.value;
                      setDestinationAccountId(newDst);
                      const srcObj = accounts.find((a) => a.id === accountId);
                      const dstObj = accounts.find((a) => a.id === newDst);
                      if (srcObj && dstObj && (!description || description.startsWith("Transferência:"))) {
                        setDescription(`Transferência: ${srcObj.name} → ${dstObj.name}`);
                      }
                    }}
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-zinc-900 dark:text-zinc-100 font-medium"
                  >
                    <option value="">Selecione a conta de entrada...</option>
                    {[...accounts]
                      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" }))
                      .map((acc) => (
                        <option key={acc.id} value={acc.id} disabled={acc.id === accountId}>
                          {acc.name} ({acc.type === "CORRENTE" ? "Corrente" : acc.type === "POUPANCA" ? "Poupança" : acc.type === "INVESTIMENTO" ? "Investimento" : acc.type === "CAIXA" ? "Caixa" : "Outro"})
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5 flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Meio / Instrumento Utilizado (Opcional)</span>
                </label>
                <select
                  value={paymentMethodId}
                  onChange={(e) => setPaymentMethodId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-zinc-900 dark:text-zinc-100"
                >
                  <option value="">Nenhum (Transferência Bancária Direta)</option>
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
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5" />
                  <span>Categoria</span>
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-zinc-900 dark:text-zinc-100"
                >
                  {categories.length === 0 && <option value="">Nenhuma categoria encontrada</option>}
                  {[...categories]
                    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" }))
                    .map((cat) => {
                      const natLabel = cat.nature && cat.nature !== "NENHUM" ? ` • ${cat.nature.charAt(0) + cat.nature.slice(1).toLowerCase()}` : "";
                      return (
                        <option key={cat.id} value={cat.id}>
                          {cat.name} ({cat.type}){natLabel}
                        </option>
                      );
                    })}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5 flex items-center gap-1.5">
                    <Landmark className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Conta / Carteira</span>
                  </label>
                  <select
                    value={accountId}
                    onChange={(e) => setAccountId(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-zinc-900 dark:text-zinc-100"
                  >
                    <option value="">Nenhuma (Opcional)</option>
                    {[...accounts]
                      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" }))
                      .map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.name} ({acc.type === "CORRENTE" ? "Corrente" : acc.type === "POUPANCA" ? "Poupança" : acc.type === "INVESTIMENTO" ? "Investimento" : acc.type === "CAIXA" ? "Caixa" : "Outro"})
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5 flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Forma de Pagto</span>
                  </label>
                  <select
                    value={paymentMethodId}
                    onChange={(e) => setPaymentMethodId(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-zinc-900 dark:text-zinc-100"
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

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5 flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-purple-500" />
                    <span>Cartão de Crédito</span>
                  </label>
                  <select
                    value={creditCardId}
                    onChange={(e) => handleCardChange(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all text-zinc-900 dark:text-zinc-100 font-medium"
                  >
                    <option value="">Nenhum (Lançamento Comum)</option>
                    {[...creditCards]
                      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" }))
                      .map((card) => (
                        <option key={card.id} value={card.id}>
                          {card.name} (Disp: R$ {(card.available_limit_cents / 100).toFixed(0)})
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5 flex items-center gap-1.5">
                    <ContactIcon className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Contato / Favorecido</span>
                  </label>
                  <select
                    value={contactId}
                    onChange={(e) => setContactId(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-zinc-900 dark:text-zinc-100"
                  >
                    <option value="">Nenhum (Opcional)</option>
                    {[...contacts]
                      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" }))
                      .map((ct) => (
                        <option key={ct.id} value={ct.id}>
                          {ct.name} ({ct.type})
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Card Smart Hint */}
              {cardHint && (
                <div className="p-2.5 rounded-xl bg-purple-50/80 dark:bg-purple-950/40 border border-purple-200/80 dark:border-purple-800/80 text-purple-700 dark:text-purple-300 text-xs flex items-center gap-2 font-medium animate-fade-in">
                  <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
                  <span>{cardHint}</span>
                </div>
              )}
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
              Observações (Opcional)
            </label>
            <input
              type="text"
              placeholder="Anotações complementares..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2 text-sm bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-zinc-900 dark:text-zinc-100"
            />
          </div>

          {/* Comprovantes & Anexos */}
          <div className="space-y-2.5 pt-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                <Paperclip className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Documentos & Comprovantes (Opcional)</span>
              </label>
              <span className="text-[10px] text-zinc-400">JPG, PNG, WEBP ou PDF</span>
            </div>

            {/* Seletor rápido do tipo do anexo antes do upload */}
            <div className="p-2 bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700/80 rounded-xl space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400">
                  Tipo do documento a anexar:
                </span>
                <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                  {ATTACHMENT_TYPES[selectedUploadType]?.shortLabel}
                </span>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-1">
                {(Object.keys(ATTACHMENT_TYPES) as AttachmentType[]).map((typeKey) => {
                  const cfg = ATTACHMENT_TYPES[typeKey];
                  const isSelected = selectedUploadType === typeKey;
                  return (
                    <button
                      key={typeKey}
                      type="button"
                      onClick={() => setSelectedUploadType(typeKey)}
                      className={`px-2 py-1.5 text-[11px] font-semibold rounded-lg border transition-all text-center truncate ${
                        isSelected
                          ? `${cfg.badgeClass} border shadow-xs font-bold ring-1 ring-emerald-500/30`
                          : "bg-white dark:bg-zinc-800/80 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700/60"
                      }`}
                      title={cfg.description}
                    >
                      {cfg.shortLabel}
                    </button>
                  );
                })}
              </div>
            </div>

            <input
              type="file"
              ref={attachmentInputRef}
              onChange={handleAttachmentUpload}
              multiple
              accept="image/*,.pdf"
              className="hidden"
            />

            {/* Dropzone / Botão de upload */}
            <button
              type="button"
              onClick={() => attachmentInputRef.current?.click()}
              disabled={isUploadingAttachment}
              className="w-full p-3 border border-dashed border-zinc-300 dark:border-zinc-700 hover:border-emerald-500 dark:hover:border-emerald-500 rounded-xl bg-zinc-50 dark:bg-zinc-800/30 hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20 text-zinc-600 dark:text-zinc-400 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 text-xs font-medium"
            >
              {isUploadingAttachment ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
                  <span>Carregando {ATTACHMENT_TYPES[selectedUploadType]?.shortLabel.toLowerCase()}...</span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 text-emerald-500" />
                  <span>
                    Clique para anexar arquivo como <strong>{ATTACHMENT_TYPES[selectedUploadType]?.shortLabel}</strong>
                  </span>
                </>
              )}
            </button>

            {/* Lista de Comprovantes Carregados */}
            {uploadedAttachments.length > 0 && (
              <div className="space-y-2 pt-1">
                {uploadedAttachments.map((att) => {
                  const isPdf = att.mime_type === "application/pdf" || att.file_name.toLowerCase().endsWith(".pdf");
                  const currentTypeKey = (att.attachment_type || "COMPROVANTE") as AttachmentType;
                  const typeCfg = ATTACHMENT_TYPES[currentTypeKey] || ATTACHMENT_TYPES.COMPROVANTE;

                  return (
                    <div
                      key={att.id}
                      className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/80 text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <div className="p-1.5 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shrink-0">
                          {isPdf ? (
                            <FileText className="w-4 h-4 text-rose-500" />
                          ) : (
                            <ImageIcon className="w-4 h-4 text-emerald-500" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-zinc-800 dark:text-zinc-200 truncate">{att.file_name}</p>
                          <p className="text-[10px] text-zinc-400 font-mono">{att.formatted_size || "Carregado"}</p>
                        </div>
                      </div>

                      {/* Seletor do Tipo de Anexo individual */}
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="relative">
                          <select
                            value={currentTypeKey}
                            onChange={(e) => handleUpdateAttachmentType(att.id, e.target.value as AttachmentType)}
                            className={`text-[11px] font-bold py-1 pl-2.5 pr-6 rounded-lg border appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-emerald-500 ${typeCfg.badgeClass}`}
                          >
                            {(Object.keys(ATTACHMENT_TYPES) as AttachmentType[]).map((key) => (
                              <option key={key} value={key} className="bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100">
                                {ATTACHMENT_TYPES[key].shortLabel}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="w-3 h-3 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-60" />
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveAttachment(att.id)}
                          className="p-1 text-zinc-400 hover:text-rose-500 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-md transition-colors"
                          title="Remover anexo"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-200 dark:border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-md shadow-emerald-600/20 transition-all disabled:opacity-50 flex items-center gap-1.5"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{isEditing ? (loading ? "Salvando Alterações..." : "Salvar Alterações") : (loading ? "Salvando..." : "Salvar Lançamento")}</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
