import React, { useState, useEffect, useMemo } from "react";
import { useApp } from "../context/AppContext";
import { api } from "../api/client";
import { 
  Category, Item, Account, AccountType, PaymentMethod, CreditCard as CreditCardType, Contact, Debt, Budget, Goal, Schedule,
  User, SyncLog,
  AttachmentStats, StorageDirectoryConfigResponse, SystemStatsResponse
} from "../types";
import { formatCurrency } from "../utils/format";
import { MobileAppGuideModal } from "../components/MobileAppGuideModal";
import { CreditCardInvoicesModal } from "../components/CreditCardInvoicesModal";
import { ContactStatementModal } from "../components/ContactStatementModal";
import { 
  Settings as SettingsIcon, Palette, Users, Cloud, 
  Sun, Moon, Eye, EyeOff, UserPlus, Trash2, ShieldCheck, 
  CheckCircle2, AlertCircle, RefreshCw, Upload, FileJson, 
  ExternalLink, Copy, Check, ArrowUpRight, ArrowDownRight, Key, HelpCircle,
  ShieldAlert, Lock, User as UserIcon, FileSpreadsheet, FolderTree,
  Package, CreditCard, Scale, Target, Smartphone, Database, Layers,
  Plus, Pencil, X, Loader2, Search, DollarSign, Calendar,
  Building2, Landmark, PiggyBank, Percent, ChevronLeft, ChevronRight,
  Info, Coins, Wallet, CircleDollarSign, ArrowUp, ArrowDown,
  HardDrive, Paperclip, BookOpen, QrCode, Banknote, FileText, ArrowRightLeft,
  FileCheck, Shield, Sparkles, Play, Pause, Ban, Repeat, History, FileDown, Server
} from "lucide-react";

export type SettingsTab = 
  | "CATEGORIAS" 
  | "ITENS" 
  | "CONTAS" 
  | "PAGAMENTOS"
  | "CARTOES"
  | "CONTATOS" 
  | "DIVIDAS" 
  | "ORCAMENTOS" 
  | "METAS"
  | "RECORRENCIAS"
  | "SYNC" 
  | "ANEXOS" 
  | "USUARIOS" 
  | "APARENCIA";

interface SettingsProps {
  initialTab?: SettingsTab;
}

