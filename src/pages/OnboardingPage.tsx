import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GraduationCap,
  Building,
  Briefcase,
  Laptop,
  Car,
  BadgePercent,
  UserCheck,
  Home,
  Coffee,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Calendar,
  Wallet,
  Coins,
  ShieldCheck,
  Plus,
  Trash2,
} from 'lucide-react';
import { profileService } from '@/services/supabase';
import type { IncomeType, IncomeFrequency, AdditionalIncomeSource } from '@/types';
import { formatCurrency } from '@/utils';

interface OccupationMeta {
  type: IncomeType;
  title: string;
  desc: string;
  icon: React.ElementType;
  defaultFrequency: IncomeFrequency;
  customHint: string;
}

const OCCUPATIONS: OccupationMeta[] = [
  {
    type: 'Student',
    title: 'Student',
    desc: 'Focus on allowance, scholarships, and disciplined student budgeting.',
    icon: GraduationCap,
    defaultFrequency: 'No current income',
    customHint: 'You can start with ₹0 income. Track pocket allowances or part-time stipends.',
  },
  {
    type: 'Salaried employee',
    title: 'Salaried Employee',
    desc: 'Regular monthly paycheck with fixed salary credit cycle.',
    icon: Building,
    defaultFrequency: 'Monthly',
    customHint: 'Enter your net take-home pay and regular salary deposit date.',
  },
  {
    type: 'Business owner / Entrepreneur',
    title: 'Business Owner / Entrepreneur',
    desc: 'Enterprise dividends, profit drawdowns, and multi-channel revenues.',
    icon: Briefcase,
    defaultFrequency: 'Monthly',
    customHint: 'Track personal draws and executive distributions separated from company funds.',
  },
  {
    type: 'Freelancer',
    title: 'Freelancer / Consultant',
    desc: 'Project retainers, client milestone payouts, and variable contracts.',
    icon: Laptop,
    defaultFrequency: 'Irregular',
    customHint: 'Configure average monthly billings and secondary retainer contracts.',
  },
  {
    type: 'Gig worker',
    title: 'Gig Worker / Platform Earner',
    desc: 'Daily and weekly payouts across mobility, delivery, or logistics platforms.',
    icon: Car,
    defaultFrequency: 'Weekly',
    customHint: 'Track platform earnings (Uber, Zomato, etc.) with flexible weekly pacing.',
  },
  {
    type: 'Sales professional',
    title: 'Sales Professional',
    desc: 'Fixed baseline salary coupled with performance incentives and commission.',
    icon: BadgePercent,
    defaultFrequency: 'Monthly',
    customHint: 'Record base salary plus average performance incentives.',
  },
  {
    type: 'Self-employed',
    title: 'Self-Employed Professional',
    desc: 'Clinics, practices, agencies, and independent service revenues.',
    icon: UserCheck,
    defaultFrequency: 'Monthly',
    customHint: 'Track net personal cash flow drawn from your professional practice.',
  },
  {
    type: 'Homemaker',
    title: 'Homemaker',
    desc: 'Household allowances, family budget allocations, and savings.',
    icon: Home,
    defaultFrequency: 'Monthly',
    customHint: 'Manage household discretionary budgets and personal savings goals.',
  },
  {
    type: 'Retired',
    title: 'Retired / Pensioner',
    desc: 'Pensions, annuity payouts, senior citizen schemes, and dividends.',
    icon: Coffee,
    defaultFrequency: 'Monthly',
    customHint: 'Track annuity inflows, fixed deposit interests, and living costs.',
  },
  {
    type: 'Other',
    title: 'Other Inflow Profile',
    desc: 'Custom cash flow structure or unconventional revenue sources.',
    icon: Sparkles,
    defaultFrequency: 'Monthly',
    customHint: 'Configure flexible baseline parameters adapted to your needs.',
  },
];

