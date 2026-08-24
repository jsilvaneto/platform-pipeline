export type ProfileType = "PESSOAL" | "EMPRESA";
export type TransactionType = "RECEITA" | "DESPESA" | "TRANSFERENCIA";
export type TransactionStatus = "PENDENTE" | "CONCLUIDO" | "CANCELADO";
export type CategoryNature = "NENHUM" | "OBRIGATORIO" | "NECESSARIO" | "DESEJO";

export interface User {
  id: string;
  username: string;
  created_at: string;
}

export type AccountType = "CORRENTE" | "POUPANCA" | "INVESTIMENTO" | "CAIXA" | "OUTRO";

export interface Account {
  id: string;
  profile: ProfileType;
  name: string;
  type: AccountType;
  created_at: string;
}

export interface PaymentMethod {
  id: string;
  profile: ProfileType;
  name: string;
  created_at: string;
}

export interface CreditCard {
  id: string;
  profile: ProfileType;
  name: string;
  limit_cents: number;
  used_limit_cents: number;
  available_limit_cents: number;
  current_invoice_cents: number;
  closing_day: number;
  due_day: number;
  color: string;
  brand?: string | null;
  account_id?: string | null;
  account_name?: string | null;
  created_at: string;
}

export interface CreditCardInvoiceItem {
  id: string;
  description: string;
  amount_cents: number;
  category_id: string;
  category_name: string;
  contact_id?: string | null;
  contact_name?: string | null;
  due_date: string;
  payment_date?: string | null;
  created_at: string;
  installment_number?: number | null;
  total_installments?: number | null;
  status: TransactionStatus;
  notes?: string | null;
}

export interface CreditCardInvoiceSummary {
  card_id: string;
  card_name: string;
  month: number;
  year: number;
  period_start: string;
  period_end: string;
  due_date: string;
  status: "ABERTA" | "FECHADA" | "PAGA";
  total_cents: number;
  paid_cents: number;
  remaining_cents: number;
  items_count: number;
}

export interface CreditCardInvoiceDetail extends CreditCardInvoiceSummary {
  items: CreditCardInvoiceItem[];
}

export interface CreditCardInvoiceSettleRequest {
  account_id: string;
  payment_date: string;
  payment_method_id?: string | null;
  category_id?: string | null;
  amount_cents?: number | null;
  notes?: string | null;
}

export interface CreditCardInvoiceSettleResponse {
  card_id: string;
  month: number;
  year: number;
  total_settled_cents: number;
  settled_items_count: number;
  bank_transaction_id: string;
  message: string;
}

export type CategoryType = "RECEITA" | "DESPESA";

export interface Category {
  id: string;
  profile: ProfileType;
  type: CategoryType;
  name: string;
  nature: CategoryNature;
  created_at: string;
}

export interface Item {
  id: string;
  profile: ProfileType;
  category_id: string;
  name: string;
  default_amount_cents?: number | null;
  type: CategoryType;
  category_name?: string | null;
  category_type?: TransactionType | null;
  category_nature?: CategoryNature | null;
  created_at: string;
}

export interface Contact {
  id: string;
  profile: ProfileType;
  name: string;
  type: "FORNECEDOR" | "CLIENTE" | "FUNCIONARIO" | "OUTRO";
  document?: string;
  notes?: string;
  created_at: string;
}

export interface ContactSummary {
  total_paid_cents: number;
  total_received_cents: number;
  total_pending_pay_cents: number;
  total_pending_receive_cents: number;
  net_realized_cents: number;
  net_pending_cents: number;
  total_debts_cents: number;
  remaining_debts_cents: number;
  transactions_count: number;
  debts_count: number;
}

export interface ContactStatement {
  contact: Contact;
  summary: ContactSummary;
  transactions: Transaction[];
  debts: Debt[];
}

export interface Debt {
  id: string;
  profile: ProfileType;
  contact_id?: string;
  title: string;
  total_amount_cents: number;
  remaining_amount_cents: number;
  due_date?: string;
  status: "ATIVA" | "QUITADA" | "CANCELADA";
  created_at: string;
}

export interface Budget {
  id: string;
  profile: ProfileType;
  category_id: string;
  category_name?: string;
  month: number;
  year: number;
  limit_amount_cents: number;
  spent_amount_cents: number;
  remaining_amount_cents: number;
  percentage_used: number;
  created_at: string;
}

