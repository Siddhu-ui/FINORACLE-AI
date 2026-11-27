/**
 * FinOracle AI — Self-Contained FastAPI REST & Auth Client
 * Zero external database dependencies. Uses local FastAPI JWT persisted in localStorage.
 */
import type {
  Budget,
  BudgetFormData,
  ChatMessage,
  ChatSession,
  DashboardData,
  FinancialGoal,
  GoalFormData,
  PaginatedResponse,
  Scenario,
  Transaction,
  TransactionFormData,
  UserProfile,
} from '@/types';

const TOKEN_STORAGE_KEY = 'finoracle_auth_token';

// Always clear any legacy demo user key on module load
if (typeof window !== 'undefined') {
  try {
    localStorage.removeItem('finoracle_demo_user');
  } catch {
    // ignore storage access issues
  }
}

const RAW_API_BASE = (
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  '/api'
).replace(/\/$/, '');

export const API_BASE = RAW_API_BASE.endsWith('/api') ? RAW_API_BASE : `${RAW_API_BASE}/api`;
export const HEALTH_URL =
  RAW_API_BASE === '/api' ? '/api/health' : `${RAW_API_BASE.replace(/\/api$/, '')}/health`;

export function getAuthToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setAuthToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
    localStorage.removeItem('finoracle_demo_user');
  } catch {
    // ignore
  }
}

export function clearAuthToken(): void {
  try {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem('finoracle_demo_user');
  } catch {
    // ignore
  }
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit & { requireAuth?: boolean } = {}
): Promise<T> {
  const { requireAuth = true, headers: extraHeaders, ...rest } = options;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((extraHeaders as Record<string, string>) || {}),
  };

  const token = getAuthToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  } else if (requireAuth) {
    throw new Error('Please sign in to access FinOracle AI.');
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...rest,
      headers,
    });
  } catch {
    throw new Error(
      `Unable to reach the FinOracle AI backend at ${API_BASE}. Ensure FastAPI is running on port 8000.`
    );
  }

  if (!response.ok) {
    let detail = `Request failed (${response.status})`;
    try {
      const errBody = await response.json();
      detail = errBody.detail || errBody.message || detail;
    } catch {
      // keep status text
    }
    if (response.status === 401 && requireAuth) {
      clearAuthToken();
    }
    throw new Error(detail);
  }

  return response.json() as Promise<T>;
}

// ============================================================
// Auth API
// ============================================================
export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: UserProfile;
}

export const authApi = {
  register: (payload: { full_name: string; email: string; password: string }) =>
    apiRequest<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
      requireAuth: false,
    }),

  login: (payload: { email: string; password: string }) =>
    apiRequest<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
      requireAuth: false,
    }),

  me: () => apiRequest<{ user: UserProfile }>('/auth/me'),

  completeOnboarding: (payload: {
    occupation: string;
    income_mode: string;
    income_value: number;
    income_type?: string;
    currency: string;
    primary_goal?: string;
  }) =>
    apiRequest<{ user: UserProfile; onboarding_completed: boolean }>('/auth/onboarding', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updatePassword: (newPassword: string) =>
    apiRequest<{ updated: boolean }>('/auth/password', {
      method: 'PUT',
      body: JSON.stringify({ new_password: newPassword }),
    }),
};

