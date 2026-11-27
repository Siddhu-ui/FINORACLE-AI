import React, { useState, useEffect, useMemo } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  FlaskConical,
  FolderOpen,
  Layers,
  Loader2,
  MessageSquare,
  Plus,
  Save,
  Send,
  Trash2,
} from 'lucide-react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Badge, Card, Modal, PageHeader } from '@/components/ui';
import { formatCurrency, formatPercent, getCurrentMonth, getMonthRange } from '@/utils';
import { profileService, scenarioService, transactionService } from '@/services/api';
import { aiApi, type ConversationalScenarioResponse } from '@/services/aiApi';
import type { Scenario, ScenarioData, ScenarioImpact } from '@/types';

interface SimulationChange {
  id: string;
  type:
    | 'income_increase'
    | 'income_decrease'
    | 'expense_increase'
    | 'expense_decrease'
    | 'one_time_expense'
    | 'new_loan_emi';
  label: string;
  amount: number;
}

const CONVERSATIONAL_EXAMPLES = [
  'What happens if my income decreases by 20%?',
  'What if I lose my income for 3 months?',
  'Can I afford a ₹45,000 laptop?',
  'What if I save ₹5,000 more per month?',
  'What happens if I reduce ₹2,000 on food every month?',
];

const chartTooltipStyle = {
  contentStyle: {
    backgroundColor: 'var(--card)',
    border: '1px solid var(--card-border)',
    borderRadius: '8px',
    fontSize: '12px',
    color: 'var(--text-primary)',
  },
};