export interface Goal {
  id: string;
  profile: ProfileType;
  title: string;
  target_amount_cents: number;
  current_amount_cents: number;
  target_date?: string | null;
  status: "EM_ANDAMENTO" | "CONCLUIDA" | "CANCELADA";
  created_at: string;
  progress_percentage?: number;
}

export type ScheduleType = "RECORRENTE_CONTINUA" | "PARCELADA";
export type FrequencyType = "SEMANAL" | "MENSAL" | "TRIMESTRAL" | "SEMESTRAL" | "ANUAL";
export type ScheduleStatus = "ATIVO" | "PAUSADO" | "FINALIZADO" | "CANCELADO";

export interface Schedule {
  id: string;
  profile: ProfileType;
  type: TransactionType;
  account_id?: string | null;
  credit_card_id?: string | null;
  category_id: string;
  item_id?: string | null;
  contact_id?: string | null;
  debt_id?: string | null;
  payment_method_id?: string | null;
  description: string;
  schedule_type: ScheduleType;
  frequency: FrequencyType;
  amount_cents: number;
  total_installments?: number | null;
  start_date: string;
  due_day: number;
  status: ScheduleStatus;
  created_at: string;
  category_name?: string | null;
  account_name?: string | null;
  credit_card_name?: string | null;
  payment_method_name?: string | null;
  contact_name?: string | null;
  paid_count: number;
  pending_count: number;
  paid_amount_cents: number;
  pending_amount_cents: number;
  next_due_date?: string | null;
}

export interface Transaction {
  id: string;
  profile: ProfileType;
  type: TransactionType;
  account_id?: string | null;
  destination_account_id?: string | null;
  payment_method_id?: string | null;
  credit_card_id?: string | null;
  invoice_month?: number | null;
  invoice_year?: number | null;
  is_invoice_payment?: number;
  category_id?: string | null;
  item_id?: string | null;
  contact_id?: string | null;
  debt_id?: string | null;
  schedule_id?: string | null;
  installment_number?: number | null;
  total_installments?: number | null;
  description: string;
  amount_cents: number;
  due_date: string;
  payment_date?: string | null;
  status: TransactionStatus;
  sync_status: "PENDENTE" | "SINCRONIZADO";
  notes?: string | null;
  created_at: string;
  attachments?: Attachment[];
  attachments_count?: number;
}

export interface CategoryBreakdown {
  category_id: string;
  category_name: string;
  amount_cents: number;
  percentage: number;
}

export interface AccountBalanceSummary {
  account_id: string;
  account_name: string;
  account_type: "CORRENTE" | "POUPANCA" | "INVESTIMENTO" | "CAIXA" | string;
  balance_cents: number;
}

export interface MonthlyTrendItem {
  month: number;
  year: number;
  label: string;
  income_realized_cents: number;
  expense_realized_cents: number;
  net_realized_cents: number;
  savings_rate: number;
}

export interface NatureBreakdown {
  nature: CategoryNature;
  nature_label: string;
  amount_cents: number;
  percentage: number;
  target_percentage: number;
  status: "NORMAL" | "ATENCAO" | "EXCEDIDO";
}

export interface BudgetSummaryItem {
  budget_id: string;
  category_id: string;
  category_name: string;
  limit_amount_cents: number;
  spent_amount_cents: number;
  percentage: number;
  remaining_cents: number;
  status: "NORMAL" | "ATENCAO" | "ESTOURADO";
}

export interface UpcomingTransactionItem {
  id: string;
  description: string;
  due_date: string;
  amount_cents: number;
  type: TransactionType;
  status: TransactionStatus;
  category_name?: string | null;
  account_name?: string | null;
  contact_name?: string | null;
}

export interface PaymentMethodDistribution {
  payment_method_id?: string | null;
  name: string;
  amount_cents: number;
  percentage: number;
  count: number;
}

export interface GoalSummaryItem {
  id: string;
  title: string;
  target_amount_cents: number;
  current_amount_cents: number;
  percentage: number;
  target_date?: string | null;
  status: string;
}

export interface DashboardSummary {
  profile: ProfileType;
  month: number;
  year: number;
  income_realized_cents: number;
  expense_realized_cents: number;
  net_realized_cents: number;
  savings_rate: number;
  income_pending_cents: number;
  expense_pending_cents: number;
  net_pending_cents: number;
  projected_net_cents: number;
  overdue_count: number;
  overdue_amount_cents: number;
  due_today_count: number;
  due_today_amount_cents: number;
  
