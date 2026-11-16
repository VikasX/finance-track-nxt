// Generated from openapi.json. Run npm run api:types after updating the contract.
export type AmortizationRead = {
  loan_id: number;
  basis: string;
  calculated_emi: string;
  reported_monthly_emi: string;
  total_payment: string;
  total_interest: string;
  schedule: Array<Installment>;
};
export type BudgetCreate = {
  category_id: number;
  budget_month: string;
  limit_amount: number | string;
};
export type BudgetRead = {
  id: number;
  user_id: number;
  category_id: number;
  budget_month: string;
  limit_amount: string;
  spent_amount: string;
  remaining_amount: string;
  usage_percent: string | null;
};
export type BudgetUpdate = {
  category_id?: number;
  budget_month?: string;
  limit_amount?: number | string;
};
export type BudgetUsageRead = {
  limit_amount: string;
  spent_amount: string;
  remaining_amount: string;
  usage_percent: string | null;
  budgets: Array<BudgetRead>;
};
export type CashFlow = {
  income: string;
  expenses: string;
  investment_outflow: string;
  loan_payments: string;
  transfers: string;
  total_outflow: string;
  net_cash_flow: string;
  savings_rate_percent: string | null;
  transaction_count: number;
};
export type CategoryCreate = {
  name: string;
  type: "income" | "expense" | "investment" | "loan_payment";
};
export type CategoryRead = {
  name: string;
  type: "income" | "expense" | "investment" | "loan_payment";
  id: number;
  user_id: number | null;
};
export type CategoryReportRead = {
  date_from: string;
  date_to: string;
  currency: string | null;
  categories: Array<CategoryTotal>;
};
export type CategoryTotal = {
  category_id: number | null;
  category_name: string;
  transaction_type: string;
  amount: string;
  transaction_count: number;
  share_of_type_percent: string | null;
};
export type CategoryUpdate = {
  name?: string;
  type?: "income" | "expense" | "investment" | "loan_payment";
};
export type ContributionCreate = {
  amount: number | string;
  contribution_date: string;
  reference_code?: string | null;
};
export type ContributionRead = {
  amount: string;
  contribution_date: string;
  reference_code?: string | null;
  id: number;
  ppf_account_id: number;
};
export type ContributionUpdate = {
  amount?: number | string;
  contribution_date?: string;
  reference_code?: string | null;
};
export type DashboardRead = {
  month: string;
  as_of: string;
  currency: string | null;
  income: string;
  expenses: string;
  balance: string;
  balance_basis: string;
  cash_flow: CashFlow;
  investments: PortfolioRead;
  outstanding_loans: string;
  budget_usage: BudgetUsageRead;
  upcoming_obligations: Array<ObligationRead>;
  recent_transactions: Array<TransactionRead>;
};
export type FixedDepositCreate = {
  bank_name: string;
  principal: number | string;
  interest_rate: number | string;
  start_date: string;
  maturity_date: string;
  fd_reference?: string | null;
  compounding_frequency?:
    "monthly" | "quarterly" | "half_yearly" | "annually" | "simple" | null;
  status?: string | null;
};
export type FixedDepositRead = {
  id: number;
  user_id: number;
  bank_name: string;
  principal: string;
  interest_rate: string;
  start_date: string;
  maturity_date: string;
  fd_reference?: string | null;
  compounding_frequency?:
    "monthly" | "quarterly" | "half_yearly" | "annually" | "simple" | null;
  status?: string | null;
  estimated_maturity_value: string;
  estimated_interest: string;
  estimated_current_value: string;
  calculation_basis: string;
};
export type FixedDepositUpdate = {
  bank_name?: string;
  principal?: number | string;
  interest_rate?: number | string;
  start_date?: string;
  maturity_date?: string;
  fd_reference?: string | null;
  compounding_frequency?:
    "monthly" | "quarterly" | "half_yearly" | "annually" | "simple" | null;
  status?: string | null;
};
export type HTTPValidationError = { detail?: Array<ValidationError> };
export type HealthResponse = { status?: "ok" };
export type Installment = {
  installment: number;
  due_date: string;
  opening_balance: string;
  payment: string;
  principal: string;
  interest: string;
  closing_balance: string;
};
export type InvestmentCreate = {
  asset_type: "stock" | "mutual_fund";
  name: string;
  quantity: number | string;
  average_buy_price: number | string;
  current_price: number | string;
  symbol?: string | null;
  purchase_date?: string | null;
  monthly_sip?: number | string | null;
  next_sip_date?: string | null;
};
export type InvestmentRead = {
  id: number;
  user_id: number;
  asset_type: "stock" | "mutual_fund";
  name: string;
  quantity: string;
  average_buy_price: string;
  current_price: string;
  symbol?: string | null;
  purchase_date?: string | null;
  monthly_sip?: string | null;
  next_sip_date?: string | null;
  invested_value: string;
  current_value: string;
  gain_loss: string;
  gain_loss_percent: string | null;
};
export type InvestmentUpdate = {
  asset_type?: "stock" | "mutual_fund";
  name?: string;
  quantity?: number | string;
  average_buy_price?: number | string;
  current_price?: number | string;
  symbol?: string | null;
  purchase_date?: string | null;
  monthly_sip?: number | string | null;
  next_sip_date?: string | null;
};
export type LoanCreate = {
  loan_name: string;
  loan_type: string;
  principal: number | string;
  outstanding_balance: number | string;
  interest_rate: number | string;
  tenure_months: number;
  monthly_emi: number | string;
  start_date: string;
  account_reference?: string | null;
  next_due_date?: string | null;
  status?: string | null;
};
export type LoanRead = {
  id: number;
  user_id: number;
  loan_name: string;
  loan_type: string;
  principal: string;
  outstanding_balance: string;
  interest_rate: string;
  tenure_months: number;
  monthly_emi: string;
  start_date: string;
  account_reference?: string | null;
  next_due_date?: string | null;
  status?: string | null;
  calculated_emi: string;
  estimated_total_interest: string;
};
export type LoanUpdate = {
  loan_name?: string;
  loan_type?: string;
  principal?: number | string;
  outstanding_balance?: number | string;
  interest_rate?: number | string;
  tenure_months?: number;
  monthly_emi?: number | string;
  start_date?: string;
  account_reference?: string | null;
  next_due_date?: string | null;
  status?: string | null;
};
export type MonthlyReportRead = {
  date_from: string;
  date_to: string;
  currency: string | null;
  months: Array<MonthlyRow>;
};
export type MonthlyRow = {
  income: string;
  expenses: string;
  investment_outflow: string;
  loan_payments: string;
  transfers: string;
  total_outflow: string;
  net_cash_flow: string;
  savings_rate_percent: string | null;
  transaction_count: number;
  month: string;
};
export type ObligationRead = {
  source: string;
  source_id: number;
  title: string;
  due_date: string;
  amount: string | null;
  direction: string;
  overdue: boolean;
};
export type PPFCreate = {
  opening_date: string;
  maturity_date: string;
  account_reference?: string | null;
  bank_name?: string | null;
  opening_balance?: number | string | null;
  current_balance?: number | string | null;
  interest_rate?: number | string | null;
};
export type PPFInterestMonth = {
  month: string;
  eligible_balance: string;
  estimated_interest: string;
};
export type PPFInterestRead = {
  account_id: number;
  financial_year: number;
  interest_rate: string;
  estimated_interest: string;
  is_estimate?: boolean;
  basis: string;
  months: Array<PPFInterestMonth>;
};
export type PPFRead = {
  id: number;
  user_id: number;
  opening_date: string;
  maturity_date: string;
  account_reference?: string | null;
  bank_name?: string | null;
  opening_balance?: string | null;
  current_balance?: string | null;
  interest_rate?: string | null;
  total_contributions: string;
};
export type PPFUpdate = {
  opening_date?: string;
  maturity_date?: string;
  account_reference?: string | null;
  bank_name?: string | null;
  opening_balance?: number | string | null;
  current_balance?: number | string | null;
  interest_rate?: number | string | null;
};
export type Page_BudgetRead_ = {
  items: Array<BudgetRead>;
  total: number;
  page: number;
  page_size: number;
};
export type Page_CategoryRead_ = {
  items: Array<CategoryRead>;
  total: number;
  page: number;
  page_size: number;
};
export type Page_FixedDepositRead_ = {
  items: Array<FixedDepositRead>;
  total: number;
  page: number;
  page_size: number;
};
export type Page_InvestmentRead_ = {
  items: Array<InvestmentRead>;
  total: number;
  page: number;
  page_size: number;
};
export type Page_LoanRead_ = {
  items: Array<LoanRead>;
  total: number;
  page: number;
  page_size: number;
};
export type Page_PPFRead_ = {
  items: Array<PPFRead>;
  total: number;
  page: number;
  page_size: number;
};
export type Page_ReminderRead_ = {
  items: Array<ReminderRead>;
  total: number;
  page: number;
  page_size: number;
};
export type Page_SavingsGoalRead_ = {
  items: Array<SavingsGoalRead>;
  total: number;
  page: number;
  page_size: number;
};
export type Page_TransactionRead_ = {
  items: Array<TransactionRead>;
  total: number;
  page: number;
  page_size: number;
};
export type PortfolioRead = {
  invested_value: string;
  current_value: string;
  gain_loss: string;
  gain_loss_percent: string | null;
  fixed_deposit_estimated_value: string;
  ppf_reported_balance: string;
  total_asset_value: string;
};
export type PreferencesRead = {
  currency: string | null;
  financial_year_start: number | null;
  number_format: string | null;
};
export type ProfileRead = {
  id: number;
  name: string;
  email: string;
  created_at: string | null;
};
export type ReminderCreate = {
  title: string;
  due_date: string;
  amount?: number | string | null;
  reminder_type?: string | null;
  status?: string | null;
};
export type ReminderRead = {
  id: number;
  user_id: number;
  title: string;
  due_date: string;
  amount?: string | null;
  reminder_type?: string | null;
  status?: string | null;
};
export type ReminderUpdate = {
  title?: string;
  due_date?: string;
  amount?: number | string | null;
  reminder_type?: string | null;
  status?: string | null;
};
export type SavingsGoalCreate = {
  name: string;
  target_amount: number | string;
  saved_amount?: number | string | null;
  target_date?: string | null;
};
export type SavingsGoalRead = {
  id: number;
  user_id: number;
  name: string;
  target_amount: string;
  saved_amount?: string | null;
  target_date?: string | null;
  remaining_amount: string;
  progress_percent: string;
};
export type SavingsGoalUpdate = {
  name?: string;
  target_amount?: number | string;
  saved_amount?: number | string | null;
  target_date?: string | null;
};
export type SettingsRead = {
  profile: ProfileRead;
  preferences: PreferencesRead | null;
};
export type SettingsUpdate = {
  name?: string | null;
  email?: string | null;
  currency?: string | null;
  financial_year_start?: number | null;
  number_format?: string | null;
};
export type StudentResponse = {
  id: number;
  name: string | null;
  age: number | null;
};
export type SummaryRead = {
  date_from: string;
  date_to: string;
  currency: string | null;
  totals: CashFlow;
  previous_period: CashFlow;
  income_change_percent: string | null;
  expense_change_percent: string | null;
  accounting_basis: string;
};
export type TransactionCreate = {
  description: string;
  amount: number | string;
  transaction_type:
    "income" | "expense" | "investment" | "loan_payment" | "transfer";
  transaction_date: string;
  category_id?: number | null;
  reference_code?: string | null;
  payment_method?: string | null;
  notes?: string | null;
};
export type TransactionRead = {
  id: number;
  user_id: number;
  description: string;
  amount: string;
  transaction_type:
    "income" | "expense" | "investment" | "loan_payment" | "transfer";
  transaction_date: string;
  category_id?: number | null;
  reference_code?: string | null;
  payment_method?: string | null;
  notes?: string | null;
  created_at?: string | null;
};
export type TransactionUpdate = {
  description?: string;
  amount?: number | string;
  transaction_type?:
    "income" | "expense" | "investment" | "loan_payment" | "transfer";
  transaction_date?: string;
  category_id?: number | null;
  reference_code?: string | null;
  payment_method?: string | null;
  notes?: string | null;
};
export type ValidationError = {
  loc: Array<string | number>;
  msg: string;
  type: string;
  input?: unknown;
  ctx?: Record<string, unknown>;
};
export interface PageResult<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}
