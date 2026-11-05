import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { mockStore } from '@/services/mockData';
import type {
  Transaction,
  TransactionFormData,
  Budget,
  BudgetFormData,
  FinancialGoal,
  GoalFormData,
  Scenario,
  UserProfile,
  DashboardData,
  ChatSession,
  ChatMessage,
  PaginatedResponse,
} from '@/types';
import { getCurrentMonth, getMonthRange, getCategoryColor } from '@/utils';

async function getCurrentUser() {
  if (isSupabaseConfigured) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) return user;
    } catch {
      // fallback
    }
  }
  const raw = localStorage.getItem('finoracle_demo_user');
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
  return null;
}

// ============================================================
// Profile Service
// ============================================================
export const profileService = {
  async get(): Promise<UserProfile | null> {
    const user = await getCurrentUser();
    if (!user) return null;

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (!error && data) return data;
      } catch {
        // fallback
      }
    }
    return mockStore.getProfile();
  },

  async upsert(profile: Partial<UserProfile>): Promise<UserProfile> {
    const user = await getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .upsert({ ...profile, user_id: user.id, email: user.email }, { onConflict: 'user_id' })
          .select()
          .single();

        if (!error && data) return data;
      } catch {
        // fallback
      }
    }
    return mockStore.saveProfile(profile);
  },
};

// ============================================================
// Transaction Service
// ============================================================
export const transactionService = {
  async list(params?: {
    page?: number;
    per_page?: number;
    type?: string;
    category?: string;
    start_date?: string;
    end_date?: string;
    search?: string;
    sort_by?: string;
    sort_order?: 'asc' | 'desc';
  }): Promise<PaginatedResponse<Transaction>> {
    const user = await getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    const page = params?.page ?? 1;
    const perPage = params?.per_page ?? 20;

    if (isSupabaseConfigured) {
      try {
        const from = (page - 1) * perPage;
        const to = from + perPage - 1;

        let query = supabase
          .from('transactions')
          .select('*', { count: 'exact' })
          .eq('user_id', user.id);

        if (params?.type) query = query.eq('type', params.type);
        if (params?.category) query = query.eq('category', params.category);
        if (params?.start_date) query = query.gte('date', params.start_date);
        if (params?.end_date) query = query.lte('date', params.end_date);
        if (params?.search) query = query.ilike('description', `%${params.search}%`);

        const sortBy = params?.sort_by ?? 'date';
        const sortOrder = params?.sort_order ?? 'desc';
        query = query.order(sortBy, { ascending: sortOrder === 'asc' }).range(from, to);

        const { data, count, error } = await query;
        if (!error && data) {
          return {
            data: data ?? [],
            total: count ?? 0,
            page,
            per_page: perPage,
            total_pages: Math.ceil((count ?? 0) / perPage),
          };
        }
      } catch {
        // fallback
      }
    }

    // Mock Store Filter
    let list = mockStore.getTransactions();
    if (params?.type) list = list.filter((t) => t.type === params.type);
    if (params?.category) list = list.filter((t) => t.category === params.category);
    if (params?.start_date) list = list.filter((t) => t.date >= params.start_date!);
    if (params?.end_date) list = list.filter((t) => t.date <= params.end_date!);
    if (params?.search) {
      const q = params.search.toLowerCase();
      list = list.filter((t) => t.description.toLowerCase().includes(q));
    }

    const total = list.length;
    const from = (page - 1) * perPage;
    const paged = list.slice(from, from + perPage);

    return {
      data: paged,
      total,
      page,
      per_page: perPage,
      total_pages: Math.ceil(total / perPage),
    };
  },

  async create(transaction: TransactionFormData): Promise<Transaction> {
    const user = await getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('transactions')
          .insert({ ...transaction, user_id: user.id })
          .select()
          .single();

        if (!error && data) return data;
      } catch {
        // fallback
      }
    }
    return mockStore.saveTransaction({ ...transaction, user_id: user.id });
  },

  async update(id: string, transaction: Partial<TransactionFormData>): Promise<Transaction> {
    const user = await getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('transactions')
          .update({ ...transaction, updated_at: new Date().toISOString() })
          .eq('id', id)
          .eq('user_id', user.id)
          .select()
          .single();

        if (!error && data) return data;
      } catch {
        // fallback
      }
    }
    return mockStore.updateTransaction(id, transaction);
  },

  async delete(id: string): Promise<void> {
    const user = await getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    if (isSupabaseConfigured) {
      try {
        await supabase
          .from('transactions')
          .delete()
          .eq('id', id)
          .eq('user_id', user.id);
        return;
      } catch {
        // fallback
      }
    }
    mockStore.deleteTransaction(id);
  },

  async bulkCreate(transactions: TransactionFormData[]): Promise<Transaction[]> {
    const user = await getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    if (isSupabaseConfigured) {
      try {
        const rows = transactions.map((t) => ({ ...t, user_id: user.id }));
        const { data, error } = await supabase.from('transactions').insert(rows).select();
        if (!error && data) return data;
      } catch {
        // fallback
      }
    }
    return transactions.map((t) => mockStore.saveTransaction({ ...t, user_id: user.id }));
  },

  async getSummary(startDate: string, endDate: string) {
    const user = await getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    let txns = mockStore.getTransactions();

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('transactions')
          .select('type, amount, category, date')
          .eq('user_id', user.id)
          .gte('date', startDate)
          .lte('date', endDate);

        if (!error && data) {
          txns = data as any;
        }
      } catch {
        // fallback
      }
    }

    const filtered = txns.filter((t) => t.date >= startDate && t.date <= endDate);
    const income = filtered.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expenses = filtered.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

    const byCategory: Record<string, number> = {};
    filtered
      .filter((t) => t.type === 'expense')
      .forEach((t) => {
        byCategory[t.category] = (byCategory[t.category] || 0) + t.amount;
      });

    const spendingByCategory = Object.entries(byCategory).map(([category, amount]) => ({
      category,
      amount,
      color: getCategoryColor(category),
    }));

    return { income, expenses, savings: income - expenses, spendingByCategory };
  },
};