export const Settings: React.FC<SettingsProps> = ({ initialTab = "CATEGORIAS" }) => {
  const { 
    profile, isDark, toggleTheme, hideValues, toggleHideValues, 
    loginTheme, setLoginTheme, syncStatus, refreshSyncStatus 
  } = useApp();
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);
  const [loading, setLoading] = useState(false);

  // ==========================================
  // 1. ESTADOS DE CATEGORIAS
  // ==========================================
  const [categories, setCategories] = useState<Category[]>([]);
  const [catName, setCatName] = useState("");
  const [catType, setCatType] = useState<"RECEITA" | "DESPESA">("DESPESA");
  const [catNature, setCatNature] = useState<"NENHUM" | "OBRIGATORIO" | "NECESSARIO" | "DESEJO">("NENHUM");
  const [catFilterType, setCatFilterType] = useState<"TODOS" | "RECEITA" | "DESPESA">("TODOS");
  const [catFilterNature, setCatFilterNature] = useState<string>("TODOS");
  const [creatingCat, setCreatingCat] = useState(false);

  // Modal de Edição de Categoria
  const [editModalCat, setEditModalCat] = useState<Category | null>(null);
  const [editCatName, setEditCatName] = useState("");
  const [editCatType, setEditCatType] = useState<"RECEITA" | "DESPESA">("DESPESA");
  const [editCatNature, setEditCatNature] = useState<"NENHUM" | "OBRIGATORIO" | "NECESSARIO" | "DESEJO">("NENHUM");
  const [editCatSaving, setEditCatSaving] = useState(false);
  const [editCatError, setEditCatError] = useState<string | null>(null);

  // ==========================================
  // 2. ESTADOS DE ITENS
  // ==========================================
  const [items, setItems] = useState<Item[]>([]);
  const [itemName, setItemName] = useState("");
  const [itemCatId, setItemCatId] = useState("");
  const [itemAmountStr, setItemAmountStr] = useState("");
  const [itemSearch, setItemSearch] = useState("");
  const [itemFilterCatId, setItemFilterCatId] = useState("TODAS");
  const [creatingItem, setCreatingItem] = useState(false);

  // Modal de Edição de Item
  const [editModalItem, setEditModalItem] = useState<Item | null>(null);
  const [editItemName, setEditItemName] = useState("");
  const [editItemCatId, setEditItemCatId] = useState("");
  const [editItemAmountStr, setEditItemAmountStr] = useState("");
  const [editItemSaving, setEditItemSaving] = useState(false);
  const [editItemError, setEditItemError] = useState<string | null>(null);

  // ==========================================
  // 3. ESTADOS DE CONTAS
  // ==========================================
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accName, setAccName] = useState("");
  const [accType, setAccType] = useState<AccountType>("CORRENTE");
  const [accSearch, setAccSearch] = useState("");
  const [accFilterType, setAccFilterType] = useState<string>("TODOS");
  const [creatingAcc, setCreatingAcc] = useState(false);

  // Modal de Edição de Conta
  const [editModalAcc, setEditModalAcc] = useState<Account | null>(null);
  const [editAccName, setEditAccName] = useState("");
  const [editAccType, setEditAccType] = useState<AccountType>("CORRENTE");
  const [editAccSaving, setEditAccSaving] = useState(false);
  const [editAccError, setEditAccError] = useState<string | null>(null);

  // ==========================================
  // 3.1 ESTADOS DE FORMAS DE PAGAMENTO
  // ==========================================
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [pmName, setPmName] = useState("");
  const [pmSearch, setPmSearch] = useState("");
  const [creatingPm, setCreatingPm] = useState(false);

  // Modal de Edição de Forma de Pagamento
  const [editModalPm, setEditModalPm] = useState<PaymentMethod | null>(null);
  const [editPmName, setEditPmName] = useState("");
  const [editPmSaving, setEditPmSaving] = useState(false);
  const [editPmError, setEditPmError] = useState<string | null>(null);

  // ==========================================
  // 3.2 ESTADOS DE CARTÕES DE CRÉDITO
  // ==========================================
  const [creditCards, setCreditCards] = useState<CreditCardType[]>([]);
  const [cardName, setCardName] = useState("");
  const [cardLimitStr, setCardLimitStr] = useState("");
  const [cardClosingDay, setCardClosingDay] = useState("20");
  const [cardDueDay, setCardDueDay] = useState("27");
  const [cardColor, setCardColor] = useState("emerald");
  const [cardBrand, setCardBrand] = useState("MASTERCARD");
  const [cardAccountId, setCardAccountId] = useState("");
  const [cardSearch, setCardSearch] = useState("");
  const [creatingCard, setCreatingCard] = useState(false);

  // Modal de Edição de Cartão
  const [editModalCard, setEditModalCard] = useState<CreditCardType | null>(null);
  const [editCardName, setEditCardName] = useState("");
  const [editCardLimitStr, setEditCardLimitStr] = useState("");
  const [editCardClosingDay, setEditCardClosingDay] = useState("20");
  const [editCardDueDay, setEditCardDueDay] = useState("27");
  const [editCardColor, setEditCardColor] = useState("emerald");
  const [editCardBrand, setEditCardBrand] = useState("MASTERCARD");
  const [editCardAccountId, setEditCardAccountId] = useState("");
  const [editCardSaving, setEditCardSaving] = useState(false);
  const [editCardError, setEditCardError] = useState<string | null>(null);

  // Modal de Faturas do Cartão
  const [invoicesModalCard, setInvoicesModalCard] = useState<CreditCardType | null>(null);

  // ==========================================
  // 4. ESTADOS DE CONTATOS
  // ==========================================
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [conName, setConName] = useState("");
  const [conType, setConType] = useState<"FORNECEDOR" | "CLIENTE" | "FUNCIONARIO" | "OUTRO">("FORNECEDOR");
  const [conDoc, setConDoc] = useState("");
  const [conNotes, setConNotes] = useState("");
  const [conSearch, setConSearch] = useState("");
  const [conFilterType, setConFilterType] = useState<string>("TODOS");
  const [creatingCon, setCreatingCon] = useState(false);

  // Modal de Edição de Contato
  const [editModalCon, setEditModalCon] = useState<Contact | null>(null);
  const [editConName, setEditConName] = useState("");
  const [editConType, setEditConType] = useState<"FORNECEDOR" | "CLIENTE" | "FUNCIONARIO" | "OUTRO">("FORNECEDOR");
  const [editConDoc, setEditConDoc] = useState("");
  const [editConNotes, setEditConNotes] = useState("");
  const [editConSaving, setEditConSaving] = useState(false);
  const [editConError, setEditConError] = useState<string | null>(null);

  // Modal de Extrato / Conta-Corrente do Contato
  const [statementModalContact, setStatementModalContact] = useState<Contact | null>(null);

  // ==========================================
  // 5. ESTADOS DE DÍVIDAS
  // ==========================================
  const [debts, setDebts] = useState<Debt[]>([]);
  const [debtTitle, setDebtTitle] = useState("");
  const [debtTotalStr, setDebtTotalStr] = useState("");
  const [debtDueDate, setDebtDueDate] = useState("");
  const [debtContactId, setDebtContactId] = useState("");
  const [creatingDebt, setCreatingDebt] = useState(false);

  // Modal de Amortização de Dívida
  const [amortizeModalDebt, setAmortizeModalDebt] = useState<Debt | null>(null);
  const [amortizeAmountStr, setAmortizeAmountStr] = useState("");
  const [amortizeSaving, setAmortizeSaving] = useState(false);
  const [amortizeError, setAmortizeError] = useState<string | null>(null);

  // ==========================================
  // 6. ESTADOS DE ORÇAMENTOS
  // ==========================================
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [budgetCatId, setBudgetCatId] = useState("");
  const [budgetLimitStr, setBudgetLimitStr] = useState("");
  const currentDate = new Date();
  const [budgetMonth, setBudgetMonth] = useState(currentDate.getMonth() + 1);
  const [budgetYear, setBudgetYear] = useState(currentDate.getFullYear());
  const [creatingBudget, setCreatingBudget] = useState(false);

  // Modal de Edição de Orçamento
  const [editModalBudget, setEditModalBudget] = useState<Budget | null>(null);
  const [editBudgetLimitStr, setEditBudgetLimitStr] = useState("");
  const [editBudgetSaving, setEditBudgetSaving] = useState(false);
  const [editBudgetError, setEditBudgetError] = useState<string | null>(null);

  // ==========================================
  // 6.1 ESTADOS DE METAS FINANCEIRAS
  // ==========================================
  const [goals, setGoals] = useState<Goal[]>([]);
  const [goalTitle, setGoalTitle] = useState("");
  const [goalTargetAmountStr, setGoalTargetAmountStr] = useState("");
  const [goalCurrentAmountStr, setGoalCurrentAmountStr] = useState("");
  const [goalTargetDate, setGoalTargetDate] = useState("");
  const [creatingGoal, setCreatingGoal] = useState(false);
  const [goalSearch, setGoalSearch] = useState("");
  const [goalStatusFilter, setGoalStatusFilter] = useState<string>("TODOS");

  // Modal de Edição de Meta
  const [editModalGoal, setEditModalGoal] = useState<Goal | null>(null);
  const [editGoalTitle, setEditGoalTitle] = useState("");
  const [editGoalTargetAmountStr, setEditGoalTargetAmountStr] = useState("");
  const [editGoalCurrentAmountStr, setEditGoalCurrentAmountStr] = useState("");
  const [editGoalTargetDate, setEditGoalTargetDate] = useState("");
  const [editGoalStatus, setEditGoalStatus] = useState<"EM_ANDAMENTO" | "CONCLUIDA" | "CANCELADA">("EM_ANDAMENTO");
  const [editGoalSaving, setEditGoalSaving] = useState(false);
  const [editGoalError, setEditGoalError] = useState<string | null>(null);

  // Modal de Aporte / Resgate de Meta
  const [contributeModalGoal, setContributeModalGoal] = useState<Goal | null>(null);
  const [contributeAmountStr, setContributeAmountStr] = useState("");
  const [contributeAction, setContributeAction] = useState<"APORTE" | "RESGATE">("APORTE");
  const [contributeSaving, setContributeSaving] = useState(false);
  const [contributeError, setContributeError] = useState<string | null>(null);

  // ==========================================
  // 6.2 ESTADOS DE ASSINATURAS & RECORRÊNCIAS
  // ==========================================
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [scheduleSearch, setScheduleSearch] = useState("");
  const [scheduleTypeFilter, setScheduleTypeFilter] = useState<string>("TODOS");
  const [scheduleStatusFilter, setScheduleStatusFilter] = useState<string>("TODOS");

  // Modal de Reajuste de Recorrência
  const [adjustModalSchedule, setAdjustModalSchedule] = useState<Schedule | null>(null);
  const [adjustAmountStr, setAdjustAmountStr] = useState("");
  const [adjustDueDay, setAdjustDueDay] = useState<number>(1);
  const [adjustDescription, setAdjustDescription] = useState("");
  const [adjustSaving, setAdjustSaving] = useState(false);
  const [adjustError, setAdjustError] = useState<string | null>(null);

  // ==========================================
  // 7. ESTADOS DE SINCRONIZAÇÃO MOBILE & API
  // ==========================================
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);
  const [loadingSyncLogs, setLoadingSyncLogs] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [testingApi, setTestingApi] = useState(false);
  const [clearingLogs, setClearingLogs] = useState(false);
  const [customDirInput, setCustomDirInput] = useState("");
  const [migrateFilesCheckbox, setMigrateFilesCheckbox] = useState(true);
  const [savingCustomDir, setSavingCustomDir] = useState(false);
  const [resettingCustomDir, setResettingCustomDir] = useState(false);
  const [attachmentStats, setAttachmentStats] = useState<AttachmentStats | null>(null);
  const [systemStats, setSystemStats] = useState<SystemStatsResponse | null>(null);
  const [downloadingBackup, setDownloadingBackup] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<{ type: "success" | "error"; message: string; details?: string } | null>(null);
  const [copiedApiUrl, setCopiedApiUrl] = useState<string | null>(null);

  // ==========================================
  // 8. ESTADOS DE USUÁRIOS
  // ==========================================
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<"ADMIN" | "USER">("USER");
  const [creatingUser, setCreatingUser] = useState(false);
  const [userFeedback, setUserFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  // ==========================================
  // ESTADO DE NAVEGAÇÃO DA SIDEBAR
  // ==========================================
  const [tabSearch, setTabSearch] = useState("");

  // ==========================================
  // CARREGAMENTO DE DADOS CONFORME ABA ATIVA
  // ==========================================
  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === "CATEGORIAS") {
        const res = await api.get("/categories", { params: { profile } });
        setCategories(res.data);
      } else if (activeTab === "ITENS") {
        const [itemsRes, catRes] = await Promise.all([
          api.get("/items", { params: { profile } }),
          api.get("/categories", { params: { profile } }),
        ]);
        setItems(itemsRes.data);
        setCategories(catRes.data);
        if (catRes.data.length > 0 && !itemCatId) {
          setItemCatId(catRes.data[0].id);
        }
      } else if (activeTab === "CONTAS") {
        const res = await api.get("/accounts", { params: { profile } });
        setAccounts(res.data);
      } else if (activeTab === "PAGAMENTOS") {
        const res = await api.get("/payment-methods", { params: { profile } });
        setPaymentMethods(res.data);
      } else if (activeTab === "CARTOES") {
        const [cardsRes, accsRes] = await Promise.all([
          api.get("/credit-cards", { params: { profile } }),
          api.get("/accounts", { params: { profile } }),
        ]);
        setCreditCards(cardsRes.data);
        setAccounts(accsRes.data);
      } else if (activeTab === "CONTATOS") {
        const res = await api.get("/contacts", { params: { profile } });
        setContacts(res.data);
      } else if (activeTab === "DIVIDAS") {
        const [debtRes, conRes] = await Promise.all([
          api.get("/debts", { params: { profile } }),
          api.get("/contacts", { params: { profile } }),
        ]);
        setDebts(debtRes.data);
        setContacts(conRes.data);
      } else if (activeTab === "ORCAMENTOS") {
        const [budRes, catRes] = await Promise.all([
          api.get("/budgets", { params: { profile, month: budgetMonth, year: budgetYear } }),
          api.get("/categories", { params: { profile, type: "DESPESA" } }),
        ]);
        setBudgets(budRes.data);
        setCategories(catRes.data);
        if (catRes.data.length > 0 && !budgetCatId) {
          setBudgetCatId(catRes.data[0].id);
        }
      } else if (activeTab === "METAS") {
        const res = await api.get("/goals", { params: { profile } });
        setGoals(res.data);
      } else if (activeTab === "RECORRENCIAS") {
        const res = await api.get("/schedules", { params: { profile } });
        setSchedules(res.data);
      } else if (activeTab === "USUARIOS") {
        setLoadingUsers(true);
        const res = await api.get<User[]>("/auth/users");
        setUsers(res.data);
        setLoadingUsers(false);
      } else if (activeTab === "SYNC") {
        setLoadingSyncLogs(true);
        const logRes = await api.get<SyncLog[]>("/sync/logs");
        setSyncLogs(logRes.data);
        setLoadingSyncLogs(false);
      } else if (activeTab === "ANEXOS") {
        try {
          const [attRes, sysRes] = await Promise.all([
            api.get<AttachmentStats>("/attachments/stats", { params: { profile } }),
            api.get<SystemStatsResponse>("/system/stats")
          ]);
          setAttachmentStats(attRes.data);
          setSystemStats(sysRes.data);
          if (attRes.data.active_directory) {
            setCustomDirInput(attRes.data.active_directory);
          }
        } catch (err) {
          console.error("Erro ao carregar estatísticas de armazenamento:", err);
        }
      }
    } catch (err) {
      console.error("Erro ao carregar dados em Configurações:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [profile, activeTab, budgetMonth, budgetYear]);

  // ==========================================
  // LISTAS ORDENADAS EM ORDEM ALFABÉTICA (A a Z)
  // ==========================================
  const sortedCategories = useMemo(() => {
    return [...categories].sort((a, b) => a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" }));
  }, [categories]);

  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" }));
  }, [items]);

  const sortedAccounts = useMemo(() => {
    return [...accounts].sort((a, b) => a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" }));
  }, [accounts]);

  const sortedPaymentMethods = useMemo(() => {
    return [...paymentMethods].sort((a, b) => a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" }));
  }, [paymentMethods]);

  const sortedCreditCards = useMemo(() => {
    return [...creditCards].sort((a, b) => a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" }));
  }, [creditCards]);

  const sortedContacts = useMemo(() => {
    return [...contacts].sort((a, b) => a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" }));
  }, [contacts]);

  const sortedDebts = useMemo(() => {
    return [...debts].sort((a, b) => a.title.localeCompare(b.title, "pt-BR", { sensitivity: "base" }));
  }, [debts]);

  const sortedBudgets = useMemo(() => {
    return [...budgets].sort((a, b) => (a.category_name || "").localeCompare(b.category_name || "", "pt-BR", { sensitivity: "base" }));
  }, [budgets]);

  const sortedGoals = useMemo(() => {
    let list = [...goals];
    if (goalSearch.trim()) {
      const q = goalSearch.toLowerCase();
      list = list.filter((g) => g.title.toLowerCase().includes(q));
    }
    if (goalStatusFilter !== "TODOS") {
      list = list.filter((g) => g.status === goalStatusFilter);
    }
    return list.sort((a, b) => a.title.localeCompare(b.title, "pt-BR", { sensitivity: "base" }));
  }, [goals, goalSearch, goalStatusFilter]);

  const sortedSchedules = useMemo(() => {
    let list = [...schedules];
    if (scheduleSearch.trim()) {
      const q = scheduleSearch.toLowerCase();
      list = list.filter((s) => 
        s.description.toLowerCase().includes(q) || 
        (s.category_name || "").toLowerCase().includes(q) ||
        (s.contact_name || "").toLowerCase().includes(q)
      );
    }
    if (scheduleTypeFilter !== "TODOS") {
      list = list.filter((s) => s.schedule_type === scheduleTypeFilter);
    }
    if (scheduleStatusFilter !== "TODOS") {
      list = list.filter((s) => s.status === scheduleStatusFilter);
    }
    return list.sort((a, b) => a.description.localeCompare(b.description, "pt-BR", { sensitivity: "base" }));
  }, [schedules, scheduleSearch, scheduleTypeFilter, scheduleStatusFilter]);

  const sortedUsers = useMemo(() => {
    return [...users].sort((a, b) => a.username.localeCompare(b.username, "pt-BR", { sensitivity: "base" }));
  }, [users]);

  // ==========================================
  // HANDLERS: CATEGORIAS
  // ==========================================
  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) return;
    setCreatingCat(true);
    try {
      await api.post("/categories", {
        profile,
        name: catName.trim(),
        type: catType,
        nature: catNature,
      });
      setCatName("");
      setCatNature("NENHUM");
      loadData();
    } catch (err: any) {
      console.error("Erro ao criar categoria:", err);
      alert(err.response?.data?.detail || "Erro ao criar categoria.");
    } finally {
      setCreatingCat(false);
    }
  };

  const openEditCategory = (cat: Category) => {
    setEditModalCat(cat);
    setEditCatName(cat.name);
    setEditCatType(cat.type);
    setEditCatNature(cat.nature);
    setEditCatError(null);
    setEditCatSaving(false);
  };

  const closeEditCategory = () => {
    setEditModalCat(null);
    setEditCatError(null);
  };

  const handleSaveEditCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editModalCat || !editCatName.trim()) return;
    setEditCatSaving(true);
    setEditCatError(null);
    try {
      await api.put(`/categories/${editModalCat.id}`, {
        name: editCatName.trim(),
        type: editCatType,
        nature: editCatNature,
      });
      setEditModalCat(null);
      loadData();
    } catch (err: any) {
      console.error("Erro ao editar categoria:", err);
      setEditCatError(err.response?.data?.detail || "Erro ao salvar alterações na categoria.");
    } finally {
      setEditCatSaving(false);
    }
  };

  // ==========================================
  // HANDLERS: ITENS
  // ==========================================
  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName.trim() || !itemCatId) return;
    setCreatingItem(true);
    try {
      const defaultAmount = itemAmountStr.trim()
        ? Math.round(parseFloat(itemAmountStr.replace(",", ".")) * 100)
        : null;

      await api.post("/items", {
        profile,
        category_id: itemCatId,
        name: itemName.trim(),
        default_amount_cents: defaultAmount,
      });
      setItemName("");
      setItemAmountStr("");
      loadData();
    } catch (err: any) {
      console.error("Erro ao criar item:", err);
      alert(err.response?.data?.detail || "Erro ao criar item.");
    } finally {
      setCreatingItem(false);
    }
  };

  const openEditItem = (item: Item) => {
    setEditModalItem(item);
    setEditItemName(item.name);
    setEditItemCatId(item.category_id);
    setEditItemAmountStr(item.default_amount_cents ? (item.default_amount_cents / 100).toFixed(2).replace(".", ",") : "");
    setEditItemError(null);
    setEditItemSaving(false);
  };

  const closeEditItem = () => {
    setEditModalItem(null);
    setEditItemError(null);
  };

  const handleSaveEditItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editModalItem || !editItemName.trim() || !editItemCatId) return;
    setEditItemSaving(true);
    setEditItemError(null);
    try {
      const defaultAmount = editItemAmountStr.trim()
        ? Math.round(parseFloat(editItemAmountStr.replace(",", ".")) * 100)
        : null;

      await api.put(`/items/${editModalItem.id}`, {
        name: editItemName.trim(),
        category_id: editItemCatId,
        default_amount_cents: defaultAmount,
      });
      setEditModalItem(null);
      loadData();
    } catch (err: any) {
      console.error("Erro ao editar item:", err);
      setEditItemError(err.response?.data?.detail || "Erro ao salvar alterações no item.");
    } finally {
      setEditItemSaving(false);
    }
  };

  // ==========================================
  // HANDLERS: CONTAS
  // ==========================================
  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accName.trim()) return;
    setCreatingAcc(true);
    try {
      await api.post("/accounts", {
        profile,
        name: accName.trim(),
        type: accType,
      });
      setAccName("");
      setAccType("CORRENTE");
      loadData();
    } catch (err: any) {
      console.error("Erro ao criar conta:", err);
      alert(err.response?.data?.detail || "Erro ao criar conta.");
    } finally {
      setCreatingAcc(false);
    }
  };

  const openEditAccount = (acc: Account) => {
    setEditModalAcc(acc);
    setEditAccName(acc.name);
    setEditAccType(acc.type);
    setEditAccError(null);
    setEditAccSaving(false);
  };

  const closeEditAccount = () => {
    setEditModalAcc(null);
    setEditAccError(null);
  };

  const handleSaveEditAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editModalAcc || !editAccName.trim()) return;
    setEditAccSaving(true);
    setEditAccError(null);
    try {
      await api.put(`/accounts/${editModalAcc.id}`, {
        name: editAccName.trim(),
        type: editAccType,
      });
      setEditModalAcc(null);
      loadData();
    } catch (err: any) {
      console.error("Erro ao editar conta:", err);
      setEditAccError(err.response?.data?.detail || "Erro ao salvar alterações na conta.");
    } finally {
      setEditAccSaving(false);
    }
  };

  // ==========================================
  // HANDLERS: FORMAS DE PAGAMENTO
  // ==========================================
  const handleCreatePaymentMethod = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pmName.trim()) return;
    setCreatingPm(true);
    try {
      await api.post("/payment-methods", {
        profile,
        name: pmName.trim(),
      });
      setPmName("");
      loadData();
    } catch (err: any) {
      console.error("Erro ao criar forma de pagamento:", err);
      alert(err.response?.data?.detail || "Erro ao criar forma de pagamento.");
    } finally {
      setCreatingPm(false);
    }
  };

  const openEditPaymentMethod = (pm: PaymentMethod) => {
    setEditModalPm(pm);
    setEditPmName(pm.name);
    setEditPmError(null);
    setEditPmSaving(false);
  };

  const closeEditPaymentMethod = () => {
    setEditModalPm(null);
    setEditPmError(null);
  };

  const handleSaveEditPaymentMethod = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editModalPm || !editPmName.trim()) return;
    setEditPmSaving(true);
    setEditPmError(null);
    try {
      await api.put(`/payment-methods/${editModalPm.id}`, {
        name: editPmName.trim(),
      });
      setEditModalPm(null);
      loadData();
    } catch (err: any) {
      console.error("Erro ao editar forma de pagamento:", err);
      setEditPmError(err.response?.data?.detail || "Erro ao salvar alterações na forma de pagamento.");
    } finally {
      setEditPmSaving(false);
    }
  };

  // ==========================================
  // HANDLERS: CARTÕES DE CRÉDITO
  // ==========================================
  const handleCreateCreditCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardName.trim() || !cardLimitStr.trim()) return;
    setCreatingCard(true);
    try {
      const cleanLimit = cardLimitStr.replace(/\./g, "").replace(",", ".");
      const limitCents = Math.round(parseFloat(cleanLimit) * 100);
      if (isNaN(limitCents) || limitCents <= 0) {
        alert("Informe um limite válido maior que zero.");
        setCreatingCard(false);
        return;
      }

      await api.post("/credit-cards", {
        profile,
        name: cardName.trim(),
        limit_cents: limitCents,
        closing_day: parseInt(cardClosingDay, 10),
        due_day: parseInt(cardDueDay, 10),
        color: cardColor,
        brand: cardBrand,
        account_id: cardAccountId || null,
      });

      setCardName("");
      setCardLimitStr("");
      setCardAccountId("");
      loadData();
    } catch (err: any) {
      console.error("Erro ao cadastrar cartão de crédito:", err);
      alert(err.response?.data?.detail || "Erro ao cadastrar cartão de crédito.");
    } finally {
      setCreatingCard(false);
    }
  };

  const openEditCreditCard = (c: CreditCardType) => {
    setEditModalCard(c);
    setEditCardName(c.name);
    setEditCardLimitStr((c.limit_cents / 100).toFixed(2).replace(".", ","));
    setEditCardClosingDay(String(c.closing_day));
    setEditCardDueDay(String(c.due_day));
    setEditCardColor(c.color || "emerald");
    setEditCardBrand(c.brand || "MASTERCARD");
    setEditCardAccountId(c.account_id || "");
    setEditCardError(null);
    setEditCardSaving(false);
  };

  const closeEditCreditCard = () => {
    setEditModalCard(null);
    setEditCardError(null);
  };

  const handleSaveEditCreditCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editModalCard || !editCardName.trim() || !editCardLimitStr.trim()) return;
    setEditCardSaving(true);
    setEditCardError(null);
    try {
      const cleanLimit = editCardLimitStr.replace(/\./g, "").replace(",", ".");
      const limitCents = Math.round(parseFloat(cleanLimit) * 100);
      if (isNaN(limitCents) || limitCents <= 0) {
        setEditCardError("Informe um limite válido maior que zero.");
        setEditCardSaving(false);
        return;
      }

      await api.put(`/credit-cards/${editModalCard.id}`, {
        name: editCardName.trim(),
        limit_cents: limitCents,
        closing_day: parseInt(editCardClosingDay, 10),
        due_day: parseInt(editCardDueDay, 10),
        color: editCardColor,
        brand: editCardBrand,
        account_id: editCardAccountId || null,
      });

      setEditModalCard(null);
      loadData();
    } catch (err: any) {
      console.error("Erro ao editar cartão de crédito:", err);
      setEditCardError(err.response?.data?.detail || "Erro ao salvar alterações no cartão.");
    } finally {
      setEditCardSaving(false);
    }
  };

  // ==========================================
  // HANDLERS: CONTATOS
  // ==========================================
  const handleCreateContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!conName.trim()) return;
    setCreatingCon(true);
    try {
      await api.post("/contacts", {
        profile,
        name: conName.trim(),
        type: conType,
        document: conDoc.trim() || null,
        notes: conNotes.trim() || null,
      });
      setConName("");
      setConDoc("");
      setConNotes("");
      loadData();
    } catch (err: any) {
      console.error("Erro ao criar contato:", err);
      alert(err.response?.data?.detail || "Erro ao criar contato.");
    } finally {
      setCreatingCon(false);
    }
  };

  const openEditContact = (con: Contact) => {
    setEditModalCon(con);
    setEditConName(con.name);
    setEditConType(con.type);
    setEditConDoc(con.document || "");
    setEditConNotes(con.notes || "");
    setEditConError(null);
    setEditConSaving(false);
  };

  const closeEditContact = () => {
    setEditModalCon(null);
    setEditConError(null);
  };

  const handleSaveEditContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editModalCon || !editConName.trim()) return;
    setEditConSaving(true);
    setEditConError(null);
    try {
      await api.put(`/contacts/${editModalCon.id}`, {
        name: editConName.trim(),
        type: editConType,
        document: editConDoc.trim() || null,
        notes: editConNotes.trim() || null,
      });
      setEditModalCon(null);
      loadData();
    } catch (err: any) {
      console.error("Erro ao editar contato:", err);
      setEditConError(err.response?.data?.detail || "Erro ao salvar alterações no contato.");
    } finally {
      setEditConSaving(false);
    }
  };

  // ==========================================
  // HANDLERS: DÍVIDAS
  // ==========================================
  const handleCreateDebt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!debtTitle.trim() || !debtTotalStr.trim()) return;
    setCreatingDebt(true);
    try {
      const totalCents = Math.round(parseFloat(debtTotalStr.replace(",", ".")) * 100);
      await api.post("/debts", {
        profile,
        title: debtTitle.trim(),
        total_amount_cents: totalCents,
        contact_id: debtContactId || null,
        due_date: debtDueDate || null,
      });
      setDebtTitle("");
      setDebtTotalStr("");
      setDebtDueDate("");
      setDebtContactId("");
      loadData();
    } catch (err: any) {
      console.error("Erro ao criar dívida:", err);
      alert(err.response?.data?.detail || "Erro ao criar dívida.");
    } finally {
      setCreatingDebt(false);
    }
  };

  const openAmortizeDebt = (debt: Debt) => {
    setAmortizeModalDebt(debt);
    setAmortizeAmountStr("");
    setAmortizeError(null);
    setAmortizeSaving(false);
  };

  const closeAmortizeDebt = () => {
    setAmortizeModalDebt(null);
    setAmortizeError(null);
  };

  const handleSaveAmortizeDebt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amortizeModalDebt || !amortizeAmountStr.trim()) return;
    setAmortizeSaving(true);
    setAmortizeError(null);
    try {
      const amountCents = Math.round(parseFloat(amortizeAmountStr.replace(",", ".")) * 100);
      await api.post(`/debts/${amortizeModalDebt.id}/amortize`, {
        amount_cents: amountCents,
      });
      setAmortizeModalDebt(null);
      loadData();
    } catch (err: any) {
      console.error("Erro ao amortizar dívida:", err);
      setAmortizeError(err.response?.data?.detail || "Erro ao registrar amortização.");
    } finally {
      setAmortizeSaving(false);
    }
  };

  // ==========================================
  // HANDLERS: ORÇAMENTOS
  // ==========================================
  const handleCreateBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!budgetCatId || !budgetLimitStr.trim()) return;
    setCreatingBudget(true);
    try {
      const limitCents = Math.round(parseFloat(budgetLimitStr.replace(",", ".")) * 100);
      await api.post("/budgets", {
        profile,
        category_id: budgetCatId,
        month: budgetMonth,
        year: budgetYear,
        limit_amount_cents: limitCents,
      });
      setBudgetLimitStr("");
      loadData();
    } catch (err: any) {
      console.error("Erro ao definir orçamento:", err);
      alert(err.response?.data?.detail || "Erro ao definir orçamento.");
    } finally {
      setCreatingBudget(false);
    }
  };

  const openEditBudget = (b: Budget) => {
    setEditModalBudget(b);
    setEditBudgetLimitStr((b.limit_amount_cents / 100).toFixed(2).replace(".", ","));
    setEditBudgetError(null);
    setEditBudgetSaving(false);
  };

  const closeEditBudget = () => {
    setEditModalBudget(null);
    setEditBudgetError(null);
  };

  const handleSaveEditBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editModalBudget || !editBudgetLimitStr.trim()) return;
    setEditBudgetSaving(true);
    setEditBudgetError(null);
    try {
      const limitCents = Math.round(parseFloat(editBudgetLimitStr.replace(",", ".")) * 100);
      await api.put(`/budgets/${editModalBudget.id}`, {
        limit_amount_cents: limitCents,
      });
      setEditModalBudget(null);
      loadData();
    } catch (err: any) {
      console.error("Erro ao atualizar orçamento:", err);
      setEditBudgetError(err.response?.data?.detail || "Erro ao atualizar teto de orçamento.");
    } finally {
      setEditBudgetSaving(false);
    }
  };

  // ==========================================
  // HANDLERS: METAS FINANCEIRAS
  // ==========================================
  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!goalTitle.trim() || !goalTargetAmountStr.trim()) return;
    setCreatingGoal(true);
    try {
      const targetCents = Math.round(parseFloat(goalTargetAmountStr.replace(",", ".")) * 100);
      const currentCents = goalCurrentAmountStr.trim() ? Math.round(parseFloat(goalCurrentAmountStr.replace(",", ".")) * 100) : 0;
      await api.post("/goals", {
        profile,
        title: goalTitle.trim(),
        target_amount_cents: targetCents,
        current_amount_cents: currentCents,
        target_date: goalTargetDate || null,
      });
      setGoalTitle("");
      setGoalTargetAmountStr("");
      setGoalCurrentAmountStr("");
      setGoalTargetDate("");
      loadData();
    } catch (err: any) {
      console.error("Erro ao criar meta:", err);
      alert(err.response?.data?.detail || "Erro ao criar meta.");
    } finally {
      setCreatingGoal(false);
    }
  };

  const openEditGoal = (g: Goal) => {
    setEditModalGoal(g);
    setEditGoalTitle(g.title);
    setEditGoalTargetAmountStr((g.target_amount_cents / 100).toFixed(2).replace(".", ","));
    setEditGoalCurrentAmountStr((g.current_amount_cents / 100).toFixed(2).replace(".", ","));
    setEditGoalTargetDate(g.target_date || "");
    setEditGoalStatus(g.status);
    setEditGoalError(null);
    setEditGoalSaving(false);
  };

  const closeEditGoal = () => {
    setEditModalGoal(null);
    setEditGoalError(null);
  };

  const handleSaveEditGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editModalGoal || !editGoalTitle.trim() || !editGoalTargetAmountStr.trim()) return;
    setEditGoalSaving(true);
    setEditGoalError(null);
    try {
      const targetCents = Math.round(parseFloat(editGoalTargetAmountStr.replace(",", ".")) * 100);
      const currentCents = editGoalCurrentAmountStr.trim() ? Math.round(parseFloat(editGoalCurrentAmountStr.replace(",", ".")) * 100) : 0;
      await api.put(`/goals/${editModalGoal.id}`, {
        title: editGoalTitle.trim(),
        target_amount_cents: targetCents,
        current_amount_cents: currentCents,
        target_date: editGoalTargetDate || null,
        status: editGoalStatus,
      });
      setEditModalGoal(null);
      loadData();
    } catch (err: any) {
      console.error("Erro ao atualizar meta:", err);
      setEditGoalError(err.response?.data?.detail || "Erro ao atualizar meta.");
    } finally {
      setEditGoalSaving(false);
    }
  };

  const openContributeGoal = (g: Goal) => {
    setContributeModalGoal(g);
    setContributeAmountStr("");
    setContributeAction("APORTE");
    setContributeError(null);
    setContributeSaving(false);
  };

  const closeContributeGoal = () => {
    setContributeModalGoal(null);
    setContributeError(null);
  };

  const handleSaveContributeGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contributeModalGoal || !contributeAmountStr.trim()) return;
    setContributeSaving(true);
    setContributeError(null);
    try {
      const amountCents = Math.round(parseFloat(contributeAmountStr.replace(",", ".")) * 100);
      await api.post(`/goals/${contributeModalGoal.id}/contribute`, {
        amount_cents: amountCents,
        action: contributeAction,
      });
      setContributeModalGoal(null);
      loadData();
    } catch (err: any) {
      console.error("Erro ao registrar aporte:", err);
      setContributeError(err.response?.data?.detail || "Erro ao registrar aporte/resgate.");
    } finally {
      setContributeSaving(false);
    }
  };

  const handleDeleteGoal = async (id: string) => {
    if (!confirm("Deseja realmente excluir esta meta financeira?")) return;
    try {
      await api.delete(`/goals/${id}`);
      loadData();
    } catch (err: any) {
      console.error("Erro ao excluir meta:", err);
      alert(err.response?.data?.detail || "Erro ao excluir meta.");
    }
  };

  // ==========================================
  // HANDLERS: ASSINATURAS & RECORRÊNCIAS
  // ==========================================
  const openAdjustSchedule = (s: Schedule) => {
    setAdjustModalSchedule(s);
    setAdjustAmountStr((s.amount_cents / 100).toFixed(2).replace(".", ","));
    setAdjustDueDay(s.due_day);
    setAdjustDescription(s.description);
    setAdjustError(null);
    setAdjustSaving(false);
  };

  const closeAdjustSchedule = () => {
    setAdjustModalSchedule(null);
    setAdjustError(null);
  };

  const handleSaveAdjustSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustModalSchedule || !adjustAmountStr.trim()) return;
    setAdjustSaving(true);
    setAdjustError(null);
    try {
      const amountCents = Math.round(parseFloat(adjustAmountStr.replace(",", ".")) * 100);
      await api.post(`/schedules/${adjustModalSchedule.id}/adjust`, {
        new_amount_cents: amountCents,
        new_due_day: adjustDueDay,
        new_description: adjustDescription.trim() || undefined,
      });
      setAdjustModalSchedule(null);
      loadData();
    } catch (err: any) {
      console.error("Erro ao reajustar plano:", err);
      setAdjustError(err.response?.data?.detail || "Erro ao reajustar lançamentos futuros.");
    } finally {
      setAdjustSaving(false);
    }
  };

  const handleScheduleAction = async (id: string, action: "PAUSAR" | "REATIVAR" | "CANCELAR") => {
    const promptMap = {
      PAUSAR: "Deseja pausar esta assinatura/recorrência?",
      REATIVAR: "Deseja reativar esta assinatura/recorrência?",
      CANCELAR: "Atenção: Cancelar este contrato removerá todos os lançamentos futuros pendentes, mas manterá intacto o histórico do que já foi pago. Confirmar cancelamento?",
    };
    if (!confirm(promptMap[action])) return;
    try {
      await api.post(`/schedules/${id}/action`, { action });
      loadData();
    } catch (err: any) {
      console.error("Erro ao alterar status da recorrência:", err);
      alert(err.response?.data?.detail || "Erro ao executar ação.");
    }
  };

  const handleDeleteSchedule = async (id: string) => {
    if (!confirm("Deseja excluir definitivamente esta assinatura e seus lançamentos futuros?")) return;
    try {
      await api.delete(`/schedules/${id}`);
      loadData();
    } catch (err: any) {
      console.error("Erro ao excluir plano:", err);
      alert(err.response?.data?.detail || "Erro ao excluir plano.");
    }
  };

  // ==========================================
  // HANDLER GENÉRICO DE EXCLUSÃO
  // ==========================================
  const handleDeleteItem = async (endpoint: string, id: string) => {
    if (!window.confirm("Deseja realmente excluir este cadastro?")) return;
    try {
      await api.delete(`/${endpoint}/${id}`);
      loadData();
    } catch (err: any) {
      console.error("Erro ao excluir:", err);
      alert(err.response?.data?.detail || "Erro ao excluir registro.");
    }
  };

  // ==========================================
  // HANDLERS: USUÁRIOS
  // ==========================================
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserFeedback(null);
    setCreatingUser(true);
    try {
      await api.post("/auth/register", {
        username: newUsername.trim(),
        password: newPassword,
      });
      setUserFeedback({
        type: "success",
        message: `Usuário "${newUsername}" cadastrado com sucesso!`,
      });
      setNewUsername("");
      setNewPassword("");
      loadData();
    } catch (err: any) {
      setUserFeedback({
        type: "error",
        message: err.response?.data?.detail || "Erro ao cadastrar usuário.",
      });
    } finally {
      setCreatingUser(false);
    }
  };

  const handleDeleteUser = async (user: User) => {
    if (!window.confirm(`Tem certeza que deseja excluir o usuário "${user.username}"?`)) return;
    try {
      await api.delete(`/auth/users/${user.id}`);
      setUserFeedback({
        type: "success",
        message: `Usuário "${user.username}" excluído com sucesso!`,
      });
      loadData();
    } catch (err: any) {
      setUserFeedback({
        type: "error",
        message: err.response?.data?.detail || "Erro ao excluir usuário.",
      });
    }
  };

  // ==========================================
  // HANDLERS: SINCRONIZAÇÃO MOBILE & API REST
  // ==========================================
  const handleTestApiConnection = async () => {
    setTestingApi(true);
    setSyncFeedback(null);
    try {
      await refreshSyncStatus();
      const logsRes = await api.get<SyncLog[]>("/sync/logs");
      setSyncLogs(logsRes.data);
      setSyncFeedback({
        type: "success",
        message: "API REST operacional e respondendo perfeitamente! Banco SQLite WAL ativo.",
      });
    } catch (err: any) {
      setSyncFeedback({
        type: "error",
        message: err.response?.data?.detail || "Falha ao conectar com a API REST.",
      });
    } finally {
      setTestingApi(false);
    }
  };

  const handleClearSyncLogs = async () => {
    if (!window.confirm("Deseja realmente limpar o histórico de logs de sincronização?")) return;
    setClearingLogs(true);
    try {
      await api.delete("/sync/logs");
      setSyncLogs([]);
      setSyncFeedback({
        type: "success",
        message: "Histórico de logs de sincronização limpo com sucesso!",
      });
    } catch (err: any) {
      setSyncFeedback({
        type: "error",
        message: err.response?.data?.detail || "Erro ao limpar logs de sincronização.",
      });
    } finally {
      setClearingLogs(false);
    }
  };

  const handleCopyApiUrl = (url: string, label: string) => {
    navigator.clipboard.writeText(url);
    setCopiedApiUrl(label);
    setTimeout(() => setCopiedApiUrl(null), 2500);
  };

  const handleSaveStorageDir = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customDirInput.trim()) return;

    setSavingCustomDir(true);
    setSyncFeedback(null);
    try {
      const res = await api.post<StorageDirectoryConfigResponse>("/attachments/storage-dir", {
        directory_path: customDirInput.trim(),
        migrate_existing: migrateFilesCheckbox,
      });
      setSyncFeedback({
        type: "success",
        message: res.data.message || "Diretório de armazenamento configurado com sucesso!",
        details: res.data.migrated_count > 0 ? `${res.data.migrated_count} comprovante(s) migrado(s) para o novo diretório.` : undefined,
      });
      loadData();
      await refreshSyncStatus(true);
    } catch (err: any) {
      setSyncFeedback({
        type: "error",
        message: err.response?.data?.detail || "Erro ao configurar diretório de armazenamento.",
      });
    } finally {
      setSavingCustomDir(false);
    }
  };

  const handleResetStorageDir = async () => {
    if (!confirm("Deseja realmente restaurar o diretório de armazenamento para o padrão original do Wallet?")) return;
    setResettingCustomDir(true);
    try {
      const res = await api.post<StorageDirectoryConfigResponse>("/attachments/storage-dir/reset");
      setCustomDirInput(res.data.active_directory);
      setSyncFeedback({
        type: "success",
        message: "Diretório de armazenamento restaurado para o padrão original.",
      });
      loadData();
    } catch (err: any) {
      setSyncFeedback({
        type: "error",
        message: err.response?.data?.detail || "Erro ao restaurar diretório padrão.",
      });
    } finally {
      setResettingCustomDir(false);
    }
  };


  // ==========================================
  // HELPERS DE FORMATAÇÃO E ESTILO
  // ==========================================
  const getNatureStyle = (nature: string) => {
    switch (nature) {
      case "OBRIGATORIO": return "bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-700/70";
      case "NECESSARIO": return "bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-700/70";
      case "DESEJO": return "bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-700/70";
      default: return "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700";
    }
  };

  const getNatureLabel = (nature: string) => {
    switch (nature) {
      case "OBRIGATORIO": return "Obrigatório";
      case "NECESSARIO": return "Necessário";
      case "DESEJO": return "Desejo";
      default: return "Nenhum";
    }
  };

  const getAccountTypeIcon = (type: AccountType) => {
    switch (type) {
      case "CORRENTE": return <Landmark className="w-4 h-4 text-emerald-500" />;
      case "POUPANCA": return <PiggyBank className="w-4 h-4 text-amber-500" />;
      case "INVESTIMENTO": return <CircleDollarSign className="w-4 h-4 text-indigo-500" />;
      case "CAIXA": return <Wallet className="w-4 h-4 text-blue-500" />;
      default: return <CreditCard className="w-4 h-4 text-zinc-400" />;
    }
  };

  const getAccountTypeLabel = (type: AccountType) => {
    switch (type) {
      case "CORRENTE": return "Conta Corrente";
      case "POUPANCA": return "Poupança";
      case "INVESTIMENTO": return "Investimento";
      case "CAIXA": return "Carteira / Caixa Físico";
      default: return "Outro";
    }
  };

  const getPaymentMethodIcon = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes("pix")) return QrCode;
    if (n.includes("boleto")) return FileText;
    if (n.includes("dinheiro") || n.includes("físico") || n.includes("fisico") || n.includes("especie")) return Banknote;
    if (n.includes("debito") || n.includes("débito") || n.includes("crédito") || n.includes("credito") || n.includes("cartão") || n.includes("cartao")) return CreditCard;
    if (n.includes("transferência") || n.includes("transferencia") || n.includes("ted") || n.includes("doc")) return ArrowRightLeft;
    return CreditCard;
  };

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

  const monthNames = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  // Configuração das 10 Abas Agrupadas por Domínio
  interface SettingsTabItem {
    id: SettingsTab;
    label: string;
    shortDescription: string;
    icon: React.ComponentType<{ className?: string }>;
  }

  interface SettingsGroup {
    id: string;
    title: string;
    tabs: SettingsTabItem[];
  }

  const SETTINGS_GROUPS: SettingsGroup[] = [
    {
      id: "financeiro",
      title: "Cadastros Financeiros",
      tabs: [
        { id: "CATEGORIAS", label: "Categorias", shortDescription: "Classificação & essencialidade", icon: FolderTree },
        { id: "ITENS", label: "Itens Rápidos", shortDescription: "Valores padrão sugeridos", icon: Package },
        { id: "CONTAS", label: "Contas & Carteiras", shortDescription: "Bancos e caixas", icon: Landmark },
        { id: "PAGAMENTOS", label: "Formas de Pagamento", shortDescription: "Pix, cartões, dinheiro e boletos", icon: CreditCard },
        { id: "CARTOES", label: "Cartões de Crédito", shortDescription: "Limites, faturas e fechamento", icon: CreditCard },
        { id: "CONTATOS", label: "Contatos", shortDescription: "Clientes e fornecedores", icon: Users },
        { id: "DIVIDAS", label: "Dívidas & Passivos", shortDescription: "Controle e amortização", icon: Scale },
        { id: "ORCAMENTOS", label: "Orçamentos Mensais", shortDescription: "Tetos e limites por categoria", icon: PiggyBank },
        { id: "METAS", label: "Metas Financeiras", shortDescription: "Objetivos, reservas e aportes", icon: Target },
        { id: "RECORRENCIAS", label: "Assinaturas & Recorrências", shortDescription: "Contratos contínuos e parcelamentos", icon: RefreshCw },
      ],
    },
    {
      id: "integracao",
      title: "Dados & Arquivos",
      tabs: [
        { id: "SYNC", label: "App Mobile & API", shortDescription: "Conexão REST & Offline-First", icon: Smartphone },
        { id: "ANEXOS", label: "Comprovantes & Backups", shortDescription: "Download de .ZIP, disco e arquivos", icon: HardDrive },
      ],
    },
    {
      id: "sistema",
      title: "Sistema & Preferências",
      tabs: [
        { id: "USUARIOS", label: "Gestão de Usuários", shortDescription: "Acesso e permissões", icon: ShieldCheck },
        { id: "APARENCIA", label: "Aparência & Temas", shortDescription: "Cores e modo escuro", icon: Palette },
      ],
    },
  ];

  const filteredGroups = useMemo(() => {
    if (!tabSearch.trim()) return SETTINGS_GROUPS;
    const q = tabSearch.toLowerCase();
    return SETTINGS_GROUPS.map((group) => ({
      ...group,
      tabs: group.tabs.filter(
        (t) =>
          t.label.toLowerCase().includes(q) ||
          t.shortDescription.toLowerCase().includes(q)
      ),
    })).filter((group) => group.tabs.length > 0);
  }, [tabSearch]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header da Página */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight flex items-center gap-2">
            <SettingsIcon className="w-5 h-5 text-emerald-500" />
            <span>Configurações &amp; Cadastros</span>
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Painel unificado de cadastros mestres, metas orçamentárias, sincronização e preferências ({profile})
          </p>
        </div>

        {/* Indicador de Perfil Ativo */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm self-start sm:self-auto">
          <Building2 className="w-3.5 h-3.5 text-zinc-400" />
          <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
            Perfil Atual: <strong>{profile}</strong>
          </span>
        </div>
      </div>

      {/* Seletor Mobile / Telas Pequenas (< 1024px) */}
      <div className="block lg:hidden bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-3.5 shadow-sm space-y-1.5">
        <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
          Selecione a Configuração
        </label>
        <select
          value={activeTab}
          onChange={(e) => setActiveTab(e.target.value as SettingsTab)}
          className="w-full px-3.5 py-2.5 text-xs font-bold bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-emerald-500"
        >
          {SETTINGS_GROUPS.map((group) => (
            <optgroup key={group.id} label={group.title}>
              {group.tabs.map((tab) => (
                <option key={tab.id} value={tab.id}>
                  {tab.label} — {tab.shortDescription}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      {/* Grid Principal: Sidebar Fixa (Desktop) + Conteúdo Ativo */}
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] xl:grid-cols-[300px_1fr] items-start gap-6 xl:gap-8">
        {/* Sidebar Desktop */}
        <aside className="hidden lg:block bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-4 shadow-sm space-y-4 sticky top-6">
          {/* Campo de Busca Rápida */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar aba ou ajuste..."
              value={tabSearch}
              onChange={(e) => setTabSearch(e.target.value)}
              className="w-full pl-8 pr-7 py-2 text-xs bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:border-emerald-500 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 transition-all"
            />
            {tabSearch && (
              <button
                type="button"
                onClick={() => setTabSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Lista de Grupos e Abas */}
          <nav className="space-y-4 max-h-[calc(100vh-210px)] overflow-y-auto pr-1">
            {filteredGroups.map((group) => (
              <div key={group.id} className="space-y-1">
                <h4 className="px-2.5 text-[10px] font-extrabold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                  {group.title}
                </h4>
                <div className="space-y-0.5">
                  {group.tabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveTab(tab.id)}
                        className={`w-full text-left flex items-center justify-between px-3 py-2 rounded-xl transition-all ${
                          isActive
                            ? "bg-emerald-600 text-white font-bold shadow-md shadow-emerald-600/20"
                            : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-white" : "text-zinc-400"}`} />
                          <div className="min-w-0">
                            <p className="text-xs truncate">{tab.label}</p>
                            <p className={`text-[10px] truncate font-normal ${isActive ? "text-emerald-100" : "text-zinc-400"}`}>
                              {tab.shortDescription}
                            </p>
                          </div>
                        </div>
                        {isActive && (
                          <div className="w-1.5 h-1.5 rounded-full bg-white shrink-0 ml-1.5" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            {filteredGroups.length === 0 && (
              <div className="p-4 text-center text-xs text-zinc-400">
                Nenhuma configuração encontrada para "{tabSearch}".
              </div>
            )}
          </nav>
        </aside>

        {/* Conteúdo da Aba Ativa */}
        <main className="min-w-0">

      {/* ========================================== */}
      {/* ABA 1: CATEGORIAS                          */}
      {/* ========================================== */}
      {activeTab === "CATEGORIAS" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
          {/* Form de Criação */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-500" />
                <span>Nova Categoria</span>
              </h3>
            </div>

            <form onSubmit={handleCreateCategory} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Nome da Categoria
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Alimentação, Moradia, Salário, Freelas..."
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:border-emerald-500 text-zinc-900 dark:text-zinc-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Tipo de Fluxo
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCatType("DESPESA")}
                    className={`py-2 text-xs font-bold rounded-lg border transition-all ${
                      catType === "DESPESA"
                        ? "border-rose-600 bg-rose-50 dark:bg-rose-950/40 text-rose-600 shadow-sm"
                        : "border-zinc-200 dark:border-zinc-700 text-zinc-500"
                    }`}
                  >
                    Despesa
                  </button>
                  <button
                    type="button"
                    onClick={() => setCatType("RECEITA")}
                    className={`py-2 text-xs font-bold rounded-lg border transition-all ${
                      catType === "RECEITA"
                        ? "border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 shadow-sm"
                        : "border-zinc-200 dark:border-zinc-700 text-zinc-500"
                    }`}
                  >
                    Receita
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Natureza da Categoria
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setCatNature("NENHUM")}
                    className={`px-2.5 py-1.5 text-[11px] font-bold rounded-lg border text-left transition-all ${
                      catNature === "NENHUM"
                        ? "border-zinc-800 bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-sm"
                        : "border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/30"
                    }`}
                  >
                    Nenhum
                  </button>
                  <button
                    type="button"
                    onClick={() => setCatNature("OBRIGATORIO")}
                    className={`px-2.5 py-1.5 text-[11px] font-bold rounded-lg border text-left transition-all ${
                      catNature === "OBRIGATORIO"
                        ? "border-amber-500 bg-amber-500 text-white shadow-sm"
                        : "border-amber-200 dark:border-amber-900/60 text-amber-700 dark:text-amber-300 bg-amber-50/50 dark:bg-amber-950/20"
                    }`}
                  >
                    Obrigatório
                  </button>
                  <button
                    type="button"
                    onClick={() => setCatNature("NECESSARIO")}
                    className={`px-2.5 py-1.5 text-[11px] font-bold rounded-lg border text-left transition-all ${
                      catNature === "NECESSARIO"
                        ? "border-blue-500 bg-blue-500 text-white shadow-sm"
                        : "border-blue-200 dark:border-blue-900/60 text-blue-700 dark:text-blue-300 bg-blue-50/50 dark:bg-blue-950/20"
                    }`}
                  >
                    Necessário
                  </button>
                  <button
                    type="button"
                    onClick={() => setCatNature("DESEJO")}
                    className={`px-2.5 py-1.5 text-[11px] font-bold rounded-lg border text-left transition-all ${
                      catNature === "DESEJO"
                        ? "border-purple-500 bg-purple-500 text-white shadow-sm"
                        : "border-purple-200 dark:border-purple-900/60 text-purple-700 dark:text-purple-300 bg-purple-50/50 dark:bg-purple-950/20"
                    }`}
                  >
                    Desejo
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={creatingCat}
                className="w-full py-2.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-1.5"
              >
                {creatingCat ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Cadastrando...</span>
                  </>
                ) : (
                  <span>Cadastrar Categoria</span>
                )}
              </button>
            </form>
          </div>

          {/* Listagem de Categorias (Ordenada A a Z) */}
          <div className="lg:col-span-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  Categorias Cadastradas
                </h3>
                <p className="text-xs text-zinc-400">
                  {sortedCategories.length} categorias em ordem alfabética (A a Z) • {profile}
                </p>
              </div>

              {/* Filtros */}
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={catFilterType}
                  onChange={(e: any) => setCatFilterType(e.target.value)}
                  className="px-2.5 py-1 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-700 dark:text-zinc-300 font-medium"
                >
                  <option value="TODOS">Todos os Fluxos</option>
                  <option value="DESPESA">Apenas Despesas</option>
                  <option value="RECEITA">Apenas Receitas</option>
                </select>

                <select
                  value={catFilterNature}
                  onChange={(e) => setCatFilterNature(e.target.value)}
                  className="px-2.5 py-1 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-700 dark:text-zinc-300 font-medium"
                >
                  <option value="TODOS">Todas as Naturezas</option>
                  <option value="OBRIGATORIO">Obrigatório</option>
                  <option value="NECESSARIO">Necessário</option>
                  <option value="DESEJO">Desejo</option>
                  <option value="NENHUM">Nenhum</option>
                </select>
              </div>
            </div>

            {sortedCategories.length === 0 ? (
              <div className="p-8 text-center text-xs text-zinc-500">
                Nenhuma categoria cadastrada.
              </div>
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-2.5 max-h-[600px] overflow-y-auto pr-1">
                {sortedCategories
                  .filter((c) => catFilterType === "TODOS" || c.type === catFilterType)
                  .filter((c) => catFilterNature === "TODOS" || c.nature === catFilterNature)
                  .map((cat) => (
                    <div
                      key={cat.id}
                      className="flex items-center justify-between p-3 rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700 shadow-sm transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <span className={`p-1.5 rounded-xl text-xs font-bold shadow-sm ${
                          cat.type === "RECEITA"
                            ? "bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60"
                            : "bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60"
                        }`}>
                          {cat.type === "RECEITA" ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                        </span>

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                              {cat.name}
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getNatureStyle(cat.nature)}`}>
                              {getNatureLabel(cat.nature)}
                            </span>
                          </div>
                          <span className="text-[10px] text-zinc-400 font-mono">
                            {cat.type === "RECEITA" ? "Receita" : "Despesa"} • {items.filter(it => it.category_id === cat.id).length} item(ns)
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveTab("ITENS");
                            setItemCatId(cat.id);
                          }}
                          className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50/70 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-950/80 border border-emerald-200/80 dark:border-emerald-800/60 rounded-lg transition-all"
                          title="Criar Item nesta Categoria"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Item</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => openEditCategory(cat)}
                          className="p-1.5 text-zinc-400 hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-950/40 rounded-lg transition-all"
                          title="Editar Categoria"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleDeleteItem("categories", cat.id)}
                          className="p-1.5 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-all"
                          title="Excluir Categoria"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* ABA 2: ITENS                               */}
      {/* ========================================== */}
      {activeTab === "ITENS" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
          {/* Form */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-500" />
                <span>Novo Item</span>
              </h3>
            </div>

            <form onSubmit={handleCreateItem} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Nome do Item
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Aluguel Residencial, Netflix, Supermercado..."
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:border-emerald-500 text-zinc-900 dark:text-zinc-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Categoria Vinculada
                </label>
                <select
                  required
                  value={itemCatId}
                  onChange={(e) => setItemCatId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:border-emerald-500 text-zinc-900 dark:text-zinc-100"
                >
                  {sortedCategories.length === 0 && <option value="">Nenhuma categoria cadastrada</option>}
                  {sortedCategories.map((c) => {
                    const getNat = (n?: string) => (n && n !== "NENHUM" ? ` [${n.charAt(0) + n.slice(1).toLowerCase()}]` : "");
                    return (
                      <option key={c.id} value={c.id}>
                        {c.name}{getNat(c.nature)} ({c.type})
                      </option>
                    );
                  })}
                </select>
                <p className="text-[10px] text-zinc-400 mt-1">
                  Selecione a categoria à qual este item pertence.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Valor Padrão Sugerido (R$ - Opcional)
                </label>
                <input
                  type="text"
                  placeholder="0,00"
                  value={itemAmountStr}
                  onChange={(e) => setItemAmountStr(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:border-emerald-500 font-mono text-zinc-900 dark:text-zinc-100"
                />
                <p className="text-[10px] text-zinc-400 mt-1">
                  Se preenchido, esse valor será sugerido automaticamente ao selecionar o item nos lançamentos.
                </p>
              </div>

              <button
                type="submit"
                disabled={creatingItem}
                className="w-full py-2.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg shadow-md shadow-emerald-600/20 transition-all mt-2"
              >
                Cadastrar Item
              </button>
            </form>
          </div>

          {/* Listagem de Itens (Ordenada A a Z) */}
          <div className="lg:col-span-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  Itens Cadastrados
                </h3>
                <p className="text-xs text-zinc-400">
                  {sortedItems.length} itens em ordem alfabética (A a Z) • {profile}
                </p>
              </div>

              {/* Filtros e Busca */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-2" />
                  <input
                    type="text"
                    placeholder="Buscar item..."
                    value={itemSearch}
                    onChange={(e) => setItemSearch(e.target.value)}
                    className="pl-8 pr-2.5 py-1 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-700 dark:text-zinc-300 w-36 sm:w-44 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <select
                  value={itemFilterCatId}
                  onChange={(e) => setItemFilterCatId(e.target.value)}
                  className="px-2.5 py-1 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-700 dark:text-zinc-300 max-w-[160px] truncate font-medium"
                >
                  <option value="TODAS">Todas as Categorias</option>
                  {sortedCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.type})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {sortedItems.length === 0 ? (
              <div className="p-8 text-center text-xs text-zinc-500">
                Nenhum item cadastrado ainda.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3 gap-2.5 max-h-[600px] overflow-y-auto pr-1">
                {sortedItems
                  .filter((item) => {
                    if (itemFilterCatId !== "TODAS" && item.category_id !== itemFilterCatId) return false;
                    if (itemSearch.trim()) {
                      const q = itemSearch.toLowerCase();
                      const matchName = item.name.toLowerCase().includes(q);
                      const matchCat = item.category_name?.toLowerCase().includes(q) || false;
                      return matchName || matchCat;
                    }
                    return true;
                  })
                  .map((item) => (
                    <div
                      key={item.id}
                      className="p-3 rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/90 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all shadow-sm flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className={`p-1 rounded-md text-[10px] font-bold ${
                            item.category_type === "RECEITA"
                              ? "bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300"
                              : "bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300"
                          }`}>
                            {item.category_type === "RECEITA" ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                          </span>

                          <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate" title={item.name}>
                            {item.name}
                          </h4>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-zinc-400">
                          <span>
                            {item.category_name || "Categoria"}
                          </span>
                          {item.category_nature && (
                            <span className={`text-[9px] font-semibold px-1.5 py-0.2 rounded-full border ${getNatureStyle(item.category_nature)}`}>
                              {getNatureLabel(item.category_nature)}
                            </span>
                          )}
                        </div>

                        {item.default_amount_cents && item.default_amount_cents > 0 ? (
                          <p className="text-[11px] font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                            Padrão: {hideValues ? "••••••" : formatCurrency(item.default_amount_cents)}
                          </p>
                        ) : null}
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => openEditItem(item)}
                          className="p-1.5 text-zinc-400 hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-950/40 rounded-lg transition-all"
                          title="Editar Item"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleDeleteItem("items", item.id)}
                          className="p-1.5 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-all"
                          title="Excluir Item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* ABA 3: CONTAS E CARTEIRAS                  */}
      {/* ========================================== */}
      {activeTab === "CONTAS" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
          {/* Form */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-500" />
                <span>Nova Conta / Carteira</span>
              </h3>
            </div>

            <form onSubmit={handleCreateAccount} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Nome da Instituição / Carteira
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Nubank, Itaú PJ, Carteira Dinheiro, XP..."
                  value={accName}
                  onChange={(e) => setAccName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:border-emerald-500 text-zinc-900 dark:text-zinc-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Modalidade / Tipo
                </label>
                <select
                  value={accType}
                  onChange={(e) => setAccType(e.target.value as AccountType)}
                  className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:border-emerald-500 text-zinc-900 dark:text-zinc-100 font-medium"
                >
                  <option value="CORRENTE">Conta Corrente</option>
                  <option value="POUPANCA">Poupança</option>
                  <option value="INVESTIMENTO">Investimento / Aplicação</option>
                  <option value="CAIXA">Carteira / Caixa Físico</option>
                  <option value="OUTRO">Outro</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={creatingAcc}
                className="w-full py-2.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-1.5"
              >
                {creatingAcc ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Cadastrando...</span>
                  </>
                ) : (
                  <span>Cadastrar Conta</span>
                )}
              </button>
            </form>
          </div>

          {/* Listagem de Contas (Ordenada A a Z) */}
          <div className="lg:col-span-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  Contas & Carteiras Cadastradas
                </h3>
                <p className="text-xs text-zinc-400">
                  {sortedAccounts.length} contas em ordem alfabética (A a Z) • {profile}
                </p>
              </div>

              {/* Filtros e Busca */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-2" />
                  <input
                    type="text"
                    placeholder="Buscar conta..."
                    value={accSearch}
                    onChange={(e) => setAccSearch(e.target.value)}
                    className="pl-8 pr-2.5 py-1 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-700 dark:text-zinc-300 w-36 sm:w-44 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <select
                  value={accFilterType}
                  onChange={(e) => setAccFilterType(e.target.value)}
                  className="px-2.5 py-1 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-700 dark:text-zinc-300 font-medium"
                >
                  <option value="TODOS">Todas Modalidades</option>
                  <option value="CORRENTE">Conta Corrente</option>
                  <option value="POUPANCA">Poupança</option>
                  <option value="INVESTIMENTO">Investimento</option>
                  <option value="CAIXA">Caixa Físico</option>
                  <option value="OUTRO">Outro</option>
                </select>
              </div>
            </div>

            {sortedAccounts.length === 0 ? (
              <div className="p-8 text-center text-xs text-zinc-500">
                Nenhuma conta bancária cadastrada.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3 gap-3 max-h-[600px] overflow-y-auto pr-1">
                {sortedAccounts
                  .filter((acc) => {
                    if (accFilterType !== "TODOS" && acc.type !== accFilterType) return false;
                    if (accSearch.trim()) {
                      return acc.name.toLowerCase().includes(accSearch.toLowerCase());
                    }
                    return true;
                  })
                  .map((acc) => (
                    <div
                      key={acc.id}
                      className="p-3.5 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700 shadow-sm transition-all flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/70 dark:border-zinc-700/60 shrink-0">
                          {getAccountTypeIcon(acc.type)}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate" title={acc.name}>
                            {acc.name}
                          </h4>
                          <span className="text-[11px] text-zinc-400 block truncate">
                            {getAccountTypeLabel(acc.type)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => openEditAccount(acc)}
                          className="p-1.5 text-zinc-400 hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-950/40 rounded-lg transition-all"
                          title="Editar Conta"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleDeleteItem("accounts", acc.id)}
                          className="p-1.5 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-all"
                          title="Excluir Conta"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* ABA 3.1: FORMAS DE PAGAMENTO               */}
      {/* ========================================== */}
      {activeTab === "PAGAMENTOS" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
          {/* Form */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-500" />
                <span>Nova Forma de Pagamento</span>
              </h3>
            </div>

            <form onSubmit={handleCreatePaymentMethod} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Nome da Forma / Meio
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Pix, Boleto, Cartão XP, Dinheiro..."
                  value={pmName}
                  onChange={(e) => setPmName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:border-emerald-500 text-zinc-900 dark:text-zinc-100"
                />
                <p className="text-[11px] text-zinc-400 mt-1">
                  Meio utilizado para pagar ou receber (separado da instituição bancária).
                </p>
              </div>

              <button
                type="submit"
                disabled={creatingPm}
                className="w-full py-2.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-1.5"
              >
                {creatingPm ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Cadastrando...</span>
                  </>
                ) : (
                  <span>Cadastrar Forma de Pagamento</span>
                )}
              </button>
            </form>
          </div>

          {/* Listagem de Formas de Pagamento (Ordenada A a Z) */}
          <div className="lg:col-span-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  Formas de Pagamento Cadastradas
                </h3>
                <p className="text-xs text-zinc-400">
                  {sortedPaymentMethods.length} formas em ordem alfabética (A a Z) • {profile}
                </p>
              </div>

              {/* Filtros e Busca */}
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-2" />
                  <input
                    type="text"
                    placeholder="Buscar forma..."
                    value={pmSearch}
                    onChange={(e) => setPmSearch(e.target.value)}
                    className="pl-8 pr-2.5 py-1 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-700 dark:text-zinc-300 w-36 sm:w-48 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>

            {sortedPaymentMethods.length === 0 ? (
              <div className="p-8 text-center text-xs text-zinc-500">
                Nenhuma forma de pagamento cadastrada.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3 gap-3 max-h-[600px] overflow-y-auto pr-1">
                {sortedPaymentMethods
                  .filter((pm) => {
                    if (pmSearch.trim()) {
                      return pm.name.toLowerCase().includes(pmSearch.toLowerCase());
                    }
                    return true;
                  })
                  .map((pm) => {
                    const PmIcon = getPaymentMethodIcon(pm.name);
                    return (
                      <div
                        key={pm.id}
                        className="p-3.5 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700 shadow-sm transition-all flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200/70 dark:border-emerald-800/60 shrink-0">
                            <PmIcon className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate" title={pm.name}>
                              {pm.name}
                            </h4>
                            <span className="text-[11px] text-zinc-400 block truncate">
                              Forma de Pagamento
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => openEditPaymentMethod(pm)}
                            className="p-1.5 text-zinc-400 hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-950/40 rounded-lg transition-all"
                            title="Editar Forma de Pagamento"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleDeleteItem("payment-methods", pm.id)}
                            className="p-1.5 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-all"
                            title="Excluir Forma de Pagamento"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* ABA 3.2: CARTÕES DE CRÉDITO                */}
      {/* ========================================== */}
      {activeTab === "CARTOES" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
          {/* Form */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-500" />
                <span>Novo Cartão de Crédito</span>
              </h3>
            </div>

            <form onSubmit={handleCreateCreditCard} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Nome do Cartão
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Nubank Ultravioleta, Itaú Visa..."
                  value={cardName}
                  onChange={(e) => setCardName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:border-emerald-500 text-zinc-900 dark:text-zinc-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Limite Total (R$)
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: 5000,00"
                  value={cardLimitStr}
                  onChange={(e) => setCardLimitStr(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:border-emerald-500 text-zinc-900 dark:text-zinc-100 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1" title="Melhor dia de compra / corte">
                    Dia Fechamento (1-31)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    required
                    value={cardClosingDay}
                    onChange={(e) => setCardClosingDay(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:border-emerald-500 text-zinc-900 dark:text-zinc-100 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1" title="Dia do vencimento da fatura">
                    Dia Vencimento (1-31)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    required
                    value={cardDueDay}
                    onChange={(e) => setCardDueDay(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:border-emerald-500 text-zinc-900 dark:text-zinc-100 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Bandeira
                  </label>
                  <select
                    value={cardBrand}
                    onChange={(e) => setCardBrand(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:border-emerald-500 text-zinc-900 dark:text-zinc-100"
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
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Tema Visual
                  </label>
                  <select
                    value={cardColor}
                    onChange={(e) => setCardColor(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:border-emerald-500 text-zinc-900 dark:text-zinc-100 font-medium"
                  >
                    <option value="emerald">Emerald (Verde)</option>
                    <option value="purple">Purple (Roxo / Nubank)</option>
                    <option value="indigo">Indigo (Azul Escuro)</option>
                    <option value="rose">Rose (Vermelho)</option>
                    <option value="amber">Amber (Dourado / Laranja)</option>
                    <option value="sky">Sky (Azul Claro)</option>
                    <option value="zinc">Zinc (Black / Escuro)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Conta Débito Padrão (Opcional)
                </label>
                <select
                  value={cardAccountId}
                  onChange={(e) => setCardAccountId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:border-emerald-500 text-zinc-900 dark:text-zinc-100"
                >
                  <option value="">Nenhuma (Selecionar no pagamento)</option>
                  {[...accounts]
                    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" }))
                    .map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} ({acc.type})
                      </option>
                    ))}
                </select>
              </div>

              <button
                type="submit"
                disabled={creatingCard}
                className="w-full py-2.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-1.5"
              >
                {creatingCard ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Cadastrando...</span>
                  </>
                ) : (
                  <span>Cadastrar Cartão de Crédito</span>
                )}
              </button>
            </form>
          </div>

          {/* Listagem de Cartões de Crédito (Cards Virtuais) */}
          <div className="lg:col-span-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  Cartões de Crédito Cadastrados
                </h3>
                <p className="text-xs text-zinc-400">
                  {sortedCreditCards.length} cartões • Limites e faturas gerenciadas • {profile}
                </p>
              </div>

              {/* Filtros e Busca */}
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-2" />
                  <input
                    type="text"
                    placeholder="Buscar cartão..."
                    value={cardSearch}
                    onChange={(e) => setCardSearch(e.target.value)}
                    className="pl-8 pr-2.5 py-1 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-700 dark:text-zinc-300 w-36 sm:w-48 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>

            {sortedCreditCards.length === 0 ? (
              <div className="p-8 text-center text-xs text-zinc-500">
                Nenhum cartão de crédito cadastrado.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[600px] overflow-y-auto pr-1">
                {sortedCreditCards
                  .filter((c) => {
                    if (cardSearch.trim()) {
                      return c.name.toLowerCase().includes(cardSearch.toLowerCase());
                    }
                    return true;
                  })
                  .map((c) => {
                    const usedPct = c.limit_cents > 0 
                      ? Math.min(100, Math.round((c.used_limit_cents / c.limit_cents) * 100))
                      : 0;

                    return (
                      <div
                        key={c.id}
                        className="rounded-3xl border border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/40 dark:bg-zinc-900/50 p-4 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-3"
                      >
                        {/* Virtual Card Front */}
                        <div className={`p-4 rounded-2xl bg-gradient-to-br ${getCardThemeClasses(c.color)} border shadow-lg relative overflow-hidden flex flex-col justify-between h-36`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <CreditCard className="w-4 h-4 text-white/80" />
                              <span className="text-xs font-bold tracking-wider uppercase text-white truncate max-w-[150px]">
                                {c.name}
                              </span>
                            </div>
                            <span className="text-[10px] font-mono font-extrabold px-2 py-0.5 rounded bg-white/10 text-white border border-white/15">
                              {c.brand || "CARTÃO"}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-white">
                            <div>
                              <span className="text-[10px] text-white/60 block font-medium">Limite Total</span>
                              <span className="text-sm font-mono font-extrabold block truncate">
                                {formatCurrency(c.limit_cents, hideValues)}
                              </span>
                            </div>
                            <div className="text-right">
                              <span className="text-[10px] text-white/60 block font-medium">Disponível</span>
                              <span className="text-sm font-mono font-extrabold text-emerald-300 block truncate">
                                {formatCurrency(c.available_limit_cents, hideValues)}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-[11px] text-white/80 border-t border-white/10 pt-1.5 font-medium">
                            <span>Melhor Dia: <strong>{c.closing_day}</strong></span>
                            <span>Vence: <strong>{c.due_day}</strong></span>
                          </div>
                        </div>

                        {/* Limit Progress and Info */}
                        <div className="space-y-1.5 px-1">
                          <div className="flex items-center justify-between text-[11px] font-medium text-zinc-500">
                            <span>Uso do Limite:</span>
                            <span className="font-mono font-bold text-zinc-700 dark:text-zinc-300">
                              {usedPct}% ({formatCurrency(c.used_limit_cents, hideValues)})
                            </span>
                          </div>

                          <div className="w-full h-2 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                            <div 
                              className={`h-full transition-all duration-500 rounded-full ${
                                usedPct > 85 ? "bg-rose-500" : usedPct > 60 ? "bg-amber-500" : "bg-emerald-500"
                              }`}
                              style={{ width: `${usedPct}%` }}
                            />
                          </div>

                          {c.account_name && (
                            <p className="text-[11px] text-zinc-400 truncate flex items-center gap-1 pt-0.5">
                              <Landmark className="w-3 h-3 text-zinc-400" />
                              <span>Débito em: {c.account_name}</span>
                            </p>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-between gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                          <button
                            type="button"
                            onClick={() => setInvoicesModalCard(c)}
                            className="px-3 py-1.5 text-xs font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800/80 rounded-xl transition-all flex items-center gap-1.5"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>Ver Faturas</span>
                          </button>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => openEditCreditCard(c)}
                              className="p-1.5 text-zinc-400 hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-950/40 rounded-lg transition-all"
                              title="Editar Cartão"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => handleDeleteItem("credit-cards", c.id)}
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
            )}
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* ABA 4: CONTATOS & FAVORECIDOS              */}
      {/* ========================================== */}
      {activeTab === "CONTATOS" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
          {/* Form */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-500" />
                <span>Novo Contato</span>
              </h3>
            </div>

            <form onSubmit={handleCreateContact} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Nome do Contato
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: João da Silva, Locatário XP, Enel..."
                  value={conName}
                  onChange={(e) => setConName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:border-emerald-500 text-zinc-900 dark:text-zinc-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Tipo de Relação
                </label>
                <select
                  value={conType}
                  onChange={(e: any) => setConType(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:border-emerald-500 text-zinc-900 dark:text-zinc-100 font-medium"
                >
                  <option value="FORNECEDOR">Fornecedor / Prestador</option>
                  <option value="CLIENTE">Cliente / Pagador</option>
                  <option value="FUNCIONARIO">Colaborador / Equipe</option>
                  <option value="OUTRO">Outro / Geral</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  CPF / CNPJ (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="000.000.000-00 ou 00.000.000/0001-00"
                  value={conDoc}
                  onChange={(e) => setConDoc(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:border-emerald-500 text-zinc-900 dark:text-zinc-100 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Anotações / Chave PIX (Opcional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Chave PIX, dados bancários, telefone..."
                  value={conNotes}
                  onChange={(e) => setConNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:border-emerald-500 text-zinc-900 dark:text-zinc-100 resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={creatingCon}
                className="w-full py-2.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-1.5"
              >
                {creatingCon ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Cadastrando...</span>
                  </>
                ) : (
                  <span>Cadastrar Contato</span>
                )}
              </button>
            </form>
          </div>

          {/* Listagem de Contatos (Ordenada A a Z) */}
          <div className="lg:col-span-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  Contatos & Favorecidos
                </h3>
                <p className="text-xs text-zinc-400">
                  {sortedContacts.length} contatos em ordem alfabética (A a Z) • {profile}
                </p>
              </div>

              {/* Filtros e Busca */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-2" />
                  <input
                    type="text"
                    placeholder="Buscar contato..."
                    value={conSearch}
                    onChange={(e) => setConSearch(e.target.value)}
                    className="pl-8 pr-2.5 py-1 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-700 dark:text-zinc-300 w-36 sm:w-44 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <select
                  value={conFilterType}
                  onChange={(e) => setConFilterType(e.target.value)}
                  className="px-2.5 py-1 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-700 dark:text-zinc-300 font-medium"
                >
                  <option value="TODOS">Todos os Tipos</option>
                  <option value="FORNECEDOR">Fornecedores</option>
                  <option value="CLIENTE">Clientes</option>
                  <option value="FUNCIONARIO">Funcionários</option>
                  <option value="OUTRO">Outros</option>
                </select>
              </div>
            </div>

            {sortedContacts.length === 0 ? (
              <div className="p-8 text-center text-xs text-zinc-500">
                Nenhum contato cadastrado.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 max-h-[620px] overflow-y-auto pr-1">
                {sortedContacts
                  .filter((c) => {
                    if (conFilterType !== "TODOS" && c.type !== conFilterType) return false;
                    if (conSearch.trim()) {
                      const q = conSearch.toLowerCase();
                      return c.name.toLowerCase().includes(q) || (c.document && c.document.includes(q));
                    }
                    return true;
                  })
                  .map((con) => {
                    const typeBadgeClass = 
                      con.type === "FORNECEDOR"
                        ? "bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800"
                        : con.type === "CLIENTE"
                        ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                        : con.type === "FUNCIONARIO"
                        ? "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800"
                        : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700";

                    return (
                      <div
                        key={con.id}
                        className="p-4 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700 shadow-sm transition-all flex flex-col justify-between space-y-3"
                      >
                        {/* Header: Avatar + Full Name + Type Badge */}
                        <div className="space-y-2">
                          <div className="flex items-start gap-3">
                            <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/60 shrink-0 mt-0.5 shadow-sm">
                              <UserIcon className="w-4 h-4" />
                            </div>
                            
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-2">
                                <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 leading-snug break-words" title={con.name}>
                                  {con.name}
                                </h4>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${typeBadgeClass}`}>
                                  {con.type}
                                </span>
                              </div>

                              {con.document && (
                                <p className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 mt-1 flex items-center gap-1">
                                  <span className="font-semibold text-zinc-400">Doc:</span> {con.document}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Notes / PIX / Phone */}
                          {con.notes && (
                            <div className="pt-1.5 border-t border-zinc-100 dark:border-zinc-800/60">
                              <p className="text-[11px] text-zinc-600 dark:text-zinc-400 line-clamp-2 italic bg-zinc-50 dark:bg-zinc-800/40 p-2 rounded-xl border border-zinc-100 dark:border-zinc-800">
                                "{con.notes}"
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Action Footer */}
                        <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-zinc-100 dark:border-zinc-800">
                          <button
                            type="button"
                            onClick={() => setStatementModalContact(con)}
                            className="px-3 py-1.5 text-xs font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800/80 rounded-xl transition-all flex items-center gap-1.5"
                            title="Abrir Extrato / Conta-Corrente do Contato"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>Extrato</span>
                          </button>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => openEditContact(con)}
                              className="p-1.5 text-zinc-400 hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-950/40 rounded-lg transition-all"
                              title="Editar Contato"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => handleDeleteItem("contacts", con.id)}
                              className="p-1.5 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-all"
                              title="Excluir Contato"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* ABA 5: DÍVIDAS & PASSIVOS                  */}
      {/* ========================================== */}
      {activeTab === "DIVIDAS" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
          {/* Form */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-500" />
                <span>Nova Dívida / Passivo</span>
              </h3>
            </div>

            <form onSubmit={handleCreateDebt} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Título da Dívida
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Empréstimo Bancário, Financiamento Carro..."
                  value={debtTitle}
                  onChange={(e) => setDebtTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:border-emerald-500 text-zinc-900 dark:text-zinc-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Valor Total do Passivo (R$)
                </label>
                <input
                  type="text"
                  required
                  placeholder="0,00"
                  value={debtTotalStr}
                  onChange={(e) => setDebtTotalStr(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:border-emerald-500 font-mono text-zinc-900 dark:text-zinc-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Credor / Contato Vinculado (Opcional)
                </label>
                <select
                  value={debtContactId}
                  onChange={(e) => setDebtContactId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:border-emerald-500 text-zinc-900 dark:text-zinc-100 font-medium"
                >
                  <option value="">[Nenhum Credor Selecionado]</option>
                  {sortedContacts.map((con) => (
                    <option key={con.id} value={con.id}>
                      {con.name} ({con.type})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Data de Vencimento Final (Opcional)
                </label>
                <input
                  type="date"
                  value={debtDueDate}
                  onChange={(e) => setDebtDueDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:border-emerald-500 text-zinc-900 dark:text-zinc-100"
                />
              </div>

              <button
                type="submit"
                disabled={creatingDebt}
                className="w-full py-2.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-1.5"
              >
                {creatingDebt ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Cadastrando...</span>
                  </>
                ) : (
                  <span>Cadastrar Dívida</span>
                )}
              </button>
            </form>
          </div>

          {/* Listagem de Dívidas (Ordenada A a Z) */}
          <div className="lg:col-span-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                Acompanhamento de Passivos & Amortizações
              </h3>
              <p className="text-xs text-zinc-400">
                {sortedDebts.length} dívidas em ordem alfabética (A a Z) • {profile}
              </p>
            </div>

            {sortedDebts.length === 0 ? (
              <div className="p-8 text-center text-xs text-zinc-500">
                Nenhuma dívida registrada.
              </div>
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-3.5 max-h-[600px] overflow-y-auto pr-1">
                {sortedDebts.map((debt) => {
                  const paid = debt.total_amount_cents - debt.remaining_amount_cents;
                  const pct = Math.min(100, Math.round((paid / debt.total_amount_cents) * 100));

                  return (
                    <div
                      key={debt.id}
                      className="p-4 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 shadow-sm space-y-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                              {debt.title}
                            </h4>
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                              debt.status === "QUITADA"
                                ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700/60"
                                : "bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-700/60"
                            }`}>
                              {debt.status}
                            </span>
                          </div>
                          {debt.contact_id && (
                            <p className="text-[11px] text-zinc-400">
                              Credor: <strong>{contacts.find(c => c.id === debt.contact_id)?.name || "Contato"}</strong>
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5">
                          {debt.status !== "QUITADA" && (
                            <button
                              type="button"
                              onClick={() => openAmortizeDebt(debt)}
                              className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50/70 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-950/80 border border-emerald-200/80 dark:border-emerald-800/60 rounded-lg transition-all"
                            >
                              <Coins className="w-3.5 h-3.5" />
                              <span>Amortizar</span>
                            </button>
                          )}

                          <button
                            onClick={() => handleDeleteItem("debts", debt.id)}
                            className="p-1.5 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-all"
                            title="Excluir Dívida"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Barra de Progresso de Amortização */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px] text-zinc-500 dark:text-zinc-400 font-mono">
                          <span>Pago: {hideValues ? "••••••" : formatCurrency(paid)} ({pct}%)</span>
                          <span>Restante: {hideValues ? "••••••" : formatCurrency(debt.remaining_amount_cents)}</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden border border-zinc-200/60 dark:border-zinc-700/60">
                          <div
                            className={`h-full transition-all rounded-full ${
                              pct === 100 ? "bg-emerald-500" : "bg-gradient-to-r from-amber-500 to-emerald-500"
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* ABA 6: ORÇAMENTOS & METAS                  */}
      {/* ========================================== */}
      {activeTab === "ORCAMENTOS" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
          {/* Form */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-500" />
                <span>Definir Teto Orçamentário</span>
              </h3>
            </div>

            <form onSubmit={handleCreateBudget} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Categoria de Despesa
                </label>
                <select
                  required
                  value={budgetCatId}
                  onChange={(e) => setBudgetCatId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:border-emerald-500 text-zinc-900 dark:text-zinc-100 font-medium"
                >
                  {sortedCategories
                    .filter((c) => c.type === "DESPESA")
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Limite Mensal Máximo (R$)
                </label>
                <input
                  type="text"
                  required
                  placeholder="0,00"
                  value={budgetLimitStr}
                  onChange={(e) => setBudgetLimitStr(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:border-emerald-500 font-mono text-zinc-900 dark:text-zinc-100"
                />
              </div>

              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/30 border border-zinc-200/60 dark:border-zinc-700/60 text-xs text-zinc-500">
                O teto será aplicado ao mês selecionado: <strong>{monthNames[budgetMonth - 1]} / {budgetYear}</strong>
              </div>

              <button
                type="submit"
                disabled={creatingBudget}
                className="w-full py-2.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-1.5"
              >
                {creatingBudget ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Salvando...</span>
                  </>
                ) : (
                  <span>Salvar Limite Mensal</span>
                )}
              </button>
            </form>
          </div>

          {/* Listagem de Orçamentos (Ordenada A a Z) */}
          <div className="lg:col-span-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  Tetos & Consumo Mensal
                </h3>
                <p className="text-xs text-zinc-400">
                  {sortedBudgets.length} categorias monitoradas em ordem alfabética (A a Z) • {profile}
                </p>
              </div>

              {/* Seletor de Mês/Ano */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (budgetMonth === 1) {
                      setBudgetMonth(12);
                      setBudgetYear(budgetYear - 1);
                    } else {
                      setBudgetMonth(budgetMonth - 1);
                    }
                  }}
                  className="p-1 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-bold px-2 text-zinc-800 dark:text-zinc-200 min-w-[110px] text-center">
                  {monthNames[budgetMonth - 1]} / {budgetYear}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    if (budgetMonth === 12) {
                      setBudgetMonth(1);
                      setBudgetYear(budgetYear + 1);
                    } else {
                      setBudgetMonth(budgetMonth + 1);
                    }
                  }}
                  className="p-1 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {sortedBudgets.length === 0 ? (
              <div className="p-8 text-center text-xs text-zinc-500">
                Nenhum orçamento configurado para este mês.
              </div>
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-3.5 max-h-[600px] overflow-y-auto pr-1">
                {sortedBudgets.map((b) => {
                  const pct = b.percentage_used || 0;
                  const isOver = pct > 100;
                  const isWarning = pct >= 80 && pct <= 100;

                  return (
                    <div
                      key={b.id}
                      className="p-4 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 shadow-sm space-y-2.5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                            {b.category_name}
                          </h4>
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                            isOver
                              ? "bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-700/60"
                              : isWarning
                              ? "bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-700/60"
                              : "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700/60"
                          }`}>
                            {isOver ? "ESTOURADO" : isWarning ? "ATENÇÃO" : "NORMAL"} ({pct}%)
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openEditBudget(b)}
                            className="p-1 text-zinc-400 hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-950/40 rounded-lg transition-all"
                            title="Editar Teto"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleDeleteItem("budgets", b.id)}
                            className="p-1 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-all"
                            title="Excluir Orçamento"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Progresso de Gastos */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px] text-zinc-500 dark:text-zinc-400 font-mono">
                          <span>Gasto Real: {hideValues ? "••••••" : formatCurrency(b.spent_amount_cents || 0)}</span>
                          <span>Teto: {hideValues ? "••••••" : formatCurrency(b.limit_amount_cents)}</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden border border-zinc-200/60 dark:border-zinc-700/60">
                          <div
                            className={`h-full transition-all rounded-full ${
                              isOver ? "bg-rose-500" : isWarning ? "bg-amber-500" : "bg-emerald-500"
                            }`}
                            style={{ width: `${Math.min(100, pct)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* ABA 6.1: METAS FINANCEIRAS & OBJETIVOS     */}
      {/* ========================================== */}
      {activeTab === "METAS" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
          {/* Form de Criação */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-500" />
                <span>Nova Meta Financeira</span>
              </h3>
            </div>

            <form onSubmit={handleCreateGoal} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Título do Objetivo / Meta
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Reserva de Emergência, Viagem, Carro"
                  value={goalTitle}
                  onChange={(e) => setGoalTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:border-emerald-500 text-zinc-900 dark:text-zinc-100 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Valor Alvo Desejado (R$)
                </label>
                <input
                  type="text"
                  required
                  placeholder="0,00"
                  value={goalTargetAmountStr}
                  onChange={(e) => setGoalTargetAmountStr(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:border-emerald-500 font-mono text-zinc-900 dark:text-zinc-100 font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Valor Já Acumulado Inicial (R$)
                </label>
                <input
                  type="text"
                  placeholder="0,00 (opcional)"
                  value={goalCurrentAmountStr}
                  onChange={(e) => setGoalCurrentAmountStr(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:border-emerald-500 font-mono text-zinc-900 dark:text-zinc-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Data Limite Prevista (Opcional)
                </label>
                <input
                  type="date"
                  value={goalTargetDate}
                  onChange={(e) => setGoalTargetDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:border-emerald-500 font-mono text-zinc-900 dark:text-zinc-100"
                />
              </div>

              <button
                type="submit"
                disabled={creatingGoal}
                className="w-full py-2.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {creatingGoal ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Salvando Meta...</span>
                  </>
                ) : (
                  <span>Cadastrar Meta</span>
                )}
              </button>
            </form>
          </div>

          {/* Listagem de Metas */}
          <div className="lg:col-span-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <Target className="w-4 h-4 text-emerald-500" />
                  <span>Objetivos & Metas Cadastradas</span>
                </h3>
                <p className="text-xs text-zinc-400">
                  {sortedGoals.length} meta(s) cadastrada(s) • {profile}
                </p>
              </div>

              {/* Filtros */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Buscar meta..."
                  value={goalSearch}
                  onChange={(e) => setGoalSearch(e.target.value)}
                  className="px-3 py-1.5 text-xs bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100"
                />
                <select
                  value={goalStatusFilter}
                  onChange={(e) => setGoalStatusFilter(e.target.value)}
                  className="px-2.5 py-1.5 text-xs bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 font-medium"
                >
                  <option value="TODOS">Todos os status</option>
                  <option value="EM_ANDAMENTO">Em Andamento</option>
                  <option value="CONCLUIDA">Concluídas</option>
                  <option value="CANCELADA">Canceladas</option>
                </select>
              </div>
            </div>

            {sortedGoals.length === 0 ? (
              <div className="p-8 text-center text-xs text-zinc-500">
                Nenhuma meta financeira encontrada.
              </div>
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-3.5 max-h-[600px] overflow-y-auto pr-1">
                {sortedGoals.map((g) => {
                  const pct = g.progress_percentage || (g.target_amount_cents > 0 ? Math.round((g.current_amount_cents / g.target_amount_cents) * 100) : 0);
                  const isCompleted = g.status === "CONCLUIDA" || pct >= 100;
                  const remaining = Math.max(0, g.target_amount_cents - g.current_amount_cents);

                  return (
                    <div
                      key={g.id}
                      className="p-4 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 shadow-sm space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">
                            {g.title}
                          </h4>
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${
                            isCompleted
                              ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700/60"
                              : g.status === "CANCELADA"
                              ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border-zinc-300 dark:border-zinc-700"
                              : "bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-700/60"
                          }`}>
                            {isCompleted ? "✓ CONCLUÍDA" : `${pct}% ACUMULADO`}
                          </span>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => openContributeGoal(g)}
                            className="px-2 py-1 text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 rounded-lg transition-all flex items-center gap-1"
                            title="Aporte / Resgate"
                          >
                            <Coins className="w-3 h-3" />
                            <span>Aporte</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => openEditGoal(g)}
                            className="p-1 text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg transition-all"
                            title="Editar Meta"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleDeleteGoal(g.id)}
                            className="p-1 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-all"
                            title="Excluir Meta"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Progresso Financeiro */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px] text-zinc-500 dark:text-zinc-400 font-mono">
                          <span>Acumulado: <strong className="text-zinc-900 dark:text-zinc-100">{hideValues ? "••••••" : formatCurrency(g.current_amount_cents)}</strong></span>
                          <span>Alvo: {hideValues ? "••••••" : formatCurrency(g.target_amount_cents)}</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden border border-zinc-200/60 dark:border-zinc-700/60">
                          <div
                            className={`h-full transition-all rounded-full ${
                              isCompleted ? "bg-emerald-500" : "bg-indigo-500"
                            }`}
                            style={{ width: `${Math.min(100, pct)}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[10px] text-zinc-400 pt-0.5">
                          <span>Faltam: <strong>{hideValues ? "••••••" : formatCurrency(remaining)}</strong></span>
                          {g.target_date && <span>Data Limite: {g.target_date}</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* ABA 6.2: ASSINATURAS & RECORRÊNCIAS        */}
      {/* ========================================== */}
      {activeTab === "RECORRENCIAS" && (
        <div className="space-y-6 animate-fade-in">
          
          {/* Header & Indicadores Rápidos */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 shadow-sm">
              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                Contratos Ativos
              </span>
              <div className="text-xl font-bold font-mono text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <Repeat className="w-5 h-5 text-emerald-500" />
                <span>{schedules.filter(s => s.status === "ATIVO").length} plano(s)</span>
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 shadow-sm">
              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                Custo Mensal Recorrente (Ativos)
              </span>
              <div className="text-xl font-bold font-mono text-rose-600 dark:text-rose-400">
                {hideValues ? "••••••" : formatCurrency(
                  schedules
                    .filter(s => s.status === "ATIVO" && s.type === "DESPESA")
                    .reduce((acc, curr) => acc + curr.amount_cents, 0)
                )}
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 shadow-sm">
              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                Receita Recorrente Fixa (Ativos)
              </span>
              <div className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                {hideValues ? "••••••" : formatCurrency(
                  schedules
                    .filter(s => s.status === "ATIVO" && s.type === "RECEITA")
                    .reduce((acc, curr) => acc + curr.amount_cents, 0)
                )}
              </div>
            </div>
          </div>

          {/* Barra de Filtros */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-emerald-500" />
                <span>Central de Contratos & Planos Recorrentes</span>
              </h3>
              <p className="text-xs text-zinc-400">
                {sortedSchedules.length} plano(s) listado(s) • {profile}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                placeholder="Buscar contrato..."
                value={scheduleSearch}
                onChange={(e) => setScheduleSearch(e.target.value)}
                className="px-3 py-1.5 text-xs bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100"
              />
              <select
                value={scheduleTypeFilter}
                onChange={(e) => setScheduleTypeFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 font-medium"
              >
                <option value="TODOS">Todos os tipos</option>
                <option value="RECORRENTE_CONTINUA">Assinaturas Contínuas</option>
                <option value="PARCELADA">Compras Parceladas</option>
              </select>
              <select
                value={scheduleStatusFilter}
                onChange={(e) => setScheduleStatusFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 font-medium"
              >
                <option value="TODOS">Todos os status</option>
                <option value="ATIVO">Ativos</option>
                <option value="PAUSADO">Pausados</option>
                <option value="CANCELADO">Cancelados</option>
              </select>
            </div>
          </div>

          {/* Grid de Cards de Recorrências */}
          {sortedSchedules.length === 0 ? (
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-12 text-center text-xs text-zinc-500">
              Nenhuma assinatura ou parcelamento encontrado. Crie lançamentos recorrentes através do botão "Novo Lançamento".
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sortedSchedules.map((s) => {
                const isContinuous = s.schedule_type === "RECORRENTE_CONTINUA";
                const isPaused = s.status === "PAUSADO";
                const isCanceled = s.status === "CANCELADO";

                return (
                  <div
                    key={s.id}
                    className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl p-5 shadow-sm space-y-4 flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      {/* Top Header do Card */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border mb-1.5 inline-block ${
                            isContinuous
                              ? "bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800"
                              : "bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800"
                          }`}>
                            {isContinuous ? "🔁 Assinatura Contínua" : `💳 Parcelamento (${s.total_installments}x)`}
                          </span>
                          <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">
                            {s.description}
                          </h4>
                          <p className="text-xs text-zinc-400">
                            {s.category_name || "Sem categoria"} {s.contact_name ? `• ${s.contact_name}` : ""}
                          </p>
                        </div>

                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${
                          s.status === "ATIVO"
                            ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                            : isPaused
                            ? "bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800"
                            : "bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800"
                        }`}>
                          {s.status}
                        </span>
                      </div>

                      {/* Valor e Periodicidade */}
                      <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/30 border border-zinc-100 dark:border-zinc-800/60">
                        <div className="flex items-baseline justify-between">
                          <span className="text-xs text-zinc-500">Valor Recorrente:</span>
                          <div className="text-right">
                            <span className={`text-base font-bold font-mono ${
                              s.type === "DESPESA" ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"
                            }`}>
                              {s.type === "DESPESA" ? "-" : "+"} {hideValues ? "••••••" : formatCurrency(s.amount_cents)}
                            </span>
                            <span className="text-[10px] text-zinc-400 block">/ {s.frequency.toLowerCase()}</span>
                          </div>
                        </div>

                        <div className="mt-2 pt-2 border-t border-zinc-200/50 dark:border-zinc-700/50 flex justify-between text-[11px] text-zinc-400 font-mono">
                          <span>Vencimento: Dia {s.due_day}</span>
                          <span>Próximo: {s.next_due_date || "—"}</span>
                        </div>
                      </div>

                      {/* Progresso de Pagamentos */}
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between text-[11px] text-zinc-500 font-mono">
                          <span>Quitados: <strong>{s.paid_count}</strong> ({formatCurrency(s.paid_amount_cents, hideValues)})</span>
                          <span>Pendentes: <strong>{s.pending_count}</strong></span>
                        </div>
                        {!isContinuous && s.total_installments && (
                          <div className="w-full h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                            <div
                              className="h-full bg-emerald-500 rounded-full transition-all"
                              style={{ width: `${Math.min(100, Math.round((s.paid_count / s.total_installments) * 100))}%` }}
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Ações Rápidas */}
                    <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between gap-1">
                      <button
                        type="button"
                        onClick={() => openAdjustSchedule(s)}
                        className="px-2.5 py-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                        title="Reajustar valor futuro"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        <span>Reajustar</span>
                      </button>

                      <div className="flex items-center gap-1">
                        {s.status === "ATIVO" && (
                          <button
                            type="button"
                            onClick={() => handleScheduleAction(s.id, "PAUSAR")}
                            className="p-1.5 text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-lg transition-all cursor-pointer"
                            title="Pausar recorrência"
                          >
                            <Pause className="w-4 h-4" />
                          </button>
                        )}

                        {isPaused && (
                          <button
                            type="button"
                            onClick={() => handleScheduleAction(s.id, "REATIVAR")}
                            className="p-1.5 text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg transition-all cursor-pointer"
                            title="Reativar recorrência"
                          >
                            <Play className="w-4 h-4" />
                          </button>
                        )}

                        {!isCanceled && (
                          <button
                            type="button"
                            onClick={() => handleScheduleAction(s.id, "CANCELAR")}
                            className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-all cursor-pointer"
                            title="Cancelar contrato (remove futuros)"
                          >
                            <Ban className="w-4 h-4" />
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleDeleteSchedule(s.id)}
                          className="p-1.5 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-all cursor-pointer"
                          title="Excluir"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>
      )}

      {/* ========================================== */}
      {/* ABA 7: APP MOBILE & SINCRONIZAÇÃO API      */}
      {/* ========================================== */}
      {activeTab === "SYNC" && (
        <div className="space-y-6 animate-fade-in">
          
          {/* Banner Interativo com Guia do Aplicativo Android */}
          <div className="bg-gradient-to-r from-emerald-900/40 via-teal-900/30 to-zinc-900 border border-emerald-500/30 rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3.5 min-w-0">
              <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shrink-0">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                  <span>Aplicativo Android: 100% Offline-First</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    API REST Direta
                  </span>
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Lançamentos com latência zero gravados no Room local e sincronizados diretamente com a API do Wallet quando houver conexão.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowGuide(true)}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs shadow-md shadow-emerald-900/30 transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer"
            >
              <BookOpen className="w-4 h-4" />
              <span>Ver Guia de Conexão Mobile</span>
            </button>
          </div>

          {/* Feedback Alertas */}
          {syncFeedback && (
            <div className={`p-4 rounded-2xl border flex items-start gap-3 animate-fade-in ${
              syncFeedback.type === "success"
                ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/80 text-emerald-800 dark:text-emerald-200"
                : "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/80 text-rose-800 dark:text-rose-200"
            }`}>
              {syncFeedback.type === "success" ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              )}
              <div className="space-y-1 flex-1 min-w-0">
                <p className="text-xs font-semibold break-words">{syncFeedback.message}</p>
                {syncFeedback.details && (
                  <p className="text-[11px] font-mono opacity-80 break-words">{syncFeedback.details}</p>
                )}
              </div>
            </div>
          )}

          {/* Grid Principal: Conexão API & Endpoints */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Card 1: Endereços da API REST para o Android */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 shadow-sm">
                    <Server className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                      Endereço da API REST (FastAPI)
                    </h3>
                    <p className="text-xs text-zinc-400">
                      Configure a Base URL no seu aplicativo Android
                    </p>
                  </div>
                </div>

                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Porta 8000</span>
                </span>
              </div>

              {/* Endereços Copiáveis */}
              <div className="space-y-2.5">
                {/* Emulador Android */}
                <div className="p-3 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-800/40 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 block">
                      Emulador Android Studio (Host Loopback)
                    </span>
                    <code className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-bold truncate block">
                      http://10.0.2.2:8000/
                    </code>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopyApiUrl("http://10.0.2.2:8000/", "emu")}
                    className="p-2 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:bg-white dark:hover:bg-zinc-800 transition-all text-zinc-600 dark:text-zinc-300 shrink-0 cursor-pointer"
                    title="Copiar URL"
                  >
                    {copiedApiUrl === "emu" ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {/* Aparelho Físico Wi-Fi */}
                <div className="p-3 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-800/40 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 block">
                      Aparelho Físico (Mesmo Wi-Fi / IP Local)
                    </span>
                    <code className="text-[11px] font-mono text-indigo-600 dark:text-indigo-400 font-bold truncate block">
                      http://192.168.x.x:8000/
                    </code>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopyApiUrl("http://192.168.1.100:8000/", "wifi")}
                    className="p-2 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:bg-white dark:hover:bg-zinc-800 transition-all text-zinc-600 dark:text-zinc-300 shrink-0 cursor-pointer"
                    title="Copiar Modelo"
                  >
                    {copiedApiUrl === "wifi" ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Botão Testar Conexão */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleTestApiConnection}
                  disabled={testingApi}
                  className="w-full py-2.5 px-4 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${testingApi ? "animate-spin" : ""}`} />
                  <span>{testingApi ? "Verificando API..." : "Testar Conectividade da API REST"}</span>
                </button>
              </div>
            </div>

            {/* Card 2: Contratos e Endpoints REST de Sincronização */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-teal-100 dark:bg-teal-950/80 text-teal-600 dark:text-teal-400 border border-teal-200 dark:border-teal-800/60 shadow-sm">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                      Endpoints REST de Sincronização
                    </h3>
                    <p className="text-xs text-zinc-400">
                      Utilizados pelo Retrofit + WorkManager no Android
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2.5 text-xs">
                {/* Push */}
                <div className="p-3 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30 space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold font-mono text-[10px]">
                        POST
                      </span>
                      <code className="font-mono text-zinc-900 dark:text-zinc-100 font-semibold text-[11px]">
                        /api/v1/sync/mobile/push
                      </code>
                    </div>
                    <span className="text-[10px] text-zinc-400">Mobile $\rightarrow$ Servidor</span>
                  </div>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    Envia em lote todas as transações criadas offline. Upsert idempotente no SQLite.
                  </p>
                </div>

                {/* Pull */}
                <div className="p-3 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30 space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 font-bold font-mono text-[10px]">
                        GET
                      </span>
                      <code className="font-mono text-zinc-900 dark:text-zinc-100 font-semibold text-[11px]">
                        /api/v1/sync/mobile/pull
                      </code>
                    </div>
                    <span className="text-[10px] text-zinc-400">Servidor $\rightarrow$ Mobile</span>
                  </div>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    Baixa categorias, contas, formas de pagamento, itens e lançamentos delta.
                  </p>
                </div>

                {/* Attachments */}
                <div className="p-3 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30 space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-bold font-mono text-[10px]">
                        POST
                      </span>
                      <code className="font-mono text-zinc-900 dark:text-zinc-100 font-semibold text-[11px]">
                        /api/v1/attachments/upload
                      </code>
                    </div>
                    <span className="text-[10px] text-zinc-400">Comprovantes</span>
                  </div>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    Upload de fotos de cupons/recibos capturados via CameraX para o disco local.
                  </p>
                </div>
              </div>
            </div>

          </div>

          {/* Histórico & Logs de Sincronização Mobile */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-emerald-500" />
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  Auditoria de Eventos de Sincronização Mobile
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    setLoadingSyncLogs(true);
                    const res = await api.get<SyncLog[]>("/sync/logs");
                    setSyncLogs(res.data);
                    setLoadingSyncLogs(false);
                  }}
                  disabled={loadingSyncLogs}
                  className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingSyncLogs ? "animate-spin" : ""}`} />
                  <span>Atualizar</span>
                </button>

                {syncLogs.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearSyncLogs}
                    disabled={clearingLogs}
                    className="text-xs font-semibold text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Limpar Logs</span>
                  </button>
                )}
              </div>
            </div>

            {loadingSyncLogs ? (
              <div className="py-8 flex flex-col items-center justify-center gap-2 text-zinc-400">
                <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
                <span className="text-xs">Carregando histórico de sincronização...</span>
              </div>
            ) : syncLogs.length === 0 ? (
              <div className="py-8 text-center text-zinc-400 text-xs">
                Nenhum evento de sincronização mobile registrado ainda.
              </div>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1 text-xs">
                {syncLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                  >
                    <div className="flex items-start sm:items-center gap-2.5 min-w-0">
                      <span className={`w-2.5 h-2.5 rounded-full shrink-0 mt-1 sm:mt-0 ${
                        log.status === "SUCESSO" ? "bg-emerald-500" : log.status === "PARCIAL" ? "bg-amber-500" : "bg-rose-500"
                      }`} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-zinc-900 dark:text-zinc-100 font-mono text-xs">
                            {log.action}
                          </span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-md ${
                            log.status === "SUCESSO" 
                              ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300" 
                              : "bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300"
                          }`}>
                            {log.status}
                          </span>
                        </div>
                        <p className="text-zinc-600 dark:text-zinc-300 text-[11px] mt-0.5 truncate">
                          {log.message}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0 font-mono text-[10px] text-zinc-400">
                      <span>{log.created_at ? new Date(log.created_at).toLocaleString("pt-BR") : ""}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}

      {/* ========================================== */}
      {/* ABA 8: ARMAZENAMENTO & COMPROVANTES        */}
      {/* ========================================== */}
      {activeTab === "ANEXOS" && (
        <div className="space-y-6 animate-fade-in">
          {/* Header da Aba de Armazenamento */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-sm shrink-0">
                  <HardDrive className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex flex-wrap items-center gap-2">
                    <span>Armazenamento de Anexos &amp; Comprovantes</span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                      Local-First
                    </span>
                    {attachmentStats?.is_custom_directory ? (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-800">
                        Diretório Personalizado
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">
                        Diretório Padrão
                      </span>
                    )}
                    {attachmentStats?.is_writable ? (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Gravável &amp; Ativo</span>
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        <span>Sem permissão de escrita</span>
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    Defina e gerencie o diretório do computador onde ficam salvos os recibos, fotos e PDFs anexados aos lançamentos ({profile}).
                  </p>
                </div>
              </div>

              {attachmentStats?.is_custom_directory && (
                <button
                  type="button"
                  onClick={handleResetStorageDir}
                  disabled={resettingCustomDir}
                  className="px-4 py-2 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-xl transition-all flex items-center gap-1.5 shadow-sm"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${resettingCustomDir ? "animate-spin" : ""}`} />
                  <span>Restaurar Diretório Padrão</span>
                </button>
              )}
            </div>

            {/* Métricas de Armazenamento */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <div className="p-4 bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/70 dark:border-zinc-800 rounded-2xl">
                <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 mb-1">
                  <span className="flex items-center gap-1.5 font-semibold">
                    <Paperclip className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Total de Arquivos</span>
                  </span>
                </div>
                <p className="text-xl font-black font-mono text-zinc-900 dark:text-zinc-100">
                  {attachmentStats?.total_count || 0}
                </p>
                <p className="text-[10px] text-zinc-400 mt-0.5">Comprovantes cadastrados</p>
              </div>

              <div className="p-4 bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/70 dark:border-zinc-800 rounded-2xl">
                <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 mb-1">
                  <span className="flex items-center gap-1.5 font-semibold">
                    <HardDrive className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Espaço Ocupado</span>
                  </span>
                </div>
                <p className="text-xl font-black font-mono text-emerald-600 dark:text-emerald-400">
                  {attachmentStats?.formatted_total_size || "0 B"}
                </p>
                <p className="text-[10px] text-zinc-400 mt-0.5">Em disco no Wallet</p>
              </div>

              <div className="p-4 bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/70 dark:border-zinc-800 rounded-2xl">
                <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 mb-1">
                  <span className="flex items-center gap-1.5 font-semibold">
                    <Database className="w-3.5 h-3.5 text-sky-500" />
                    <span>Espaço Livre em Disco</span>
                  </span>
                </div>
                <p className="text-xl font-black font-mono text-sky-600 dark:text-sky-400">
                  {attachmentStats?.formatted_free_space || "Disponível"}
                </p>
                <p className="text-[10px] text-zinc-400 mt-0.5">Na partição atual</p>
              </div>

              <div className="p-4 bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/70 dark:border-zinc-800 rounded-2xl">
                <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 mb-1">
                  <span className="flex items-center gap-1.5 font-semibold text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Status do Sistema</span>
                  </span>
                </div>
                <p className="text-base font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                  Pronto &amp; Seguro
                </p>
                <p className="text-[10px] text-zinc-400 mt-0.5">Leitura instantânea (&lt; 50ms)</p>
              </div>
            </div>
          </div>

          {/* Card Principal de Configuração de Diretório */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <FolderTree className="w-4 h-4 text-emerald-500" />
                <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  Definir Pasta / Diretório de Armazenamento
                </h4>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400 font-mono">
                <span className="font-sans font-semibold text-zinc-400">Diretório Atual:</span>
                <span className="px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-lg">
                  {attachmentStats?.active_directory || customDirInput}
                </span>
              </div>
            </div>

            <form onSubmit={handleSaveStorageDir} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Caminho Completo da Pasta (Absoluto)
                </label>
                <div className="flex flex-col sm:flex-row items-stretch gap-2">
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      required
                      placeholder="Ex: /home/usuario/meus_anexos ou D:\Wallet\Comprovantes ou /mnt/backup/wallet"
                      value={customDirInput}
                      onChange={(e) => setCustomDirInput(e.target.value)}
                      className="w-full px-4 py-2.5 text-xs bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:border-emerald-500 font-mono text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 shadow-inner"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={savingCustomDir || !customDirInput.trim()}
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 shrink-0"
                  >
                    {savingCustomDir ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    <span>Salvar e Aplicar Pasta</span>
                  </button>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl border border-zinc-200/70 dark:border-zinc-800">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={migrateFilesCheckbox}
                    onChange={(e) => setMigrateFilesCheckbox(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-zinc-300 dark:border-zinc-700"
                  />
                  <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    Copiar comprovantes existentes automaticamente para a nova pasta ao salvar
                  </span>
                </label>

                <span className="text-[11px] text-zinc-400">
                  Formatos: JPG, PNG, WEBP, HEIC, PDF até 15MB
                </span>
              </div>
            </form>

            {/* Informações e Recomendações de Armazenamento */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
              <div className="p-3.5 bg-zinc-50/70 dark:bg-zinc-800/30 border border-zinc-200/60 dark:border-zinc-800 rounded-xl space-y-1">
                <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                  <FolderTree className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Estrutura Organizada</span>
                </p>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  Os arquivos são particionados automaticamente em <code>{'{perfil}/{ano}/{mes}/'}</code> para facilitar auditorias e backups externos.
                </p>
              </div>

              <div className="p-3.5 bg-zinc-50/70 dark:bg-zinc-800/30 border border-zinc-200/60 dark:border-zinc-800 rounded-xl space-y-1">
                <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                  <HardDrive className="w-3.5 h-3.5 text-sky-500" />
                  <span>Drives &amp; Nuvem Local</span>
                </p>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  Você pode apontar para pastas sincronizadas pelo app do Google Drive Desktop, OneDrive, Dropbox ou HDs externos.
                </p>
              </div>

              <div className="p-3.5 bg-zinc-50/70 dark:bg-zinc-800/30 border border-zinc-200/60 dark:border-zinc-800 rounded-xl space-y-1">
                <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Segurança &amp; Fallback</span>
                </p>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  O Wallet valida permissões de gravação antes de alterar e mantém fallback transparente caso arquivos antigos ainda estejam no local original.
                </p>
              </div>
            </div>
          </div>

          {/* Card de Backup Completo do Sistema em 1 Clique */}
          <div className="bg-gradient-to-br from-indigo-950/40 via-zinc-900 to-zinc-900 border border-indigo-500/30 rounded-2xl p-6 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-500/40 text-indigo-400 flex items-center justify-center shadow-lg shadow-indigo-950/30 shrink-0">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                    <span>Backup Completo do Sistema em 1 Clique</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      Disaster Recovery
                    </span>
                  </h4>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Gera um arquivo <strong className="text-zinc-200">.ZIP</strong> consolidado contendo o banco de dados SQLite (<code>wallet.db</code>), todos os comprovantes/anexos particionados e manifesto.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={async () => {
                  setDownloadingBackup(true);
                  try {
                    const response = await api.get("/system/backup", {
                      responseType: "blob",
                    });
                    const url = window.URL.createObjectURL(new Blob([response.data]));
                    const link = document.createElement("a");
                    link.href = url;
                    const nowStr = new Date().toISOString().slice(0, 10);
                    link.setAttribute("download", `wallet_backup_${nowStr}.zip`);
                    document.body.appendChild(link);
                    link.click();
                    link.remove();
                    window.URL.revokeObjectURL(url);

                    const sysRes = await api.get<SystemStatsResponse>("/system/stats");
                    setSystemStats(sysRes.data);
                  } catch (err) {
                    console.error("Erro ao baixar backup:", err);
                    alert("Erro ao gerar e baixar pacote de backup do sistema.");
                  } finally {
                    setDownloadingBackup(false);
                  }
                }}
                disabled={downloadingBackup}
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer"
              >
                {downloadingBackup ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Gerando Snapshot &amp; Compactando ZIP...</span>
                  </>
                ) : (
                  <>
                    <FileDown className="w-4 h-4" />
                    <span>Baixar Backup Completo (.ZIP)</span>
                  </>
                )}
              </button>
            </div>

            {/* Grid de Estatísticas do Pacote */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <div className="p-3.5 bg-zinc-900/60 border border-zinc-800 rounded-xl">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Banco de Dados</span>
                <p className="text-sm font-bold font-mono text-zinc-100 mt-0.5">
                  {systemStats?.database_size_formatted || "—"}
                </p>
                <span className="text-[10px] text-zinc-500">{systemStats?.total_transactions || 0} lançamentos</span>
              </div>

              <div className="p-3.5 bg-zinc-900/60 border border-zinc-800 rounded-xl">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Anexos Arquivados</span>
                <p className="text-sm font-bold font-mono text-zinc-100 mt-0.5">
                  {systemStats?.attachments_size_formatted || "—"}
                </p>
                <span className="text-[10px] text-zinc-500">{systemStats?.total_attachments || 0} comprovantes</span>
              </div>

              <div className="p-3.5 bg-zinc-900/60 border border-zinc-800 rounded-xl">
                <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider block">Tamanho Estimado ZIP</span>
                <p className="text-sm font-bold font-mono text-indigo-300 mt-0.5">
                  {systemStats?.total_backup_size_formatted || "—"}
                </p>
                <span className="text-[10px] text-zinc-500">Compressão DEFLATE</span>
              </div>

              <div className="p-3.5 bg-zinc-900/60 border border-zinc-800 rounded-xl">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Último Backup</span>
                <p className="text-xs font-semibold text-zinc-200 mt-1 truncate">
                  {systemStats?.last_backup_at || "Ainda não realizado"}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* ABA 9: GESTÃO DE USUÁRIOS                  */}
      {/* ========================================== */}
      {activeTab === "USUARIOS" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
          {/* Form */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-emerald-500" />
                <span>Novo Usuário</span>
              </h3>
            </div>

            {userFeedback && (
              <div className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                userFeedback.type === "success"
                  ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300"
                  : "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300"
              }`}>
                {userFeedback.type === "success" ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                <span>{userFeedback.message}</span>
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Nome de Usuário (Login)
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: financeiro, joao, gestor..."
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:border-emerald-500 text-zinc-900 dark:text-zinc-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Senha Inicial
                </label>
                <input
                  type="password"
                  required
                  placeholder="Mínimo 4 caracteres..."
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:border-emerald-500 text-zinc-900 dark:text-zinc-100"
                />
              </div>

              <button
                type="submit"
                disabled={creatingUser}
                className="w-full py-2.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-1.5"
              >
                {creatingUser ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Cadastrando...</span>
                  </>
                ) : (
                  <span>Cadastrar Usuário</span>
                )}
              </button>
            </form>
          </div>

          {/* Listagem de Usuários (Ordenada A a Z) */}
          <div className="lg:col-span-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                Usuários do Sistema
              </h3>
              <p className="text-xs text-zinc-400">
                {sortedUsers.length} usuários cadastrados em ordem alfabética (A a Z)
              </p>
            </div>

            {loadingUsers ? (
              <div className="p-8 text-center text-xs text-zinc-400 flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
                <span>Carregando usuários...</span>
              </div>
            ) : sortedUsers.length === 0 ? (
              <div className="p-8 text-center text-xs text-zinc-500">
                Nenhum usuário cadastrado.
              </div>
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                {sortedUsers.map((u) => (
                  <div
                    key={u.id}
                    className="p-3.5 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 shadow-sm flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs">
                        {u.username.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                          {u.username}
                        </h4>
                        <p className="text-[10px] text-zinc-400 font-mono">
                          ID: {u.id.slice(0, 8)}...
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteUser(u)}
                      className="p-2 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-all"
                      title="Excluir Usuário"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* ABA 9: APARÊNCIA & TEMAS                   */}
      {/* ========================================== */}
      {activeTab === "APARENCIA" && (
        <div className="max-w-4xl space-y-6 animate-fade-in">
          {/* Modo Claro / Escuro Global */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm space-y-3">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Palette className="w-4 h-4 text-emerald-500" />
              <span>Tema do Sistema</span>
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Escolha a interface visual para navegação e relatórios diários.
            </p>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => !isDark && toggleTheme()}
                className={`p-4 rounded-xl border text-left flex items-center gap-3 transition-all ${
                  isDark
                    ? "border-emerald-500 bg-emerald-50/20 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 shadow-sm"
                    : "border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:border-zinc-300"
                }`}
              >
                <Moon className="w-5 h-5 text-indigo-400" />
                <div>
                  <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Modo Escuro (Dark)</p>
                  <p className="text-[11px] text-zinc-400">Visual moderno de alto contraste</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => isDark && toggleTheme()}
                className={`p-4 rounded-xl border text-left flex items-center gap-3 transition-all ${
                  !isDark
                    ? "border-emerald-500 bg-emerald-50/20 text-emerald-700 shadow-sm"
                    : "border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:border-zinc-300"
                }`}
              >
                <Sun className="w-5 h-5 text-amber-500" />
                <div>
                  <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Modo Claro (Light)</p>
                  <p className="text-[11px] text-zinc-400">Visual limpo e brilhante</p>
                </div>
              </button>
            </div>
          </div>

          {/* Tema Inicial da Tela de Login */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm space-y-3">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Lock className="w-4 h-4 text-emerald-500" />
              <span>Tema da Tela de Login</span>
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Defina se a tela inicial de login deve abrir por padrão em modo escuro ou claro.
            </p>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setLoginTheme("dark")}
                className={`p-3.5 rounded-xl border text-left flex items-center gap-3 transition-all ${
                  loginTheme === "dark"
                    ? "border-emerald-500 bg-emerald-50/20 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 shadow-sm"
                    : "border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:border-zinc-300"
                }`}
              >
                <Moon className="w-5 h-4 text-indigo-400" />
                <div>
                  <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Login Dark</p>
                  <p className="text-[10px] text-zinc-400">Fundo escuro profundo</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setLoginTheme("light")}
                className={`p-3.5 rounded-xl border text-left flex items-center gap-3 transition-all ${
                  loginTheme === "light"
                    ? "border-emerald-500 bg-emerald-50/20 text-emerald-700 shadow-sm"
                    : "border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:border-zinc-300"
                }`}
              >
                <Sun className="w-5 h-4 text-amber-500" />
                <div>
                  <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Login Light</p>
                  <p className="text-[10px] text-zinc-400">Fundo claro suave</p>
                </div>
              </button>
            </div>
          </div>

          {/* Ocultar Valores Monetários */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm flex items-center justify-between gap-4">
            <div>
              <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                {hideValues ? <EyeOff className="w-4 h-4 text-amber-500" /> : <Eye className="w-4 h-4 text-emerald-500" />}
                <span>Privacidade de Valores (Ocultação)</span>
              </h3>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Oculta todos os saldos e valores em tela para ambientes públicos ou compartilhados.
              </p>
            </div>

            <button
              type="button"
              onClick={toggleHideValues}
              className={`px-4 py-2 text-xs font-bold rounded-xl border transition-all ${
                hideValues
                  ? "border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300"
                  : "border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
              }`}
            >
              {hideValues ? "Valores Ocultos" : "Valores Visíveis"}
            </button>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAIS DE EDIÇÃO                           */}
      {/* ========================================== */}

      {/* 1. Modal de Edição de Categoria */}
      {editModalCat && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-zinc-100 dark:border-zinc-800 bg-gradient-to-r from-sky-50/50 via-white to-white dark:from-sky-950/20 dark:via-zinc-900 dark:to-zinc-900">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-sky-100 dark:bg-sky-950/80 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-800/60 shadow-sm">
                  <Pencil className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                    Editar Categoria
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Perfil {profile} • Atualize nome, fluxo e essencialidade
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeEditCategory}
                className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditCategory} className="p-5 space-y-4">
              {editCatError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{editCatError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Nome da Categoria
                </label>
                <input
                  type="text"
                  required
                  value={editCatName}
                  onChange={(e) => setEditCatName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:border-sky-500 text-zinc-900 dark:text-zinc-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Tipo de Fluxo
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditCatType("DESPESA")}
                    className={`py-2 text-xs font-bold rounded-lg border transition-all ${
                      editCatType === "DESPESA"
                        ? "border-rose-600 bg-rose-50 dark:bg-rose-950/40 text-rose-600 shadow-sm"
                        : "border-zinc-200 dark:border-zinc-700 text-zinc-500"
                    }`}
                  >
                    Despesa
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditCatType("RECEITA")}
                    className={`py-2 text-xs font-bold rounded-lg border transition-all ${
                      editCatType === "RECEITA"
                        ? "border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 shadow-sm"
                        : "border-zinc-200 dark:border-zinc-700 text-zinc-500"
                    }`}
                  >
                    Receita
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Natureza da Categoria
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setEditCatNature("NENHUM")}
                    className={`px-2.5 py-1.5 text-[11px] font-bold rounded-lg border text-left transition-all ${
                      editCatNature === "NENHUM"
                        ? "border-zinc-800 bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-sm"
                        : "border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/30"
                    }`}
                  >
                    Nenhum
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditCatNature("OBRIGATORIO")}
                    className={`px-2.5 py-1.5 text-[11px] font-bold rounded-lg border text-left transition-all ${
                      editCatNature === "OBRIGATORIO"
                        ? "border-amber-500 bg-amber-500 text-white shadow-sm"
                        : "border-amber-200 dark:border-amber-900/60 text-amber-700 dark:text-amber-300 bg-amber-50/50 dark:bg-amber-950/20"
                    }`}
                  >
                    Obrigatório
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditCatNature("NECESSARIO")}
                    className={`px-2.5 py-1.5 text-[11px] font-bold rounded-lg border text-left transition-all ${
                      editCatNature === "NECESSARIO"
                        ? "border-blue-500 bg-blue-500 text-white shadow-sm"
                        : "border-blue-200 dark:border-blue-900/60 text-blue-700 dark:text-blue-300 bg-blue-50/50 dark:bg-blue-950/20"
                    }`}
                  >
                    Necessário
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditCatNature("DESEJO")}
                    className={`px-2.5 py-1.5 text-[11px] font-bold rounded-lg border text-left transition-all ${
                      editCatNature === "DESEJO"
                        ? "border-purple-500 bg-purple-500 text-white shadow-sm"
                        : "border-purple-200 dark:border-purple-900/60 text-purple-700 dark:text-purple-300 bg-purple-50/50 dark:bg-purple-950/20"
                    }`}
                  >
                    Desejo
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={closeEditCategory}
                  className="px-4 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={editCatSaving}
                  className="px-5 py-2 text-xs font-bold bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white rounded-lg shadow-md shadow-sky-600/20 transition-all flex items-center gap-1.5"
                >
                  {editCatSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  <span>Salvar Alterações</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Modal de Edição de Item */}
      {editModalItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-zinc-100 dark:border-zinc-800 bg-gradient-to-r from-sky-50/50 via-white to-white dark:from-sky-950/20 dark:via-zinc-900 dark:to-zinc-900">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-sky-100 dark:bg-sky-950/80 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-800/60 shadow-sm">
                  <Pencil className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                    Editar Item
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Perfil {profile} • Atualize nome, categoria vinculada ou valor sugerido
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeEditItem}
                className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditItem} className="p-5 space-y-4">
              {editItemError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{editItemError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Nome do Item
                </label>
                <input
                  type="text"
                  required
                  value={editItemName}
                  onChange={(e) => setEditItemName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:border-sky-500 text-zinc-900 dark:text-zinc-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Categoria Vinculada
                </label>
                <select
                  required
                  value={editItemCatId}
                  onChange={(e) => setEditItemCatId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:border-sky-500 text-zinc-900 dark:text-zinc-100 font-medium"
                >
                  {sortedCategories.map((c) => {
                    const getNat = (n?: string) => (n && n !== "NENHUM" ? ` [${n.charAt(0) + n.slice(1).toLowerCase()}]` : "");
                    return (
                      <option key={c.id} value={c.id}>
                        {c.name}{getNat(c.nature)} ({c.type})
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Valor Padrão Sugerido (R$ - Opcional)
                </label>
                <input
                  type="text"
                  placeholder="0,00"
                  value={editItemAmountStr}
                  onChange={(e) => setEditItemAmountStr(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:border-sky-500 font-mono text-zinc-900 dark:text-zinc-100"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={closeEditItem}
                  className="px-4 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={editItemSaving}
                  className="px-5 py-2 text-xs font-bold bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white rounded-lg shadow-md shadow-sky-600/20 transition-all flex items-center gap-1.5"
                >
                  {editItemSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  <span>Salvar Alterações</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Modal de Edição de Conta */}
      {editModalAcc && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-zinc-100 dark:border-zinc-800 bg-gradient-to-r from-sky-50/50 via-white to-white dark:from-sky-950/20 dark:via-zinc-900 dark:to-zinc-900">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-sky-100 dark:bg-sky-950/80 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-800/60 shadow-sm">
                  <Pencil className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                    Editar Conta / Carteira
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Perfil {profile} • Atualize o nome e o tipo da conta
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeEditAccount}
                className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditAccount} className="p-5 space-y-4">
              {editAccError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{editAccError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Nome da Instituição / Carteira
                </label>
                <input
                  type="text"
                  required
                  value={editAccName}
                  onChange={(e) => setEditAccName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:border-sky-500 text-zinc-900 dark:text-zinc-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Modalidade / Tipo
                </label>
                <select
                  value={editAccType}
                  onChange={(e) => setEditAccType(e.target.value as AccountType)}
                  className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:border-sky-500 text-zinc-900 dark:text-zinc-100 font-medium"
                >
                  <option value="CORRENTE">Conta Corrente</option>
                  <option value="POUPANCA">Poupança</option>
                  <option value="INVESTIMENTO">Investimento / Aplicação</option>
                  <option value="CAIXA">Carteira / Caixa Físico</option>
                  <option value="OUTRO">Outro</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={closeEditAccount}
                  className="px-4 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={editAccSaving}
                  className="px-5 py-2 text-xs font-bold bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white rounded-lg shadow-md shadow-sky-600/20 transition-all flex items-center gap-1.5"
                >
                  {editAccSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  <span>Salvar Alterações</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3.1 Modal de Edição de Forma de Pagamento */}
      {editModalPm && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-zinc-100 dark:border-zinc-800 bg-gradient-to-r from-sky-50/50 via-white to-white dark:from-sky-950/20 dark:via-zinc-900 dark:to-zinc-900">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-sky-100 dark:bg-sky-950/80 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-800/60 shadow-sm">
                  <Pencil className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                    Editar Forma de Pagamento
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Perfil {profile} • Atualize o nome da forma de pagamento
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeEditPaymentMethod}
                className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditPaymentMethod} className="p-5 space-y-4">
              {editPmError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{editPmError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Nome da Forma de Pagamento
                </label>
                <input
                  type="text"
                  required
                  value={editPmName}
                  onChange={(e) => setEditPmName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:border-sky-500 text-zinc-900 dark:text-zinc-100"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={closeEditPaymentMethod}
                  className="px-4 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={editPmSaving}
                  className="px-5 py-2 text-xs font-bold bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white rounded-lg shadow-md shadow-sky-600/20 transition-all flex items-center gap-1.5"
                >
                  {editPmSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  <span>Salvar Alterações</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3.2 Modal de Edição de Cartão de Crédito */}
      {editModalCard && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-zinc-100 dark:border-zinc-800 bg-gradient-to-r from-sky-50/50 via-white to-white dark:from-sky-950/20 dark:via-zinc-900 dark:to-zinc-900">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-sky-100 dark:bg-sky-950/80 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-800/60 shadow-sm">
                  <Pencil className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                    Editar Cartão de Crédito
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Perfil {profile} • Atualize limites, dias de corte e configurações
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeEditCreditCard}
                className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditCreditCard} className="p-5 space-y-4">
              {editCardError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{editCardError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Nome do Cartão
                </label>
                <input
                  type="text"
                  required
                  value={editCardName}
                  onChange={(e) => setEditCardName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:border-sky-500 text-zinc-900 dark:text-zinc-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Limite Total (R$)
                </label>
                <input
                  type="text"
                  required
                  value={editCardLimitStr}
                  onChange={(e) => setEditCardLimitStr(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:border-sky-500 text-zinc-900 dark:text-zinc-100 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Dia Fechamento (1-31)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    required
                    value={editCardClosingDay}
                    onChange={(e) => setEditCardClosingDay(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:border-sky-500 text-zinc-900 dark:text-zinc-100 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Dia Vencimento (1-31)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    required
                    value={editCardDueDay}
                    onChange={(e) => setEditCardDueDay(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:border-sky-500 text-zinc-900 dark:text-zinc-100 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Bandeira
                  </label>
                  <select
                    value={editCardBrand}
                    onChange={(e) => setEditCardBrand(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:border-sky-500 text-zinc-900 dark:text-zinc-100"
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
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Tema Visual
                  </label>
                  <select
                    value={editCardColor}
                    onChange={(e) => setEditCardColor(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:border-sky-500 text-zinc-900 dark:text-zinc-100 font-medium"
                  >
                    <option value="emerald">Emerald (Verde)</option>
                    <option value="purple">Purple (Roxo / Nubank)</option>
                    <option value="indigo">Indigo (Azul Escuro)</option>
                    <option value="rose">Rose (Vermelho)</option>
                    <option value="amber">Amber (Dourado / Laranja)</option>
                    <option value="sky">Sky (Azul Claro)</option>
                    <option value="zinc">Zinc (Black / Escuro)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Conta Débito Padrão (Opcional)
                </label>
                <select
                  value={editCardAccountId}
                  onChange={(e) => setEditCardAccountId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:border-sky-500 text-zinc-900 dark:text-zinc-100"
                >
                  <option value="">Nenhuma (Selecionar no pagamento)</option>
                  {[...accounts]
                    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" }))
                    .map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} ({acc.type})
                      </option>
                    ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={closeEditCreditCard}
                  className="px-4 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={editCardSaving}
                  className="px-5 py-2 text-xs font-bold bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white rounded-lg shadow-md shadow-sky-600/20 transition-all flex items-center gap-1.5"
                >
                  {editCardSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  <span>Salvar Alterações</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Faturas do Cartão */}
      {invoicesModalCard && (
        <CreditCardInvoicesModal
          isOpen={true}
          onClose={() => setInvoicesModalCard(null)}
          card={invoicesModalCard}
          onInvoiceUpdated={loadData}
        />
      )}

      {/* Modal de Extrato / Conta-Corrente do Contato */}
      {statementModalContact && (
        <ContactStatementModal
          isOpen={true}
          onClose={() => setStatementModalContact(null)}
          contact={statementModalContact}
          onContactUpdated={loadData}
        />
      )}

      {/* 4. Modal de Edição de Contato */}
      {editModalCon && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-zinc-100 dark:border-zinc-800 bg-gradient-to-r from-sky-50/50 via-white to-white dark:from-sky-950/20 dark:via-zinc-900 dark:to-zinc-900">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-sky-100 dark:bg-sky-950/80 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-800/60 shadow-sm">
                  <Pencil className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                    Editar Contato
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Perfil {profile} • Atualize os dados do favorecido
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeEditContact}
                className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditContact} className="p-5 space-y-4">
              {editConError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{editConError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Nome do Contato
                </label>
                <input
                  type="text"
                  required
                  value={editConName}
                  onChange={(e) => setEditConName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:border-sky-500 text-zinc-900 dark:text-zinc-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Tipo de Relação
                </label>
                <select
                  value={editConType}
                  onChange={(e: any) => setEditConType(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:border-sky-500 text-zinc-900 dark:text-zinc-100 font-medium"
                >
                  <option value="FORNECEDOR">Fornecedor / Prestador</option>
                  <option value="CLIENTE">Cliente / Pagador</option>
                  <option value="FUNCIONARIO">Colaborador / Equipe</option>
                  <option value="OUTRO">Outro / Geral</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  CPF / CNPJ (Opcional)
                </label>
                <input
                  type="text"
                  value={editConDoc}
                  onChange={(e) => setEditConDoc(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:border-sky-500 text-zinc-900 dark:text-zinc-100 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Anotações / Chave PIX (Opcional)
                </label>
                <textarea
                  rows={2}
                  value={editConNotes}
                  onChange={(e) => setEditConNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:border-sky-500 text-zinc-900 dark:text-zinc-100 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={closeEditContact}
                  className="px-4 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={editConSaving}
                  className="px-5 py-2 text-xs font-bold bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white rounded-lg shadow-md shadow-sky-600/20 transition-all flex items-center gap-1.5"
                >
                  {editConSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  <span>Salvar Alterações</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Modal de Amortização de Dívida */}
      {amortizeModalDebt && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-zinc-100 dark:border-zinc-800 bg-gradient-to-r from-emerald-50/50 via-white to-white dark:from-emerald-950/20 dark:via-zinc-900 dark:to-zinc-900">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 shadow-sm">
                  <Coins className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                    Amortizar Dívida
                  </h3>
                  <p className="text-xs text-zinc-400">
                    {amortizeModalDebt.title} • Saldo Restante: {formatCurrency(amortizeModalDebt.remaining_amount_cents)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeAmortizeDebt}
                className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAmortizeDebt} className="p-5 space-y-4">
              {amortizeError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{amortizeError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Valor Pago / Amortizado (R$)
                </label>
                <input
                  type="text"
                  required
                  placeholder="0,00"
                  value={amortizeAmountStr}
                  onChange={(e) => setAmortizeAmountStr(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:border-emerald-500 font-mono font-bold text-zinc-900 dark:text-zinc-100"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={closeAmortizeDebt}
                  className="px-4 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={amortizeSaving}
                  className="px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg shadow-md shadow-emerald-600/20 transition-all flex items-center gap-1.5"
                >
                  {amortizeSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  <span>Confirmar Pagamento</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Modal de Edição de Orçamento */}
      {editModalBudget && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-zinc-100 dark:border-zinc-800 bg-gradient-to-r from-sky-50/50 via-white to-white dark:from-sky-950/20 dark:via-zinc-900 dark:to-zinc-900">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-sky-100 dark:bg-sky-950/80 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-800/60 shadow-sm">
                  <Pencil className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                    Ajustar Teto Orçamentário
                  </h3>
                  <p className="text-xs text-zinc-400">
                    {editModalBudget.category_name} • {monthNames[editModalBudget.month - 1]} / {editModalBudget.year}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeEditBudget}
                className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditBudget} className="p-5 space-y-4">
              {editBudgetError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{editBudgetError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Novo Teto Mensal Máximo (R$)
                </label>
                <input
                  type="text"
                  required
                  placeholder="0,00"
                  value={editBudgetLimitStr}
                  onChange={(e) => setEditBudgetLimitStr(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:border-sky-500 font-mono font-bold text-zinc-900 dark:text-zinc-100"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={closeEditBudget}
                  className="px-4 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={editBudgetSaving}
                  className="px-5 py-2 text-xs font-bold bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white rounded-lg shadow-md shadow-sky-600/20 transition-all flex items-center gap-1.5"
                >
                  {editBudgetSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  <span>Salvar Limite</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Edição de Meta */}
      {editModalGoal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-indigo-500" />
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  Editar Meta Financeira
                </h3>
              </div>
              <button
                type="button"
                onClick={closeEditGoal}
                className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditGoal} className="p-5 space-y-4">
              {editGoalError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{editGoalError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Título da Meta
                </label>
                <input
                  type="text"
                  required
                  value={editGoalTitle}
                  onChange={(e) => setEditGoalTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Valor Alvo (R$)
                  </label>
                  <input
                    type="text"
                    required
                    value={editGoalTargetAmountStr}
                    onChange={(e) => setEditGoalTargetAmountStr(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg font-mono font-bold text-zinc-900 dark:text-zinc-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Valor Acumulado (R$)
                  </label>
                  <input
                    type="text"
                    value={editGoalCurrentAmountStr}
                    onChange={(e) => setEditGoalCurrentAmountStr(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg font-mono text-zinc-900 dark:text-zinc-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Data Limite (Opcional)
                  </label>
                  <input
                    type="date"
                    value={editGoalTargetDate}
                    onChange={(e) => setEditGoalTargetDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg font-mono text-zinc-900 dark:text-zinc-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Status da Meta
                  </label>
                  <select
                    value={editGoalStatus}
                    onChange={(e) => setEditGoalStatus(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 font-medium"
                  >
                    <option value="EM_ANDAMENTO">Em Andamento</option>
                    <option value="CONCLUIDA">Concluída</option>
                    <option value="CANCELADA">Cancelada</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={closeEditGoal}
                  className="px-4 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={editGoalSaving}
                  className="px-5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg shadow-md shadow-indigo-600/20 transition-all flex items-center gap-1.5"
                >
                  {editGoalSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  <span>Salvar Alterações</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Aporte / Resgate de Meta */}
      {contributeModalGoal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <Coins className="w-5 h-5 text-emerald-500" />
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                    Aporte / Resgate de Meta
                  </h3>
                  <p className="text-[11px] text-zinc-400">
                    {contributeModalGoal.title}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeContributeGoal}
                className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveContributeGoal} className="p-5 space-y-4">
              {contributeError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{contributeError}</span>
                </div>
              )}

              {/* Toggle Aporte vs Resgate */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl">
                <button
                  type="button"
                  onClick={() => setContributeAction("APORTE")}
                  className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                    contributeAction === "APORTE"
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900"
                  }`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Aporte (Depositar)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setContributeAction("RESGATE")}
                  className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                    contributeAction === "RESGATE"
                      ? "bg-rose-600 text-white shadow-sm"
                      : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900"
                  }`}
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                  <span>Resgate (Retirar)</span>
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Valor da Movimentação (R$)
                </label>
                <input
                  type="text"
                  required
                  placeholder="0,00"
                  value={contributeAmountStr}
                  onChange={(e) => setContributeAmountStr(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg font-mono font-bold text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/30 border border-zinc-100 dark:border-zinc-800 text-xs text-zinc-500 space-y-1">
                <div className="flex justify-between">
                  <span>Saldo Atual:</span>
                  <strong className="font-mono">{formatCurrency(contributeModalGoal.current_amount_cents)}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Meta Alvo:</span>
                  <strong className="font-mono">{formatCurrency(contributeModalGoal.target_amount_cents)}</strong>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={closeContributeGoal}
                  className="px-4 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={contributeSaving}
                  className={`px-5 py-2 text-xs font-bold disabled:opacity-50 text-white rounded-lg shadow-md transition-all flex items-center gap-1.5 ${
                    contributeAction === "APORTE"
                      ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20"
                      : "bg-rose-600 hover:bg-rose-700 shadow-rose-600/20"
                  }`}
                >
                  {contributeSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  <span>Confirmar {contributeAction === "APORTE" ? "Aporte" : "Resgate"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Reajuste de Assinatura & Recorrência */}
      {adjustModalSchedule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <Pencil className="w-5 h-5 text-indigo-500" />
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                    Reajustar Assinatura / Contrato
                  </h3>
                  <p className="text-[11px] text-zinc-400">
                    {adjustModalSchedule.description}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeAdjustSchedule}
                className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAdjustSchedule} className="p-5 space-y-4">
              {adjustError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{adjustError}</span>
                </div>
              )}

              <div className="p-3 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200/50 dark:border-indigo-800/40 text-xs text-indigo-700 dark:text-indigo-300 leading-relaxed">
                💡 O novo valor e dia de vencimento serão aplicados a todos os <strong>lançamentos futuros pendentes</strong> ({adjustModalSchedule.pending_count} parcelas/meses). O histórico já quitado permanecerá inalterado.
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Novo Valor por Parcela / Mês (R$)
                </label>
                <input
                  type="text"
                  required
                  placeholder="0,00"
                  value={adjustAmountStr}
                  onChange={(e) => setAdjustAmountStr(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg font-mono font-bold text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Dia de Vencimento
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={31}
                    required
                    value={adjustDueDay}
                    onChange={(e) => setAdjustDueDay(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg font-mono text-zinc-900 dark:text-zinc-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Descrição Base
                  </label>
                  <input
                    type="text"
                    value={adjustDescription}
                    onChange={(e) => setAdjustDescription(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={closeAdjustSchedule}
                  className="px-4 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={adjustSaving}
                  className="px-5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg shadow-md shadow-indigo-600/20 transition-all flex items-center gap-1.5"
                >
                  {adjustSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  <span>Aplicar Reajuste Futuro</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
        </main>
      </div>

      {/* Modal Interativo com Guia Passo a Passo do App Mobile */}
      <MobileAppGuideModal
        isOpen={showGuide}
        onClose={() => setShowGuide(false)}
      />
    </div>
  );
};
