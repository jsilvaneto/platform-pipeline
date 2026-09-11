import { api } from "./client";
import {
  Category,
  CategoryCreateInput,
  CategoryUpdateInput,
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
  Payment,
  PaymentStatusUpdateInput,
  DashboardMetrics,
  User,
  UserCreateInput,
  UserUpdateInput,
  SystemDiagnosticsResponse,
  VersionRelease,
  SystemVersionResponse,
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
};

