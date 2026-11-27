/** @vitest-environment jsdom */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { dashboardService, setAuthToken } from './api';

describe('dashboardService API contract', () => {
  beforeEach(() => {
    localStorage.clear();
    setAuthToken('test-jwt-token');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('fetches authenticated dashboard metrics without fabricating actual income', async () => {
    const mockPayload = {
      planned_monthly_income: 145000,
      actual_income: 0,
      total_income: 0,
      total_expenses: 0,
      net_cash_flow: 0,
      savings: 0,
      savings_rate: 0,
      total_budget_allocated: 0,
      budget_utilization: 0,
      has_data: true,
      recent_transactions: [],
      spending_by_category: [],
      income_vs_expenses: [],
      savings_trend: [],
      category_budgets: [],
      active_goals: [],
      insights: [],
    };

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify(mockPayload), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const result = await dashboardService.getData();

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(result.planned_monthly_income).toBe(145000);
    expect(result.actual_income).toBe(0);
    expect(result.total_income).toBe(0);
    expect(result.net_cash_flow).toBe(0);
    expect(result.savings_rate).toBe(0);
  });
});
