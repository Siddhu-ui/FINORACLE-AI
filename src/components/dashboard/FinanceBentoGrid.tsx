import React from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  ChevronRight,
  PiggyBank,
  Wallet,
} from 'lucide-react';
import { Card, ProgressBar } from '@/components/ui';
import { formatCurrency, formatDate, formatPercent } from '@/utils';
import type { DashboardData } from '@/types';

type FinanceBentoGridProps = {
  data: DashboardData;
  periodLabel: string;
  onAddTransaction: () => void;
  onOpenTransactions: () => void;
  onOpenBudgets: () => void;
  onOpenGoals: () => void;
  onConfigureIncome: () => void;
};

const tooltipStyle = {
  contentStyle: {
    background: 'var(--card)',
    border: '1px solid var(--card-border)',
    borderRadius: '8px',
    fontSize: '12px',
    color: 'var(--text-primary)',
  },
  labelStyle: { color: 'var(--text-secondary)' },
};

function TileHeading({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div>
        <h2 className="text-sm font-semibold text-text-primary">{title}</h2>
        {subtitle && <p className="mt-1 text-xs text-text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function FinanceBentoGrid({
  data,
  periodLabel,
  onAddTransaction,
  onOpenTransactions,
  onOpenBudgets,
  onOpenGoals,
  onConfigureIncome,
}: FinanceBentoGridProps) {
  return (
    <div className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4" role="region" aria-label="Financial overview">
      <Card className="min-w-0 p-5 md:col-span-2 xl:col-span-2">
        <div className="flex h-full flex-col justify-between gap-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-text-secondary">Net cash flow</p>
              <p className={`mt-2 text-3xl font-bold tracking-tight ${data.net_cash_flow >= 0 ? 'text-positive' : 'text-negative'}`}>
                {data.net_cash_flow >= 0 ? '+' : ''}{formatCurrency(data.net_cash_flow)}
              </p>
              <p className="mt-1 text-xs text-text-muted">Recorded income minus recorded expenses · {periodLabel}</p>
            </div>
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${data.net_cash_flow >= 0 ? 'bg-positive/10 text-positive' : 'bg-negative/10 text-negative'}`} aria-hidden="true">
              <Wallet className="h-5 w-5" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 border-t border-card-border pt-4">
            <div>
              <p className="text-xs text-text-muted">Recorded income</p>
              <p className="mt-1 font-semibold tabular-nums text-text-primary">{formatCurrency(data.total_income)}</p>
            </div>
            <div>
              <p className="text-xs text-text-muted">Recorded expenses</p>
              <p className="mt-1 font-semibold tabular-nums text-text-primary">{formatCurrency(data.total_expenses)}</p>
            </div>
          </div>
        </div>
      </Card>

      <Card className="min-w-0 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-text-secondary">Savings rate</p>
            <p className="mt-2 text-2xl font-bold tabular-nums text-text-primary">{formatPercent(data.savings_rate)}</p>
            <p className="mt-1 text-xs text-text-muted">Retained {formatCurrency(data.savings)}</p>
          </div>
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary" aria-hidden="true">
            <PiggyBank className="h-4 w-4" />
          </span>
        </div>
        <div className="mt-5 flex items-center justify-between gap-2 text-xs">
          <span className="text-text-muted">Planned monthly income</span>
          <button type="button" onClick={onConfigureIncome} className="font-medium text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded motion-reduce:transition-none">
            {data.planned_monthly_income > 0 ? formatCurrency(data.planned_monthly_income) : 'Set income'}
          </button>
        </div>
      </Card>

      <Card className="min-w-0 p-5">
        <TileHeading title="Spending allocation" subtitle="Recorded expenses by category" />
        {data.spending_by_category.length ? (
          <div className="flex min-w-0 flex-col items-center gap-3 sm:flex-row xl:flex-col 2xl:flex-row">
            <div className="h-36 w-36 shrink-0" role="img" aria-label={`Spending allocation across ${data.spending_by_category.length} categories`}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={data.spending_by_category} dataKey="amount" nameKey="category" innerRadius={42} outerRadius={64} paddingAngle={2} isAnimationActive={false}>
                    {data.spending_by_category.map((item) => <Cell key={item.category} fill={item.color} />)}
                  </Pie>
                  <Tooltip {...tooltipStyle} formatter={(value: number) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="max-h-36 w-full min-w-0 space-y-2 overflow-y-auto" aria-label="Spending categories">
              {data.spending_by_category.map((item) => (
                <li key={item.category} className="flex items-center justify-between gap-2 text-xs">
                  <span className="flex min-w-0 items-center gap-2 text-text-secondary">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: item.color }} aria-hidden="true" />
                    <span className="truncate">{item.category}</span>
                  </span>
                  <span className="shrink-0 font-medium tabular-nums text-text-primary">{item.percentage}%</span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="flex min-h-36 flex-col items-center justify-center text-center">
            <p className="text-xs text-text-muted">No expenses recorded for this period.</p>
            <button type="button" onClick={onAddTransaction} className="mt-3 text-xs font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded motion-reduce:transition-none">Record an expense</button>
          </div>
        )}
      </Card>

      <Card className="min-w-0 p-5 md:col-span-2 xl:col-span-2">
        <TileHeading title="Income and expenses" subtitle="Monthly totals from recorded transactions" />
        {data.income_vs_expenses.length ? (
          <div className="h-56 min-w-0" role="img" aria-label="Monthly income and expense trend chart">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.income_vs_expenses}>
                <defs>
                  <linearGradient id="financeIncome" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="var(--positive)" stopOpacity={0.18} /><stop offset="95%" stopColor="var(--positive)" stopOpacity={0} /></linearGradient>
                  <linearGradient id="financeExpenses" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="var(--negative)" stopOpacity={0.15} /><stop offset="95%" stopColor="var(--negative)" stopOpacity={0} /></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" vertical={false} />
                <XAxis dataKey="month" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`} />
                <Tooltip {...tooltipStyle} formatter={(value: number) => formatCurrency(value)} />
                <Area type="monotone" dataKey="income" name="Income" stroke="var(--positive)" fill="url(#financeIncome)" strokeWidth={2} isAnimationActive={false} />
                <Area type="monotone" dataKey="expenses" name="Expenses" stroke="var(--negative)" fill="url(#financeExpenses)" strokeWidth={2} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : <div className="flex h-56 items-center justify-center text-xs text-text-muted">No monthly transaction history available.</div>}
      </Card>

      {data.savings_trend.length > 1 && (
        <Card className="min-w-0 p-5 md:col-span-2">
          <TileHeading title="Savings trend" subtitle="Monthly surplus from recorded income and expenses" />
          <div className="h-48 min-w-0" role="img" aria-label="Monthly savings trend chart">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.savings_trend}>
                <defs>
                  <linearGradient id="financeSavings" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="var(--primary)" stopOpacity={0.2} /><stop offset="95%" stopColor="var(--primary)" stopOpacity={0} /></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" vertical={false} />
                <XAxis dataKey="month" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`} />
                <Tooltip {...tooltipStyle} formatter={(value: number) => formatCurrency(value)} />
                <Area type="monotone" dataKey="savings" name="Monthly surplus" stroke="var(--primary)" fill="url(#financeSavings)" strokeWidth={2} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {data.insights.length > 0 && (
        <Card className="min-w-0 p-5 md:col-span-2 xl:col-span-4">
          <TileHeading title="Financial insights" subtitle="Based on your recorded activity" />
          <ul className="grid gap-3 md:grid-cols-2" aria-label="Financial insights">
            {data.insights.map((insight, index) => (
              <li key={`${insight.title}-${index}`} className={`flex items-start gap-3 rounded-xl border p-3 ${insight.type === 'warning' ? 'border-warning/25 bg-warning/10' : insight.type === 'positive' ? 'border-positive/25 bg-positive/10' : 'border-primary/25 bg-primary/10'}`}>
                {insight.type === 'warning' ? <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden="true" /> : <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-positive" aria-hidden="true" />}
                <div className="text-xs"><p className="font-semibold text-text-primary">{insight.title}</p><p className="mt-1 text-text-secondary">{insight.message}</p></div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card className="min-w-0 p-5 md:col-span-2">
        <TileHeading
          title="Recent transactions"
          subtitle="Latest records in your ledger"
          action={<button type="button" onClick={onOpenTransactions} className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded motion-reduce:transition-none">View all <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" /></button>}
        />
        {data.recent_transactions.length ? (
          <ul className="divide-y divide-card-border" aria-label="Recent financial transactions">
            {data.recent_transactions.slice(0, 5).map((transaction) => (
              <li key={transaction.id} className="flex min-w-0 items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <div className="flex min-w-0 items-center gap-3">
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${transaction.type === 'income' ? 'bg-positive/10 text-positive' : 'bg-negative/10 text-negative'}`} aria-hidden="true">
                    {transaction.type === 'income' ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium text-text-primary">{transaction.description}</p>
                    <p className="truncate text-[11px] text-text-muted">{transaction.category} · {formatDate(transaction.date, 'short')}</p>
                  </div>
                </div>
                <span className={`shrink-0 text-xs font-semibold tabular-nums ${transaction.type === 'income' ? 'text-positive' : 'text-text-primary'}`}>
                  {transaction.type === 'income' ? '+' : '−'}{formatCurrency(transaction.amount)}
                </span>
              </li>
            ))}
          </ul>
        ) : <div className="flex min-h-32 flex-col items-center justify-center text-center"><p className="text-xs text-text-muted">No transactions recorded yet.</p><button type="button" onClick={onAddTransaction} className="mt-3 text-xs font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded motion-reduce:transition-none">Add your first transaction</button></div>}
      </Card>

      <Card className="min-w-0 p-5">
        <TileHeading title="Budget pacing" subtitle={data.total_budget_allocated > 0 ? `${formatPercent(data.budget_utilization)} of total budget used` : 'No budget configured'} action={<button type="button" onClick={onOpenBudgets} className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded motion-reduce:transition-none">Manage <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" /></button>} />
        {data.category_budgets.length ? (
          <ul className="space-y-4" aria-label="Budget category progress">
            {data.category_budgets.slice(0, 4).map((category) => {
              const exceeded = category.utilization > 100;
              return <li key={category.category}>
                <div className="mb-1.5 flex items-center justify-between gap-2 text-xs"><span className="truncate font-medium text-text-primary">{category.category}</span><span className="shrink-0 tabular-nums text-text-muted"><span className={exceeded ? 'font-semibold text-negative' : 'text-text-primary'}>{formatCurrency(category.spent)}</span> / {formatCurrency(category.limit)}</span></div>
                <ProgressBar value={category.utilization} color={exceeded ? 'bg-negative' : category.utilization > 80 ? 'bg-warning' : 'bg-positive'} size="sm" />
              </li>;
            })}
          </ul>
        ) : <div className="flex min-h-32 flex-col items-center justify-center text-center"><p className="text-xs text-text-muted">Set category limits to track spending against your budget.</p><button type="button" onClick={onOpenBudgets} className="mt-3 text-xs font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded motion-reduce:transition-none">Set a budget</button></div>}
      </Card>

      <Card className="min-w-0 p-5">
        <TileHeading title="Savings goals" subtitle="Progress from your saved goals" action={<button type="button" onClick={onOpenGoals} className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded motion-reduce:transition-none">View goals <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" /></button>} />
        {data.active_goals.length ? (
          <ul className="space-y-4" aria-label="Active savings goals">
            {data.active_goals.slice(0, 3).map((goal) => {
              const progress = Math.min(100, (goal.current_amount / goal.target_amount) * 100);
              return <li key={goal.id}>
                <div className="mb-1.5 flex items-center justify-between gap-2 text-xs"><span className="truncate font-medium text-text-primary">{goal.title}</span><span className="shrink-0 text-text-muted">{progress.toFixed(0)}%</span></div>
                <ProgressBar value={progress} color="bg-positive" size="sm" />
                <p className="mt-1 text-right text-[11px] tabular-nums text-text-muted">{formatCurrency(goal.current_amount)} of {formatCurrency(goal.target_amount)}</p>
              </li>;
            })}
          </ul>
        ) : <div className="flex min-h-32 flex-col items-center justify-center text-center"><p className="text-xs text-text-muted">No active savings goals yet.</p><button type="button" onClick={onOpenGoals} className="mt-3 text-xs font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded motion-reduce:transition-none">Create a goal</button></div>}
      </Card>
    </div>
  );
}
