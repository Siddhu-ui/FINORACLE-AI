import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Briefcase, Check, CheckCircle2, ChevronRight, Loader2, PiggyBank, Sparkles, Wallet } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { profileService } from '@/services/api';

const OCCUPATIONS = [
  'Student',
  'Salaried employee',
  'Business owner / Entrepreneur',
  'Freelancer',
  'Gig worker',
  'Sales professional',
  'Self-employed',
  'Homemaker',
  'Retired',
  'Other',
];

const INCOME_OPTIONS = [
  { label: 'Monthly income', value: 'monthly' },
  { label: 'Weekly income', value: 'weekly' },
  { label: 'Daily income', value: 'daily' },
  { label: 'Irregular income', value: 'irregular' },
  { label: 'No current income', value: 'none' },
];

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { user, completeOnboarding } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [occupation, setOccupation] = useState('');
  const [incomeMode, setIncomeMode] = useState<'monthly' | 'weekly' | 'daily' | 'irregular' | 'none'>('monthly');
  const [incomeValue, setIncomeValue] = useState('');
  const [currency, setCurrency] = useState('INR');
  const [goalText, setGoalText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState(1);

  const currencySymbols: Record<string, string> = { INR: '₹', USD: '$', EUR: '€', GBP: '£' };
  const incomePeriod = incomeMode === 'none' ? '' : incomeMode;
  const incomeLabel = incomeMode === 'none'
    ? 'No current income'
    : `${incomeMode.charAt(0).toUpperCase()}${incomeMode.slice(1)} income`;

  const continueToNextStep = () => {
    setError(null);
    if (step === 2 && incomeMode !== 'none' && incomeValue.trim()) {
      const amount = Number(incomeValue);
      if (!Number.isFinite(amount) || amount < 0) {
        setError('Enter a valid amount of 0 or more, or choose “No current income”.');
        return;
      }
    }
    setStep((current) => Math.min(current + 1, 3));
  };

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const profile = await profileService.get();
        if (profile) {
          setOccupation(profile.occupation || '');
          setCurrency(profile.currency || 'INR');
          if (profile.monthly_income > 0) {
            setIncomeMode('monthly');
            setIncomeValue(String(profile.monthly_income));
          }
        }
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, []);

  const saveProfile = async (skipIncome = false) => {
    setError(null);
    setSaving(true);

    try {
      const numericIncome = skipIncome || incomeMode === 'none' ? 0 : Number(incomeValue || 0);

      if (!skipIncome && incomeMode !== 'none' && (Number.isNaN(numericIncome) || numericIncome < 0)) {
        setError('Please enter a valid income value or choose “No current income”.');
        return;
      }

      const updated = await completeOnboarding({
        occupation,
        income_mode: incomeMode,
        income_value: numericIncome,
        income_type:
          occupation === 'Student'
            ? 'Student'
            : occupation === 'Freelancer'
              ? 'Freelance'
              : occupation === 'Business owner / Entrepreneur'
                ? 'Business'
                : occupation === 'Gig worker'
                  ? 'Gig Worker'
                  : 'Salaried',
        currency,
        primary_goal: goalText.trim(),
      });

      if (goalText.trim()) {
        localStorage.setItem('finoracle_goal_note', goalText.trim());
      }

      if (updated) {
        navigate('/dashboard', { replace: true });
      }
    } catch (err: any) {
      setError(err?.message || 'Unable to save your onboarding details.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background-secondary flex items-center justify-center px-4">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-text-muted">Preparing your financial profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-primary-bg text-text-primary flex flex-col justify-between py-8 px-4 sm:px-6 lg:px-8">
      {/* Top Header */}
      <div className="max-w-3xl mx-auto w-full flex items-center justify-between pb-6 border-b border-card-border/60">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-primary-light flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-text-primary tracking-tight">FinOracle AI</h1>
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

      <div className="mx-auto max-w-4xl">
        <header className="mb-8">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-sm font-bold text-white shadow-sm">F</div>
              <div>
                <p className="text-base font-bold leading-tight text-text-primary">FinOracle</p>
                <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-text-muted">Financial profile</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => saveProfile(true)}
              disabled={saving}
              className="rounded-lg px-3 py-2 text-sm font-medium text-text-muted transition-colors hover:bg-card hover:text-primary disabled:opacity-50"
            >
              Skip for now
            </button>
          </div>

          <div className="mt-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">A clearer view of your finances</p>
              <h1 className="mt-2 text-2xl font-bold leading-tight text-text-primary sm:text-3xl">Set up your financial foundation</h1>
              <p className="mt-2 max-w-xl text-sm leading-6 text-text-muted">A few details help make your dashboard useful from day one. You can update these anytime.</p>
            </div>
            <p className="shrink-0 text-sm font-semibold text-text-muted">Step {step} <span className="font-normal">of 3</span></p>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-2" aria-label={`Step ${step} of 3`}>
            {[1, 2, 3].map((item) => (
              <div key={item} className={`h-1.5 rounded-full transition-colors duration-300 ${item <= step ? 'bg-primary' : 'bg-card-border'}`} />
            ))}
          </div>
        </header>

        <main className="overflow-hidden rounded-2xl border border-card-border bg-card shadow-[var(--shadow-soft)]">
          <div className="border-b border-card-border px-5 py-5 sm:px-8">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-background-secondary text-primary">
                {step === 1 ? <Briefcase className="h-5 w-5" /> : step === 2 ? <Wallet className="h-5 w-5" /> : <PiggyBank className="h-5 w-5" />}
              </div>
              <div>
                <p className="text-xs font-medium text-text-muted">Step 0{step}</p>
                <h2 className="text-lg font-semibold text-text-primary">
                  {step === 1 ? 'About your work' : step === 2 ? 'Income details' : 'Preferences and goal'}
                </h2>
              </div>
            </div>
          </div>

          <div className="min-h-[330px] px-5 py-6 sm:px-8 sm:py-8">
            {step === 1 && (
              <section aria-labelledby="occupation-heading" className="animate-[fadeIn_.2s_ease-out]">
                <div className="mb-5">
                  <h3 id="occupation-heading" className="text-sm font-semibold text-text-primary">Which best describes you?</h3>
                  <p className="mt-1 text-sm text-text-muted">Choose the option that most closely matches your current situation.</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {OCCUPATIONS.map((option) => {
                    const selected = occupation === option;
                    return (
                      <button
                        key={option}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => setOccupation(option)}
                        className={`flex min-h-14 items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                          selected
                            ? 'border-primary bg-primary-lighter text-primary shadow-[inset_0_0_0_1px_rgb(var(--c-primary))]'
                            : 'border-card-border bg-card text-text-primary hover:border-primary hover:bg-background-secondary'
                        }`}
                      >
                        <span className="text-sm font-medium">{option}</span>
                        {selected && <Check className="h-4 w-4 shrink-0 text-primary" />}
                      </button>
                    );
                  })}
                </div>
              </section>
            )}

            {step === 2 && (
              <section aria-labelledby="income-heading" className="animate-[fadeIn_.2s_ease-out]">
                <div className="mb-5">
                  <h3 id="income-heading" className="text-sm font-semibold text-text-primary">How does income arrive for you?</h3>
                  <p className="mt-1 text-sm text-text-muted">
                    {occupation === 'Student'
                      ? 'Include regular earnings or support you want to account for. You can also choose no current income.'
                      : occupation === 'Retired' || occupation === 'Homemaker'
                        ? 'Add any regular or occasional income, or choose no current income.'
                        : 'Choose the frequency that best reflects your income. This is a planning estimate, not a transaction.'}
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {INCOME_OPTIONS.map((option) => {
                    const selected = incomeMode === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => { setIncomeMode(option.value as typeof incomeMode); setError(null); }}
                        className={`flex min-h-14 items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                          selected
                            ? 'border-primary bg-primary-lighter text-primary shadow-[inset_0_0_0_1px_rgb(var(--c-primary))]'
                            : 'border-card-border bg-card text-text-primary hover:border-primary hover:bg-background-secondary'
                        }`}
                      >
                        <span className="text-sm font-medium">{option.label}</span>
                        {selected && <Check className="h-4 w-4 shrink-0 text-primary" />}
                      </button>
                    );
                  })}
                </div>

                {incomeMode !== 'none' && (
                  <div className="mt-7 max-w-md">
                    <label htmlFor="income-amount" className="mb-2 block text-sm font-semibold text-text-secondary">
                      Estimated {incomePeriod} income <span className="font-normal text-text-muted">(optional)</span>
                    </label>
                    <div className="flex overflow-hidden rounded-xl border border-card-border bg-card transition focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15">
                      <span className="flex w-14 shrink-0 items-center justify-center border-r border-card-border bg-background-secondary text-sm font-semibold text-text-muted" aria-hidden="true">
                        {currencySymbols[currency] || currency}
                      </span>
                      <input
                        id="income-amount"
                        type="number"
                        min="0"
                        step="0.01"
                        value={incomeValue}
                        onChange={(event) => { setIncomeValue(event.target.value); setError(null); }}
                        placeholder={incomeMode === 'irregular' ? 'For example, 35,000' : 'Enter an amount'}
                        aria-invalid={Boolean(error)}
                        className="min-w-0 flex-1 border-0 bg-transparent px-4 py-3 text-base text-text-primary outline-none placeholder:text-text-muted"
                      />
                      <span className="flex items-center px-4 text-xs font-medium text-text-muted">{currency}</span>
                    </div>
                    <p className="mt-2 text-xs text-text-muted">You can leave this blank and add income details later.</p>
                  </div>
                )}
              </section>
            )}

            {step === 3 && (
              <section aria-labelledby="preferences-heading" className="animate-[fadeIn_.2s_ease-out]">
                <div className="mb-6">
                  <h3 id="preferences-heading" className="text-sm font-semibold text-text-primary">Set your preferences</h3>
                  <p className="mt-1 text-sm text-text-muted">These details personalize how your financial information is displayed.</p>
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label htmlFor="preferred-currency" className="mb-2 block text-sm font-semibold text-text-secondary">Preferred currency</label>
                    <select id="preferred-currency" value={currency} onChange={(event) => setCurrency(event.target.value)} className="w-full rounded-xl border border-card-border bg-card px-4 py-3 text-sm text-text-primary outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15">
                      <option value="INR">INR (₹)</option>
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="GBP">GBP (£)</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="financial-goal" className="mb-2 block text-sm font-semibold text-text-secondary">
                      Financial goal <span className="font-normal text-text-muted">(optional)</span>
                    </label>
                    <input
                      id="financial-goal"
                      value={goalText}
                      onChange={(event) => setGoalText(event.target.value)}
                      placeholder="Emergency fund or travel goal"
                      className="w-full rounded-xl border border-card-border bg-card px-4 py-3 text-sm text-text-primary outline-none transition placeholder:text-text-muted focus:border-primary focus:ring-2 focus:ring-primary/15"
                    />
                  </div>
                </div>

                <div className="mt-7 rounded-xl bg-background-secondary p-4 sm:p-5">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-card text-primary">
                      <PiggyBank className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-text-muted">Your profile summary</p>
                      <p className="font-semibold text-text-primary">{occupation || 'Occupation not selected'}</p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 border-t border-card-border pt-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                    <span className="text-text-muted">{incomeLabel}</span>
                    <span className="font-semibold text-text-primary">
                      {incomeMode === 'none'
                        ? 'No current income'
                        : incomeValue
                          ? `${currencySymbols[currency] || ''}${Number(incomeValue).toLocaleString('en-IN')} ${currency}`
                          : 'Income not configured'}
                    </span>
                  </div>
                </div>

                <ul className="mt-5 grid gap-3 text-xs leading-5 text-text-muted sm:grid-cols-3">
                  <li className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />Personalize your budget and cash-flow planning.</li>
                  <li className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />Keep your dashboard based on your real numbers.</li>
                  <li className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />Update your profile later without affecting transactions.</li>
                </ul>
              </section>
            )}

            {error && (
              <div role="alert" className="mt-6 rounded-xl border border-negative/30 bg-negative/10 px-4 py-3 text-sm text-negative">
                {error}
              </div>
            )}
          </div>

          <footer className="flex flex-col-reverse gap-3 border-t border-card-border bg-background-secondary px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-8">
            <button
              type="button"
              onClick={() => { setError(null); setStep((current) => Math.max(current - 1, 1)); }}
              disabled={step === 1 || saving}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-card-border bg-card px-5 text-sm font-semibold text-text-primary transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
            {step < 3 ? (
              <button
                type="button"
                onClick={continueToNextStep}
                disabled={saving}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50"
              >
                Continue <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => saveProfile(false)}
                disabled={saving}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50"
              >
                {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving profile...</> : <>Complete setup <Check className="h-4 w-4" /></>}
              </button>
            )}
          </footer>
        </main>
      </div>
    </div>
  );
}
