export type ExpenseStatus = "PENDENTE" | "CONCLUIDO" | "CANCELADO";

export type EssentialityType = "OBRIGATORIO" | "NECESSARIO" | "DESEJO" | "NENHUM";

export type PaymentMethodType =
  | "CARTAO_CREDITO"
  | "CARTAO_DEBITO"
  | "DINHEIRO"
  | "PIX"
  | "BOLETO"
  | "OUTRO";

export type NavTab = "inicio" | "registros" | "calendario" | "compromissos" | "configuracoes";

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
  attachments?: Attachment[];
}

export interface PaymentStatusUpdateInput {
  status: ExpenseStatus;
  paid_at?: string | null;
}

export interface PaymentUpdateInput {
  amount_cents?: number;
  due_date?: string;
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
  attachments?: Attachment[];
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
  is_overdue?: boolean;
  page?: number;
  page_size?: number;
}

export interface PaginatedExpenses {
  items: Expense[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
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

export interface ItemSpending {
  item_id: string | null;
  item_name: string;
  category_name: string;
  nature: EssentialityType;
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

export interface OverduePayment {
  payment_id: string;
  expense_id: string;
  description: string;
  installment_text: string;
  amount_cents: number;
  due_date: string;
  days_overdue: number;
  category_name: string;
  color: string;
  contact_name?: string | null;
}

export interface DailySpending {
  day: number;
  date: string;
  weekday_name: string;
  total_cents: number;
  paid_cents: number;
  pending_cents: number;
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
  month?: string | null;
  view_mode?: "annual" | "monthly";
  total_expenses_cents: number;
  total_paid_cents: number;
  total_pending_cents: number;
  total_overdue_cents: number;
  monthly_breakdown: MonthlySpending[];
  daily_breakdown?: DailySpending[];
  by_category: CategorySpending[];
  by_item: ItemSpending[];
  by_essentiality: EssentialitySpending[];
  upcoming_payments: UpcomingPayment[];
  overdue_payments?: OverduePayment[];
}

export interface CalendarPaymentItem {
  payment_id: string;
  expense_id: string;
  description: string;
  installment_text: string;
  amount_cents: number;
  due_date: string;
  status: ExpenseStatus;
  paid_at?: string | null;
  is_recurring: boolean;
  is_overdue: boolean;
  category_name: string;
  category_color: string;
  category_icon: string;
  contact_name?: string | null;
}

export interface CalendarDay {
  date: string;
  day: number;
  weekday: number;
  weekday_name: string;
  is_current_month: boolean;
  is_today: boolean;
  total_cents: number;
  paid_cents: number;
  pending_cents: number;
  overdue_cents: number;
  has_overdue: boolean;
  payments: CalendarPaymentItem[];
}

export interface CalendarMonthResponse {
  month: string;
  year: number;
  month_num: number;
  month_name: string;
  total_cents: number;
  paid_cents: number;
  pending_cents: number;
  overdue_cents: number;
  peak_day?: string | null;
  peak_day_amount_cents: number;
  days: CalendarDay[];
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

export interface NextPayoffInfo {
  expense_id: string;
  description: string;
  item_name?: string | null;
  remaining_installments: number;
  total_installments: number;
  payoff_due_date: string;
  remaining_cents: number;
}

export interface MonthlyCommitmentProjection {
  month: string;
  month_name: string;
  recurring_cents: number;
  installments_cents: number;
  total_cents: number;
}

export interface RecurringCommitmentItem {
  expense_id: string;
  description: string;
  item_id?: string | null;
  item_name?: string | null;
  category_id?: string | null;
  category_name?: string | null;
  category_color?: string | null;
  contact_name?: string | null;
  payment_method_name?: string | null;
  amount_cents: number;
  due_day: number;
  status: string;
  next_due_date?: string | null;
  next_payment_id?: string | null;
  next_payment_status?: string | null;
}

export interface InstallmentCommitmentItem {
  expense_id: string;
  description: string;
  item_name?: string | null;
  category_name?: string | null;
  category_color?: string | null;
  contact_name?: string | null;
  total_amount_cents: number;
  paid_amount_cents: number;
  remaining_amount_cents: number;
  installment_amount_cents: number;
  total_installments: number;
  paid_installments: number;
  remaining_installments: number;
  progress_percentage: number;
  next_due_date?: string | null;
  last_due_date?: string | null;
  payments: Payment[];
}

export interface CommitmentsSummary {
  fixed_monthly_total_cents: number;
  active_recurring_count: number;
  total_installments_remaining_cents: number;
  active_installments_count: number;
  next_payoff?: NextPayoffInfo | null;
  recurring_commitments: RecurringCommitmentItem[];
  installment_commitments: InstallmentCommitmentItem[];
  monthly_projection: MonthlyCommitmentProjection[];
}

// Tipos de Backup e Armazenamento
export interface BackupItem {
  id: string;
  filename: string;
  size_bytes: number;
  size_pretty: string;
  created_at: string;
  source: "local";
}

export interface BackupListResponse {
  items: BackupItem[];
  total: number;
}

export interface BackupStatusResponse {
  local_backups_count: number;
  total_disk_usage_pretty: string;
  last_backup_at?: string | null;
  retention_days: number;
  backups_dir: string;
}

export interface BackupCreateResponse {
  success: boolean;
  filename: string;
  size_bytes: number;
  size_pretty: string;
  created_at: string;
  message: string;
}

export interface BackupRestoreRequest {
  backup_id: string;
  source?: "local";
  confirmation_token: string;
}

export interface BackupRestoreResponse {
  success: boolean;
  message: string;
  restored_at: string;
}


// ----------------------------------------------------------------------
// Armazenamento & Diretórios Host (WSL / Windows)
// ----------------------------------------------------------------------

export interface DirectoryHealth {
  configured_path: string;
  resolved_path: string;
  exists: boolean;
  is_writable: boolean;
  free_space_bytes: number;
  free_space_pretty: string;
  total_space_bytes: number;
  total_space_pretty: string;
  files_count: number;
  total_files_size_pretty: string;
  error_message?: string | null;
}

export interface StorageSuggestion {
  label: string;
  backups_dir: string;
  attachments_dir: string;
}

export interface StorageConfigResponse {
  backups: DirectoryHealth;
  attachments: DirectoryHealth;
  backup_retention_days: number;
  detected_suggestions: StorageSuggestion[];
}

export interface StorageConfigUpdate {
  backups_dir: string;
  attachments_dir: string;
  backup_retention_days: number;
}

// ----------------------------------------------------------------------
// Anexos & Categorização de Documentos
// ----------------------------------------------------------------------

export type AttachmentCategory =
  | "COMPROVANTE_PAGAMENTO"
  | "NOTA_FISCAL"
  | "FATURA_BOLETO"
  | "CONTRATO"
  | "OUTRO";

export interface Attachment {
  id: string;
  user_id: string;
  expense_id?: string | null;
  payment_id?: string | null;
  category: AttachmentCategory;
  original_filename: string;
  content_type: string;
  file_size_bytes: number;
  file_size_pretty: string;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface AttachmentListResponse {
  items: Attachment[];
  total: number;
}

// ----------------------------------------------------------------------
// Integração Oficial BudgetBakers Wallet REST API
// ----------------------------------------------------------------------

export type WalletSyncStatus =
  | "NOT_CONFIGURED"
  | "PENDING"
  | "IN_PROGRESS"
  | "SUCCESS"
  | "FAILED"
  | "RATE_LIMITED";

export interface WalletIntegrationResponse {
  id: string;
  user_id: string;
  api_base_url: string;
  token_masked?: string | null;
  is_configured: boolean;
  is_active: boolean;
  last_sync_at?: string | null;
  last_sync_rev?: number | null;
  last_sync_status: WalletSyncStatus;
  last_error_message?: string | null;
  rate_limit_remaining?: number | null;
  rate_limit_limit?: number | null;
  rate_limit_reset_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface WalletIntegrationCreate {
  api_key: string;
  api_base_url?: string;
}

export interface WalletIntegrationTestRequest {
  api_key?: string;
}

export interface WalletIntegrationTestResponse {
  success: boolean;
  message: string;
  latency_ms: number;
  status_code: number;
  api_usage?: Record<string, unknown> | null;
}

export type WalletSyncMode = "full" | "incremental";

export interface WalletSyncJobStatus {
  is_running: boolean;
  step: string;
  progress_percent: number;
  message: string;
  status: "IDLE" | "IN_PROGRESS" | "SUCCESS" | "FAILED" | "RATE_LIMITED" | "INIT_SYNC_WAITING";
  started_at?: string | null;
  finished_at?: string | null;
  error?: string | null;
  items_synced?: {
    accounts: number;
    categories: number;
    labels: number;
    records: number;
    budgets: number;
    standing_orders: number;
    goals: number;
  };
}

// ----------------------------------------------------------------------
// Inteligência Financeira: Análises Passadas e Futuras
// ----------------------------------------------------------------------

export interface NetWorthSummary {
  total_net_worth_cents: number;
  total_assets_cents: number;
  total_liabilities_cents: number;
  currency_code: string;
}

export interface NetWorthPoint {
  date: string;
  net_worth_cents: number;
  assets_cents: number;
  liabilities_cents: number;
}

export interface CashFlowMonthly {
  period: string;
  month_name: string;
  income_cents: number;
  expense_cents: number;
  net_savings_cents: number;
  savings_rate_percent: number;
}

export interface EssentialityBreakdown {
  cardinality: string;
  label: string;
  total_cents: number;
  percentage: number;
  color: string;
}

export interface CategoryBreakdown {
  category_id: string;
  name: string;
  group_name?: string | null;
  color: string;
  icon: string;
  cardinality: string;
  total_cents: number;
  percentage: number;
  records_count: number;
}

export interface LabelBreakdown {
  label_id: string;
  name: string;
  color: string;
  total_cents: number;
  records_count: number;
}

export interface ReconciliationMetrics {
  total_records: number;
  reconciled_count: number;
  cleared_count: number;
  uncleared_count: number;
  void_count: number;
  reconciled_percent: number;
}

export interface HistoricalAnalyticsResponse {
  net_worth: NetWorthSummary;
  net_worth_history: NetWorthPoint[];
  monthly_cash_flow: CashFlowMonthly[];
  by_essentiality: EssentialityBreakdown[];
  top_categories: CategoryBreakdown[];
  top_labels: LabelBreakdown[];
  reconciliation: ReconciliationMetrics;
}

export interface DailyBalanceProjection {
  date: string;
  weekday: string;
  day_inflow_cents: number;
  day_outflow_cents: number;
  projected_balance_cents: number;
  is_negative: boolean;
  scheduled_items_count: number;
}

export interface UpcomingScheduledItem {
  id: string;
  name: string;
  amount_cents: number;
  record_type: string;
  due_date: string;
  account_name: string;
  category_name: string;
  category_color: string;
  recurrence_rule: string;
  reminder: string;
}

export interface GoalProjection {
  goal_id: string;
  name: string;
  target_amount_cents: number;
  current_amount_cents: number;
  progress_percent: number;
  desired_date?: string | null;
  estimated_completion_date?: string | null;
  is_on_track: boolean;
  monthly_savings_needed_cents: number;
  state: string;
}

export interface BudgetForecast {
  budget_id: string;
  name: string;
  limit_cents: number;
  spent_so_far_cents: number;
  projected_end_of_period_cents: number;
  is_exceeded_projected: boolean;
  burn_rate_daily_cents: number;
  remaining_cents: number;
  days_remaining: number;
}

export interface LiquidityAlert {
  severity: string;
  title: string;
  description: string;
  date_expected: string;
  projected_deficit_cents: number;
}

export interface FutureAnalyticsResponse {
  horizon_days: number;
  current_liquid_balance_cents: number;
  projected_lowest_balance_cents: number;
  projected_lowest_date?: string | null;
  daily_projections: DailyBalanceProjection[];
  upcoming_scheduled: UpcomingScheduledItem[];
  goals_projections: GoalProjection[];
  budgets_forecast: BudgetForecast[];
  liquidity_alerts: LiquidityAlert[];
}

export interface FinancialOverviewResponse {
  current_net_worth_cents: number;
  current_month_income_cents: number;
  current_month_expense_cents: number;
  current_month_balance_cents: number;
  savings_rate_percent: number;
  projected_30d_balance_cents: number;
  total_accounts_count: number;
  active_standing_orders_count: number;
  active_goals_count: number;
  liquidity_risk_detected: boolean;
  last_sync_at?: string | null;
}

export interface WalletAccount {
  id: string;
  user_id: string;
  name: string;
  account_type: string;
  currency_code: string;
  initial_balance_cents: number;
  current_balance_cents: number;
  credit_balance_cents?: number | null;
  credit_limit_cents?: number | null;
  available_credit_cents?: number | null;
  balance_mode?: string | null;
  exclude_from_stats: boolean;
  color: string;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface WalletRecord {
  id: string;
  user_id: string;
  account_id: string;
  account_name: string;
  category_id?: string | null;
  category_name?: string | null;
  category_color?: string | null;
  category_icon?: string | null;
  cardinality: string;
  record_type: "RECEITA" | "DESPESA" | "TRANSFERENCIA";
  amount_cents: number;
  currency_code: string;
  converted_amount_cents: number;
  record_date: string;
  record_state: "reconciled" | "cleared" | "uncleared" | "void" | "waitForAssign";
  counter_party?: string | null;
  note?: string | null;
  source: string;
  is_transfer: boolean;
  transfer_id?: string | null;
  labels: string[];
}

export interface PaginatedRecordsResponse {
  items: WalletRecord[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}











