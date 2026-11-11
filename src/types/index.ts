// ============================================================
// FinOracle AI — TypeScript Type Definitions
// ============================================================

// ---- Auth & User ----
export interface User {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  created_at: string;
}

export type IncomeType =
  | 'Salaried'
  | 'Freelance'
  | 'Business'
  | 'Gig Worker'
  | 'Student'
  | 'Other';

export interface AdditionalIncomeSource {
  id: string;
  name: string;
  amount: number;
  frequency: 'monthly' | 'irregular' | 'one_time';
  received_day?: number;
}

export interface UserProfile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone?: string;
  date_of_birth?: string;
  occupation?: string;
  monthly_income: number;
  income_type?: IncomeType;
  additional_income_sources?: AdditionalIncomeSource[];
  planning_period_start_day?: number; // e.g. 1st of month
  onboarding_completed?: boolean;
  currency: string;
  created_at: string;
  updated_at: string;
}

// ---- Transactions ----
export type TransactionType = 'income' | 'expense';

export interface Transaction {
  id: string;
  user_id: string;
  type: TransactionType;
  amount: number;
  category: string;
  description: string;
  date: string;
  payment_method?: string;
  is_recurring?: boolean;
  created_at: string;
  updated_at: string;
}

export interface TransactionFormData {
  type: TransactionType;
  amount: number;
  category: string;
  description: string;
  date: string;
  payment_method?: string;
}

export const INCOME_CATEGORIES = [
  'Salary',
  'Freelance',
  'Business',
  'Investments',
  'Allowance',
  'Rental Income',
  'Dividends',
  'Other Income',
] as const;

export const EXPENSE_CATEGORIES = [
  'Housing',
  'Food',
  'Transportation',
  'Utilities',
  'Healthcare',
  'Education',
  'Entertainment',
  'Shopping',
  'Savings',
  'Other',
] as const;

export const PAYMENT_METHODS = [
  'UPI',
  'Net Banking',
  'Debit Card',
  'Credit Card',
  'Cash',
  'Bank Transfer',
  'Wallet',
  'Other',
] as const;

// ---- Budgets ----
export interface Budget {
  id: string;
  user_id: string;
  name: string;
  month: string; // YYYY-MM
  planned_income?: number;
  total_limit: number;
  created_at: string;
  updated_at: string;
  categories: BudgetCategory[];
}

export interface BudgetCategory {
  id: string;
  budget_id: string;
  category: string;
  limit_amount: number;
  spent_amount?: number; // calculated from real transactions
}

export interface BudgetFormData {
  name: string;
  month: string;
  planned_income?: number;
  total_limit: number;
  categories: { category: string; limit_amount: number }[];
}

// ---- Goals ----
export type GoalStatus = 'active' | 'completed' | 'paused' | 'cancelled';

export interface FinancialGoal {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  target_amount: number;
  current_amount: number;
  target_date: string;
  monthly_contribution: number;
  status: GoalStatus;
  icon?: string;
  color?: string;
  created_at: string;
  updated_at: string;
}

export interface GoalFormData {
  title: string;
  description?: string;
  target_amount: number;
  current_amount: number;
  target_date: string;
  monthly_contribution: number;
  icon?: string;
  color?: string;
}

export interface GoalAnalysis {
  progress_percentage: number;
  remaining_amount: number;
  months_remaining: number;
  required_monthly: number;
  estimated_completion: string;
  on_track: boolean;
  additional_needed: number;
}

// ---- Scenarios ----
export interface Scenario {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  baseline: ScenarioData;
  modified: ScenarioData;
  impact: ScenarioImpact;
  created_at: string;
  updated_at: string;
}

export interface ScenarioData {
  monthly_income: number;
  monthly_expenses: number;
  monthly_savings: number;
  one_time_expense?: number;
  one_time_income?: number;
  loan_emi?: number;
  additional_savings?: number;
  expense_changes: Record<string, number>;
  income_changes: Record<string, number>;
}

export interface ScenarioImpact {
  savings_change: number;
  savings_change_percent: number;
  cash_flow_change: number;
  goal_impact: string;
  monthly_net_change: number;
  projected_savings_6m: number;
  projected_savings_12m: number;
  baseline_savings_6m: number;
  baseline_savings_12m: number;
}

export interface ScenarioFormData {
  name: string;
  description?: string;
  changes: {
    type: 'income_change' | 'expense_change' | 'one_time' | 'loan' | 'savings';
    category?: string;
    amount: number;
    is_percentage?: boolean;
  }[];
}

// ---- Loans ----
export interface LoanAnalysis {
  principal: number;
  annual_rate: number;
  tenure_months: number;
  processing_fee: number;
  emi: number;
  total_interest: number;
  total_repayment: number;
  effective_cost: number;
  amortization: AmortizationEntry[];
}

export interface AmortizationEntry {
  month: number;
  emi: number;
  principal: number;
  interest: number;
  balance: number;
}

export interface LoanFormData {
  principal: number;
  annual_rate: number;
  tenure_months: number;
  processing_fee?: number;
}

// ---- Chat / AI ----
export interface ChatSession {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: ChatSource[];
  created_at: string;
}

export interface ChatSource {
  title: string;
  organization: string;
  url?: string;
  chunk_text: string;
  relevance_score: number;
}

// ---- Financial Insights ----
export interface FinancialInsight {
  type: 'positive' | 'warning' | 'info';
  title: string;
  message: string;
}

// ---- Dashboard ----
export interface DashboardData {
  planned_monthly_income: number;
  actual_income: number;
  total_income: number;
  total_expenses: number;
  net_cash_flow: number;
  savings: number;
  savings_rate: number;
  total_budget_allocated: number;
  budget_utilization: number;
  has_data: boolean;
  recent_transactions: Transaction[];
  spending_by_category: {
    category: string;
    amount: number;
    percentage: number;
    color: string;
  }[];
  income_vs_expenses: {
    month: string;
    income: number;
    expenses: number;
  }[];
  savings_trend: {
    month: string;
    savings: number;
  }[];
  category_budgets: {
    category: string;
    limit: number;
    spent: number;
    utilization: number;
  }[];
  active_goals: FinancialGoal[];
  insights: FinancialInsight[];
}

// ---- Reports ----
export interface ReportConfig {
  type: 'monthly' | 'expense' | 'income' | 'budget' | 'goals' | 'scenario';
  start_date: string;
  end_date: string;
  format: 'pdf' | 'csv';
}

// ---- Notifications ----
export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  read: boolean;
  created_at: string;
}

// ---- API ----
export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface ApiError {
  message: string;
  detail?: string;
  status: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

// ---- Filters ----
export type DateFilter = 'this_month' | 'last_month' | 'last_3_months' | 'financial_year' | 'all_time';

export interface DateRange {
  start: string;
  end: string;
}
