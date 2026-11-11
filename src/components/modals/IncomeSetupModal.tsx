import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui';
import { profileService } from '@/services/supabase';
import type { UserProfile, IncomeType, AdditionalIncomeSource } from '@/types';
import { formatCurrency } from '@/utils';
import {
  Wallet,
  Building,
  Briefcase,
  Laptop,
  GraduationCap,
  Sparkles,
  Plus,
  Trash2,
  Calendar,
  CheckCircle2,
} from 'lucide-react';

interface IncomeSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: (updated: UserProfile) => void;
  initialProfile?: UserProfile | null;
  isFirstTime?: boolean;
}

const INCOME_TYPES: { type: IncomeType; label: string; desc: string; icon: React.ElementType }[] = [
  { type: 'Salaried', label: 'Salaried', desc: 'Regular fixed monthly paycheck', icon: Building },
  { type: 'Freelance', label: 'Freelance / Consultant', desc: 'Variable project-based billings', icon: Laptop },
  { type: 'Business', label: 'Business Owner', desc: 'Enterprise dividends & drawdowns', icon: Briefcase },
  { type: 'Gig Worker', label: 'Gig Economy', desc: 'Platform & contract based income', icon: Wallet },
  { type: 'Student', label: 'Student / Stipend', desc: 'Stipends, allowance or scholarship', icon: GraduationCap },
  { type: 'Other', label: 'Other Inflows', desc: 'Investments, pensions or custom', icon: Sparkles },
];