// ============================================================
// Budget Service
// ============================================================
export const budgetService = {
  async list(): Promise<Budget[]> {
    const user = await getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('budgets')
          .select('*, budget_categories(*)')
          .eq('user_id', user.id)
          .order('month', { ascending: false });

        if (!error && data) {
          return data.map((b) => ({ ...b, categories: b.budget_categories ?? [] }));
        }
      } catch {
        // fallback
      }
    }
    return mockStore.getBudgets();
  },

  async create(budget: BudgetFormData): Promise<Budget> {
    const user = await getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('budgets')
          .insert({ name: budget.name, month: budget.month, total_limit: budget.total_limit, user_id: user.id })
          .select()
          .single();

        if (!error && data) {
          if (budget.categories.length > 0) {
            const cats = budget.categories.map((c) => ({ ...c, budget_id: data.id }));
            await supabase.from('budget_categories').insert(cats);
          }
          return { ...data, categories: budget.categories.map((c) => ({ ...c, id: '', budget_id: data.id })) };
        }
      } catch {
        // fallback
      }
    }
    return mockStore.saveBudget(budget);
  },

  async update(id: string, budget: Partial<BudgetFormData>): Promise<void> {
    const user = await getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    if (isSupabaseConfigured) {
      try {
        if (budget.name || budget.total_limit || budget.month) {
          await supabase
            .from('budgets')
            .update({
              ...(budget.name && { name: budget.name }),
              ...(budget.total_limit && { total_limit: budget.total_limit }),
              ...(budget.month && { month: budget.month }),
              updated_at: new Date().toISOString(),
            })
            .eq('id', id)
            .eq('user_id', user.id);
        }
        return;
      } catch {
        // fallback
      }
    }
  },

  async delete(id: string): Promise<void> {
    const user = await getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    if (isSupabaseConfigured) {
      try {
        await supabase.from('budgets').delete().eq('id', id).eq('user_id', user.id);
        return;
      } catch {
        // fallback
      }
    }
    mockStore.deleteBudget(id);
  },
};

