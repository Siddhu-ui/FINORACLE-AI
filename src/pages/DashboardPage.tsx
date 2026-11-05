import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  PiggyBank,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Receipt,
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
  LineChart,
  Line,
  Area,
  AreaChart,
} from 'recharts';
import { useAuth } from '@/contexts/AuthContext';
import { dashboardService } from '@/services/supabase';
import { Card, StatCard, StatCardSkeleton, EmptyState, ProgressBar, Badge, PageHeader } from '@/components/ui';
import { formatCurrency, formatPercent, formatDate } from '@/utils';
import type { DashboardData, DateFilter } from '@/types';
import { useNavigate } from 'react-router-dom';

const dateFilters: { value: DateFilter; label: string }[] = [
  { value: 'this_month', label: 'This Month' },
  { value: 'last_month', label: 'Last Month' },
  { value: 'this_week', label: 'This Week' },
  { value: 'today', label: 'Today' },
];

const chartTooltipStyle = {
  contentStyle: {
    background: '#171725',
    border: '1px solid #2A2A3C',
    borderRadius: '12px',
    fontSize: '12px',
    color: '#F8FAFC',
  },
  labelStyle: { color: '#A1A1AA' },
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<DateFilter>('this_month');
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    loadDashboard();
  }, [filter]);

  async function loadDashboard() {
    setLoading(true);
    try {
      // Calculate date range based on filter
      const now = new Date();
      let start: string;
      let end: string = now.toISOString().split('T')[0];

      switch (filter) {
        case 'today':
          start = end;
          break;
        case 'this_week': {
          const dayOfWeek = now.getDay();
          const startOfWeek = new Date(now);
          startOfWeek.setDate(now.getDate() - dayOfWeek);
          start = startOfWeek.toISOString().split('T')[0];
          break;
        }
        case 'last_month': {
          const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
          start = lastMonth.toISOString().split('T')[0];
          end = lastMonthEnd.toISOString().split('T')[0];
          break;
        }
        default: {
          const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
          start = monthStart.toISOString().split('T')[0];
          break;
        }
      }

      const result = await dashboardService.getData(start, end);
      setData(result);
    } catch (err) {
      console.error('Dashboard load error:', err);
    } finally {
      setLoading(false);
    }
  }

  const hasData = data && (data.total_income > 0 || data.total_expenses > 0);

  return (
    <div>
      <PageHeader
        title={`Welcome back${user?.user_metadata?.full_name ? `, ${user.user_metadata.full_name}` : ''}`}
        description="Here's your financial overview"
        action={
          <div className="flex items-center gap-2 bg-card border border-card-border rounded-xl p-1">
            {dateFilters.map((f) => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  filter === f.value
                    ? 'bg-primary text-white'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        }
      />

      {loading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <StatCardSkeleton key={i} />
            ))}
          </div>
        </div>
      ) : !hasData ? (
        <EmptyState
          icon={Sparkles}
          title="Start tracking your finances"
          description="Add your first transaction to see your financial dashboard come to life. Track income, expenses, savings, and more."
          action={{ label: 'Add Transaction', onClick: () => navigate('/transactions') }}
        />
      ) : (
        <div className="space-y-6">
          {/* Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <StatCard
              title="Total Income"
              value={formatCurrency(data!.total_income)}
              icon={TrendingUp}
              color="positive"
              subtitle="This period"
            />
            <StatCard
              title="Total Expenses"
              value={formatCurrency(data!.total_expenses)}
              icon={TrendingDown}
              color="negative"
              subtitle="This period"
            />
            <StatCard
              title="Net Savings"
              value={formatCurrency(data!.savings)}
              icon={PiggyBank}
              color={data!.savings >= 0 ? 'positive' : 'negative'}
              subtitle={`${formatPercent(data!.savings_rate)} savings rate`}
            />
            <StatCard
              title="Budget Used"
              value={formatPercent(data!.budget_utilization)}
              icon={Wallet}
              color={data!.budget_utilization > 90 ? 'negative' : data!.budget_utilization > 70 ? 'warning' : 'primary'}
              subtitle="Current month budget"
            />
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Income vs Expenses Chart */}
            <Card>
              <h3 className="text-base font-semibold text-text-primary mb-4">Income vs Expenses</h3>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data!.income_vs_expenses} barGap={4}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272A" vertical={false} />
                    <XAxis dataKey="month" tick={{ fill: '#A1A1AA', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#A1A1AA', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}K`} />
                    <RechartsTooltip {...chartTooltipStyle} formatter={(value: number) => formatCurrency(value)} />
                    <Bar dataKey="income" fill="#10B981" radius={[6, 6, 0, 0]} maxBarSize={32} name="Income" />
                    <Bar dataKey="expenses" fill="#EF4444" radius={[6, 6, 0, 0]} maxBarSize={32} name="Expenses" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Spending by Category */}
            <Card>
              <h3 className="text-base font-semibold text-text-primary mb-4">Spending Breakdown</h3>
              {data!.spending_by_category.length > 0 ? (
                <div className="flex gap-4">
                  <div className="w-[180px] h-[180px] flex-shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={data!.spending_by_category}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          paddingAngle={3}
                          dataKey="amount"
                        >
                          {data!.spending_by_category.map((entry, index) => (
                            <Cell key={index} fill={entry.color} />
                          ))}
                        </Pie>
                        <RechartsTooltip {...chartTooltipStyle} formatter={(value: number) => formatCurrency(value)} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex-1 space-y-2 overflow-y-auto max-h-[200px] no-scrollbar">
                    {data!.spending_by_category.map((cat) => (
                      <div key={cat.category} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                          <span className="text-text-secondary">{cat.category}</span>
                        </div>
                        <span className="text-text-primary font-medium">{formatCurrency(cat.amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-text-muted text-sm py-8 text-center">No expense data for this period</p>
              )}
            </Card>
          </div>

          {/* Savings Trend */}
          <Card>
            <h3 className="text-base font-semibold text-text-primary mb-4">Savings Trend</h3>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data!.savings_trend}>
                  <defs>
                    <linearGradient id="savingsGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272A" vertical={false} />
                  <XAxis dataKey="month" tick={{ fill: '#A1A1AA', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#A1A1AA', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}K`} />
                  <RechartsTooltip {...chartTooltipStyle} formatter={(value: number) => formatCurrency(value)} />
                  <Area type="monotone" dataKey="savings" stroke="#8B5CF6" fill="url(#savingsGradient)" strokeWidth={2} name="Savings" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Bottom Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Transactions */}
            <Card>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold text-text-primary">Recent Transactions</h3>
                <button
                  onClick={() => navigate('/transactions')}
                  className="text-xs text-primary hover:text-primary-light transition-colors font-medium"
                >
                  View all →
                </button>
              </div>
              {data!.recent_transactions.length > 0 ? (
                <div className="space-y-3">
                  {data!.recent_transactions.map((tx) => (
                    <div key={tx.id} className="flex items-center justify-between py-2">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                            tx.type === 'income' ? 'bg-positive/10' : 'bg-negative/10'
                          }`}
                        >
                          {tx.type === 'income' ? (
                            <ArrowUpRight className="w-4 h-4 text-positive" />
                          ) : (
                            <ArrowDownRight className="w-4 h-4 text-negative" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-text-primary">{tx.description}</p>
                          <p className="text-xs text-text-muted">{tx.category} · {formatDate(tx.date, 'short')}</p>
                        </div>
                      </div>
                      <span
                        className={`text-sm font-semibold ${
                          tx.type === 'income' ? 'text-positive' : 'text-negative'
                        }`}
                      >
                        {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-text-muted text-sm py-4 text-center">No transactions yet</p>
              )}
            </Card>

            {/* Active Goals */}
            <Card>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold text-text-primary">Active Goals</h3>
                <button
                  onClick={() => navigate('/goals')}
                  className="text-xs text-primary hover:text-primary-light transition-colors font-medium"
                >
                  View all →
                </button>
              </div>
              {data!.active_goals.length > 0 ? (
                <div className="space-y-4">
                  {data!.active_goals.map((goal) => {
                    const progress = goal.target_amount > 0
                      ? (goal.current_amount / goal.target_amount) * 100
                      : 0;
                    return (
                      <div key={goal.id} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Target className="w-4 h-4 text-primary" />
                            <span className="text-sm font-medium text-text-primary">{goal.title}</span>
                          </div>
                          <span className="text-xs text-text-muted">
                            {formatCurrency(goal.current_amount)} / {formatCurrency(goal.target_amount)}
                          </span>
                        </div>
                        <ProgressBar
                          value={progress}
                          color={progress >= 100 ? 'positive' : progress >= 50 ? 'primary' : 'warning'}
                          size="sm"
                        />
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-text-muted text-sm py-4 text-center">
                  No active goals.{' '}
                  <button onClick={() => navigate('/goals')} className="text-primary hover:underline">
                    Create one
                  </button>
                </p>
              )}
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
