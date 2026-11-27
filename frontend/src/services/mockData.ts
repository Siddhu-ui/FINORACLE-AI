import type {
  Transaction,
  Budget,
  FinancialGoal,
  Scenario,
  UserProfile,
} from '@/types';

// Clean initial profile with zero fabricated income
const INITIAL_PROFILE: UserProfile = {
  id: 'usr-default',
  user_id: 'usr-default',
  full_name: '',
  email: '',
  monthly_income: 0,
  currency: 'INR',
  onboarding_completed: false,
  additional_income_sources: [],
  planning_period_start_day: 1,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

export const mockStore = {
  getProfile(): UserProfile | null {
    const raw = localStorage.getItem('finoracle_profile');
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },

  saveProfile(p: Partial<UserProfile>): UserProfile {
    const current = mockStore.getProfile() || INITIAL_PROFILE;
    const updated: UserProfile = {
      ...current,
      ...p,
      updated_at: new Date().toISOString(),
    };
    localStorage.setItem('finoracle_profile', JSON.stringify(updated));
    return updated;
  },

  getTransactions(): Transaction[] {
    const raw = localStorage.getItem('finoracle_transactions');
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  },

  saveTransaction(t: Omit<Transaction, 'id' | 'created_at' | 'updated_at'>): Transaction {
    const list = mockStore.getTransactions();
    const newTxn: Transaction = {
      ...t,
      id: `tx-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const updated = [newTxn, ...list];
    localStorage.setItem('finoracle_transactions', JSON.stringify(updated));
    return newTxn;
  },

  updateTransaction(id: string, updates: Partial<Transaction>): Transaction {
    const list = mockStore.getTransactions();
    const updated = list.map((t) =>
      t.id === id ? { ...t, ...updates, updated_at: new Date().toISOString() } : t
    );
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
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  },

  saveBudget(b: any): Budget {
    const list = mockStore.getBudgets();
    const newBudget: Budget = {
      id: b.id || `bgt-${Date.now()}`,
      user_id: 'usr-default',
      name: b.name,
      month: b.month,
      planned_income: b.planned_income ?? 0,
      total_limit: b.total_limit,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      categories: (b.categories || []).map((c: any, i: number) => ({
        id: c.id || `bc-${Date.now()}-${i}`,
        budget_id: b.id || `bgt-${Date.now()}`,
        category: c.category,
        limit_amount: Number(c.limit_amount) || 0,
        spent_amount: 0,
      })),
    };
    const filtered = list.filter((x) => x.month !== b.month && x.id !== newBudget.id);
    const updated = [newBudget, ...filtered];
    localStorage.setItem('finoracle_budgets', JSON.stringify(updated));
    return newBudget;
  },

  updateBudget(id: string, updates: Partial<Budget>): Budget {
    const list = mockStore.getBudgets();
    const updated = list.map((b) =>
      b.id === id ? { ...b, ...updates, updated_at: new Date().toISOString() } : b
    );
    localStorage.setItem('finoracle_budgets', JSON.stringify(updated));
    return updated.find((b) => b.id === id)!;
  },

  deleteBudget(id: string): void {
    const list = mockStore.getBudgets();
    const updated = list.filter((b) => b.id !== id);
    localStorage.setItem('finoracle_budgets', JSON.stringify(updated));
  },

  getGoals(): FinancialGoal[] {
    const raw = localStorage.getItem('finoracle_goals');
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  },

  saveGoal(g: any): FinancialGoal {
    const list = mockStore.getGoals();
    const newGoal: FinancialGoal = {
      ...g,
      id: `goal-${Date.now()}`,
      user_id: 'usr-default',
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
    const updated = list.map((g) =>
      g.id === id ? { ...g, ...updates, updated_at: new Date().toISOString() } : g
    );
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
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  },

  saveScenario(sc: any): Scenario {
    const list = mockStore.getScenarios();
    const newScenario: Scenario = {
      ...sc,
      id: `sc-${Date.now()}`,
      user_id: 'usr-default',
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