  // Posição Patrimonial & Saldos
  total_account_balance_cents: number;
  total_credit_card_invoices_cents: number;
  total_debts_remaining_cents: number;
  net_worth_cents: number;
  accounts_balances: AccountBalanceSummary[];

  // Histórico & Tendência
  historical_trend: MonthlyTrendItem[];

  // Diagnóstico 50-30-20
  nature_breakdown: NatureBreakdown[];

  // Top Categorias
  top_expense_categories: CategoryBreakdown[];

  // Orçamentos
  budgets_summary: BudgetSummaryItem[];

  // Próximos 7 Dias
  upcoming_7_days: UpcomingTransactionItem[];

  // Meios de Pagamento
  payment_methods_distribution: PaymentMethodDistribution[];

  // Metas
  goals_summary: GoalSummaryItem[];
}

export interface SyncStatus {
  api_online: boolean;
  server_time: string;
  database: string;
  total_transactions: number;
  total_attachments: number;
  storage_healthy: boolean;
  last_sync_at?: string | null;
  last_sync_status?: string | null;
  last_action?: string | null;
}

export interface SyncLog {
  id: string;
  action: "MOBILE_PUSH" | "MOBILE_PULL" | "EXPORT" | "IMPORT" | "FULL" | "TEST" | string;
  status: "SUCESSO" | "ERRO" | "PARCIAL" | "EM_ANDAMENTO" | string;
  items_imported: number;
  items_exported: number;
  message: string;
  details?: string | null;
  created_at: string;
}

export interface MobileTransactionSyncItem {
  id?: string;
  type: "RECEITA" | "DESPESA" | "TRANSFERENCIA";
  description: string;
  amount_cents: number;
  due_date: string;
  payment_date?: string | null;
  status: "PENDENTE" | "CONCLUIDO" | "CANCELADO";
  category_id?: string | null;
  account_id?: string | null;
  destination_account_id?: string | null;
  credit_card_id?: string | null;
  payment_method_id?: string | null;
  contact_id?: string | null;
  item_id?: string | null;
  debt_id?: string | null;
  schedule_id?: string | null;
  notes?: string | null;
  installment_number?: number | null;
  total_installments?: number | null;
  invoice_month?: number | null;
  invoice_year?: number | null;
  is_invoice_payment?: number;
  created_at?: string;
  updated_at?: string;
}

export interface MobileSyncPushRequest {
  profile: ProfileType;
  transactions: MobileTransactionSyncItem[];
}

export interface MobileSyncPushResponse {
  success: boolean;
  server_timestamp: string;
  inserted_count: number;
  updated_count: number;
  synced_ids: string[];
  errors: string[];
}

export interface MobileSyncPullResponse {
  server_timestamp: string;
  profile?: ProfileType | null;
  categories: Category[];
  accounts: Account[];
  payment_methods: PaymentMethod[];
  credit_cards: CreditCard[];
  items: Item[];
  contacts: Contact[];
  debts: Debt[];
  budgets: Budget[];
  goals: Goal[];
  schedules: Schedule[];
  transactions: Transaction[];
}

export type AttachmentType = 
  | "COMPROVANTE" 
  | "NOTA_FISCAL" 
  | "FATURA" 
  | "RECIBO" 
  | "CONTRATO" 
  | "OUTRO";

export interface AttachmentTypeConfig {
  value: AttachmentType;
  label: string;
  shortLabel: string;
  badgeClass: string;
  badgeBgLight: string;
  badgeBgDark: string;
  badgeTextLight: string;
  badgeTextDark: string;
  borderLight: string;
  borderDark: string;
  description: string;
}

