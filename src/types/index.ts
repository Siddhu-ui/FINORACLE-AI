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

export interface UserProfile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone?: string;
  date_of_birth?: string;
  occupation?: string;
  monthly_income?: number;
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
  'Other Income',
] as const;

export const EXPENSE_CATEGORIES = [
  'Food',
  'Housing',
  'Transport',
  'Education',
  'Healthcare',
  'Shopping',
  'Entertainment',
  'Utilities',
  'Subscriptions',
  'Other Expenses',
] as const;

export const PAYMENT_METHODS = [
  'Cash',
  'UPI',
  'Debit Card',
  'Credit Card',
  'Net Banking',
  'Wallet',
  'Other',
] as const;

// ---- Budgets ----
export interface Budget {
  id: string;
  user_id: string;
  name: string;
  month: string; // YYYY-MM
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
  spent_amount?: number; // calculated
}

export interface BudgetFormData {
  name: string;
  month: string;
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

// ---- Dashboard ----
export interface DashboardData {
  total_income: number;
  total_expenses: number;
  available_balance: number;
  savings: number;
  savings_rate: number;
  budget_utilization: number;
  recent_transactions: Transaction[];
  spending_by_category: { category: string; amount: number; color: string }[];
  income_vs_expenses: { month: string; income: number; expenses: number }[];
  savings_trend: { month: string; savings: number }[];
  active_goals: FinancialGoal[];
  upcoming_bills: Transaction[];
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
export type DateFilter = 'today' | 'this_week' | 'this_month' | 'last_month' | 'custom';

export interface DateRange {
  start: string;
  end: string;
}