export default function ScenariosPage() {
  // Real user baseline hydrated from local SQLite backend (never hardcoded fake figures)
  const [baselineIncome, setBaselineIncome] = useState<number>(0);
  const [baselineExpenses, setBaselineExpenses] = useState<number>(0);
  const [baselineNote, setBaselineNote] = useState<string>('Loading your recorded baseline...');

  // Manual adjustments
  const [changes, setChanges] = useState<SimulationChange[]>([]);

  // Conversational AI Simulator state
  const [promptInput, setPromptInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiResult, setAiResult] = useState<ConversationalScenarioResponse | null>(null);

  // Saved scenarios
  const [savedScenarios, setSavedScenarios] = useState<Scenario[]>([]);
  const [scenarioName, setScenarioName] = useState('Custom What-If Scenario');
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    hydrateRealBaseline();
    loadSavedScenarios();
  }, []);

  async function hydrateRealBaseline() {
    try {
      const currentMonth = getCurrentMonth();
      const { start, end } = getMonthRange(currentMonth);
      const [summary, profile] = await Promise.all([
        transactionService.getSummary(start, end),
        profileService.get(),
      ]);

      const recIncome = summary.income > 0 ? summary.income : profile?.monthly_income || 0;
      const recExpenses = summary.expenses || 0;
      setBaselineIncome(recIncome);
      setBaselineExpenses(recExpenses);

      if (summary.income > 0 || summary.expenses > 0) {
        setBaselineNote(`Hydrated from your ${currentMonth} recorded transactions.`);
      } else if (profile?.monthly_income) {
        setBaselineNote('Hydrated from your configured profile monthly income (no expenses recorded this month yet).');
      } else {
        setBaselineNote('No recorded transactions yet — enter your monthly income & expenses below to simulate.');
      }
    } catch {
      setBaselineNote('Enter your actual monthly income and expenses to run a deterministic simulation.');
    }
  }

  async function loadSavedScenarios() {
    try {
      const data = await scenarioService.list();
      setSavedScenarios(data);
    } catch (err) {
      console.error('Failed to load saved scenarios:', err);
    }
  }

  async function handleRunConversationalScenario(promptOverride?: string) {
    const query = (promptOverride ?? promptInput).trim();
    if (!query || aiLoading) return;

    setPromptInput(query);
    setAiLoading(true);
    setAiError(null);

    try {
      const res = await aiApi.converseScenario({
        message: query,
        baseline_income: baselineIncome > 0 ? baselineIncome : undefined,
        baseline_expenses: baselineExpenses > 0 ? baselineExpenses : undefined,
      });
      setAiResult(res);

      // Sync extracted changes into manual editor when simulation succeeds
      if (!res.needs_clarification && res.parsed_changes.length > 0) {
        const mapped: SimulationChange[] = res.parsed_changes
          .filter((c) => c.type !== 'savings_increase')
          .map((c, idx) => ({
            id: `ai-${Date.now()}-${idx}`,
            type: c.type as SimulationChange['type'],
            label: c.label,
            amount: c.amount,
          }));
        if (mapped.length > 0) {
          setChanges(mapped);
        }
        if (res.current_position.monthly_income > 0) {
          setBaselineIncome(res.current_position.monthly_income);
        }
        if (res.current_position.monthly_expenses > 0) {
          setBaselineExpenses(res.current_position.monthly_expenses);
        }
        setScenarioName(query.slice(0, 48));
      }
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Unable to run conversational scenario.');
    } finally {
      setAiLoading(false);
    }
  }

  // Deterministic client-side preview synchronized with manual sliders/inputs
  const manualSimulation = useMemo(() => {
    let modifiedIncome = baselineIncome;
    let modifiedExpenses = baselineExpenses;
    let oneTimeOutflow = 0;

    changes.forEach((c) => {
      if (c.type === 'income_increase') modifiedIncome += c.amount;
      if (c.type === 'income_decrease') modifiedIncome = Math.max(0, modifiedIncome - c.amount);
      if (c.type === 'expense_increase' || c.type === 'new_loan_emi') modifiedExpenses += c.amount;
      if (c.type === 'expense_decrease') modifiedExpenses = Math.max(0, modifiedExpenses - c.amount);
      if (c.type === 'one_time_expense') oneTimeOutflow += c.amount;
    });

    const baselineMonthlySavings = baselineIncome - baselineExpenses;
    const modifiedMonthlySavings = modifiedIncome - modifiedExpenses;
    const monthlyNetDelta = modifiedMonthlySavings - baselineMonthlySavings;

    const projectionData = [];
    let cumBaseline = 0;
    let cumModified = -oneTimeOutflow;
    for (let m = 1; m <= 12; m++) {
      cumBaseline += baselineMonthlySavings;
      cumModified += modifiedMonthlySavings;
      projectionData.push({
        month: `M${m}`,
        Baseline: Math.round(cumBaseline),
        Scenario: Math.round(cumModified),
      });
    }

    const baseline6m = baselineMonthlySavings * 6;
    const baseline12m = baselineMonthlySavings * 12;
    const scenario6m = modifiedMonthlySavings * 6 - oneTimeOutflow;
    const scenario12m = modifiedMonthlySavings * 12 - oneTimeOutflow;
    const deltaPercent =
      baselineMonthlySavings !== 0
        ? ((modifiedMonthlySavings - baselineMonthlySavings) / Math.abs(baselineMonthlySavings)) * 100
        : 0;

    return {
      modifiedIncome,
      modifiedExpenses,
      oneTimeOutflow,
      baselineMonthlySavings,
      modifiedMonthlySavings,
      monthlyNetDelta,
      deltaPercent,
      projectionData,
      baseline6m,
      baseline12m,
      scenario6m,
      scenario12m,
    };
  }, [baselineIncome, baselineExpenses, changes]);

  // Prefer backend conversational projection if an AI scenario with income-loss or full comparison is active
  const activeChartData = useMemo(() => {
    if (aiResult && !aiResult.needs_clarification && aiResult.simulation?.projection_12m) {
      return aiResult.simulation.projection_12m.map((p) => ({
        month: p.month,
        Baseline: p.baseline,
        Scenario: p.scenario,
      }));
    }
    return manualSimulation.projectionData;
  }, [aiResult, manualSimulation.projectionData]);

  const comparisonRows = useMemo(() => {
    if (aiResult && !aiResult.needs_clarification && aiResult.simulation?.comparison_table) {
      return aiResult.simulation.comparison_table;
    }
    const baseRate = baselineIncome > 0 ? (manualSimulation.baselineMonthlySavings / baselineIncome) * 100 : 0;
    const modRate =
      manualSimulation.modifiedIncome > 0
        ? (manualSimulation.modifiedMonthlySavings / manualSimulation.modifiedIncome) * 100
        : 0;
    return [
      {
        metric: 'Monthly Income',
        current: baselineIncome,
        projected: manualSimulation.modifiedIncome,
        delta: manualSimulation.modifiedIncome - baselineIncome,
      },
      {
        metric: 'Monthly Expenses',
        current: baselineExpenses,
        projected: manualSimulation.modifiedExpenses,
        delta: manualSimulation.modifiedExpenses - baselineExpenses,
      },
      {
        metric: 'Monthly Net Cash Flow',
        current: manualSimulation.baselineMonthlySavings,
        projected: manualSimulation.modifiedMonthlySavings,
        delta: manualSimulation.monthlyNetDelta,
      },
      {
        metric: 'Savings Rate (%)',
        current: baseRate,
        projected: modRate,
        delta: modRate - baseRate,
      },
      {
        metric: '12-Month Cumulative Net',
        current: manualSimulation.baseline12m,
        projected: manualSimulation.scenario12m,
        delta: manualSimulation.scenario12m - manualSimulation.baseline12m,
      },
    ];
  }, [aiResult, baselineIncome, baselineExpenses, manualSimulation]);

  function handleAddChange() {
    setAiResult(null);
    setChanges([
      ...changes,
      {
        id: Date.now().toString(),
        type: 'expense_decrease',
        label: 'Category Expense Cut',
        amount: 2000,
      },
    ]);
  }

  function handleRemoveChange(id: string) {
    setAiResult(null);
    setChanges(changes.filter((c) => c.id !== id));
  }

  function handleUpdateChange(id: string, updates: Partial<SimulationChange>) {
    setAiResult(null);
    setChanges(changes.map((c) => (c.id === id ? { ...c, ...updates } : c)));
  }

  async function handleSaveScenario() {
    setSaving(true);
    try {
      const sim = aiResult?.simulation;
      const baseline: ScenarioData = {
        monthly_income: sim ? sim.baseline.income : baselineIncome,
        monthly_expenses: sim ? sim.baseline.expenses : baselineExpenses,
        monthly_savings: sim ? sim.baseline.monthly_savings : manualSimulation.baselineMonthlySavings,
        expense_changes: {},
        income_changes: {},
      };
      const modified: ScenarioData = {
        monthly_income: sim ? sim.modified.income : manualSimulation.modifiedIncome,
        monthly_expenses: sim ? sim.modified.expenses : manualSimulation.modifiedExpenses,
        monthly_savings: sim ? sim.modified.monthly_savings : manualSimulation.modifiedMonthlySavings,
        one_time_expense: sim ? sim.modified.one_time_outflow : manualSimulation.oneTimeOutflow,
        expense_changes: {},
        income_changes: {},
      };
      const impact: ScenarioImpact = {
        savings_change: sim
          ? sim.impact.annual_net_difference
          : manualSimulation.scenario12m - manualSimulation.baseline12m,
        savings_change_percent: sim ? sim.impact.delta_percent : manualSimulation.deltaPercent,
        cash_flow_change: sim ? sim.impact.monthly_net_delta : manualSimulation.monthlyNetDelta,
        goal_impact: sim
          ? sim.impact.goal_impact
          : manualSimulation.monthlyNetDelta >= 0
            ? 'Accelerates Goals'
            : 'Delays Goals',
        monthly_net_change: sim ? sim.impact.monthly_net_delta : manualSimulation.monthlyNetDelta,
        projected_savings_6m: sim ? sim.modified.savings_6m : manualSimulation.scenario6m,
        projected_savings_12m: sim ? sim.modified.savings_12m : manualSimulation.scenario12m,
        baseline_savings_6m: sim ? sim.baseline.savings_6m : manualSimulation.baseline6m,
        baseline_savings_12m: sim ? sim.baseline.savings_12m : manualSimulation.baseline12m,
      };

      await scenarioService.create({
        name: scenarioName,
        description: promptInput || `What-If simulation with ${changes.length} adjustment(s)`,
        baseline,
        modified,
        impact,
      });
      setSaveModalOpen(false);
      await loadSavedScenarios();
    } catch (err) {
      console.error('Failed to save scenario:', err);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteSaved(id: string) {
    await scenarioService.delete(id);
    await loadSavedScenarios();
  }

  const active12mDelta =
    aiResult && !aiResult.needs_clarification && aiResult.simulation
      ? aiResult.simulation.impact.annual_net_difference
      : manualSimulation.scenario12m - manualSimulation.baseline12m;

  const activeMonthlyDelta =
    aiResult && !aiResult.needs_clarification && aiResult.simulation
      ? aiResult.simulation.impact.monthly_net_delta
      : manualSimulation.monthlyNetDelta;

  const activeProjectedMonthly =
    aiResult && !aiResult.needs_clarification && aiResult.simulation
      ? aiResult.simulation.modified.monthly_savings
      : manualSimulation.modifiedMonthlySavings;

  return (
    <div className="space-y-6 min-w-0 w-full">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader
          title="Conversational What-If Scenario Simulator"
          subtitle="Ask financial what-if questions in plain language — parameter extraction maps to deterministic Python simulation math"
        />
        <button
          onClick={() => setSaveModalOpen(true)}
          className="btn-primary text-xs flex items-center gap-2 self-start sm:self-auto"
        >
          <Save className="w-4 h-4" /> Save Scenario
        </button>
      </div>

      {/* Natural Language Conversational Prompt Bar */}
      <Card className="p-5 space-y-3 border-l-4 border-l-primary">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="text-sm font-bold text-text-primary flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-primary" />
            Ask a What-If Scenario
          </h2>
          <span className="text-[11px] text-text-muted">{baselineNote}</span>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleRunConversationalScenario();
          }}
          className="flex flex-col sm:flex-row gap-2"
        >
          <input
            type="text"
            value={promptInput}
            onChange={(e) => setPromptInput(e.target.value)}
            placeholder="e.g., What happens if my income decreases by 20%? or Can I afford a ₹45,000 laptop?"
            className="input-field flex-1 text-xs py-2.5"
            disabled={aiLoading}
          />
          <button
            type="submit"
            disabled={aiLoading || !promptInput.trim()}
            className="btn-primary text-xs px-5 flex items-center justify-center gap-2"
          >
            {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            <span>Simulate</span>
          </button>
        </form>

        <div className="flex flex-wrap gap-1.5">
          {CONVERSATIONAL_EXAMPLES.map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => handleRunConversationalScenario(ex)}
              className="text-[11px] bg-[var(--bg)] hover:border-primary border border-card-border px-2.5 py-1 rounded-lg text-text-secondary hover:text-text-primary transition-colors"
            >
              {ex}
            </button>
          ))}
        </div>

        {aiError && (
          <div className="p-3 rounded-xl bg-negative/10 border border-negative/25 text-xs text-negative">
            {aiError}
          </div>
        )}

        {/* Missing Information Follow-up Card */}
        {aiResult?.needs_clarification && (
          <div className="p-4 rounded-xl bg-warning/10 border border-warning/30 space-y-1.5">
            <p className="text-xs font-bold text-text-primary flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-warning" />
              Additional Information Needed (No Assumptions Fabricated)
            </p>
            <ul className="list-disc pl-5 text-xs text-text-secondary space-y-1">
              {aiResult.follow_up_questions.map((q, idx) => (
                <li key={idx}>{q}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Assumptions, Affordability & Risk Flags */}
        {aiResult && !aiResult.needs_clarification && aiResult.simulation && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="p-3.5 rounded-xl bg-[var(--bg)] border border-card-border space-y-1.5">
              <p className="text-[11px] font-bold uppercase text-text-muted">Explicit Scenario Assumptions</p>
              <ul className="list-disc pl-4 text-xs text-text-primary space-y-1">
                {aiResult.assumptions.map((a, i) => (
                  <li key={i}>{a}</li>
                ))}
              </ul>
            </div>

            <div className="p-3.5 rounded-xl bg-[var(--bg)] border border-card-border space-y-2">
              <p className="text-[11px] font-bold uppercase text-text-muted">
                Risk Flags & Affordability Check
              </p>
              {aiResult.affordability && (
                <div className="p-2.5 rounded-lg bg-card border border-card-border text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-text-primary">Affordability Verdict:</span>
                    <Badge
                      variant={
                        aiResult.affordability.verdict.includes('comfortable') ||
                        aiResult.affordability.verdict.includes('caution')
                          ? 'positive'
                          : 'warning'
                      }
                    >
                      {aiResult.affordability.verdict.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                  <p className="text-text-secondary">{aiResult.affordability.reason}</p>
                </div>
              )}
              {aiResult.simulation.risk_flags.length === 0 ? (
                <p className="text-xs text-primary flex items-center gap-1.5 font-medium">
                  <CheckCircle2 className="w-4 h-4" /> No critical cash-flow risk flags triggered.
                </p>
              ) : (
                <ul className="space-y-1.5">
                  {aiResult.simulation.risk_flags.map((flag, i) => (
                    <li
                      key={i}
                      className="text-xs text-text-primary flex items-start gap-1.5"
                    >
                      <AlertTriangle
                        className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${
                          flag.severity === 'high' ? 'text-negative' : 'text-warning'
                        }`}
                      />
                      <span>{flag.message}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </Card>

      {/* Main Studio Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Baseline & Manual Adjustments */}
        <div className="lg:col-span-5 space-y-5">
          <Card className="p-5">
            <h3 className="text-sm font-bold text-text-primary mb-3 flex items-center gap-2">
              <Layers className="w-4 h-4 text-primary" /> Current Monthly Baseline (INR)
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-text-muted uppercase mb-1">
                  Monthly Income (₹)
                </label>
                <input
                  type="number"
                  value={baselineIncome}
                  onChange={(e) => {
                    setAiResult(null);
                    setBaselineIncome(Number(e.target.value) || 0);
                  }}
                  className="input-field w-full text-sm font-medium"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-text-muted uppercase mb-1">
                  Monthly Expenses (₹)
                </label>
                <input
                  type="number"
                  value={baselineExpenses}
                  onChange={(e) => {
                    setAiResult(null);
                    setBaselineExpenses(Number(e.target.value) || 0);
                  }}
                  className="input-field w-full text-sm font-medium"
                />
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
                <FlaskConical className="w-4 h-4 text-primary" /> Scenario Adjustments ({changes.length})
              </h3>
              <button
                type="button"
                onClick={handleAddChange}
                className="text-xs text-primary font-semibold flex items-center gap-1 hover:underline"
              >
                <Plus className="w-3.5 h-3.5" /> Add
              </button>
            </div>

            {changes.length === 0 ? (
              <p className="text-xs text-text-muted py-3">
                Use the conversational prompt above or click Add to test income, expense, or lump-sum changes.
              </p>
            ) : (
              <div className="space-y-3">
                {changes.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 bg-[var(--bg)] rounded-xl border border-card-border space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <input
                        type="text"
                        value={item.label}
                        onChange={(e) => handleUpdateChange(item.id, { label: e.target.value })}
                        className="bg-transparent font-medium text-xs text-text-primary focus:outline-none flex-1"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveChange(item.id)}
                        className="text-text-muted hover:text-negative p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <select
                        value={item.type}
                        onChange={(e) =>
                          handleUpdateChange(item.id, { type: e.target.value as SimulationChange['type'] })
                        }
                        className="input-field text-xs py-1.5"
                      >
                        <option value="income_increase">+ Monthly Income</option>
                        <option value="income_decrease">- Monthly Income</option>
                        <option value="expense_increase">+ Monthly Expense</option>
                        <option value="expense_decrease">- Monthly Expense</option>
                        <option value="new_loan_emi">+ Loan EMI</option>
                        <option value="one_time_expense">One-Time Purchase</option>
                      </select>
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted text-xs">₹</span>
                        <input
                          type="number"
                          value={item.amount}
                          onChange={(e) =>
                            handleUpdateChange(item.id, { amount: Number(e.target.value) || 0 })
                          }
                          className="input-field text-xs pl-6 py-1.5"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Right: Side-by-Side Current vs Projected Comparison & Chart */}
        <div className="lg:col-span-7 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="p-4 border-l-4 border-l-primary">
              <span className="text-[11px] font-semibold text-text-muted uppercase">Projected Cash Flow</span>
              <p className="text-lg font-bold text-text-primary mt-1">
                {formatCurrency(activeProjectedMonthly)}/mo
              </p>
              <p className="text-[11px] text-text-secondary">
                Current: {formatCurrency(baselineIncome - baselineExpenses)}/mo
              </p>
            </Card>

            <Card
              className={`p-4 border-l-4 ${
                activeMonthlyDelta >= 0 ? 'border-l-positive' : 'border-l-negative'
              }`}
            >
              <span className="text-[11px] font-semibold text-text-muted uppercase">Monthly Net Delta</span>
              <p
                className={`text-lg font-bold mt-1 ${
                  activeMonthlyDelta >= 0 ? 'text-positive' : 'text-negative'
                }`}
              >
                {activeMonthlyDelta >= 0 ? '+' : ''}
                {formatCurrency(activeMonthlyDelta)}
              </p>
              <p className="text-[11px] text-text-secondary">
                {formatPercent(
                  aiResult?.simulation?.impact.delta_percent ?? manualSimulation.deltaPercent
                )}{' '}
                vs baseline
              </p>
            </Card>

            <Card className="p-4 border-l-4 border-l-secondary">
              <span className="text-[11px] font-semibold text-text-muted uppercase">12-Month Net Impact</span>
              <p
                className={`text-lg font-bold mt-1 ${
                  active12mDelta >= 0 ? 'text-positive' : 'text-negative'
                }`}
              >
                {active12mDelta >= 0 ? '+' : ''}
                {formatCurrency(active12mDelta)}
              </p>
              <p className="text-[11px] text-text-secondary">
                {aiResult?.simulation?.impact.runway_months !== null &&
                aiResult?.simulation?.impact.runway_months !== undefined
                  ? `Runway: ${aiResult.simulation.impact.runway_months} mo`
                  : '12-month cumulative delta'}
              </p>
            </Card>
          </div>

          {/* Current vs Projected Side-by-Side Table */}
          <Card className="p-5">
            <h4 className="text-sm font-bold text-text-primary mb-3">
              Current vs. Projected Comparison
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-card-border text-text-muted uppercase text-[11px]">
                    <th className="py-2 pr-3">Metric</th>
                    <th className="py-2 px-3 text-right">Current</th>
                    <th className="py-2 px-3 text-right">Projected</th>
                    <th className="py-2 pl-3 text-right">Delta</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-card-border">
                  {comparisonRows.map((row) => {
                    const isPct = row.metric.includes('%');
                    const fmt = (v: number) => (isPct ? `${v.toFixed(1)}%` : formatCurrency(v));
                    return (
                      <tr key={row.metric}>
                        <td className="py-2.5 pr-3 font-medium text-text-primary">{row.metric}</td>
                        <td className="py-2.5 px-3 text-right tabular-nums text-text-secondary">
                          {fmt(row.current)}
                        </td>
                        <td className="py-2.5 px-3 text-right tabular-nums font-semibold text-text-primary">
                          {fmt(row.projected)}
                        </td>
                        <td
                          className={`py-2.5 pl-3 text-right tabular-nums font-semibold ${
                            row.delta >= 0 ? 'text-positive' : 'text-negative'
                          }`}
                        >
                          {row.delta > 0 ? '+' : ''}
                          {fmt(row.delta)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {/* 12-Month Trajectory Chart */}
          <Card className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="text-sm font-bold text-text-primary">12-Month Cumulative Trajectory</h4>
                <p className="text-xs text-text-muted">Current Baseline vs. Simulated Scenario</p>
              </div>
              <Badge variant={active12mDelta >= 0 ? 'positive' : 'warning'}>
                {active12mDelta >= 0 ? 'Favorable Impact' : 'Cash-Flow Pressure'}
              </Badge>
            </div>

            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={activeChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" />
                  <XAxis dataKey="month" stroke="var(--text-muted)" tick={{ fontSize: 11 }} />
                  <YAxis
                    stroke="var(--text-muted)"
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v: number) => `₹${(v / 1000).toFixed(0)}k`}
                  />
                  <RechartsTooltip
                    formatter={(v: number) => formatCurrency(v)}
                    {...chartTooltipStyle}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="Baseline"
                    stroke="var(--text-muted)"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="Scenario"
                    stroke={active12mDelta >= 0 ? 'var(--primary)' : 'var(--negative)'}
                    strokeWidth={2.5}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      </div>

      {/* Saved Scenarios */}
      {savedScenarios.length > 0 && (
        <Card className="p-6">
          <h3 className="text-base font-bold text-text-primary mb-4 flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-primary" /> Saved Scenarios ({savedScenarios.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {savedScenarios.map((sc) => (
              <div
                key={sc.id}
                className="p-4 bg-[var(--bg)] rounded-xl border border-card-border flex flex-col justify-between"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h4 className="font-semibold text-text-primary text-sm">{sc.name}</h4>
                  <button
                    onClick={() => handleDeleteSaved(sc.id)}
                    className="text-text-muted hover:text-negative"
                    title="Delete Scenario"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                {sc.description && <p className="text-xs text-text-secondary mb-3">{sc.description}</p>}
                <div className="text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-text-muted">Monthly Delta:</span>
                    <span className="font-semibold text-text-primary">
                      {formatCurrency(sc.impact?.cash_flow_change || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">12-Mo Outlook:</span>
                    <span className="font-semibold text-positive">
                      {formatCurrency(sc.impact?.projected_savings_12m || 0)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Modal isOpen={saveModalOpen} onClose={() => setSaveModalOpen(false)} title="Save Simulation Scenario">
        <div className="space-y-4">
          <p className="text-xs text-text-secondary">
            Store this simulation to compare alongside your budgets and financial goals.
          </p>
          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1 uppercase">
              Scenario Name
            </label>
            <input
              type="text"
              value={scenarioName}
              onChange={(e) => setScenarioName(e.target.value)}
              className="input-field w-full font-medium"
            />
          </div>
          <div className="flex justify-end gap-3 pt-3 border-t border-card-border">
            <button onClick={() => setSaveModalOpen(false)} className="btn-secondary text-xs">
              Cancel
            </button>
            <button
              onClick={handleSaveScenario}
              disabled={saving}
              className="btn-primary text-xs flex items-center gap-2"
            >
              <Save className="w-4 h-4" /> Save
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