export const ATTACHMENT_TYPES: Record<AttachmentType, AttachmentTypeConfig> = {
  COMPROVANTE: {
    value: "COMPROVANTE",
    label: "Comprovante de Pagamento / PIX",
    shortLabel: "Comprovante",
    badgeClass: "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
    badgeBgLight: "bg-emerald-50",
    badgeBgDark: "dark:bg-emerald-950/50",
    badgeTextLight: "text-emerald-700",
    badgeTextDark: "dark:text-emerald-300",
    borderLight: "border-emerald-200",
    borderDark: "dark:border-emerald-800",
    description: "Comprovante bancário, PIX, TED ou depósito",
  },
  NOTA_FISCAL: {
    value: "NOTA_FISCAL",
    label: "Nota Fiscal / Cupom Fiscal",
    shortLabel: "Nota Fiscal",
    badgeClass: "bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800",
    badgeBgLight: "bg-purple-50",
    badgeBgDark: "dark:bg-purple-950/50",
    badgeTextLight: "text-purple-700",
    badgeTextDark: "dark:text-purple-300",
    borderLight: "border-purple-200",
    borderDark: "dark:border-purple-800",
    description: "DANFE, NF-e, NFS-e, NFC-e ou cupom",
  },
  FATURA: {
    value: "FATURA",
    label: "Fatura / Boleto Bancário",
    shortLabel: "Fatura / Boleto",
    badgeClass: "bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800",
    badgeBgLight: "bg-sky-50",
    badgeBgDark: "dark:bg-sky-950/50",
    badgeTextLight: "text-sky-700",
    badgeTextDark: "dark:text-sky-300",
    borderLight: "border-sky-200",
    borderDark: "dark:border-sky-800",
    description: "Fatura de cartão, boleto, conta de consumo",
  },
  RECIBO: {
    value: "RECIBO",
    label: "Recibo de Prestação / Quitação",
    shortLabel: "Recibo",
    badgeClass: "bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800",
    badgeBgLight: "bg-amber-50",
    badgeBgDark: "dark:bg-amber-950/50",
    badgeTextLight: "text-amber-700",
    badgeTextDark: "dark:text-amber-300",
    borderLight: "border-amber-200",
    borderDark: "dark:border-amber-800",
    description: "Recibo assinado, RPA ou quitação manual",
  },
  CONTRATO: {
    value: "CONTRATO",
    label: "Contrato / Proposta / Termo",
    shortLabel: "Contrato",
    badgeClass: "bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800",
    badgeBgLight: "bg-indigo-50",
    badgeBgDark: "dark:bg-indigo-950/50",
    badgeTextLight: "text-indigo-700",
    badgeTextDark: "dark:text-indigo-300",
    borderLight: "border-indigo-200",
    borderDark: "dark:border-indigo-800",
    description: "Contrato de serviço, locação ou proposta",
  },
  OUTRO: {
    value: "OUTRO",
    label: "Outro Documento",
    shortLabel: "Outro",
    badgeClass: "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700",
    badgeBgLight: "bg-zinc-100",
    badgeBgDark: "dark:bg-zinc-800",
    badgeTextLight: "text-zinc-700",
    badgeTextDark: "dark:text-zinc-300",
    borderLight: "border-zinc-200",
    borderDark: "dark:border-zinc-700",
    description: "Documento complementar genérico",
  },
};

export interface Attachment {
  id: string;
  profile: ProfileType;
  transaction_id?: string | null;
  file_name: string;
  file_path: string;
  file_size_bytes: number;
  mime_type: string;
  attachment_type: AttachmentType;
  drive_file_id?: string | null;
  drive_web_view_link?: string | null;
  drive_folder_id?: string | null;
  sync_status: "PENDENTE" | "SINCRONIZADO" | "ERRO" | "LOCAL_ONLY";
  sync_error?: string | null;
  created_at: string;
  synced_at?: string | null;
  download_url?: string;
  file_url?: string;
  formatted_size?: string;
}

export interface AttachmentStats {
  total_count: number;
  total_size_bytes: number;
  formatted_total_size: string;
  active_directory: string;
  default_directory: string;
  is_custom_directory: boolean;
  is_writable: boolean;
  free_space_bytes?: number | null;
  formatted_free_space?: string | null;
  synced_count: number;
  pending_count: number;
  error_count: number;
}

export interface StorageDirectoryConfigResponse {
  active_directory: string;
  default_directory: string;
  is_custom: boolean;
  is_writable: boolean;
  free_space_bytes?: number | null;
  formatted_free_space?: string | null;
  migrated_count: number;
  message: string;
}

export type ConciliationMatchStatus = "NOVO" | "DUPLICADO" | "POSSIVEL_CONCILIACAO";

export interface ConciliationParsedItem {
  id: string;
  fitid?: string | null;
  date: string;
  description: string;
  original_description: string;
  amount_cents: number;
  type: TransactionType;
  match_status: ConciliationMatchStatus;
  matched_transaction_id?: string | null;
  matched_transaction_description?: string | null;
  suggested_category_id?: string | null;
  suggested_category_name?: string | null;
  suggested_contact_id?: string | null;
  suggested_contact_name?: string | null;
  suggested_payment_method_id?: string | null;
  selected: boolean;
  custom_category_id?: string;
  custom_contact_id?: string;
  custom_payment_method_id?: string;
  custom_description?: string;
}

