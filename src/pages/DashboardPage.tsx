import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  PiggyBank,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  SlidersHorizontal,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  ExternalLink,
  ShieldCheck,
  ChevronRight,
  Layers,
  Sparkles,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from 'recharts';
import { useAuth } from '@/contexts/AuthContext';
import { dashboardService, profileService } from '@/services/supabase';
import { Card, StatCardSkeleton, ProgressBar, Badge } from '@/components/ui';
import { formatCurrency, formatPercent, formatDate, getCurrentMonth } from '@/utils';
import type { DashboardData, UserProfile } from '@/types';
import { useNavigate } from 'react-router-dom';
import { AddTransactionModal } from '@/components/modals/AddTransactionModal';
import { IncomeSetupModal } from '@/components/modals/IncomeSetupModal';

type PeriodFilter = 'this_month' | 'last_month' | 'last_3_months' | 'all_time';

const chartTooltipStyle = {
  contentStyle: {
    background: '#111622',
    border: '1px solid #1E2638',
    borderRadius: '12px',
    fontSize: '12px',
    color: '#F8FAFC',
    boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
  },
  labelStyle: { color: '#94A3B8' },
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<PeriodFilter>('this_month');

  // Modals
  const [isAddTxnOpen, setIsAddTxnOpen] = useState(false);
  const [isIncomeModalOpen, setIsIncomeModalOpen] = useState(false);

  const { user } = useAuth();
  const navigate = useNavigate();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const now = new Date();
      let start: string | undefined;
      let end: string | undefined = now.toISOString().split('T')[0];

      if (period === 'this_month') {
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        start = monthStart.toISOString().split('T')[0];
      } else if (period === 'last_month') {
        const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
        start = lastMonthStart.toISOString().split('T')[0];
        end = lastMonthEnd.toISOString().split('T')[0];
      } else if (period === 'last_3_months') {
        const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1);
        start = threeMonthsAgo.toISOString().split('T')[0];
      } else {
        // all_time
        start = '2000-01-01';
      }

      const [dashResult, profResult] = await Promise.all([
        dashboardService.getData(start, end),
        profileService.get(),
      ]);

      setData(dashResult);
      setProfile(profResult);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Greeting helper
  const hour = new Date().getHours();
  const timeGreeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const userName = profile?.full_name || user?.user_metadata?.full_name || 'Investor';

  const currentMonthLabel = new Date().toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
  });

  const hasAnyFinancialActivity =
    data &&
    (data.actual_income > 0 ||
      data.total_expenses > 0 ||
      data.planned_monthly_income > 0 ||
      data.recent_transactions.length > 0);

  return (
    <div className="space-y-6 min-w-0 w-full">
      {/* 1. Header with Period Selector & Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-card-border/60">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-text-primary tracking-tight">
              {timeGreeting}, {userName}
            </h1>
            <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-primary/10 text-primary border border-primary/20">
              <ShieldCheck className="w-3 h-3" /> Real-time
            </span>
          </div>
          <p className="text-xs sm:text-sm text-text-secondary mt-0.5 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-text-muted" />
            <span>Cycle: {currentMonthLabel}</span>
            {profile?.income_type && (
              <>
                <span className="text-text-muted">•</span>
                <span className="text-text-muted">{profile.income_type}</span>
              </>
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Period Filter Tabs */}
          <div className="flex items-center bg-card border border-card-border rounded-xl p-1 text-xs">
            {(
              [
                { id: 'this_month', label: 'This Month' },
                { id: 'last_month', label: 'Last Month' },
                { id: 'last_3_months', label: '3M' },
                { id: 'all_time', label: 'All' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setPeriod(tab.id)}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                  period === tab.id
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Action buttons */}
          <button
            onClick={() => setIsIncomeModalOpen(true)}
            className="btn-secondary text-xs flex items-center gap-1.5 py-2 px-3"
            title="Configure monthly baseline income"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-text-muted" />
            <span className="hidden sm:inline">Configure</span> Income
          </button>

          <button
            onClick={() => setIsAddTxnOpen(true)}
            className="btn-primary text-xs flex items-center gap-1.5 py-2 px-3.5 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Add Transaction</span>
          </button>
        </div>
      </div>

      {/* 2. Loading State */}
      {loading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <StatCardSkeleton key={i} />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="skeleton h-[300px] rounded-2xl" />
            <div className="skeleton h-[300px] rounded-2xl" />
          </div>
        </div>
      ) : !hasAnyFinancialActivity ? (
        /* 3. Empty State (Zero Fabricated Data) */
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="bg-gradient-to-b from-card to-background-secondary border border-card-border rounded-2xl p-6 sm:p-10 text-center relative overflow-hidden">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-4 text-primary">
              <Sparkles className="w-8 h-8" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-text-primary mb-2">
              Welcome to FinOracle AI
            </h2>
            <p className="text-sm text-text-secondary max-w-lg mx-auto mb-8 leading-relaxed">
              Your financial dashboard is completely clean. FinOracle AI uses only your verified figures—no
              hardcoded assumptions, fake balances, or simulated salaries.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={() => setIsIncomeModalOpen(true)}
                className="w-full sm:w-auto btn-primary flex items-center justify-center gap-2 py-3 px-6 text-sm"
              >
                <Wallet className="w-4 h-4" />
                <span>Configure Monthly Income</span>
              </button>
              <button
                onClick={() => setIsAddTxnOpen(true)}
                className="w-full sm:w-auto btn-secondary flex items-center justify-center gap-2 py-3 px-6 text-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Record First Transaction</span>
              </button>
            </div>

            {/* Feature Highlights Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-12 text-left pt-8 border-t border-card-border/60">
              <div className="p-4 rounded-xl bg-card/60 border border-card-border/40">
                <div className="text-xs font-semibold text-text-primary mb-1 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-positive" />
                  <span>Real Cash Flow Precision</span>
                </div>
                <p className="text-xs text-text-muted leading-relaxed">
                  Track actual inflows and outflows down to the penny. Net savings are calculated with zero fabrication.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-card/60 border border-card-border/40">
                <div className="text-xs font-semibold text-text-primary mb-1 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-positive" />
                  <span>Disciplined Category Budgets</span>
                </div>
                <p className="text-xs text-text-muted leading-relaxed">
                  Set realistic category limits and monitor your spending trajectory before overspending occurs.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-card/60 border border-card-border/40">
                <div className="text-xs font-semibold text-text-primary mb-1 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-positive" />
                  <span>AI Scenario Projections</span>
                </div>
                <p className="text-xs text-text-muted leading-relaxed">
                  Simulate job switches, loan prepayments, and inflation impacts using your actual financial baseline.
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      ) : (
        /* 4. Active Dashboard with Real Data */
        <div className="space-y-6">
          {/* Top Metric Cards (Groww/Fintech aesthetic) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Monthly Income */}
            <Card className="p-5 border-card-border hover:border-border-hover transition-all">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-text-secondary uppercase tracking-wider">
                  Total Income
                </span>
                <div className="w-9 h-9 rounded-xl bg-positive/10 text-positive flex items-center justify-center">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-bold text-text-primary tracking-tight">
                {data!.total_income > 0 || profile?.income_frequency === 'No current income' || profile?.occupation === 'Student'
                  ? formatCurrency(data!.total_income)
                  : 'Income not configured'}
              </p>
              <div className="mt-2 flex items-center justify-between text-xs text-text-muted">
                {data!.actual_income > 0 ? (
                  <span className="text-positive font-medium">
                    {formatCurrency(data!.actual_income)} recorded inflows
                  </span>
                ) : data!.planned_monthly_income > 0 ? (
                  <span>Base planned income</span>
                ) : (
                  <span>Income not configured</span>
                )}
                <button
                  onClick={() => setIsIncomeModalOpen(true)}
                  className="text-primary hover:underline"
                >
                  Configure
                </button>
              </div>
            </Card>

            {/* Card 2: Total Expenses */}
            <Card className="p-5 border-card-border hover:border-border-hover transition-all">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-text-secondary uppercase tracking-wider">
                  Total Outflows
                </span>
                <div className="w-9 h-9 rounded-xl bg-negative/10 text-negative flex items-center justify-center">
                  <TrendingDown className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-bold text-text-primary tracking-tight">
                {formatCurrency(data!.total_expenses)}
              </p>
              <p className="text-xs text-text-muted mt-2">
                {data!.total_expenses === 0
                  ? 'No expenses recorded'
                  : period === 'this_month'
                  ? 'Expenses logged this month'
                  : 'Total period expenses'}
              </p>
            </Card>

            {/* Card 3: Net Cash Flow */}
            <Card className="p-5 border-card-border hover:border-border-hover transition-all">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-text-secondary uppercase tracking-wider">
                  Net Cash Flow
                </span>
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                    data!.net_cash_flow >= 0
                      ? 'bg-positive/10 text-positive'
                      : 'bg-negative/10 text-negative'
                  }`}
                >
                  {data!.net_cash_flow >= 0 ? (
                    <ArrowUpRight className="w-4 h-4" />
                  ) : (
                    <ArrowDownRight className="w-4 h-4" />
                  )}
                </div>
              </div>
              <p
                className={`text-2xl font-bold tracking-tight ${
                  data!.net_cash_flow >= 0 ? 'text-positive' : 'text-negative'
                }`}
              >
                {data!.net_cash_flow >= 0 ? '+' : ''}
                {formatCurrency(data!.net_cash_flow)}
              </p>
              <p className="text-xs text-text-muted mt-2">
                Inflows minus recorded outflows
              </p>
            </Card>

            {/* Card 4: Capital Retention / Savings */}
            <Card className="p-5 border-card-border hover:border-border-hover transition-all">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-text-secondary uppercase tracking-wider">
                  Savings Rate
                </span>
                <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <PiggyBank className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-bold text-text-primary tracking-tight">
                {formatPercent(data!.savings_rate)}
              </p>
              <div className="mt-2 flex items-center justify-between text-xs text-text-muted">
                <span>Retained: {formatCurrency(data!.savings)}</span>
                <span
                  className={
                    data!.savings_rate >= 20 ? 'text-positive font-medium' : 'text-text-muted'
                  }
                >
                  {data!.savings_rate >= 20 ? 'Healthy (≥20%)' : 'Target: ≥20%'}
                </span>
              </div>
            </Card>
          </div>

          {/* Algorithmic Financial Insights (Only if actual criteria triggered) */}
          {data!.insights.length > 0 && (
            <div className="space-y-2">
              {data!.insights.map((ins, i) => (
                <div
                  key={i}
                  className={`p-3.5 rounded-xl border flex items-start gap-3 ${
                    ins.type === 'warning'
                      ? 'bg-warning/10 border-warning/25 text-text-primary'
                      : ins.type === 'positive'
                      ? 'bg-positive/10 border-positive/25 text-text-primary'
                      : 'bg-primary/10 border-primary/25 text-text-primary'
                  }`}
                >
                  <div className="mt-0.5">
                    {ins.type === 'warning' ? (
                      <AlertTriangle className="w-4 h-4 text-warning" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-positive" />
                    )}
                  </div>
                  <div className="text-xs">
                    <span className="font-semibold block mb-0.5">{ins.title}</span>
                    <span className="text-text-secondary">{ins.message}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Charts Row (strictly with min-w-0 to prevent horizontal overflow) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-w-0">
            {/* Chart 1: Income vs Expenses */}
            <Card className="min-w-0 p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-text-primary">Inflows vs Outflows</h3>
                  <p className="text-xs text-text-muted">Actual monthly recorded movement</p>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-1.5 text-text-secondary">
                    <span className="w-2.5 h-2.5 rounded-sm bg-positive" /> Inflow
                  </span>
                  <span className="flex items-center gap-1.5 text-text-secondary">
                    <span className="w-2.5 h-2.5 rounded-sm bg-negative" /> Outflow
                  </span>
                </div>
              </div>

              <div className="h-[260px] w-full min-w-0">
                {data!.income_vs_expenses.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data!.income_vs_expenses} barGap={6}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1E2638" vertical={false} />
                      <XAxis
                        dataKey="month"
                        tick={{ fill: '#94A3B8', fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fill: '#94A3B8', fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                      />
                      <RechartsTooltip
                        {...chartTooltipStyle}
                        formatter={(val: number) => formatCurrency(val)}
                      />
                      <Bar
                        dataKey="income"
                        fill="#10B981"
                        radius={[4, 4, 0, 0]}
                        maxBarSize={32}
                        name="Inflow"
                      />
                      <Bar
                        dataKey="expenses"
                        fill="#EF4444"
                        radius={[4, 4, 0, 0]}
                        maxBarSize={32}
                        name="Outflow"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-text-muted">
                    No historical records available
                  </div>
                )}
              </div>
            </Card>

            {/* Chart 2: Expense Breakdown by Category */}
            <Card className="min-w-0 p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-text-primary">Spending Breakdown</h3>
                  <p className="text-xs text-text-muted">Category distribution of outflows</p>
                </div>
                {data!.total_expenses > 0 && (
                  <span className="text-xs font-semibold text-text-secondary">
                    {formatCurrency(data!.total_expenses)} Total
                  </span>
                )}
              </div>

              {data!.spending_by_category.length > 0 ? (
                <div className="flex flex-col sm:flex-row items-center gap-4 min-w-0">
                  <div className="w-[180px] h-[180px] shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={data!.spending_by_category}
                          cx="50%"
                          cy="50%"
                          innerRadius={52}
                          outerRadius={78}
                          paddingAngle={3}
                          dataKey="amount"
                        >
                          {data!.spending_by_category.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <RechartsTooltip
                          {...chartTooltipStyle}
                          formatter={(val: number) => formatCurrency(val)}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="flex-1 w-full space-y-2 max-h-[190px] overflow-y-auto pr-1">
                    {data!.spending_by_category.map((item) => (
                      <div
                        key={item.category}
                        className="flex items-center justify-between text-xs py-1 px-1.5 rounded hover:bg-card-hover transition-colors"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: item.color }}
                          />
                          <span className="font-medium text-text-secondary truncate">
                            {item.category}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-semibold text-text-primary">
                            {formatCurrency(item.amount)}
                          </span>
                          <span className="text-[10px] text-text-muted w-8 text-right">
                            {item.percentage}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="h-[200px] flex flex-col items-center justify-center text-center p-4">
                  <p className="text-xs text-text-muted mb-3">No expenses recorded for this period.</p>
                  <button
                    onClick={() => setIsAddTxnOpen(true)}
                    className="btn-secondary text-xs py-1.5 px-3"
                  >
                    + Record an Outflow
                  </button>
                </div>
              )}
            </Card>
          </div>

          {/* Savings Trend Chart */}
          {data!.savings_trend.length > 1 && (
            <Card className="min-w-0 p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-text-primary">Capital Retention Trend</h3>
                  <p className="text-xs text-text-muted">Net surplus retained month-over-month</p>
                </div>
              </div>
              <div className="h-[200px] w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data!.savings_trend}>
                    <defs>
                      <linearGradient id="savingsGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366F1" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#6366F1" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1E2638" vertical={false} />
                    <XAxis
                      dataKey="month"
                      tick={{ fill: '#94A3B8', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: '#94A3B8', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                    />
                    <RechartsTooltip
                      {...chartTooltipStyle}
                      formatter={(val: number) => formatCurrency(val)}
                    />
                    <Area
                      type="monotone"
                      dataKey="savings"
                      stroke="#6366F1"
                      strokeWidth={2}
                      fill="url(#savingsGrad)"
                      name="Net Surplus"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )}

          {/* Bottom Grid: Recent Transactions & Budget Overview */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-w-0">
            {/* Recent Transactions List */}
            <Card className="p-5 min-w-0">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-text-primary">Recent Transactions</h3>
                  <p className="text-xs text-text-muted">Latest verified ledger records</p>
                </div>
                <button
                  onClick={() => navigate('/transactions')}
                  className="text-xs font-semibold text-primary hover:text-primary-hover flex items-center gap-1 transition-colors"
                >
                  <span>View All</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {data!.recent_transactions.length > 0 ? (
                <div className="divide-y divide-card-border/60">
                  {data!.recent_transactions.map((tx) => (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                            tx.type === 'income'
                              ? 'bg-positive/10 text-positive'
                              : 'bg-negative/10 text-negative'
                          }`}
                        >
                          {tx.type === 'income' ? (
                            <ArrowUpRight className="w-4 h-4" />
                          ) : (
                            <ArrowDownRight className="w-4 h-4" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-text-primary truncate">
                            {tx.description}
                          </p>
                          <p className="text-[11px] text-text-muted flex items-center gap-1.5">
                            <span>{tx.category}</span>
                            <span>•</span>
                            <span>{formatDate(tx.date, 'short')}</span>
                            {tx.payment_method && (
                              <>
                                <span>•</span>
                                <span>{tx.payment_method}</span>
                              </>
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0 text-right pl-3">
                        <span
                          className={`text-xs font-bold ${
                            tx.type === 'income' ? 'text-positive' : 'text-negative'
                          }`}
                        >
                          {tx.type === 'income' ? '+' : '-'}
                          {formatCurrency(tx.amount)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-xs text-text-muted">
                  No transactions recorded yet.
                </div>
              )}
            </Card>

            {/* Budget Utilization & Category Caps */}
            <Card className="p-5 min-w-0">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-text-primary">Monthly Budget Pacing</h3>
                  <p className="text-xs text-text-muted">
                    {data!.total_budget_allocated > 0
                      ? `${formatPercent(data!.budget_utilization)} of allocated cap utilized`
                      : 'No monthly budget configured yet'}
                  </p>
                </div>
                <button
                  onClick={() => navigate('/budgets')}
                  className="text-xs font-semibold text-primary hover:text-primary-hover flex items-center gap-1 transition-colors"
                >
                  <span>Manage</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {data!.category_budgets.length > 0 ? (
                <div className="space-y-3.5">
                  {data!.category_budgets.slice(0, 4).map((cat) => {
                    const isBreached = cat.utilization > 100;
                    return (
                      <div key={cat.category} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium text-text-primary">{cat.category}</span>
                          <span className="text-text-muted">
                            <span className={isBreached ? 'text-negative font-bold' : 'text-text-primary'}>
                              {formatCurrency(cat.spent)}
                            </span>{' '}
                            / {formatCurrency(cat.limit)}
                          </span>
                        </div>
                        <ProgressBar
                          value={cat.utilization}
                          color={isBreached ? 'bg-negative' : cat.utilization > 80 ? 'bg-warning' : 'bg-positive'}
                          size="sm"
                        />
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-8 text-center text-xs text-text-muted">
                  <p className="mb-3">Configure spending limits by category to avoid end-of-month budget leaks.</p>
                  <button
                    onClick={() => navigate('/budgets')}
                    className="btn-secondary text-xs py-1.5 px-3"
                  >
                    Set Category Caps →
                  </button>
                </div>
              )}
            </Card>
          </div>
        </div>
      )}

      {/* Income Setup Modal */}
      <IncomeSetupModal
        isOpen={isIncomeModalOpen}
        onClose={() => setIsIncomeModalOpen(false)}
        onSaved={() => loadData()}
        initialProfile={profile}
      />

      {/* Add Transaction Modal */}
      <AddTransactionModal
        isOpen={isAddTxnOpen}
        onClose={() => setIsAddTxnOpen(false)}
        onSaved={() => loadData()}
      />
    </div>
  );
}
