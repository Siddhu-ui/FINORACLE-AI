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
  FinancialInsight,
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
          .upsert(
            {
              ...profile,
              user_id: user.id,
              email: user.email || profile.email,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'user_id' }
          )
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

    // Local Store Filter (User's real transactions)
    let list = mockStore.getTransactions();
    if (params?.type) list = list.filter((t) => t.type === params.type);
    if (params?.category) list = list.filter((t) => t.category === params.category);
    if (params?.start_date) list = list.filter((t) => t.date >= params.start_date!);
    if (params?.end_date) list = list.filter((t) => t.date <= params.end_date!);
    if (params?.search) {
      const q = params.search.toLowerCase();
      list = list.filter((t) => t.description.toLowerCase().includes(q));
    }

    // Default sort by date desc
    list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

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

  async getForMonth(month: string): Promise<Budget | null> {
    const all = await budgetService.list();
    return all.find((b) => b.month === month) || null;
  },

  async create(budget: BudgetFormData): Promise<Budget> {
    const user = await getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('budgets')
          .insert({
            name: budget.name,
            month: budget.month,
            planned_income: budget.planned_income ?? 0,
            total_limit: budget.total_limit,
            user_id: user.id,
          })
          .select()
          .single();

        if (!error && data) {
          if (budget.categories.length > 0) {
            const cats = budget.categories.map((c) => ({ ...c, budget_id: data.id }));
            await supabase.from('budget_categories').insert(cats);
          }
          return {
            ...data,
            categories: budget.categories.map((c) => ({ ...c, id: '', budget_id: data.id })),
          };
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
        await supabase
          .from('budgets')
          .update({
            ...(budget.name && { name: budget.name }),
            ...(budget.total_limit !== undefined && { total_limit: budget.total_limit }),
            ...(budget.planned_income !== undefined && { planned_income: budget.planned_income }),
            ...(budget.month && { month: budget.month }),
            updated_at: new Date().toISOString(),
          })
          .eq('id', id)
          .eq('user_id', user.id);

        if (budget.categories) {
          await supabase.from('budget_categories').delete().eq('budget_id', id);
          const cats = budget.categories.map((c) => ({ ...c, budget_id: id }));
          await supabase.from('budget_categories').insert(cats);
        }
        return;
      } catch {
        // fallback
      }
    }

    mockStore.updateBudget(id, budget as any);
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
      return [];
    }
    return JSON.parse(raw);
  },

  async createSession(title: string): Promise<ChatSession> {
    const sessions = await chatService.listSessions();
    const newSession: ChatSession = {
      id: `session-${Date.now()}`,
      user_id: 'usr-default',
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
      // fallback handled by local knowledge
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
// Dashboard Service (Deterministic Real-Data Aggregation Engine)
// ============================================================
export const dashboardService = {
  async getData(startDate?: string, endDate?: string): Promise<DashboardData> {
    const user = await getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    const currentMonth = getCurrentMonth();
    const { start: defaultMonthStart, end: defaultMonthEnd } = getMonthRange(currentMonth);
    const rangeStart = startDate ?? defaultMonthStart;
    const rangeEnd = endDate ?? defaultMonthEnd;

    // 1. Fetch user's profile for planned base income
    const profile = await profileService.get();
    const plannedBaseIncome = profile?.monthly_income ?? 0;

    // 2. Fetch all user transactions
    let allTxns: Transaction[] = [];
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('transactions')
          .select('*')
          .eq('user_id', user.id);
        if (!error && data) allTxns = data;
      } catch {
        allTxns = mockStore.getTransactions();
      }
    } else {
      allTxns = mockStore.getTransactions();
    }

    // Filter transactions within period
    const periodTxns = allTxns.filter((t) => t.date >= rangeStart && t.date <= rangeEnd);

    // Sum actual recorded inflows and outflows
    const actualIncome = periodTxns
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalExpenses = periodTxns
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    // Actual received inflows are the only income recognized in the ledger.
    // Profile income is stored as a planning baseline for budgeting, not cash received.
    const totalIncome = actualIncome;

    // Net cash flow: actual money in minus actual money out
    const netCashFlow = actualIncome - totalExpenses;
    const savings = netCashFlow > 0 ? netCashFlow : 0;
    const savingsRate = actualIncome > 0 ? Math.max(0, Math.min(100, (netCashFlow / actualIncome) * 100)) : 0;

    // 3. Category spending breakdown (only from real transactions)
    const categoryTotals: Record<string, number> = {};
    periodTxns
      .filter((t) => t.type === 'expense')
      .forEach((t) => {
        categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
      });

    const spendingByCategory = Object.entries(categoryTotals)
      .map(([category, amount]) => ({
        category,
        amount,
        percentage: totalExpenses > 0 ? Math.round((amount / totalExpenses) * 100) : 0,
        color: getCategoryColor(category),
      }))
      .sort((a, b) => b.amount - a.amount);

    // 4. Monthly trends (ONLY from months where user has actual transactions)
    const monthlyGroups: Record<string, { income: number; expenses: number }> = {};
    allTxns.forEach((t) => {
      const monthKey = t.date.substring(0, 7); // YYYY-MM
      if (!monthlyGroups[monthKey]) {
        monthlyGroups[monthKey] = { income: 0, expenses: 0 };
      }
      if (t.type === 'income') {
        monthlyGroups[monthKey].income += t.amount;
      } else {
        monthlyGroups[monthKey].expenses += t.amount;
      }
    });

    // Do not fabricate historical income from the profile baseline.
    // Only real transactions are included in trends and recorded inflows.
    const sortedMonthKeys = Object.keys(monthlyGroups).sort();
    const incomeVsExpenses = sortedMonthKeys.map((key) => {
      const [year, month] = key.split('-');
      const d = new Date(Number(year), Number(month) - 1, 1);
      const label = d.toLocaleDateString('en-IN', { month: 'short' });
      return {
        month: label,
        income: monthlyGroups[key].income,
        expenses: monthlyGroups[key].expenses,
      };
    });

    const savingsTrend = sortedMonthKeys.map((key) => {
      const [year, month] = key.split('-');
      const d = new Date(Number(year), Number(month) - 1, 1);
      const label = d.toLocaleDateString('en-IN', { month: 'short' });
      return {
        month: label,
        savings: monthlyGroups[key].income - monthlyGroups[key].expenses,
      };
    });

    // 5. Budget Utilization for current month
    const budgets = await budgetService.list();
    const activeBudget = budgets.find((b) => b.month === currentMonth) || budgets[0] || null;
    const totalBudgetAllocated = activeBudget ? activeBudget.total_limit : 0;
    const budgetUtilization = totalBudgetAllocated > 0 ? (totalExpenses / totalBudgetAllocated) * 100 : 0;

    const categoryBudgets = (activeBudget?.categories || []).map((cat) => {
      const spent = categoryTotals[cat.category] || 0;
      return {
        category: cat.category,
        limit: cat.limit_amount,
        spent,
        utilization: cat.limit_amount > 0 ? (spent / cat.limit_amount) * 100 : 0,
      };
    });

    // 6. Active Goals
    const goals = await goalService.list();

    // 7. Recent Transactions (sorted newest first)
    const recentTransactions = [...allTxns]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 6);

    // 8. Financial Insights derived strictly from real numbers
    const insights: FinancialInsight[] = [];
    if (actualIncome > 0 && totalExpenses > 0) {
      if (netCashFlow < 0) {
        insights.push({
          type: 'warning',
          title: 'Deficit Alert',
          message: `Your outflows (₹${totalExpenses.toLocaleString('en-IN')}) exceeded recorded inflows by ₹${Math.abs(netCashFlow).toLocaleString('en-IN')} this period.`,
        });
      } else if (savingsRate >= 20) {
        insights.push({
          type: 'positive',
          title: 'Disciplined Capital Retention',
          message: `You retained ${savingsRate.toFixed(1)}% of your income this month, exceeding the 20% personal finance benchmark.`,
        });
      }
    }

    if (categoryBudgets.length > 0) {
      const overspent = categoryBudgets.filter((c) => c.utilization > 100);
      if (overspent.length > 0) {
        insights.push({
          type: 'warning',
          title: 'Budget Limits Breached',
          message: `${overspent.map((c) => c.category).join(', ')} exceeded allocated spending caps. Review discretionary outflows.`,
        });
      }
    }

    const hasAnyData =
      allTxns.length > 0 ||
      plannedBaseIncome > 0 ||
      (budgets && budgets.length > 0) ||
      (goals && goals.length > 0);

    return {
      planned_monthly_income: plannedBaseIncome,
      actual_income: actualIncome,
      total_income: totalIncome,
      total_expenses: totalExpenses,
      net_cash_flow: netCashFlow,
      savings,
      savings_rate: savingsRate,
      total_budget_allocated: totalBudgetAllocated,
      budget_utilization: budgetUtilization,
      has_data: hasAnyData,
      recent_transactions: recentTransactions,
      spending_by_category: spendingByCategory,
      income_vs_expenses: incomeVsExpenses,
      savings_trend: savingsTrend,
      category_budgets: categoryBudgets,
      active_goals: goals.filter((g) => g.status === 'active').slice(0, 3),
      insights,
    };
  },
};