export default function OnboardingPage() {
  const navigate = useNavigate();

  // Wizard Step (1: Occupation, 2: Income Details, 3: Cadence & Currency)
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [saving, setSaving] = useState(false);

  // Form State
  const [selectedOccupation, setSelectedOccupation] = useState<IncomeType>('Salaried employee');
  const [incomeAmount, setIncomeAmount] = useState<string>('');
  const [isZeroIncome, setIsZeroIncome] = useState<boolean>(false);
  const [frequency, setFrequency] = useState<IncomeFrequency>('Monthly');

  // Occupation-specific fields
  const [salaryCreditDate, setSalaryCreditDate] = useState<number>(1);
  const [secondarySources, setSecondarySources] = useState<AdditionalIncomeSource[]>([]);
  const [salesBaseSalary, setSalesBaseSalary] = useState<string>('');
  const [salesCommission, setSalesCommission] = useState<string>('');
  const [gigCadence, setGigCadence] = useState<'Daily' | 'Weekly'>('Weekly');
  const [currency, setCurrency] = useState<string>('INR');
  const [planningPeriodStart, setPlanningPeriodStart] = useState<number>(1);

  // Mini form for additional source
  const [newSourceName, setNewSourceName] = useState('');
  const [newSourceAmount, setNewSourceAmount] = useState('');

  const currentMeta = OCCUPATIONS.find((o) => o.type === selectedOccupation) || OCCUPATIONS[1];

  const handleSelectOccupation = (type: IncomeType) => {
    setSelectedOccupation(type);
    const meta = OCCUPATIONS.find((o) => o.type === type);
    if (meta) {
      setFrequency(meta.defaultFrequency);
      if (type === 'Student') {
        setIsZeroIncome(true);
        setIncomeAmount('0');
      } else {
        setIsZeroIncome(false);
      }
    }
  };

  const handleAddSecondarySource = () => {
    if (!newSourceName.trim() || !newSourceAmount || isNaN(parseFloat(newSourceAmount))) return;
    const newSource: AdditionalIncomeSource = {
      id: `sec-${Date.now()}`,
      name: newSourceName.trim(),
      amount: parseFloat(newSourceAmount),
      frequency: 'monthly',
    };
    setSecondarySources([...secondarySources, newSource]);
    setNewSourceName('');
    setNewSourceAmount('');
  };

  const handleRemoveSecondarySource = (id: string) => {
    setSecondarySources(secondarySources.filter((s) => s.id !== id));
  };

  const calculateFinalMonthlyIncome = (): number => {
    if (isZeroIncome) return 0;
    if (selectedOccupation === 'Sales professional') {
      const base = parseFloat(salesBaseSalary) || 0;
      const comm = parseFloat(salesCommission) || 0;
      return base + comm;
    }
    const val = parseFloat(incomeAmount);
    return isNaN(val) ? 0 : val;
  };

  const handleSaveAndProceed = async (skip = false) => {
    setSaving(true);
    try {
      let finalIncome = 0;
      let finalDetails: Record<string, any> = {};

      if (!skip) {
        finalIncome = calculateFinalMonthlyIncome();
        finalDetails = {
          salaryCreditDate,
          gigCadence,
          salesBaseSalary: parseFloat(salesBaseSalary) || 0,
          salesCommission: parseFloat(salesCommission) || 0,
        };
      }

      await profileService.upsert({
        occupation: selectedOccupation,
        income_type: selectedOccupation,
        income_frequency: skip ? 'No current income' : frequency,
        monthly_income: finalIncome,
        income_details: finalDetails,
        additional_income_sources: secondarySources,
        planning_period_start_day: planningPeriodStart,
        currency,
        onboarding_completed: true,
      });

      navigate('/dashboard');
    } catch (err) {
      console.error('Failed to save profile during onboarding:', err);
      // Fallback: Proceed to dashboard
      navigate('/dashboard');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#09090F] text-text-primary flex flex-col justify-between py-8 px-4 sm:px-6 lg:px-8">
      {/* Top Header */}
      <div className="max-w-3xl mx-auto w-full flex items-center justify-between pb-6 border-b border-card-border/60">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-primary-light flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white tracking-tight">FinOracle AI</h1>
            <p className="text-[10px] text-text-muted">Financial Onboarding</p>
          </div>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 text-xs font-semibold">
          <span className={`w-6 h-6 rounded-full flex items-center justify-center ${step === 1 ? 'bg-primary text-white' : 'bg-card text-text-muted border border-card-border'}`}>
            1
          </span>
          <span className="w-4 h-[1px] bg-card-border" />
          <span className={`w-6 h-6 rounded-full flex items-center justify-center ${step === 2 ? 'bg-primary text-white' : 'bg-card text-text-muted border border-card-border'}`}>
            2
          </span>
          <span className="w-4 h-[1px] bg-card-border" />
          <span className={`w-6 h-6 rounded-full flex items-center justify-center ${step === 3 ? 'bg-primary text-white' : 'bg-card text-text-muted border border-card-border'}`}>
            3
          </span>
        </div>
      </div>

      {/* Main Form Content */}
      <div className="max-w-3xl mx-auto w-full py-8">
        {/* STEP 1: Occupation Selection */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="text-center sm:text-left space-y-1.5">
                <h2 className="text-xl sm:text-2xl font-extrabold text-white">
                  What best describes your primary occupation?
                </h2>
                <p className="text-xs sm:text-sm text-text-secondary">
                  FinOracle AI customizes your budget pacing, income frequency, and cash flow formulas to your profession.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {OCCUPATIONS.map((occ) => {
                  const Icon = occ.icon;
                  const isSelected = selectedOccupation === occ.type;
                  return (
                    <button
                      key={occ.type}
                      type="button"
                      onClick={() => handleSelectOccupation(occ.type)}
                      className={`p-4 rounded-xl border text-left transition-all flex items-start gap-3.5 ${
                        isSelected
                          ? 'bg-primary/10 border-primary shadow-sm text-white'
                          : 'bg-card border-card-border hover:bg-card-hover text-text-secondary hover:text-white'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        isSelected ? 'bg-primary text-white' : 'bg-card-border/50 text-text-muted'
                      }`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs sm:text-sm font-bold text-white">{occ.title}</span>
                          {isSelected && <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />}
                        </div>
                        <p className="text-[11px] text-text-muted mt-1 leading-relaxed">{occ.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 2: Occupation-Specific Income Details */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="space-y-1.5">
                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-primary/10 border border-primary/20 text-xs text-primary font-medium">
                  <currentMeta.icon className="w-3.5 h-3.5" />
                  <span>Configuring for: {currentMeta.title}</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-extrabold text-white">
                  Configure Your Financial Baseline
                </h2>
                <p className="text-xs sm:text-sm text-text-secondary">
                  {currentMeta.customHint} You can skip this step at any time.
                </p>
              </div>

              {/* Student specific: Zero income option */}
              {selectedOccupation === 'Student' && (
                <div className="p-4 rounded-xl bg-card border border-card-border space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isZeroIncome}
                      onChange={(e) => {
                        setIsZeroIncome(e.target.checked);
                        if (e.target.checked) setIncomeAmount('0');
                      }}
                      className="w-4 h-4 rounded text-primary focus:ring-primary"
                    />
                    <div>
                      <span className="text-xs font-bold text-white block">
                        I am currently studying with ₹0 direct income
                      </span>
                      <span className="text-[11px] text-text-muted block">
                        Track family allowances or pocket money through manual transactions.
                      </span>
                    </div>
                  </label>
                </div>
              )}

              {/* Sales Professional: Base + Commission */}
              {selectedOccupation === 'Sales professional' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-text-primary block">
                      Fixed Monthly Base Salary (₹)
                    </label>
                    <input
                      type="number"
                      placeholder="e.g. 45000"
                      value={salesBaseSalary}
                      onChange={(e) => setSalesBaseSalary(e.target.value)}
                      className="input-field text-xs font-semibold"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-text-primary block">
                      Estimated Monthly Commission / Incentive (₹)
                    </label>
                    <input
                      type="number"
                      placeholder="e.g. 20000"
                      value={salesCommission}
                      onChange={(e) => setSalesCommission(e.target.value)}
                      className="input-field text-xs font-semibold"
                    />
                  </div>
                </div>
              ) : !isZeroIncome && (
                /* Standard Income Amount Input */
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-text-primary flex items-center justify-between">
                    <span>
                      {selectedOccupation === 'Salaried employee'
                        ? 'Net Monthly Salary (Take-Home)'
                        : selectedOccupation === 'Gig worker'
                        ? 'Estimated Average Monthly Earnings'
                        : selectedOccupation === 'Business owner / Entrepreneur'
                        ? 'Estimated Monthly Draw / Dividends'
                        : 'Estimated Monthly Inflow (₹)'}
                    </span>
                    {incomeAmount && !isNaN(parseFloat(incomeAmount)) && (
                      <span className="text-xs text-primary font-bold">
                        {formatCurrency(parseFloat(incomeAmount))}
                      </span>
                    )}
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-text-muted">
                      ₹
                    </span>
                    <input
                      type="number"
                      placeholder="e.g. 75000"
                      value={incomeAmount}
                      onChange={(e) => setIncomeAmount(e.target.value)}
                      className="input-field pl-8 text-base font-bold text-white placeholder:font-normal"
                    />
                  </div>
                </div>
              )}

              {/* Salaried specific: Salary credit date */}
              {selectedOccupation === 'Salaried employee' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-text-primary flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-text-muted" />
                    <span>Salary Credit Day of the Month</span>
                  </label>
                  <select
                    value={salaryCreditDate}
                    onChange={(e) => setSalaryCreditDate(Number(e.target.value))}
                    className="select-field text-xs"
                  >
                    <option value={1}>1st of each month (Standard)</option>
                    <option value={5}>5th of each month</option>
                    <option value={7}>7th of each month</option>
                    <option value={28}>28th of each month</option>
                    <option value={30}>30th / Last working day</option>
                  </select>
                </div>
              )}

              {/* Gig worker specific: Cadence */}
              {selectedOccupation === 'Gig worker' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-text-primary block">
                    Payout Schedule
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {(['Weekly', 'Daily'] as const).map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setGigCadence(c)}
                        className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                          gigCadence === c
                            ? 'bg-primary/10 border-primary text-white'
                            : 'bg-card border-card-border text-text-secondary'
                        }`}
                      >
                        {c} Payouts
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Inflow Frequency Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-text-primary block">
                  Primary Income Frequency
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(['Monthly', 'Weekly', 'Daily', 'Irregular'] as const).map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setFrequency(f)}
                      className={`py-2 px-2.5 rounded-xl border text-xs font-semibold transition-all ${
                        frequency === f
                          ? 'bg-primary/15 border-primary text-white shadow-sm'
                          : 'bg-card border-card-border text-text-muted hover:text-white'
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Planning Cadence, Currency, & Secondary Inflows */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="space-y-1.5">
                <h2 className="text-xl sm:text-2xl font-extrabold text-white">
                  Planning Period & Reporting Currency
                </h2>
                <p className="text-xs sm:text-sm text-text-secondary">
                  Configure when your monthly budgeting cycle restarts and add any secondary income streams.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-text-primary mb-1.5 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-text-muted" />
                    <span>Monthly Planning Cycle Restarts On</span>
                  </label>
                  <select
                    value={planningPeriodStart}
                    onChange={(e) => setPlanningPeriodStart(Number(e.target.value))}
                    className="select-field text-xs"
                  >
                    <option value={1}>1st of every month (Calendar Cycle)</option>
                    <option value={5}>5th of every month (Post-Salary Cycle)</option>
                    <option value={10}>10th of every month</option>
                    <option value={25}>25th of every month</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-text-primary mb-1.5 flex items-center gap-1.5">
                    <Coins className="w-3.5 h-3.5 text-text-muted" />
                    <span>Preferred Currency</span>
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

              {/* Secondary Income Streams */}
              <div className="space-y-3 pt-4 border-t border-card-border/60">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-white">
                      Secondary Inflow Streams (Optional)
                    </h4>
                    <p className="text-[11px] text-text-muted">
                      Add freelancing retainers, rental dividends, or investment payouts.
                    </p>
                  </div>
                </div>

                {secondarySources.length > 0 && (
                  <div className="space-y-2">
                    {secondarySources.map((s) => (
                      <div
                        key={s.id}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-card border border-card-border text-xs"
                      >
                        <span className="font-semibold text-white">{s.name}</span>
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-positive">{formatCurrency(s.amount)}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveSecondarySource(s.id)}
                            className="text-text-muted hover:text-negative"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-3 bg-card/60 rounded-xl border border-card-border">
                  <input
                    type="text"
                    placeholder="Source title (e.g. Rental)"
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
                  <button
                    type="button"
                    onClick={handleAddSecondarySource}
                    className="btn-secondary text-xs flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Stream</span>
                  </button>
                </div>
              </div>

              {/* Overview confirmation badge */}
              <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-between">
                <div>
                  <span className="text-xs text-text-muted block">Total Configured Monthly Inflow:</span>
                  <span className="text-lg font-extrabold text-white">
                    {formatCurrency(calculateFinalMonthlyIncome() + secondarySources.reduce((s, a) => s + a.amount, 0))}
                  </span>
                </div>
                <div className="text-right text-xs">
                  <span className="text-text-muted block">Occupation:</span>
                  <span className="font-bold text-primary-light">{selectedOccupation}</span>
                </div>
              </div>
            </div>
          )}
      </div>

      {/* Bottom Actions Bar */}
      <div className="max-w-3xl mx-auto w-full pt-6 border-t border-card-border/60 flex items-center justify-between">
        <button
          type="button"
          onClick={() => handleSaveAndProceed(true)}
          className="text-xs font-semibold text-text-muted hover:text-white transition-colors"
          disabled={saving}
        >
          Skip onboarding for now
        </button>

        <div className="flex items-center gap-3">
          {step > 1 && (
            <button
              type="button"
              onClick={() => setStep((s) => (s - 1) as any)}
              className="btn-secondary text-xs py-2 px-4 flex items-center gap-1.5"
              disabled={saving}
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
          )}

          {step < 3 ? (
            <button
              type="button"
              onClick={() => setStep((s) => (s + 1) as any)}
              className="btn-primary text-xs py-2 px-5 flex items-center gap-1.5 shadow-sm"
            >
              <span>Continue</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => handleSaveAndProceed(false)}
              className="btn-primary text-xs py-2 px-6 flex items-center gap-2 shadow-glow"
              disabled={saving}
            >
              {saving ? 'Finalizing Profile...' : 'Complete & Open Dashboard'}
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