export function IncomeSetupModal({
  isOpen,
  onClose,
  onSaved,
  initialProfile,
  isFirstTime = false,
}: IncomeSetupModalProps) {
  const [monthlyIncome, setMonthlyIncome] = useState<string>('');
  const [incomeType, setIncomeType] = useState<IncomeType>('Salaried');
  const [currency, setCurrency] = useState<string>('INR');
  const [planningDay, setPlanningDay] = useState<number>(1);
  const [additionalSources, setAdditionalSources] = useState<AdditionalIncomeSource[]>([]);

  // New source form state
  const [newSourceName, setNewSourceName] = useState('');
  const [newSourceAmount, setNewSourceAmount] = useState('');
  const [newSourceFreq, setNewSourceFreq] = useState<'monthly' | 'irregular' | 'one_time'>('monthly');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialProfile) {
      setMonthlyIncome(initialProfile.monthly_income > 0 ? String(initialProfile.monthly_income) : '');
      setIncomeType(initialProfile.income_type || 'Salaried');
      setCurrency(initialProfile.currency || 'INR');
      setPlanningDay(initialProfile.planning_period_start_day || 1);
      setAdditionalSources(initialProfile.additional_income_sources || []);
    } else {
      // Load current profile asynchronously
      profileService.get().then((prof) => {
        if (prof) {
          setMonthlyIncome(prof.monthly_income > 0 ? String(prof.monthly_income) : '');
          setIncomeType(prof.income_type || 'Salaried');
          setCurrency(prof.currency || 'INR');
          setPlanningDay(prof.planning_period_start_day || 1);
          setAdditionalSources(prof.additional_income_sources || []);
        }
      });
    }
  }, [initialProfile, isOpen]);

  const handleAddSource = () => {
    if (!newSourceName.trim()) {
      setError('Please provide a source title (e.g., Freelance, Dividend)');
      return;
    }
    const amt = parseFloat(newSourceAmount);
    if (isNaN(amt) || amt <= 0) {
      setError('Please enter a valid amount for additional source');
      return;
    }

    const newSource: AdditionalIncomeSource = {
      id: `src-${Date.now()}`,
      name: newSourceName.trim(),
      amount: amt,
      frequency: newSourceFreq,
    };

    setAdditionalSources([...additionalSources, newSource]);
    setNewSourceName('');
    setNewSourceAmount('');
    setError(null);
  };

  const handleRemoveSource = (id: string) => {
    setAdditionalSources(additionalSources.filter((s) => s.id !== id));
  };

  const handleSave = async () => {
    setError(null);
    const parsedIncome = parseFloat(monthlyIncome);
    if (monthlyIncome.trim() !== '' && (isNaN(parsedIncome) || parsedIncome < 0)) {
      setError('Please enter a valid numeric monthly income or leave empty to skip.');
      return;
    }

    setSaving(true);
    try {
      const updated = await profileService.upsert({
        monthly_income: isNaN(parsedIncome) ? 0 : parsedIncome,
        income_type: incomeType,
        currency,
        planning_period_start_day: Number(planningDay) || 1,
        additional_income_sources: additionalSources,
        onboarding_completed: true,
      });

      if (onSaved) {
        onSaved(updated);
      }
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to save income configuration');
    } finally {
      setSaving(false);
    }
  };

  const totalMonthlyIncomeCalc =
    (parseFloat(monthlyIncome) || 0) +
    additionalSources
      .filter((s) => s.frequency === 'monthly')
      .reduce((sum, s) => sum + s.amount, 0);

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title={isFirstTime ? 'Financial Profile Onboarding' : 'Configure Financial Inflows'}
      size="lg"
    >
      <div className="space-y-6">
        {/* Intro */}
        <div className="p-4 rounded-xl bg-card border border-card-border/80 flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/15 text-primary flex items-center justify-center shrink-0 mt-0.5">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-text-primary">
              {isFirstTime ? 'Set Up Your Financial Baseline' : 'Update Income & Planning Settings'}
            </h4>
            <p className="text-xs text-text-secondary mt-0.5 leading-relaxed">
              FinOracle AI relies entirely on your verified numbers. We never fabricate salary estimates,
              balances, or budget allocations.
            </p>
          </div>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-negative/10 border border-negative/25 text-negative text-xs">
            {error}
          </div>
        )}

        {/* Section 1: Primary Monthly Income */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-semibold text-text-primary flex items-center gap-1.5">
              <span>Primary Monthly Take-Home Income</span>
              <span className="text-xs font-normal text-text-muted">(Optional)</span>
            </label>
            {monthlyIncome && !isNaN(parseFloat(monthlyIncome)) && (
              <span className="text-xs font-medium text-primary">
                {formatCurrency(parseFloat(monthlyIncome))} / mo
              </span>
            )}
          </div>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-text-muted">
              ₹
            </span>
            <input
              type="number"
              placeholder="e.g. 75000"
              value={monthlyIncome}
              onChange={(e) => setMonthlyIncome(e.target.value)}
              className="input-field pl-8 text-base font-semibold text-text-primary tracking-wide placeholder:font-normal placeholder:text-text-muted/60"
            />
          </div>
          <p className="text-xs text-text-muted">
            Used as your monthly baseline for budget planning and cash flow pacing.
          </p>
        </div>

        {/* Section 2: Income Type Selector */}
        <div className="space-y-2.5">
          <label className="text-sm font-semibold text-text-primary">Income Classification</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {INCOME_TYPES.map((t) => {
              const Icon = t.icon;
              const isSelected = incomeType === t.type;
              return (
                <button
                  key={t.type}
                  type="button"
                  onClick={() => setIncomeType(t.type)}
                  className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                    isSelected
                      ? 'bg-primary/10 border-primary shadow-sm text-text-primary'
                      : 'bg-card border-card-border hover:bg-card-hover text-text-secondary hover:text-text-primary'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <Icon className={`w-4 h-4 ${isSelected ? 'text-primary' : 'text-text-muted'}`} />
                    {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-primary" />}
                  </div>
                  <div>
                    <div className="text-xs font-semibold">{t.label}</div>
                    <div className="text-[10px] text-text-muted leading-tight mt-0.5">{t.desc}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Section 3: Planning Period & Currency */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1 border-t border-card-border/60">
          <div>
            <label className="text-xs font-semibold text-text-primary mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-text-muted" />
              <span>Budget Planning Period Starts On</span>
            </label>
            <select
              value={planningDay}
              onChange={(e) => setPlanningDay(Number(e.target.value))}
              className="select-field text-xs"
            >
              <option value={1}>1st of every month (Standard)</option>
              <option value={5}>5th of every month (Post-salary)</option>
              <option value={7}>7th of every month</option>
              <option value={10}>10th of every month</option>
              <option value={25}>25th of month (Early salary cycle)</option>
              <option value={28}>28th of month</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-text-primary mb-1.5 block">
              Reporting Currency
            </label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="select-field text-xs"
            >
              <option value="INR">INR (₹) — Indian Rupee</option>
              <option value="USD">USD ($) — US Dollar</option>
              <option value="EUR">EUR (€) — Euro</option>
              <option value="GBP">GBP (£) — British Pound</option>
            </select>
          </div>
        </div>

        {/* Section 4: Additional Income Sources (Optional) */}
        <div className="space-y-3 pt-1 border-t border-card-border/60">
          <div className="flex items-center justify-between">
            <div>
              <h5 className="text-xs font-semibold text-text-primary">
                Additional Income Streams (Optional)
              </h5>
              <p className="text-[11px] text-text-muted">
                Add secondary revenue channels like rental, dividends, or freelance retainers.
              </p>
            </div>
          </div>

          {/* List of existing additional sources */}
          {additionalSources.length > 0 && (
            <div className="space-y-2">
              {additionalSources.map((src) => (
                <div
                  key={src.id}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-card border border-card-border/80 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-positive" />
                    <span className="font-medium text-text-primary">{src.name}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-background text-text-muted capitalize">
                      {src.frequency}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-positive">{formatCurrency(src.amount)}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveSource(src.id)}
                      className="text-text-muted hover:text-negative p-1 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add source mini-form */}
          <div className="p-3 rounded-xl bg-card/60 border border-card-border/60 space-y-2.5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input
                type="text"
                placeholder="Stream name (e.g. Dividend)"
                value={newSourceName}
                onChange={(e) => setNewSourceName(e.target.value)}
                className="input-field text-xs"
              />
              <input
                type="number"
                placeholder="Amount (₹)"
                value={newSourceAmount}
                onChange={(e) => setNewSourceAmount(e.target.value)}
                className="input-field text-xs"
              />
              <select
                value={newSourceFreq}
                onChange={(e) => setNewSourceFreq(e.target.value as any)}
                className="select-field text-xs"
              >
                <option value="monthly">Monthly Recurring</option>
                <option value="irregular">Quarterly / Irregular</option>
                <option value="one_time">One-time Inflow</option>
              </select>
            </div>
            <button
              type="button"
              onClick={handleAddSource}
              className="text-xs font-medium text-primary hover:text-primary-hover flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Income Stream</span>
            </button>
          </div>
        </div>

        {/* Total Projected Monthly Inflow Summary */}
        {totalMonthlyIncomeCalc > 0 && (
          <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/20 flex items-center justify-between text-xs">
            <span className="text-text-secondary">Total Planned Monthly Inflows:</span>
            <span className="text-sm font-bold text-primary">{formatCurrency(totalMonthlyIncomeCalc)}</span>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-card-border">
          <button
            type="button"
            onClick={onClose}
            className="btn-ghost text-xs text-text-muted hover:text-text-secondary"
          >
            {isFirstTime ? 'Skip for now' : 'Cancel'}
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="btn-primary text-xs flex items-center gap-2"
            >
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
