export type ExpenseStatus = "PENDENTE" | "CONCLUIDO" | "CANCELADO";

export type EssentialityType = "OBRIGATORIO" | "NECESSARIO" | "DESEJO" | "NENHUM";

export type PaymentMethodType =
  | "CARTAO_CREDITO"
  | "CARTAO_DEBITO"
  | "DINHEIRO"
  | "PIX"
  | "BOLETO"
  | "OUTRO";

export interface User {
  id: string;
  username: string;
  is_active: boolean;
  is_admin: boolean;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface Category {
  id: string;
  user_id: string;
  name: string;
  icon: string;
  color: string;
  created_at: string;
}

export interface CategoryCreateInput {
  name: string;
  icon?: string;
  color?: string;
}

export interface CategoryUpdateInput {
  name?: string;
  icon?: string;
  color?: string;
}

export interface PaymentMethod {
  id: string;
  user_id: string;
  name: string;
  type: PaymentMethodType;
  created_at: string;
}

export interface PaymentMethodCreateInput {
  name: string;
  type: PaymentMethodType;
}

export interface PaymentMethodUpdateInput {
  name?: string;
  type?: PaymentMethodType;
}

export interface Payment {
  id: string;
  user_id: string;
  expense_id: string;
  installment_number: number;
  amount_cents: number;
  due_date: string; // YYYY-MM-DD
  paid_at: string | null;
  status: ExpenseStatus;
  created_at: string;
  updated_at: string;
}

export interface PaymentStatusUpdateInput {
  status: ExpenseStatus;
  paid_at?: string | null;
}

export interface Expense {
  id: string;
  user_id: string;
  category_id: string | null;
  payment_method_id: string | null;
  description: string;
  total_amount_cents: number;
  issue_date: string; // YYYY-MM-DD
  due_date: string; // YYYY-MM-DD
  essentiality: EssentialityType;
  status: ExpenseStatus;
  installments_count: number;
  is_recurring: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
  category?: Category | null;
  payment_method?: PaymentMethod | null;
  payments: Payment[];
}

export interface ExpenseCreateInput {
  description: string;
  total_amount_cents: number;
  issue_date: string;
  due_date: string;
  category_id?: string | null;
  payment_method_id?: string | null;
  essentiality?: EssentialityType;
  status?: ExpenseStatus;
  installments_count?: number;
  is_recurring?: boolean;
  notes?: string | null;
}

export interface ExpenseUpdateInput {
  description?: string;
  category_id?: string | null;
  payment_method_id?: string | null;
  essentiality?: EssentialityType;
  status?: ExpenseStatus;
  is_recurring?: boolean;
  notes?: string | null;
}

export interface ExpenseFilterParams {
  month?: string; // YYYY-MM
  status?: ExpenseStatus;
  category_id?: string;
  payment_method_id?: string;
  essentiality?: EssentialityType;
}

export interface CategorySpending {
  category_id: string | null;
  category_name: string;
  color: string;
  icon: string;
  total_cents: number;
  percentage: number;
}

export interface EssentialitySpending {
  essentiality: EssentialityType;
  total_cents: number;
  percentage: number;
}

export interface UpcomingPayment {
  payment_id: string;
  expense_id: string;
  description: string;
  installment_text: string;
  amount_cents: number;
  due_date: string;
  category_name: string;
  color: string;
  status: ExpenseStatus;
}

export interface DashboardMetrics {
  period: string;
  total_expenses_cents: number;
  total_paid_cents: number;
  total_pending_cents: number;
  total_overdue_cents: number;
  by_category: CategorySpending[];
  by_essentiality: EssentialitySpending[];
  upcoming_payments: UpcomingPayment[];
}

export interface ApiErrorDetail {
  detail: string | Array<{ loc: string[]; msg: string; type: string }>;
}
