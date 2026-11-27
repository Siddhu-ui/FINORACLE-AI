import React, { useState, useEffect, useCallback } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Info,
  Lightbulb,
  PiggyBank,
  RefreshCw,
  ShieldAlert,
  Target,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Badge, Card, PageHeader, ProgressBar } from '@/components/ui';
import { SampleLedgerBanner } from '@/components/ai/SampleLedgerBanner';
import {
  aiApi,
  type AIInsightsResponse,
  type BackendHealthResponse,
  type InsightCardItem,
} from '@/services/aiApi';
import { formatCurrency, formatDate } from '@/utils';

const EMERALD = 'var(--primary)';
const NAVY = 'var(--text-primary)';
const RED = 'var(--negative)';

const chartTooltipStyle = {
  contentStyle: {
    backgroundColor: 'var(--card)',
    border: '1px solid var(--card-border)',
    borderRadius: '10px',
    fontSize: '12px',
    color: NAVY,
  },
};

const compactInr = (v: number) => (Math.abs(v) >= 1000 ? `₹${(v / 1000).toFixed(0)}k` : `₹${v.toFixed(0)}`);

function SectionTitle({
  icon: Icon,
  title,
  subtitle,
  right,
}: {
  icon: React.ElementType;
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
      <div>
        <h2 className="text-base font-bold text-text-primary flex items-center gap-2">
          <Icon className="w-4 h-4 text-primary" />
          {title}
        </h2>
        {subtitle && <p className="text-xs text-text-secondary mt-0.5">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}

export default function InsightsPage() {
  const [data, setData] = useState<AIInsightsResponse | null>(null);
  const [backendHealth, setBackendHealth] = useState<BackendHealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedEvidence, setExpandedEvidence] = useState<Record<string, boolean>>({});

  const loadInsights = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const health = await aiApi.checkHealth().catch(() => null);
      setBackendHealth(health);
      const res = await aiApi.getInsights(false);
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load AI Insights from backend.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInsights();
  }, [loadInsights]);

  const toggleEvidence = (id: string) => setExpandedEvidence((prev) => ({ ...prev, [id]: !prev[id] }));

  const severityBadge = (sev: InsightCardItem['severity']) => {
    if (sev === 'high') return <Badge variant="negative">High Priority</Badge>;
    if (sev === 'warning') return <Badge variant="warning">Watch</Badge>;
    if (sev === 'positive') return <Badge variant="positive">On Track</Badge>;
    return <Badge variant="default">Insight</Badge>;
  };

  const forecast = data?.forecast;
  const anomalies = data?.unusual_spending;
  const evaluation = data?.classification_evaluation;
  const budget = data?.budget_status;
  const monthly = data?.monthly_series ?? [];
  const categoryMom = data?.category_mom ?? [];
  const opportunities = data?.savings_opportunities ?? [];
  const latestMonth = data?.summary.latest_month ?? null;

  return (
    <div className="space-y-6 min-w-0 w-full">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader
          title="AI Insights & Predictive Analytics"
          subtitle="Evidence-backed insights, Scikit-learn expense forecasting, unusual spending alerts, and savings opportunities"
        />
        <button
          onClick={loadInsights}
          disabled={loading}
          className="btn-secondary text-xs flex items-center gap-2 self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Analysis</span>
        </button>
      </div>

      <SampleLedgerBanner onChanged={loadInsights} />

      {error && (
        <Card className="p-5 border-amber-200 bg-amber-50/60">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1.5 text-xs">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold text-text-primary">
                  {backendHealth?.status === 'healthy'
                    ? 'Sign In Required for User-Scoped AI Insights'
                    : 'Backend AI Engine Unavailable'}
                </p>
                {backendHealth?.status === 'healthy' && (
                  <Badge variant="positive">Backend Online ({backendHealth.version})</Badge>
                )}
              </div>
              <p className="text-text-secondary">{error}</p>
              <p className="text-text-muted">
                {backendHealth?.status === 'healthy'
                  ? 'Please sign in with your FinOracle AI account so your local JWT authenticates user-scoped ML and insights endpoints.'
                  : 'Ensure the FastAPI backend is running (`uvicorn backend.main:app --port 8000`).'}
              </p>
            </div>
          </div>
        </Card>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton h-40 rounded-2xl" />
          ))}
        </div>
      ) : data ? (
        <>
          {/* KPI strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: 'Recorded Income', value: formatCurrency(data.summary.recorded_income), icon: ArrowUpRight, tone: 'text-primary' },
              { label: 'Recorded Expenses', value: formatCurrency(data.summary.recorded_expenses), icon: ArrowDownRight, tone: 'text-negative' },
              {
                label: 'Net Cash Flow',
                value: formatCurrency(data.summary.net_cash_flow),
                icon: Wallet,
                tone: data.summary.net_cash_flow >= 0 ? 'text-primary' : 'text-negative',
              },
              {
                label: 'Savings Rate',
                value: `${data.summary.savings_rate.toFixed(1)}%`,
                icon: PiggyBank,
                tone: data.summary.savings_rate >= 20 ? 'text-primary' : 'text-amber-600',
              },
            ].map((k) => (
              <Card key={k.label} className="p-4 border-l-4 border-l-primary">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-semibold uppercase text-text-muted">{k.label}</p>
                  <k.icon className={`w-4 h-4 ${k.tone}`} />
                </div>
                <p className={`text-xl font-bold mt-1 ${k.tone}`}>{k.value}</p>
              </Card>
            ))}
          </div>

          {/* 1. Transaction Cash-Flow & Category Insights */}
          <Card className="p-6 space-y-5">
            <SectionTitle
              icon={Activity}
              title="Transaction Cash-Flow & Category Insights"
              subtitle="Deterministic ledger metrics with exact ₹ evidence"
              right={
                data.top_category ? (
                  <Badge variant="positive">
                    Top category: {data.top_category.category} · {formatCurrency(data.top_category.amount)} (
                    {data.top_category.share_percent.toFixed(0)}%)
                  </Badge>
                ) : undefined
              }
            />

            {!data.has_transactions ? (
              <div className="p-6 rounded-xl bg-[var(--bg)] border border-card-border text-center text-xs text-text-secondary">
                No transactions recorded yet. Add transactions (or load the sample ledger above) to see monthly cash flow,
                category spending and month-over-month changes.
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <p className="text-xs font-semibold text-text-primary mb-2">Monthly Income vs Expenses</p>
                  <div className="h-[260px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={monthly} barGap={4}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" vertical={false} />
                        <XAxis dataKey="month" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                        <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} tickFormatter={compactInr} />
                        <RechartsTooltip
                          {...chartTooltipStyle}
                          formatter={(v: number | string) => (typeof v === 'number' ? formatCurrency(v) : v)}
                        />
                        <Legend />
                        <Bar dataKey="income" name="Income" fill={EMERALD} radius={[6, 6, 0, 0]} />
                        <Bar dataKey="expenses" name="Expenses" fill={RED} radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold text-text-primary mb-2">
                    Spending by Category{latestMonth ? ` · ${latestMonth}` : ''} (change vs previous month)
                  </p>
                  {categoryMom.length === 0 ? (
                    <p className="text-xs text-text-secondary">No expenses recorded in the latest month.</p>
                  ) : (
                    <>
                      <div className="h-[170px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={categoryMom} layout="vertical" margin={{ left: 10 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" horizontal={false} />
                            <XAxis type="number" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} tickFormatter={compactInr} />
                            <YAxis type="category" dataKey="category" width={90} tick={{ fill: NAVY, fontSize: 11 }} />
                            <RechartsTooltip
                              {...chartTooltipStyle}
                              formatter={(v: number | string) => (typeof v === 'number' ? formatCurrency(v) : v)}
                            />
                            <Bar dataKey="current" name="This month" radius={[0, 6, 6, 0]}>
                              {categoryMom.map((c, i) => (
                                <Cell key={c.category} fill={i === 0 ? EMERALD : '#7FCDB5'} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="mt-2 divide-y divide-card-border/60">
                        {categoryMom.slice(0, 5).map((c) => (
                          <div key={c.category} className="flex items-center justify-between py-1.5 text-xs">
                            <span className="font-medium text-text-primary">{c.category}</span>
                            <span className="flex items-center gap-2">
                              <span className="text-text-secondary">{formatCurrency(c.current)}</span>
                              {c.previous > 0 || c.delta !== 0 ? (
                                <span
                                  className={`font-semibold ${c.delta > 0 ? 'text-negative' : c.delta < 0 ? 'text-primary' : 'text-text-muted'}`}
                                >
                                  {c.delta > 0 ? '+' : ''}
                                  {formatCurrency(c.delta)}
                                  {c.delta_percent !== null ? ` (${c.delta_percent > 0 ? '+' : ''}${c.delta_percent}%)` : ' (new)'}
                                </span>
                              ) : null}
                            </span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Budget burn-rate */}
            <div className="pt-4 border-t border-card-border/60 space-y-3">
              <p className="text-xs font-semibold text-text-primary flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-primary" /> Budget Burn Rate
              </p>
              {budget?.has_budget ? (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="text-text-secondary">
                      {budget.budget_name} · {budget.month}: spent{' '}
                      <strong className="text-text-primary">{formatCurrency(budget.total_spent ?? 0)}</strong> of{' '}
                      <strong className="text-text-primary">{formatCurrency(budget.total_limit ?? 0)}</strong>
                    </span>
                    <Badge
                      variant={
                        budget.burn_rate_status === 'exceeded'
                          ? 'negative'
                          : budget.burn_rate_status === 'on_track'
                            ? 'positive'
                            : 'warning'
                      }
                    >
                      {(budget.burn_rate_status || '').replace('_', ' ')} · {(budget.utilization_percent ?? 0).toFixed(0)}% used
                      vs {(budget.expected_pace_percent ?? 0).toFixed(0)}% expected pace
                    </Badge>
                  </div>
                  <ProgressBar
                    value={Math.min(100, budget.utilization_percent ?? 0)}
                    color={
                      (budget.utilization_percent ?? 0) >= 100
                        ? 'negative'
                        : (budget.utilization_percent ?? 0) >= 80
                          ? 'warning'
                          : 'primary'
                    }
                  />
                  <p className="text-[11px] text-text-secondary">
                    At the current daily rate, month-end spend projects to{' '}
                    <strong className="text-text-primary">{formatCurrency(budget.projected_end_of_month_spend ?? 0)}</strong>.
                  </p>
                  {(budget.categories ?? []).length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
                      {(budget.categories ?? []).map((c) => (
                        <div key={c.category} className="space-y-1">
                          <div className="flex justify-between text-[11px]">
                            <span className="font-medium text-text-primary">{c.category}</span>
                            <span className={c.exceeded ? 'text-negative font-semibold' : 'text-text-secondary'}>
                              {formatCurrency(c.spent)} / {formatCurrency(c.limit)}
                            </span>
                          </div>
                          <ProgressBar
                            size="sm"
                            value={Math.min(100, c.utilization_percent)}
                            color={c.exceeded ? 'negative' : c.utilization_percent >= 80 ? 'warning' : 'primary'}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-text-secondary bg-[var(--bg)] p-3 rounded-xl border border-card-border">
                  No budget found. Create a monthly budget in <strong>Budgets</strong> to get burn-rate warnings with exact ₹
                  figures.
                </p>
              )}
            </div>
          </Card>

          {/* 2. Expense Forecasting */}
          <Card className="p-6 space-y-4">
            <SectionTitle
              icon={TrendingUp}
              title="Expense Forecasting (Scikit-learn Time-Series Model)"
              subtitle="Trained strictly on your completed monthly expense totals with chronological validation"
              right={
                forecast?.available ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="positive">MAE: {forecast.mae !== null ? formatCurrency(forecast.mae) : 'N/A'}</Badge>
                    <Badge variant="default">RMSE: {forecast.rmse !== null ? formatCurrency(forecast.rmse) : 'N/A'}</Badge>
                    <Badge variant="default">{forecast.training_months} Full Months</Badge>
                  </div>
                ) : undefined
              }
            />

            {!forecast?.available ? (
              <div className="p-5 rounded-xl bg-[var(--bg)] border border-card-border space-y-3">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <p className="text-sm font-bold text-text-primary">
                    Forecast unlocks after {forecast?.months_required ?? 3} full months of expenses
                  </p>
                  <span className="text-xs font-semibold text-primary">
                    {forecast?.months_available ?? 0} / {forecast?.months_required ?? 3} full months
                  </span>
                </div>
                <ProgressBar
                  value={forecast?.months_available ?? 0}
                  max={forecast?.months_required ?? 3}
                  color="primary"
                />
                <p className="text-xs text-text-secondary">
                  {forecast?.reason ||
                    'Record expenses across at least 3 full calendar months to unlock the forecast.'}{' '}
                  Still needed:{' '}
                  <strong className="text-text-primary">
                    {forecast?.months_needed ?? 3} more full month(s)
                  </strong>{' '}
                  (guideline: about 10+ expense transactions per month for a stable total). FinOracle AI never extrapolates
                  from insufficient history.
                </p>
              </div>
            ) : (
              <>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={forecast.chart_series}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" vertical={false} />
                      <XAxis dataKey="month" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                      <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} tickFormatter={compactInr} />
                      <RechartsTooltip
                        {...chartTooltipStyle}
                        formatter={(value: number | string) =>
                          typeof value === 'number' ? formatCurrency(value) : value
                        }
                      />
                      <Legend />
                      <Area
                        type="monotone"
                        dataKey="upper_bound"
                        name="Upper Uncertainty (80%)"
                        stroke="none"
                        fill={EMERALD}
                        fillOpacity={0.14}
                        connectNulls
                      />
                      <Area
                        type="monotone"
                        dataKey="lower_bound"
                        name="Lower Uncertainty (80%)"
                        stroke="none"
                        fill="var(--card)"
                        fillOpacity={1}
                        connectNulls
                      />
                      <Line
                        type="monotone"
                        dataKey="actual"
                        name="Actual Expenses"
                        stroke={NAVY}
                        strokeWidth={2.5}
                        dot={{ r: 4 }}
                        connectNulls={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="predicted"
                        name="Forecasted Expenses"
                        stroke={EMERALD}
                        strokeWidth={2.5}
                        strokeDasharray="6 4"
                        dot={{ r: 4 }}
                        connectNulls={false}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  {forecast.predictions.map((p, idx) => (
                    <div
                      key={p.month}
                      className={`p-3.5 rounded-xl border ${idx === 0 ? 'bg-primary/5 border-primary/30' : 'bg-[var(--bg)] border-card-border'}`}
                    >
                      <p className="text-[11px] font-semibold text-text-muted uppercase">
                        {idx === 0 ? 'Next month · ' : ''}
                        {p.month}
                      </p>
                      <p className="text-lg font-bold text-text-primary mt-0.5">{formatCurrency(p.predicted_expense)}</p>
                      <p className="text-[11px] text-text-secondary mt-0.5">
                        Uncertainty band: {formatCurrency(p.lower_bound)} – {formatCurrency(p.upper_bound)}
                      </p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </Card>

          {/* 3. Unusual Spending Alerts */}
          <Card className="p-6 space-y-4">
            <SectionTitle
              icon={ShieldAlert}
              title="Unusual Spending Detection"
              subtitle="Isolation Forest & robust category IQR detector — statistical deviations only, never claimed as confirmed fraud"
              right={anomalies?.method ? <Badge variant="default">Method: {anomalies.method}</Badge> : undefined}
            />

            {!anomalies?.available ? (
              <p className="text-xs text-text-secondary bg-[var(--bg)] p-4 rounded-xl border border-card-border">
                {anomalies?.reason || 'Record at least 4 expense transactions to run unusual spending detection.'}
              </p>
            ) : anomalies.alerts.length === 0 ? (
              <div className="flex items-center gap-2.5 p-4 rounded-xl bg-primary/5 border border-primary/20 text-xs text-text-primary">
                <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                <span>No unusual spending spikes detected across {anomalies.total_analyzed} expense transactions.</span>
              </div>
            ) : (
              <div className="space-y-2.5">
                {anomalies.alerts.map((alert, i) => (
                  <div
                    key={alert.transaction_id || i}
                    className="p-4 rounded-xl bg-card border border-card-border border-l-4 border-l-amber-400 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant={alert.severity === 'high' ? 'negative' : 'warning'}>Unusual Spending</Badge>
                        <span className="text-sm font-semibold text-text-primary">{alert.description}</span>
                        <span className="text-xs text-text-muted">
                          {alert.category} · {formatDate(alert.date, 'medium')}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-amber-700">
                        {alert.ratio_to_baseline}× above your {alert.category} average
                      </p>
                      <p className="text-xs text-text-secondary">{alert.explanation}</p>
                    </div>
                    <p className="text-base font-bold text-text-primary shrink-0">{formatCurrency(alert.amount)}</p>
                  </div>
                ))}
                <p className="text-[11px] text-text-muted">
                  These are statistical outliers versus your own spending history. Please verify them yourself — this is not
                  a fraud determination.
                </p>
              </div>
            )}
          </Card>

          {/* 4. Actionable Savings Opportunities */}
          <Card className="p-6 space-y-4">
            <SectionTitle
              icon={Lightbulb}
              title="Actionable Savings Opportunities"
              subtitle="Concrete ₹ suggestions computed from your actual spending, budgets and goals"
            />
            {opportunities.length === 0 ? (
              <p className="text-xs text-text-secondary bg-[var(--bg)] p-4 rounded-xl border border-card-border">
                Add transactions, a budget or a savings goal to generate ₹ savings suggestions tied to your own numbers.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {opportunities.map((o) => (
                  <div key={o.id} className="p-4 rounded-xl bg-card border border-card-border space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm font-bold text-text-primary">{o.title}</h3>
                      <Badge variant="positive">
                        {o.kind === 'goal_gap' ? 'Goal' : o.kind === 'budget_overrun' ? 'Budget' : 'Spending'}
                      </Badge>
                    </div>
                    <p className="text-xs text-text-secondary leading-relaxed">{o.message}</p>
                    <div className="flex items-center justify-between pt-1">
                      <div>
                        <p className="text-lg font-bold text-primary">{formatCurrency(o.monthly_saving_inr)}/mo</p>
                        <p className="text-[11px] text-text-muted">≈ {formatCurrency(o.annual_saving_inr)} per year</p>
                      </div>
                      <p className="text-[10px] text-text-muted text-right max-w-[50%]">{o.evidence}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* 5. Evidence-Backed AI Insights Grid */}
          <section className="space-y-3">
            <SectionTitle
              icon={Activity}
              title={`Personalized Financial Insights (${data.insights.length})`}
              subtitle="Every card is backed by deterministic ledger metrics or validated ML outputs"
            />

            {data.insights.length === 0 ? (
              <Card className="p-6 text-center">
                <p className="text-sm font-semibold text-text-primary">No insights generated yet</p>
                <p className="text-xs text-text-secondary mt-1">
                  Record your income, expenses, budgets, or savings goals to generate evidence-backed financial insights.
                </p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {data.insights.map((card) => {
                  const isOpen = !!expandedEvidence[card.id];
                  return (
                    <Card key={card.id} className="p-5 flex flex-col justify-between gap-3">
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="text-sm font-bold text-text-primary">{card.title}</h3>
                          {severityBadge(card.severity)}
                        </div>
                        <p className="text-xs text-text-primary leading-relaxed">{card.message}</p>
                        <p className="text-xs text-primary font-medium">Action: {card.action_item}</p>
                      </div>

                      <div className="pt-2 border-t border-card-border">
                        <button
                          type="button"
                          onClick={() => toggleEvidence(card.id)}
                          className="w-full flex items-center justify-between text-[11px] font-semibold text-text-secondary hover:text-text-primary"
                        >
                          <span className="flex items-center gap-1.5">
                            <Info className="w-3.5 h-3.5 text-primary" />
                            Backing Evidence ({card.evidence.timeframe})
                          </span>
                          {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>

                        {isOpen && (
                          <div className="mt-2.5 p-3 rounded-xl bg-[var(--bg)] border border-card-border text-[11px] space-y-1.5">
                            <div className="flex justify-between">
                              <span className="text-text-muted">Metric Source:</span>
                              <span className="font-mono text-text-primary">{card.evidence.metric_source}</span>
                            </div>
                            {card.evidence.primary_value_inr !== null && card.evidence.primary_value_inr !== undefined && (
                              <div className="flex justify-between">
                                <span className="text-text-muted">Primary Value:</span>
                                <span className="font-semibold text-text-primary">
                                  {formatCurrency(card.evidence.primary_value_inr)}
                                </span>
                              </div>
                            )}
                            {card.evidence.comparison_value_inr !== null &&
                              card.evidence.comparison_value_inr !== undefined && (
                                <div className="flex justify-between">
                                  <span className="text-text-muted">Reference Value:</span>
                                  <span className="font-medium text-text-primary">
                                    {formatCurrency(card.evidence.comparison_value_inr)}
                                  </span>
                                </div>
                              )}
                            {card.evidence.percent_change !== null && card.evidence.percent_change !== undefined && (
                              <div className="flex justify-between">
                                <span className="text-text-muted">Rate / % Delta:</span>
                                <span className="font-semibold text-text-primary">
                                  {card.evidence.percent_change.toFixed(1)}%
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </section>

          {/* 6. ML classifier summary (full evaluation lives on the Transactions page) */}
          {evaluation && (
            <Card className="p-5 space-y-2">
              <SectionTitle
                icon={BarChart3}
                title="ML Transaction Classifier"
                subtitle={`TF-IDF + Logistic Regression on ${evaluation.dataset.total_samples} Indian narrations (${evaluation.dataset.num_categories} categories, seed benchmark data)`}
                right={
                  <Badge variant="positive">
                    +{(evaluation.improvement_over_baseline.macro_f1_delta * 100).toFixed(1)} pts Macro-F1 vs rule baseline
                  </Badge>
                }
              />
              <p className="text-xs text-text-secondary">
                Accuracy {(evaluation.ml_model.accuracy * 100).toFixed(1)}% · Precision{' '}
                {(evaluation.ml_model.macro_precision * 100).toFixed(1)}% · Recall{' '}
                {(evaluation.ml_model.macro_recall * 100).toFixed(1)}% · Macro-F1{' '}
                {(evaluation.ml_model.macro_f1 * 100).toFixed(1)}%. See per-class metrics and the confusion matrix on the
                Transactions page.
              </p>
            </Card>
          )}
        </>
      ) : null}
    </div>
  );
}