// ============================================================
// Profile Service
// ============================================================
export const profileService = {
  async get(): Promise<UserProfile | null> {
    if (!getAuthToken()) return null;
    try {
      return await apiRequest<UserProfile>('/profile');
    } catch {
      return null;
    }
  },

  async upsert(profile: Partial<UserProfile>): Promise<UserProfile> {
    return apiRequest<UserProfile>('/profile', {
      method: 'PUT',
      body: JSON.stringify(profile),
    });
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
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.per_page) query.set('per_page', String(params.per_page));
    if (params?.type) query.set('type', params.type);
    if (params?.category) query.set('category', params.category);
    if (params?.start_date) query.set('start_date', params.start_date);
    if (params?.end_date) query.set('end_date', params.end_date);
    if (params?.search) query.set('search', params.search);
    if (params?.sort_by) query.set('sort_by', params.sort_by);
    if (params?.sort_order) query.set('sort_order', params.sort_order);
    const qs = query.toString();
    return apiRequest<PaginatedResponse<Transaction>>(`/transactions${qs ? `?${qs}` : ''}`);
  },

  async create(transaction: TransactionFormData): Promise<Transaction> {
    return apiRequest<Transaction>('/transactions', {
      method: 'POST',
      body: JSON.stringify(transaction),
    });
  },

  async update(id: string, transaction: Partial<TransactionFormData>): Promise<Transaction> {
    return apiRequest<Transaction>(`/transactions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(transaction),
    });
  },

  async delete(id: string): Promise<void> {
    await apiRequest(`/transactions/${id}`, { method: 'DELETE' });
  },

  async bulkCreate(transactions: TransactionFormData[]): Promise<Transaction[]> {
    const res = await apiRequest<{ data: Transaction[] }>('/transactions/bulk', {
      method: 'POST',
      body: JSON.stringify({ transactions }),
    });
    return res.data;
  },

  async getSummary(startDate: string, endDate: string) {
    const qs = new URLSearchParams({ start_date: startDate, end_date: endDate }).toString();
    return apiRequest<{
      income: number;
      expenses: number;
      savings: number;
      spendingByCategory: { category: string; amount: number; color: string }[];
    }>(`/transactions/summary?${qs}`);
  },
};

// ============================================================
// Budget Service
// ============================================================
export const budgetService = {
  async list(): Promise<Budget[]> {
    return apiRequest<Budget[]>('/budgets');
  },

  async getForMonth(month: string): Promise<Budget | null> {
    const all = await budgetService.list();
    return all.find((b) => b.month === month) || null;
  },

  async create(budget: BudgetFormData): Promise<Budget> {
    return apiRequest<Budget>('/budgets', {
      method: 'POST',
      body: JSON.stringify(budget),
    });
  },

  async update(id: string, budget: Partial<BudgetFormData>): Promise<void> {
    await apiRequest(`/budgets/${id}`, {
      method: 'PUT',
      body: JSON.stringify(budget),
    });
  },

  async delete(id: string): Promise<void> {
    await apiRequest(`/budgets/${id}`, { method: 'DELETE' });
  },
};

// ============================================================
// Goal Service
// ============================================================
export const goalService = {
  async list(): Promise<FinancialGoal[]> {
    return apiRequest<FinancialGoal[]>('/goals');
  },

  async create(goal: GoalFormData): Promise<FinancialGoal> {
    return apiRequest<FinancialGoal>('/goals', {
      method: 'POST',
      body: JSON.stringify(goal),
    });
  },

  async update(id: string, goal: Partial<GoalFormData & { status: string }>): Promise<FinancialGoal> {
    return apiRequest<FinancialGoal>(`/goals/${id}`, {
      method: 'PUT',
      body: JSON.stringify(goal),
    });
  },

  async addContribution(goalId: string, amount: number): Promise<FinancialGoal> {
    return apiRequest<FinancialGoal>(`/goals/${goalId}/contribute`, {
      method: 'POST',
      body: JSON.stringify({ amount }),
    });
  },

  async delete(id: string): Promise<void> {
    await apiRequest(`/goals/${id}`, { method: 'DELETE' });
  },
};

// ============================================================
// Scenario Service
// ============================================================
export const scenarioService = {
  async list(): Promise<Scenario[]> {
    return apiRequest<Scenario[]>('/scenarios');
  },

  async create(scenario: {
    name: string;
    description?: string;
    baseline: object;
    modified: object;
    impact: object;
  }): Promise<Scenario> {
    return apiRequest<Scenario>('/scenarios', {
      method: 'POST',
      body: JSON.stringify(scenario),
    });
  },

  async delete(id: string): Promise<void> {
    await apiRequest(`/scenarios/${id}`, { method: 'DELETE' });
  },
};

// ============================================================
// Chat Session Service (local session index + FastAPI AI Copilot)
// ============================================================
export const chatService = {
  async listSessions(): Promise<ChatSession[]> {
    const raw = localStorage.getItem('finoracle_chat_sessions');
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  },

  async createSession(title: string): Promise<ChatSession> {
    const sessions = await chatService.listSessions();
    const newSession: ChatSession = {
      id: `session-${Date.now()}`,
      user_id: 'authenticated',
      title,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    localStorage.setItem('finoracle_chat_sessions', JSON.stringify([newSession, ...sessions]));
    return newSession;
  },

  async getMessages(sessionId: string): Promise<ChatMessage[]> {
    const raw = localStorage.getItem(`finoracle_msgs_${sessionId}`);
    return raw ? JSON.parse(raw) : [];
  },

  async deleteSession(id: string): Promise<void> {
    const sessions = await chatService.listSessions();
    localStorage.setItem(
      'finoracle_chat_sessions',
      JSON.stringify(sessions.filter((s) => s.id !== id))
    );
  },
};

// ============================================================
// Dashboard Service (FastAPI SQLite Deterministic Aggregation)
// ============================================================
export const dashboardService = {
  async getData(startDate?: string, endDate?: string): Promise<DashboardData> {
    const query = new URLSearchParams();
    if (startDate) query.set('start_date', startDate);
    if (endDate) query.set('end_date', endDate);
    const qs = query.toString();
    return apiRequest<DashboardData>(`/dashboard${qs ? `?${qs}` : ''}`);
  },
};

// ============================================================
// Sample Indian Ledger Service (explicitly tagged demo data)
// ============================================================
export interface SampleDataStatus {
  total_count: number;
  sample_count: number;
  real_count: number;
  can_load_sample: boolean;
}

export const sampleDataService = {
  status: () => apiRequest<SampleDataStatus>('/sample-data/status'),
  load: () =>
    apiRequest<{ loaded: boolean; transactions_created: number; message: string }>('/sample-data/load', {
      method: 'POST',
    }),
  clear: () =>
    apiRequest<{ cleared: boolean; transactions_removed: number }>('/sample-data', {
      method: 'DELETE',
    }),
};
