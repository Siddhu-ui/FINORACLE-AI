/** @vitest-environment jsdom */

import { beforeEach, describe, expect, it } from 'vitest';
import { dashboardService } from './supabase';
import { mockStore } from './mockData';

describe('dashboardService data integrity', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem(
      'finoracle_demo_user',
      JSON.stringify({
        id: 'user-1',
        email: 'demo@example.com',
      })
    );
    mockStore.saveProfile({
      user_id: 'user-1',
      full_name: 'Demo User',
      email: 'demo@example.com',
      monthly_income: 145000,
      currency: 'INR',
      onboarding_completed: true,
    });
  });

  it('does not treat configured profile income as actual received income', async () => {
    const result = await dashboardService.getData();

    expect(result.planned_monthly_income).toBe(145000);
    expect(result.actual_income).toBe(0);
    expect(result.total_income).toBe(0);
    expect(result.net_cash_flow).toBe(0);
    expect(result.savings_rate).toBe(0);
  });
});
