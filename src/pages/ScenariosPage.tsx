import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FlaskConical,
  Plus,
  Trash2,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Sparkles,
  Save,
  CheckCircle2,
  Clock,
  Layers,
  HelpCircle,
  FolderOpen,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  BarChart,
  Bar,
} from 'recharts';
import { Card, PageHeader, Modal, Badge } from '@/components/ui';
import { formatCurrency, formatPercent } from '@/utils';
import { scenarioService, transactionService, profileService } from '@/services/supabase';
import type { Scenario, ScenarioData, ScenarioImpact } from '@/types';

interface SimulationChange {
  id: string;
  type: 'income_increase' | 'income_decrease' | 'expense_increase' | 'one_time_expense' | 'new_loan_emi';
  label: string;
  amount: number;
}

const TEMPLATES: { name: string; description: string; changes: Omit<SimulationChange, 'id'>[] }[] = [
  {
    name: '20% Career Promotion',
    description: 'Simulates a 20% bump in monthly salary and resulting wealth accumulation.',
    changes: [{ type: 'income_increase', label: 'Salary Hike (+20%)', amount: 20000 }],
  },
  {
    name: 'New Car Purchase & EMI',
    description: 'One-time down payment of ₹2,00,000 + monthly EMI of ₹14,000 for 5 years.',
    changes: [
      { type: 'one_time_expense', label: 'Car Down Payment', amount: 200000 },
      { type: 'new_loan_emi', label: 'Car Loan EMI', amount: 14000 },
    ],
  },
  {
    name: '15% Inflation Shock',
    description: 'Simulates increased food, fuel, and rental prices across all regular expenses.',
    changes: [{ type: 'expense_increase', label: 'General Inflation Creep', amount: 7500 }],
  },
];

const chartTooltipStyle = {
  contentStyle: {
    backgroundColor: '#171725',
    border: '1px solid #2A2A3C',
    borderRadius: '12px',
    fontSize: '12px',
    color: '#F8FAFC',
  },
};

