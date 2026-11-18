/** @vitest-environment jsdom */

import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { FinanceBentoGrid } from './FinanceBentoGrid';
import type { DashboardData } from '@/types';

vi.mock('recharts', () => {
  const Empty = () => null;
  return {
    ResponsiveContainer: Empty,
    PieChart: Empty,
    Pie: Empty,
    Cell: Empty,
    AreaChart: Empty,
    Area: Empty,
    CartesianGrid: Empty,
    XAxis: Empty,
    YAxis: Empty,
    Tooltip: Empty,
  };
});

afterEach(cleanup);

const emptyData: DashboardData = {
  planned_monthly_income: 0,
  actual_income: 0,
  total_income: 0,
  total_expenses: 0,
  net_cash_flow: 0,
  savings: 0,
  savings_rate: 0,
  total_budget_allocated: 0,
  budget_utilization: 0,
  has_data: false,
  recent_transactions: [],
  spending_by_category: [],
  income_vs_expenses: [],
  savings_trend: [],
  category_budgets: [],
  active_goals: [],
  insights: [],
};

function renderGrid(data = emptyData) {
  const actions = {
    onAddTransaction: vi.fn(),
    onOpenTransactions: vi.fn(),
    onOpenBudgets: vi.fn(),
    onOpenGoals: vi.fn(),
    onConfigureIncome: vi.fn(),
  };
  render(<FinanceBentoGrid data={data} periodLabel="this month" {...actions} />);
  return actions;
}

describe('FinanceBentoGrid', () => {
  it('shows zero-data states without injecting sample balances or activity', () => {
    renderGrid();

    expect(screen.getAllByText('₹0').length).toBeGreaterThan(1);
    expect(screen.getByText('No expenses recorded for this period.')).toBeTruthy();
    expect(screen.getByText('No transactions recorded yet.')).toBeTruthy();
    expect(screen.getByText('No active savings goals yet.')).toBeTruthy();
    expect(screen.queryByText(/Ethereum|ETH|staking|liquidity pool/i)).toBeNull();
  });

  it('renders metrics, categories, transactions and goals from supplied dashboard data', () => {
    const data: DashboardData = {
      ...emptyData,
      planned_monthly_income: 80000,
      actual_income: 75000,
      total_income: 75000,
      total_expenses: 30000,
      net_cash_flow: 45000,
      savings: 45000,
      savings_rate: 60,
      spending_by_category: [{ category: 'Housing', amount: 30000, percentage: 100, color: '#159B72' }],
      income_vs_expenses: [{ month: 'Nov', income: 75000, expenses: 30000 }],
      savings_trend: [{ month: 'Oct', savings: 40000 }, { month: 'Nov', savings: 45000 }],
      recent_transactions: [{
        id: 'txn-1', user_id: 'user-1', type: 'expense', amount: 30000,
        category: 'Housing', description: 'Monthly rent', date: '2026-11-01',
        created_at: '2026-11-01T00:00:00Z', updated_at: '2026-11-01T00:00:00Z',
      }],
      active_goals: [{
        id: 'goal-1', user_id: 'user-1', title: 'Emergency fund', target_amount: 100000,
        current_amount: 25000, target_date: '2027-11-01', monthly_contribution: 5000,
        status: 'active', created_at: '2026-11-01T00:00:00Z', updated_at: '2026-11-01T00:00:00Z',
      }],
    };

    renderGrid(data);

    expect(screen.getByText('+₹45,000')).toBeTruthy();
    expect(screen.getByText('60.0%')).toBeTruthy();
    expect(screen.getByText('Housing')).toBeTruthy();
    expect(screen.getByText('Monthly rent')).toBeTruthy();
    expect(screen.getByText('Emergency fund')).toBeTruthy();
    expect(screen.getByLabelText('Monthly income and expense trend chart')).toBeTruthy();
    expect(screen.getByLabelText('Monthly savings trend chart')).toBeTruthy();
  });

  it('keeps finance actions available from the tiles', () => {
    const actions = renderGrid();

    fireEvent.click(screen.getByRole('button', { name: 'Set income' }));
    fireEvent.click(screen.getByRole('button', { name: 'Record an expense' }));
    fireEvent.click(screen.getByRole('button', { name: /Manage/ }));
    fireEvent.click(screen.getByRole('button', { name: /View goals/ }));

    expect(actions.onConfigureIncome).toHaveBeenCalledOnce();
    expect(actions.onAddTransaction).toHaveBeenCalledOnce();
    expect(actions.onOpenBudgets).toHaveBeenCalledOnce();
    expect(actions.onOpenGoals).toHaveBeenCalledOnce();
  });
});