// ============================================================
// Goal Service
// ============================================================
export const goalService = {
  async list(): Promise<FinancialGoal[]> {
    const user = await getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('financial_goals')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (!error && data) return data;
      } catch {
        // fallback
      }
    }
    return mockStore.getGoals();
  },

  async create(goal: GoalFormData): Promise<FinancialGoal> {
    const user = await getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('financial_goals')
          .insert({ ...goal, user_id: user.id, status: 'active' })
          .select()
          .single();

        if (!error && data) return data;
      } catch {
        // fallback
      }
    }
    return mockStore.saveGoal(goal);
  },

  async update(id: string, goal: Partial<GoalFormData & { status: string }>): Promise<FinancialGoal> {
    const user = await getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('financial_goals')
          .update({ ...goal, updated_at: new Date().toISOString() })
          .eq('id', id)
          .eq('user_id', user.id)
          .select()
          .single();

        if (!error && data) return data;
      } catch {
        // fallback
      }
    }
    return mockStore.updateGoal(id, goal as any);
  },

  async addContribution(goalId: string, amount: number): Promise<FinancialGoal> {
    const goals = mockStore.getGoals();
    const g = goals.find((item) => item.id === goalId);
    if (!g) throw new Error('Goal not found');

    const newAmt = g.current_amount + amount;
    const status = newAmt >= g.target_amount ? 'completed' : 'active';
    return mockStore.updateGoal(goalId, { current_amount: newAmt, status });
  },

  async delete(id: string): Promise<void> {
    const user = await getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    if (isSupabaseConfigured) {
      try {
        await supabase.from('financial_goals').delete().eq('id', id).eq('user_id', user.id);
        return;
      } catch {
        // fallback
      }
    }
    mockStore.deleteGoal(id);
  },
};

// ============================================================
// Scenario Service
// ============================================================
export const scenarioService = {
  async list(): Promise<Scenario[]> {
    const user = await getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('scenarios')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (!error && data) return data;
      } catch {
        // fallback
      }
    }
    return mockStore.getScenarios();
  },

  async create(scenario: { name: string; description?: string; baseline: object; modified: object; impact: object }): Promise<Scenario> {
    const user = await getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('scenarios')
          .insert({ ...scenario, user_id: user.id })
          .select()
          .single();

        if (!error && data) return data;
      } catch {
        // fallback
      }
    }
    return mockStore.saveScenario(scenario);
  },

  async delete(id: string): Promise<void> {
    const user = await getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    if (isSupabaseConfigured) {
      try {
        await supabase.from('scenarios').delete().eq('id', id).eq('user_id', user.id);
        return;
      } catch {
        // fallback
      }
    }
    mockStore.deleteScenario(id);
  },
};