export default function ScenariosPage() {
  // Baseline financial state loaded from authenticated user records
  const [baselineIncome, setBaselineIncome] = useState<number>(0);
  const [baselineExpenses, setBaselineExpenses] = useState<number>(0);

  // Active changes in the simulator (starts clean)
  const [changes, setChanges] = useState<SimulationChange[]>([]);

  // Saved scenarios
  const [savedScenarios, setSavedScenarios] = useState<Scenario[]>([]);
  const [scenarioName, setScenarioName] = useState('My Financial Scenario');
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadBaselineAndScenarios();
  }, []);

  async function loadBaselineAndScenarios() {
    try {
      const [scenariosData, userProfile] = await Promise.all([
        scenarioService.list(),
        profileService.get(),
      ]);
      setSavedScenarios(scenariosData);
      if (userProfile && userProfile.monthly_income > 0) {
        setBaselineIncome(userProfile.monthly_income);
      }
    } catch (err) {
      console.error('Failed to load baseline and scenarios:', err);
    }
  }

  // Simulation Engine (Deterministic Calculations)
  const simulation = useMemo(() => {
    let modifiedIncome = baselineIncome;
    let modifiedExpenses = baselineExpenses;
    let oneTimeOutflow = 0;

    changes.forEach((c) => {
      if (c.type === 'income_increase') modifiedIncome += c.amount;
      if (c.type === 'income_decrease') modifiedIncome = Math.max(0, modifiedIncome - c.amount);
      if (c.type === 'expense_increase') modifiedExpenses += c.amount;
      if (c.type === 'new_loan_emi') modifiedExpenses += c.amount;
      if (c.type === 'one_time_expense') oneTimeOutflow += c.amount;
    });

    const baselineMonthlySavings = baselineIncome - baselineExpenses;
    const modifiedMonthlySavings = modifiedIncome - modifiedExpenses;
    const monthlyNetDelta = modifiedMonthlySavings - baselineMonthlySavings;

    // 12-Month Projection Curve
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

    const deltaPercent = baselineMonthlySavings !== 0
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

  function handleAddChange() {
    const newChange: SimulationChange = {
      id: Date.now().toString(),
      type: 'expense_increase',
      label: 'New Expense Adjustment',
      amount: 5000,
    };
    setChanges([...changes, newChange]);
  }

  function handleRemoveChange(id: string) {
    setChanges(changes.filter((c) => c.id !== id));
  }

  function handleUpdateChange(id: string, updates: Partial<SimulationChange>) {
    setChanges(changes.map((c) => (c.id === id ? { ...c, ...updates } : c)));
  }

  function applyTemplate(tpl: (typeof TEMPLATES)[0]) {
    setScenarioName(tpl.name);
    setChanges(
      tpl.changes.map((c, i) => ({
        ...c,
        id: `${Date.now()}-${i}`,
      }))
    );
  }

  async function handleSaveScenario() {
    setSaving(true);
    try {
      const baseline: ScenarioData = {
        monthly_income: baselineIncome,
        monthly_expenses: baselineExpenses,
        monthly_savings: simulation.baselineMonthlySavings,
        expense_changes: {},
        income_changes: {},
      };

      const modified: ScenarioData = {
        monthly_income: simulation.modifiedIncome,
        monthly_expenses: simulation.modifiedExpenses,
        monthly_savings: simulation.modifiedMonthlySavings,
        one_time_expense: simulation.oneTimeOutflow,
        expense_changes: {},
        income_changes: {},
      };

      const impact: ScenarioImpact = {
        savings_change: simulation.scenario12m - simulation.baseline12m,
        savings_change_percent: simulation.deltaPercent,
        cash_flow_change: simulation.monthlyNetDelta,
        goal_impact: simulation.monthlyNetDelta >= 0 ? 'Accelerates Goals' : 'Delays Goals',
        monthly_net_change: simulation.monthlyNetDelta,
        projected_savings_6m: simulation.scenario6m,
        projected_savings_12m: simulation.scenario12m,
        baseline_savings_6m: simulation.baseline6m,
        baseline_savings_12m: simulation.baseline12m,
      };

      await scenarioService.create({
        name: scenarioName,
        description: `What-If simulation with ${changes.length} adjustments`,
        baseline,
        modified,
        impact,
      });

      setSaveModalOpen(false);
      await loadBaselineAndScenarios();
    } catch (err) {
      console.error('Failed to save scenario:', err);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteSaved(id: string) {
    try {
      await scenarioService.delete(id);
      await loadBaselineAndScenarios();
    } catch (err) {
      console.error('Failed to delete scenario:', err);
    }
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader
          title="What-If Scenario Simulator"
          subtitle="Model career moves, major purchases, and macro economic shifts before committing actual capital"
        />

        <div className="flex items-center gap-2">
          <button
            onClick={() => setSaveModalOpen(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Save className="w-4 h-4" /> Save Scenario
          </button>
        </div>
      </div>

      {/* Quick Scenario Templates */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {TEMPLATES.map((tpl) => (
          <div
            key={tpl.name}
            onClick={() => applyTemplate(tpl)}
            className="cursor-pointer bg-card border border-card-border hover:border-primary/50 rounded-2xl p-4 transition-all duration-200 group"
          >
            <div className="flex items-center justify-between mb-1.5">
              <h4 className="text-sm font-bold text-text-primary group-hover:text-primary transition-colors">
                {tpl.name}
              </h4>
              <Sparkles className="w-4 h-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <p className="text-xs text-text-secondary">{tpl.description}</p>
          </div>
        ))}
      </div>

      {/* Core Simulation Studio */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Side: Parameters & Adjustments (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Baseline Income/Expense Card */}
          <Card className="p-5">
            <h3 className="text-sm font-bold text-text-primary mb-3 flex items-center gap-2">
              <Layers className="w-4 h-4 text-primary" /> Monthly Baseline Reference
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-semibold text-text-muted uppercase mb-1">
                  Baseline Income (₹)
                </label>
                <input
                  type="number"
                  value={baselineIncome}
                  onChange={(e) => setBaselineIncome(Number(e.target.value) || 0)}
                  className="input-field w-full text-sm font-medium"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-text-muted uppercase mb-1">
                  Baseline Expenses (₹)
                </label>
                <input
                  type="number"
                  value={baselineExpenses}
                  onChange={(e) => setBaselineExpenses(Number(e.target.value) || 0)}
                  className="input-field w-full text-sm font-medium"
                />
              </div>
            </div>
          </Card>

          {/* Adjustments Editor */}
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
                <FlaskConical className="w-4 h-4 text-secondary" /> Scenario Adjustments ({changes.length})
              </h3>
              <button
                onClick={handleAddChange}
                className="text-xs text-primary hover:text-primary-light font-semibold flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add Change
              </button>
            </div>

            <div className="space-y-3">
              {changes.map((item) => (
                <div
                  key={item.id}
                  className="p-3 bg-background-secondary rounded-xl border border-card-border space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <input
                      type="text"
                      value={item.label}
                      onChange={(e) => handleUpdateChange(item.id, { label: e.target.value })}
                      className="bg-transparent font-medium text-xs text-text-primary focus:outline-none flex-1 border-b border-transparent focus:border-primary pb-0.5"
                    />
                    <button
                      onClick={() => handleRemoveChange(item.id)}
                      className="text-text-muted hover:text-negative p-1 transition-colors"
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
                      <option value="new_loan_emi">+ Loan EMI</option>
                      <option value="one_time_expense">One-Time Capital Outlay</option>
                    </select>

                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted text-xs">₹</span>
                      <input
                        type="number"
                        value={item.amount}
                        onChange={(e) => handleUpdateChange(item.id, { amount: Number(e.target.value) || 0 })}
                        className="input-field text-xs pl-6 py-1.5"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Right Side: Projections & Comparison (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Delta Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="p-4 border-l-4 border-l-primary">
              <span className="text-xs font-medium text-text-muted uppercase">Monthly Cash Flow</span>
              <p className="text-xl font-bold text-text-primary mt-1">
                {formatCurrency(simulation.modifiedMonthlySavings)}/mo
              </p>
              <p className="text-[11px] text-text-secondary mt-0.5">
                Baseline: {formatCurrency(simulation.baselineMonthlySavings)}
              </p>
            </Card>

            <Card
              className={`p-4 border-l-4 ${
                simulation.monthlyNetDelta >= 0 ? 'border-l-positive' : 'border-l-negative'
              }`}
            >
              <span className="text-xs font-medium text-text-muted uppercase">Net Monthly Delta</span>
              <p
                className={`text-xl font-bold mt-1 ${
                  simulation.monthlyNetDelta >= 0 ? 'text-positive' : 'text-negative'
                }`}
              >
                {simulation.monthlyNetDelta >= 0 ? '+' : ''}
                {formatCurrency(simulation.monthlyNetDelta)}
              </p>
              <p className="text-[11px] text-text-secondary mt-0.5">
                {formatPercent(simulation.deltaPercent)} vs current plan
              </p>
            </Card>

            <Card className="p-4 border-l-4 border-l-secondary">
              <span className="text-xs font-medium text-text-muted uppercase">12-Month Net Difference</span>
              <p className="text-xl font-bold text-text-primary mt-1">
                {formatCurrency(simulation.scenario12m - simulation.baseline12m)}
              </p>
              <p className="text-[11px] text-text-secondary mt-0.5">Cumulative net after 1 yr</p>
            </Card>
          </div>

          {/* 12-Month Accumulation Chart */}
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-sm font-bold text-text-primary">12-Month Cumulative Wealth Trajectory</h4>
                <p className="text-xs text-text-muted">Comparing Baseline Growth vs Simulated What-If Scenario</p>
              </div>
              <Badge variant={simulation.scenario12m >= simulation.baseline12m ? 'positive' : 'warning'}>
                {simulation.scenario12m >= simulation.baseline12m ? 'Favorable Impact' : 'Deficit Impact'}
              </Badge>
            </div>

            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={simulation.projectionData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2A2A3C" opacity={0.5} />
                  <XAxis dataKey="month" stroke="#A1A1AA" tick={{ fontSize: 11 }} />
                  <YAxis
                    stroke="#A1A1AA"
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                  />
                  <RechartsTooltip
                    formatter={(v: number) => formatCurrency(v)}
                    {...chartTooltipStyle}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="Baseline"
                    stroke="#64748B"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="Scenario"
                    stroke={simulation.scenario12m >= simulation.baseline12m ? '#10B981' : '#F59E0B'}
                    strokeWidth={3}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      </div>

      {/* Saved Scenarios List */}
      {savedScenarios.length > 0 && (
        <Card className="p-6">
          <h3 className="text-base font-bold text-text-primary mb-4 flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-primary" /> Saved Scenarios ({savedScenarios.length})
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {savedScenarios.map((sc) => (
              <div
                key={sc.id}
                className="p-4 bg-background-secondary rounded-xl border border-card-border flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h4 className="font-semibold text-text-primary text-sm">{sc.name}</h4>
                    <button
                      onClick={() => handleDeleteSaved(sc.id)}
                      className="text-text-muted hover:text-negative transition-colors"
                      title="Delete Scenario"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {sc.description && (
                    <p className="text-xs text-text-secondary mb-3">{sc.description}</p>
                  )}
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
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Modal: Save Scenario */}
      <Modal
        isOpen={saveModalOpen}
        onClose={() => setSaveModalOpen(false)}
        title="Save Simulation Scenario"
      >
        <div className="space-y-4">
          <p className="text-xs text-text-secondary">
            Store this scenario to compare alongside your financial goals and portfolio reviews.
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
              placeholder="e.g. 2027 House Down Payment Scenario"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-card-border">
            <button
              onClick={() => setSaveModalOpen(false)}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveScenario}
              disabled={saving}
              className="btn-primary flex items-center gap-2"
            >
              <Save className="w-4 h-4" /> Save to Workspace
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
