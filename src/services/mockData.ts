import type {
  Transaction,
  Budget,
  FinancialGoal,
  Scenario,
  UserProfile,
  DashboardData,
} from '@/types';
import { getCurrentMonth, getMonthRange, getCategoryColor } from '@/utils';

const DEFAULT_PROFILE: UserProfile = {
  id: 'usr-demo-1',
  user_id: 'usr-demo-1',
  full_name: 'Siddhant Sharma',
  email: 'siddspr@gmail.com',
  phone: '+91 98765 43210',
  occupation: 'Lead AI Engineer',
  monthly_income: 145000,
  currency: 'INR',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const DEFAULT_TRANSACTIONS: Transaction[] = [
  {
    id: 'tx-1',
    user_id: 'usr-demo-1',
    type: 'income',
    amount: 145000,
    category: 'Salary',
    description: 'Monthly Corporate Salary Inflow',
    date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    payment_method: 'Net Banking',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'tx-2',
    user_id: 'usr-demo-1',
    type: 'income',
    amount: 28000,
    category: 'Freelance',
    description: 'AI Consulting & Architecture Sprint',
    date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    payment_method: 'UPI',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'tx-3',
    user_id: 'usr-demo-1',
    type: 'expense',
    amount: 32000,
    category: 'Housing',
    description: 'Apartment Rental & Maintenance',
    date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    payment_method: 'Net Banking',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'tx-4',
    user_id: 'usr-demo-1',
    type: 'expense',
    amount: 14200,
    category: 'Food',
    description: 'Whole Foods & Gourmet Dining',
    date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    payment_method: 'Credit Card',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'tx-5',
    user_id: 'usr-demo-1',
    type: 'expense',
    amount: 6500,
    category: 'Transport',
    description: 'Fuel, Fastag & Ride Sharing',
    date: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    payment_method: 'UPI',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'tx-6',
    user_id: 'usr-demo-1',
    type: 'expense',
    amount: 5200,
    category: 'Utilities',
    description: 'Electricity & High-speed Fiber',
    date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    payment_method: 'Debit Card',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'tx-7',
    user_id: 'usr-demo-1',
    type: 'expense',
    amount: 4800,
    category: 'Entertainment',
    description: 'Streaming Subscriptions & Weekend Events',
    date: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    payment_method: 'Credit Card',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'tx-8',
    user_id: 'usr-demo-1',
    type: 'expense',
    amount: 8500,
    category: 'Shopping',
    description: 'Ergonomic Desk & Tech Gear',
    date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    payment_method: 'Credit Card',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const DEFAULT_BUDGET: Budget = {
  id: 'bgt-1',
  user_id: 'usr-demo-1',
  name: `Master Allocation Plan`,
  month: getCurrentMonth(),
  total_limit: 85000,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  categories: [
    { id: 'bc-1', budget_id: 'bgt-1', category: 'Housing', limit_amount: 35000, spent_amount: 32000 },
    { id: 'bc-2', budget_id: 'bgt-1', category: 'Food', limit_amount: 18000, spent_amount: 14200 },
    { id: 'bc-3', budget_id: 'bgt-1', category: 'Transport', limit_amount: 8000, spent_amount: 6500 },
    { id: 'bc-4', budget_id: 'bgt-1', category: 'Utilities', limit_amount: 6000, spent_amount: 5200 },
    { id: 'bc-5', budget_id: 'bgt-1', category: 'Entertainment', limit_amount: 7000, spent_amount: 4800 },
    { id: 'bc-6', budget_id: 'bgt-1', category: 'Shopping', limit_amount: 11000, spent_amount: 8500 },
  ],
};

const DEFAULT_GOALS: FinancialGoal[] = [
  {
    id: 'goal-1',
    user_id: 'usr-demo-1',
    title: 'Emergency Fortress (6 Months)',
    description: 'High-yield liquid reserve covering essential rent, food, and bills.',
    target_amount: 300000,
    current_amount: 245000,
    target_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    monthly_contribution: 25000,
    status: 'active',
    color: '#10B981',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'goal-2',
    user_id: 'usr-demo-1',
    title: 'New EV Downpayment',
    description: 'Accumulate 40% upfront downpayment to minimize loan principal & EMI.',
    target_amount: 450000,
    current_amount: 180000,
    target_date: new Date(Date.now() + 240 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    monthly_contribution: 35000,
    status: 'active',
    color: '#8B5CF6',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'goal-3',
    user_id: 'usr-demo-1',
    title: 'Japan Autumn Expedition',
    description: 'Flights, ryokan stays, and travel itinerary funds.',
    target_amount: 220000,
    current_amount: 165000,
    target_date: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    monthly_contribution: 20000,
    status: 'active',
    color: '#EC4899',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const DEFAULT_SCENARIOS: Scenario[] = [
  {
    id: 'sc-1',
    user_id: 'usr-demo-1',
    name: '25% Senior Promotion & Bonus',
    description: 'Career progression with salary bump to ₹1.8L and extra ₹40K/month SIP drive',
    baseline: {
      monthly_income: 145000,
      monthly_expenses: 71200,
      monthly_savings: 73800,
      expense_changes: {},
      income_changes: {},
    },
    modified: {
      monthly_income: 181250,
      monthly_expenses: 76200,
      monthly_savings: 105050,
      expense_changes: {},
      income_changes: {},
    },
    impact: {
      savings_change: 375000,
      savings_change_percent: 42.3,
      cash_flow_change: 31250,
      goal_impact: 'Accelerates Goals',
      monthly_net_change: 31250,
      projected_savings_6m: 630300,
      projected_savings_12m: 1260600,
      baseline_savings_6m: 442800,
      baseline_savings_12m: 885600,
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

// Helper to get or initialize local storage
export const mockStore = {
  getProfile(): UserProfile {
    const raw = localStorage.getItem('finoracle_profile');
    if (!raw) {
      localStorage.setItem('finoracle_profile', JSON.stringify(DEFAULT_PROFILE));
      return DEFAULT_PROFILE;
    }
    return JSON.parse(raw);
  },

  saveProfile(p: Partial<UserProfile>): UserProfile {
    const current = mockStore.getProfile();
    const updated = { ...current, ...p, updated_at: new Date().toISOString() };
    localStorage.setItem('finoracle_profile', JSON.stringify(updated));
    return updated;
  },

  getTransactions(): Transaction[] {
    const raw = localStorage.getItem('finoracle_transactions');
    if (!raw) {
      localStorage.setItem('finoracle_transactions', JSON.stringify(DEFAULT_TRANSACTIONS));
      return DEFAULT_TRANSACTIONS;
    }
    return JSON.parse(raw);
  },

  saveTransaction(t: Omit<Transaction, 'id' | 'created_at' | 'updated_at'>): Transaction {
    const list = mockStore.getTransactions();
    const newTxn: Transaction = {
      ...t,
      id: `tx-${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const updated = [newTxn, ...list];
    localStorage.setItem('finoracle_transactions', JSON.stringify(updated));
    return newTxn;
  },

  updateTransaction(id: string, updates: Partial<Transaction>): Transaction {
    const list = mockStore.getTransactions();
    const updated = list.map((t) => (t.id === id ? { ...t, ...updates, updated_at: new Date().toISOString() } : t));
    localStorage.setItem('finoracle_transactions', JSON.stringify(updated));
    return updated.find((t) => t.id === id)!;
  },

  deleteTransaction(id: string): void {
    const list = mockStore.getTransactions();
    const updated = list.filter((t) => t.id !== id);
    localStorage.setItem('finoracle_transactions', JSON.stringify(updated));
  },

  getBudgets(): Budget[] {
    const raw = localStorage.getItem('finoracle_budgets');
    if (!raw) {
      localStorage.setItem('finoracle_budgets', JSON.stringify([DEFAULT_BUDGET]));
      return [DEFAULT_BUDGET];
    }
    return JSON.parse(raw);
  },

  saveBudget(b: any): Budget {
    const list = mockStore.getBudgets();
    const newBudget: Budget = {
      id: `bgt-${Date.now()}`,
      user_id: 'usr-demo-1',
      name: b.name,
      month: b.month,
      total_limit: b.total_limit,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      categories: (b.categories || []).map((c: any, i: number) => ({
        id: `bc-${Date.now()}-${i}`,
        budget_id: `bgt-${Date.now()}`,
        category: c.category,
        limit_amount: c.limit_amount,
        spent_amount: 0,
      })),
    };
    const updated = [newBudget, ...list.filter((x) => x.month !== b.month)];
    localStorage.setItem('finoracle_budgets', JSON.stringify(updated));
    return newBudget;
  },

  deleteBudget(id: string): void {
    const list = mockStore.getBudgets();
    const updated = list.filter((b) => b.id !== id);
    localStorage.setItem('finoracle_budgets', JSON.stringify(updated));
  },

  getGoals(): FinancialGoal[] {
    const raw = localStorage.getItem('finoracle_goals');
    if (!raw) {
      localStorage.setItem('finoracle_goals', JSON.stringify(DEFAULT_GOALS));
      return DEFAULT_GOALS;
    }
    return JSON.parse(raw);
  },

  saveGoal(g: any): FinancialGoal {
    const list = mockStore.getGoals();
    const newGoal: FinancialGoal = {
      ...g,
      id: `goal-${Date.now()}`,
      user_id: 'usr-demo-1',
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const updated = [newGoal, ...list];
    localStorage.setItem('finoracle_goals', JSON.stringify(updated));
    return newGoal;
  },

  updateGoal(id: string, updates: Partial<FinancialGoal>): FinancialGoal {
    const list = mockStore.getGoals();
    const updated = list.map((g) => (g.id === id ? { ...g, ...updates, updated_at: new Date().toISOString() } : g));
    localStorage.setItem('finoracle_goals', JSON.stringify(updated));
    return updated.find((g) => g.id === id)!;
  },

  deleteGoal(id: string): void {
    const list = mockStore.getGoals();
    const updated = list.filter((g) => g.id !== id);
    localStorage.setItem('finoracle_goals', JSON.stringify(updated));
  },

  getScenarios(): Scenario[] {
    const raw = localStorage.getItem('finoracle_scenarios');
    if (!raw) {
      localStorage.setItem('finoracle_scenarios', JSON.stringify(DEFAULT_SCENARIOS));
      return DEFAULT_SCENARIOS;
    }
    return JSON.parse(raw);
  },

  saveScenario(sc: any): Scenario {
    const list = mockStore.getScenarios();
    const newScenario: Scenario = {
      ...sc,
      id: `sc-${Date.now()}`,
      user_id: 'usr-demo-1',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const updated = [newScenario, ...list];
    localStorage.setItem('finoracle_scenarios', JSON.stringify(updated));
    return newScenario;
  },

  deleteScenario(id: string): void {
    const list = mockStore.getScenarios();
    const updated = list.filter((s) => s.id !== id);
    localStorage.setItem('finoracle_scenarios', JSON.stringify(updated));
  },
};