// ============================================================
// Chat Service
// ============================================================
export const chatService = {
  async listSessions(): Promise<ChatSession[]> {
    const raw = localStorage.getItem('finoracle_chat_sessions');
    if (!raw) {
      const initial: ChatSession[] = [
        {
          id: 'session-default',
          user_id: 'usr-demo-1',
          title: 'Financial Strategy Session',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];
      localStorage.setItem('finoracle_chat_sessions', JSON.stringify(initial));
      return initial;
    }
    return JSON.parse(raw);
  },

  async createSession(title: string): Promise<ChatSession> {
    const sessions = await chatService.listSessions();
    const newSession: ChatSession = {
      id: `session-${Date.now()}`,
      user_id: 'usr-demo-1',
      title,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const updated = [newSession, ...sessions];
    localStorage.setItem('finoracle_chat_sessions', JSON.stringify(updated));
    return newSession;
  },

  async getMessages(sessionId: string): Promise<ChatMessage[]> {
    const raw = localStorage.getItem(`finoracle_msgs_${sessionId}`);
    return raw ? JSON.parse(raw) : [];
  },

  async sendMessage(sessionId: string, content: string): Promise<ChatMessage> {
    const msgs = await chatService.getMessages(sessionId);
    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      session_id: sessionId,
      role: 'user',
      content,
      created_at: new Date().toISOString(),
    };

    // Call backend API if running
    try {
      const apiUrl = import.meta.env.VITE_API_URL || '/api';
      const res = await fetch(`${apiUrl}/assistant/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, message: content }),
      });
      if (res.ok) {
        const json = await res.json();
        const aiMsg: ChatMessage = {
          id: `ai-${Date.now()}`,
          session_id: sessionId,
          role: 'assistant',
          content: json.response,
          sources: json.sources,
          created_at: new Date().toISOString(),
        };
        localStorage.setItem(`finoracle_msgs_${sessionId}`, JSON.stringify([...msgs, userMsg, aiMsg]));
        return aiMsg;
      }
    } catch {
      // fallback handled by caller or local knowledge
    }

    throw new Error('Fallback to local intelligence');
  },

  async deleteSession(id: string): Promise<void> {
    const sessions = await chatService.listSessions();
    const filtered = sessions.filter((s) => s.id !== id);
    localStorage.setItem('finoracle_chat_sessions', JSON.stringify(filtered));
  },
};

// ============================================================
// Dashboard Service
// ============================================================
export const dashboardService = {
  async getData(startDate?: string, endDate?: string): Promise<DashboardData> {
    const user = await getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    const month = getCurrentMonth();
    const { start, end } = getMonthRange(month);
    const rangeStart = startDate ?? start;
    const rangeEnd = endDate ?? end;

    const txns = mockStore.getTransactions();
    const filtered = txns.filter((t) => t.date >= rangeStart && t.date <= rangeEnd);

    const totalIncome = filtered.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const totalExpenses = filtered.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const savings = totalIncome - totalExpenses;
    const savingsRate = totalIncome > 0 ? (savings / totalIncome) * 100 : 0;

    // Category breakdown
    const byCategory: Record<string, number> = {};
    filtered
      .filter((t) => t.type === 'expense')
      .forEach((t) => {
        byCategory[t.category] = (byCategory[t.category] || 0) + t.amount;
      });

    const spendingByCategory = Object.entries(byCategory).map(([category, amount]) => ({
      category,
      amount,
      color: getCategoryColor(category),
    }));

    // Historical monthly trends
    const incomeVsExpenses = [
      { month: 'Oct', income: 140000, expenses: 68000 },
      { month: 'Nov', income: 155000, expenses: 72000 },
      { month: 'Dec', income: 145000, expenses: 79000 },
      { month: 'Jan', income: 160000, expenses: 71000 },
      { month: 'Feb', income: totalIncome || 173000, expenses: totalExpenses || 71200 },
    ];

    const savingsTrend = incomeVsExpenses.map((d) => ({
      month: d.month,
      savings: d.income - d.expenses,
    }));

    const budgets = mockStore.getBudgets();
    const activeBudget = budgets[0];
    const totalBudgetLimit = activeBudget ? activeBudget.total_limit : 100000;
    const budgetUtilization = totalBudgetLimit > 0 ? (totalExpenses / totalBudgetLimit) * 100 : 0;

    const goals = mockStore.getGoals();

    return {
      total_income: totalIncome,
      total_expenses: totalExpenses,
      available_balance: savings,
      savings,
      savings_rate: savingsRate,
      budget_utilization: budgetUtilization,
      recent_transactions: filtered.slice(0, 6),
      spending_by_category: spendingByCategory,
      income_vs_expenses: incomeVsExpenses,
      savings_trend: savingsTrend,
      active_goals: goals.slice(0, 3),
      upcoming_bills: filtered.filter((t) => t.type === 'expense').slice(0, 2),
    };
  },
};
