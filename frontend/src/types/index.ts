export type ExpenseStatus = "PENDENTE" | "CONCLUIDO" | "CANCELADO";

export type EssentialityType = "OBRIGATORIO" | "NECESSARIO" | "DESEJO" | "NENHUM";

export type PaymentMethodType =
  | "CARTAO_CREDITO"
  | "CARTAO_DEBITO"
  | "DINHEIRO"
  | "PIX"
  | "BOLETO"
  | "OUTRO";

export type NavTab = "inicio" | "registros" | "contatos" | "configuracoes";

export interface User {
  id: string;
  username: string;
  is_active: boolean;
  is_admin: boolean;
  created_at: string;
}

export interface UserCreateInput {
  username: string;
  password: string;
  is_admin?: boolean;
}

export interface UserUpdateInput {
  password?: string;
  is_admin?: boolean;
  is_active?: boolean;
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

export interface Item {
  id: string;
  user_id: string;
  category_id: string;
  name: string;
  nature: EssentialityType;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  category?: Category | null;
}

export interface ItemCreateInput {
  name: string;
  category_id: string;
  nature?: EssentialityType;
  is_active?: boolean;
}

export interface ItemUpdateInput {
  name?: string;
  category_id?: string;
  nature?: EssentialityType;
  is_active?: boolean;
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

export interface Contact {
  id: string;
  user_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ContactCreateInput {
  name: string;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
  is_active?: boolean;
}

export interface ContactUpdateInput {
  name?: string;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
  is_active?: boolean;
}

export interface PlannedPaymentItem {
  payment_id: string;
  expense_id: string;
  description: string;
  installment_number: number;
  installments_count: number;
  amount_cents: number;
  due_date: string;
  status: ExpenseStatus;
  category_name: string;
  category_color: string;
  item_name: string;
  payment_method_name: string | null;
}

export interface ContactSummaryResponse {
  contact: Contact;
  total_expenses_cents: number;
  total_paid_cents: number;
  total_pending_cents: number;
  expenses_count: number;
  planned_payments: PlannedPaymentItem[];
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
  item_id: string | null;
  contact_id: string | null;
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
  item?: Item | null;
  contact?: Contact | null;
  payment_method?: PaymentMethod | null;
  payments: Payment[];
}

export interface ExpenseCreateInput {
  description: string;
  total_amount_cents: number;
  issue_date: string;
  due_date: string;
  item_id: string;
  contact_id: string;
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
  total_amount_cents?: number;
  issue_date?: string;
  due_date?: string;
  category_id?: string | null;
  item_id?: string | null;
  contact_id?: string | null;
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
  item_id?: string;
  contact_id?: string;
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

export interface ItemSpending {
  item_id: string | null;
  item_name: string;
  category_name: string;
  nature: EssentialityType;
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

export interface MonthlySpending {
  month: number;
  month_name: string;
  total_cents: number;
  paid_cents: number;
  pending_cents: number;
}

export interface DashboardMetrics {
  period: string;
  year: number;
  total_expenses_cents: number;
  total_paid_cents: number;
  total_pending_cents: number;
  total_overdue_cents: number;
  monthly_breakdown: MonthlySpending[];
  by_category: CategorySpending[];
  by_item: ItemSpending[];
  by_essentiality: EssentialitySpending[];
  upcoming_payments: UpcomingPayment[];
}


export interface DatabaseDiagnostics {
  engine: string;
  driver: string;
  status: string;
  database_name: string;
  server_host: string;
  server_port: number;
  latency_ms: number;
  currency_storage_mode: string;
  zero_residual_precision: boolean;
  size_bytes: number;
  size_pretty: string;
}


export interface VolumetricStats {
  total_categories: number;
  total_contacts?: number;
  total_items: number;
  total_payment_methods: number;
  total_expenses: number;
  total_payments: number;
  total_users: number;
}

export interface ApplicationDiagnostics {
  app_name: string;
  version: string;
  environment: string;
  framework: string;
  auth_algorithm: string;
  password_hasher: string;
}

export interface SystemDiagnosticsResponse {
  timestamp: string;
  database: DatabaseDiagnostics;
  volumetrics: VolumetricStats;
  application: ApplicationDiagnostics;
}

export interface ApiErrorDetail {
  detail: string | Array<{ loc: string[]; msg: string; type: string }>;
}

export interface VersionRelease {
  version: string;
  release_date: string;
  is_current: boolean;
  highlights?: string | null;
  improvements: string[];
  fixes: string[];
}

export interface SystemVersionResponse {
  current_version: string;
  app_name: string;
  environment: string;
  release_date?: string | null;
  releases: VersionRelease[];
}