export interface ConciliationParseResponse {
  account_id: string;
  account_name?: string | null;
  total_parsed: number;
  total_income_cents: number;
  total_expense_cents: number;
  new_count: number;
  duplicate_count: number;
  items: ConciliationParsedItem[];
}

export interface ConciliationImportItem {
  date: string;
  description: string;
  amount_cents: number;
  type: TransactionType;
  category_id?: string | null;
  contact_id?: string | null;
  payment_method_id?: string | null;
  notes?: string | null;
  status: "CONCLUIDO" | "PENDENTE";
}

export interface ConciliationImportResponse {
  imported_count: number;
  total_amount_cents: number;
  created_transaction_ids: string[];
}

export interface SystemStatsResponse {
  database_size_bytes: number;
  database_size_formatted: string;
  total_transactions: number;
  total_accounts: number;
  total_categories: number;
  total_contacts: number;
  total_attachments: number;
  attachments_size_bytes: number;
  attachments_size_formatted: string;
  total_backup_size_bytes: number;
  total_backup_size_formatted: string;
  last_backup_at?: string | null;
  database_path: string;
  attachments_path: string;
  version: string;
}

// ==========================================
// PLANEJAMENTO FINANCEIRO, PROJEÇÃO & FUTURO
// ==========================================

export interface CashflowProjectionItem {
  month: string;
  month_name: string;
  starting_balance_cents: number;
  projected_income_cents: number;
  projected_expense_cents: number;
  expense_mandatory_cents: number;
  expense_necessary_cents: number;
  expense_discretionary_cents: number;
  expense_other_cents: number;
  credit_card_invoices_cents: number;
  net_balance_cents: number;
  accumulated_balance_cents: number;
  is_negative_alert: boolean;
}

export interface CashflowProjectionResponse {
  profile: ProfileType;
  horizon_months: number;
  current_balance_cents: number;
  lowest_balance_cents: number;
  negative_months_count: number;
  total_projected_income_cents: number;
  total_projected_expense_cents: number;
  projected_net_cents: number;
  items: CashflowProjectionItem[];
}

export interface ScenarioSimulationRequest {
  profile: ProfileType;
  months: number;
  income_variation_percent: number;
  discretionary_cut_percent: number;
  necessary_cut_percent: number;
  mandatory_cut_percent: number;
  additional_monthly_expense_cents: number;
  additional_monthly_income_cents: number;
}

export interface ScenarioSimulationItem {
  month: string;
  month_name: string;
  base_accumulated_cents: number;
  simulated_accumulated_cents: number;
  delta_cents: number;
}

export interface ScenarioSimulationResponse {
  profile: ProfileType;
  months: number;
  base_final_balance_cents: number;
  simulated_final_balance_cents: number;
  total_delta_cents: number;
  total_savings_generated_cents: number;
  items: ScenarioSimulationItem[];
}

export interface RunwayResponse {
  profile: ProfileType;
  current_liquid_balance_cents: number;
  essential_monthly_cost_cents: number;
  discretionary_monthly_cost_cents: number;
  total_monthly_cost_cents: number;
  runway_months: number;
  health_status: "CRITICO" | "MODERADO" | "BOM" | "EXCELENTE";
  recommended_reserve_cents: number;
  reserve_gap_cents: number;
  fire_number_cents?: number | null;
  burn_rate_cents?: number | null;
}

export interface GoalProjectionItem {
  id: string;
  title: string;
  target_amount_cents: number;
  current_amount_cents: number;
  remaining_amount_cents: number;
  target_date?: string | null;
  status: string;
  progress_percentage: number;
  monthly_contribution_avg_cents: number;
  estimated_completion_date?: string | null;
  estimated_months_to_complete?: number | null;
  required_monthly_deposit_cents?: number | null;
  compound_interest_gain_cents?: number | null;
}

export interface GoalProjectionResponse {
  profile: ProfileType;
  total_target_cents: number;
  total_current_cents: number;
  total_remaining_cents: number;
  goals: GoalProjectionItem[];
}

export interface CommittedIncomeItem {
  month: string;
  month_name: string;
  projected_income_cents: number;
  schedules_amount_cents: number;
  debts_amount_cents: number;
  credit_card_amount_cents: number;
  total_committed_cents: number;
  committed_percentage: number;
  free_income_cents: number;
  free_income_percentage: number;
}

export interface CommittedIncomeResponse {
  profile: ProfileType;
  average_committed_percentage: number;
  items: CommittedIncomeItem[];
}




