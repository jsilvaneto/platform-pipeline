import { api } from "./client";
import {
  Category,
  CategoryCreateInput,
  CategoryUpdateInput,
  Contact,
  ContactCreateInput,
  ContactUpdateInput,
  ContactSummaryResponse,
  Item,
  ItemCreateInput,
  ItemUpdateInput,
  PaymentMethod,
  PaymentMethodCreateInput,
  PaymentMethodUpdateInput,
  Expense,
  ExpenseCreateInput,
  ExpenseUpdateInput,
  ExpenseFilterParams,
  PaginatedExpenses,
  Payment,
  PaymentStatusUpdateInput,
  PaymentUpdateInput,
  DashboardMetrics,
  User,
  UserCreateInput,
  UserUpdateInput,
  SystemDiagnosticsResponse,
  VersionRelease,
  SystemVersionResponse,
  CommitmentsSummary,
  BackupSource,
  BackupStatusResponse,
  BackupListResponse,
  BackupCreateResponse,
  BackupRestoreRequest,
  BackupRestoreResponse,
  CalendarMonthResponse,
} from "../types";


export const walletApi = {
  // Categorias
  async getCategories(): Promise<Category[]> {
    const { data } = await api.get<Category[]>("/categories/");
    return data;
  },

  async createCategory(input: CategoryCreateInput): Promise<Category> {
    const { data } = await api.post<Category>("/categories/", input);
    return data;
  },

  async updateCategory(id: string, input: CategoryUpdateInput): Promise<Category> {
    const { data } = await api.put<Category>(`/categories/${id}`, input);
    return data;
  },

  async deleteCategory(id: string): Promise<void> {
    await api.delete(`/categories/${id}`);
  },

  // Contatos
  async getContacts(params?: { active_only?: boolean; search?: string }): Promise<Contact[]> {
    const { data } = await api.get<Contact[]>("/contacts/", { params });
    return data;
  },

  async getContact(id: string): Promise<Contact> {
    const { data } = await api.get<Contact>(`/contacts/${id}`);
    return data;
  },

  async getContactSummary(id: string): Promise<ContactSummaryResponse> {
    const { data } = await api.get<ContactSummaryResponse>(`/contacts/${id}/summary`);
    return data;
  },

  async createContact(input: ContactCreateInput): Promise<Contact> {
    const { data } = await api.post<Contact>("/contacts/", input);
    return data;
  },

  async updateContact(id: string, input: ContactUpdateInput): Promise<Contact> {
    const { data } = await api.put<Contact>(`/contacts/${id}`, input);
    return data;
  },

  async deleteContact(id: string): Promise<void> {
    await api.delete(`/contacts/${id}`);
  },

  // Itens de Despesa
  async getItems(params?: { category_id?: string; active_only?: boolean }): Promise<Item[]> {
    const { data } = await api.get<Item[]>("/items/", { params });
    return data;
  },

  async getItem(id: string): Promise<Item> {
    const { data } = await api.get<Item>(`/items/${id}`);
    return data;
  },

  async createItem(input: ItemCreateInput): Promise<Item> {
    const { data } = await api.post<Item>("/items/", input);
    return data;
  },

  async updateItem(id: string, input: ItemUpdateInput): Promise<Item> {
    const { data } = await api.put<Item>(`/items/${id}`, input);
    return data;
  },

  async deleteItem(id: string): Promise<void> {
    await api.delete(`/items/${id}`);
  },

  // Formas de Pagamento
  async getPaymentMethods(): Promise<PaymentMethod[]> {
    const { data } = await api.get<PaymentMethod[]>("/payment-methods/");
    return data;
  },

  async createPaymentMethod(input: PaymentMethodCreateInput): Promise<PaymentMethod> {
    const { data } = await api.post<PaymentMethod>("/payment-methods/", input);
    return data;
  },

  async updatePaymentMethod(id: string, input: PaymentMethodUpdateInput): Promise<PaymentMethod> {
    const { data } = await api.put<PaymentMethod>(`/payment-methods/${id}`, input);
    return data;
  },

  async deletePaymentMethod(id: string): Promise<void> {
    await api.delete(`/payment-methods/${id}`);
  },

  // Despesas
  async getExpenses(params?: ExpenseFilterParams): Promise<Expense[]> {
    const { data } = await api.get<Expense[]>("/expenses/", { params });
    return data;
  },

  async getPaginatedExpenses(params?: ExpenseFilterParams): Promise<PaginatedExpenses> {
    const response = await api.get<Expense[]>("/expenses/", { params });
    const total = Number(response.headers["x-total-count"] || response.data.length);
    const page = Number(response.headers["x-page"] || params?.page || 1);
    const pageSize = Number(response.headers["x-page-size"] || params?.page_size || response.data.length || 10);
    const totalPages = Number(response.headers["x-total-pages"] || Math.ceil(total / (pageSize || 1)) || 1);
    return {
      items: response.data,
      total,
      page,
      pageSize,
      totalPages,
    };
  },

  async getExpense(id: string): Promise<Expense> {
    const { data } = await api.get<Expense>(`/expenses/${id}`);
    return data;
  },

  async createExpense(input: ExpenseCreateInput): Promise<Expense> {
    const { data } = await api.post<Expense>("/expenses/", input);
    return data;
  },

  async updateExpense(id: string, input: ExpenseUpdateInput): Promise<Expense> {
    const { data } = await api.put<Expense>(`/expenses/${id}`, input);
    return data;
  },

  async deleteExpense(id: string): Promise<void> {
    await api.delete(`/expenses/${id}`);
  },

  // Pagamentos / Parcelas
  async updatePayment(paymentId: string, input: PaymentUpdateInput): Promise<Payment> {
    const { data } = await api.patch<Payment>(`/payments/${paymentId}`, input);
    return data;
  },

  async updatePaymentStatus(paymentId: string, input: PaymentStatusUpdateInput): Promise<Payment> {
    const { data } = await api.patch<Payment>(`/payments/${paymentId}/status`, input);
    return data;
  },

  // Dashboard
  async getDashboardMetrics(params?: { year?: number; month?: string }): Promise<DashboardMetrics> {
    const { data } = await api.get<DashboardMetrics>("/dashboard/metrics", {
      params,
    });
    return data;
  },

  // Calendário Financeiro
  async getCalendarMonth(month: string): Promise<CalendarMonthResponse> {
    const { data } = await api.get<CalendarMonthResponse>("/calendar/month", {
      params: { month },
    });
    return data;
  },


  // Usuários (Gestão de Acesso)
  async getUsers(): Promise<User[]> {
    const { data } = await api.get<User[]>("/users/");
    return data;
  },

  async createUser(input: UserCreateInput): Promise<User> {
    const { data } = await api.post<User>("/users/", input);
    return data;
  },

  async updateUser(id: string, input: UserUpdateInput): Promise<User> {
    const { data } = await api.patch<User>(`/users/${id}`, input);
    return data;
  },

  async deleteUser(id: string): Promise<void> {
    await api.delete(`/users/${id}`);
  },

  // Sistema & Diagnósticos de Infraestrutura
  async getSystemDiagnostics(): Promise<SystemDiagnosticsResponse> {
    const { data } = await api.get<SystemDiagnosticsResponse>("/system/diagnostics");
    return data;
  },

  async getSystemVersion(): Promise<SystemVersionResponse> {
    const { data } = await api.get<SystemVersionResponse>("/system/version");
    return data;
  },

  async getChangelog(): Promise<VersionRelease[]> {
    const { data } = await api.get<VersionRelease[]>("/system/changelog");
    return data;
  },

  // Compromissos Financeiros (Recorrências & Parcelamentos)
  async getCommitmentsSummary(): Promise<CommitmentsSummary> {
    const { data } = await api.get<CommitmentsSummary>("/commitments/summary");
    return data;
  },

  async toggleRecurringCommitment(expenseId: string): Promise<Expense> {
    const { data } = await api.patch<Expense>(`/commitments/${expenseId}/toggle-status`);
    return data;
  },

  // Gestão de Backups & Google Drive
  async getBackupStatus(): Promise<BackupStatusResponse> {
    const { data } = await api.get<BackupStatusResponse>("/backups/status");
    return data;
  },

  async getBackups(): Promise<BackupListResponse> {
    const { data } = await api.get<BackupListResponse>("/backups/");
    return data;
  },

  async createBackup(): Promise<BackupCreateResponse> {
    const { data } = await api.post<BackupCreateResponse>("/backups/create");
    return data;
  },

  async restoreBackup(input: BackupRestoreRequest): Promise<BackupRestoreResponse> {
    const { data } = await api.post<BackupRestoreResponse>("/backups/restore", input);
    return data;
  },

  async downloadBackup(backupId: string, source: BackupSource, filename: string): Promise<void> {
    const response = await api.get(`/backups/${backupId}/download`, {
      params: { source },
      responseType: "blob",
    });
    const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement("a");
    link.href = blobUrl;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(blobUrl);
  },
};

