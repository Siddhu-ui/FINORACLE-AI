import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Briefcase, Check, CheckCircle2, ChevronRight, Loader2, PiggyBank, Wallet } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { profileService } from '@/services/supabase';

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
  const { user } = useAuth();
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
      const existing = await profileService.get();
      const numericIncome = skipIncome || incomeMode === 'none' ? 0 : Number(incomeValue || 0);

      if (!skipIncome && incomeMode !== 'none' && (Number.isNaN(numericIncome) || numericIncome < 0)) {
        setError('Please enter a valid income value or choose “No current income”.');
        return;
      }

      const updated = await profileService.upsert({
        ...existing,
        full_name: existing?.full_name || user?.user_metadata?.full_name || '',
        email: existing?.email || user?.email || '',
        occupation,
        income_type: occupation === 'Student' ? 'Student' : occupation === 'Freelancer' ? 'Freelance' : occupation === 'Business owner / Entrepreneur' ? 'Business' : occupation === 'Gig worker' ? 'Gig Worker' : 'Salaried',
        monthly_income: numericIncome,
        currency,
        onboarding_completed: true,
        additional_income_sources: existing?.additional_income_sources || [],
        planning_period_start_day: existing?.planning_period_start_day || 1,
      });

      if (goalText.trim()) {
        localStorage.setItem('finoracle_goal_note', goalText.trim());
      }

      if (updated) {
        navigate('/dashboard');
      }
    } catch (err: any) {
      setError(err?.message || 'Unable to save your onboarding details.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F7FA] flex items-center justify-center px-4">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-[#159B72]" />
          <p className="text-sm text-[#64748B]">Preparing your financial profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F7FA] px-4 py-6 text-[#172B4D] sm:px-6 sm:py-10 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <header className="mb-8">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#159B72] text-sm font-bold text-white shadow-sm">F</div>
              <div>
                <p className="text-base font-bold leading-tight text-[#172B4D]">FinOracle</p>
                <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#64748B]">Financial profile</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => saveProfile(true)}
              disabled={saving}
              className="rounded-lg px-3 py-2 text-sm font-medium text-[#64748B] transition-colors hover:bg-white hover:text-[#159B72] disabled:opacity-50"
            >
              Skip for now
            </button>
          </div>

          <div className="mt-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#159B72]">A clearer view of your finances</p>
              <h1 className="mt-2 text-2xl font-bold leading-tight text-[#172B4D] sm:text-3xl">Set up your financial foundation</h1>
              <p className="mt-2 max-w-xl text-sm leading-6 text-[#64748B]">A few details help make your dashboard useful from day one. You can update these anytime.</p>
            </div>
            <p className="shrink-0 text-sm font-semibold text-[#64748B]">Step {step} <span className="font-normal">of 3</span></p>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-2" aria-label={`Step ${step} of 3`}>
            {[1, 2, 3].map((item) => (
              <div key={item} className={`h-1.5 rounded-full transition-colors duration-300 ${item <= step ? 'bg-[#159B72]' : 'bg-[#E2E8F0]'}`} />
            ))}
          </div>
        </header>

        <main className="overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white shadow-[0_12px_32px_rgba(15,23,42,0.06)]">
          <div className="border-b border-[#E2E8F0] px-5 py-5 sm:px-8">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EAF0F6] text-[#159B72]">
                {step === 1 ? <Briefcase className="h-5 w-5" /> : step === 2 ? <Wallet className="h-5 w-5" /> : <PiggyBank className="h-5 w-5" />}
              </div>
              <div>
                <p className="text-xs font-medium text-[#64748B]">Step 0{step}</p>
                <h2 className="text-lg font-semibold text-[#172B4D]">
                  {step === 1 ? 'About your work' : step === 2 ? 'Income details' : 'Preferences and goal'}
                </h2>
              </div>
            </div>
          </div>

          <div className="min-h-[330px] px-5 py-6 sm:px-8 sm:py-8">
            {step === 1 && (
              <section aria-labelledby="occupation-heading" className="animate-[fadeIn_.2s_ease-out]">
                <div className="mb-5">
                  <h3 id="occupation-heading" className="text-sm font-semibold text-[#172B4D]">Which best describes you?</h3>
                  <p className="mt-1 text-sm text-[#64748B]">Choose the option that most closely matches your current situation.</p>
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
                        className={`flex min-h-14 items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#159B72] focus-visible:ring-offset-2 ${
                          selected
                            ? 'border-[#159B72] bg-[#E8F5EF] text-[#159B72] shadow-[inset_0_0_0_1px_#159B72]'
                            : 'border-[#E2E8F0] bg-white text-[#172B4D] hover:border-[#159B72] hover:bg-[#F5F7FA]'
                        }`}
                      >
                        <span className="text-sm font-medium">{option}</span>
                        {selected && <Check className="h-4 w-4 shrink-0 text-[#159B72]" />}
                      </button>
                    );
                  })}
                </div>
              </section>
            )}

            {step === 2 && (
              <section aria-labelledby="income-heading" className="animate-[fadeIn_.2s_ease-out]">
                <div className="mb-5">
                  <h3 id="income-heading" className="text-sm font-semibold text-[#172B4D]">How does income arrive for you?</h3>
                  <p className="mt-1 text-sm text-[#64748B]">
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
                        className={`flex min-h-14 items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#159B72] focus-visible:ring-offset-2 ${
                          selected
                            ? 'border-[#159B72] bg-[#E8F5EF] text-[#159B72] shadow-[inset_0_0_0_1px_#159B72]'
                            : 'border-[#E2E8F0] bg-white text-[#172B4D] hover:border-[#159B72] hover:bg-[#F5F7FA]'
                        }`}
                      >
                        <span className="text-sm font-medium">{option.label}</span>
                        {selected && <Check className="h-4 w-4 shrink-0 text-[#159B72]" />}
                      </button>
                    );
                  })}
                </div>

                {incomeMode !== 'none' && (
                  <div className="mt-7 max-w-md">
                    <label htmlFor="income-amount" className="mb-2 block text-sm font-semibold text-[#334155]">
                      Estimated {incomePeriod} income <span className="font-normal text-[#64748B]">(optional)</span>
                    </label>
                    <div className="flex overflow-hidden rounded-xl border border-[#E2E8F0] bg-white transition focus-within:border-[#159B72] focus-within:ring-2 focus-within:ring-[#159B72]/15">
                      <span className="flex w-14 shrink-0 items-center justify-center border-r border-[#E2E8F0] bg-[#EAF0F6] text-sm font-semibold text-[#64748B]" aria-hidden="true">
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
                        className="min-w-0 flex-1 border-0 bg-transparent px-4 py-3 text-base text-[#172B4D] outline-none placeholder:text-[#64748B]"
                      />
                      <span className="flex items-center px-4 text-xs font-medium text-[#64748B]">{currency}</span>
                    </div>
                    <p className="mt-2 text-xs text-[#64748B]">You can leave this blank and add income details later.</p>
                  </div>
                )}
              </section>
            )}

            {step === 3 && (
              <section aria-labelledby="preferences-heading" className="animate-[fadeIn_.2s_ease-out]">
                <div className="mb-6">
                  <h3 id="preferences-heading" className="text-sm font-semibold text-[#172B4D]">Set your preferences</h3>
                  <p className="mt-1 text-sm text-[#64748B]">These details personalize how your financial information is displayed.</p>
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label htmlFor="preferred-currency" className="mb-2 block text-sm font-semibold text-[#334155]">Preferred currency</label>
                    <select id="preferred-currency" value={currency} onChange={(event) => setCurrency(event.target.value)} className="w-full rounded-xl border border-[#E2E8F0] bg-white px-4 py-3 text-sm text-[#172B4D] outline-none transition focus:border-[#159B72] focus:ring-2 focus:ring-[#159B72]/15">
                      <option value="INR">INR (₹)</option>
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="GBP">GBP (£)</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="financial-goal" className="mb-2 block text-sm font-semibold text-[#334155]">
                      Financial goal <span className="font-normal text-[#64748B]">(optional)</span>
                    </label>
                    <input
                      id="financial-goal"
                      value={goalText}
                      onChange={(event) => setGoalText(event.target.value)}
                      placeholder="Emergency fund or travel goal"
                      className="w-full rounded-xl border border-[#E2E8F0] bg-white px-4 py-3 text-sm text-[#172B4D] outline-none transition placeholder:text-[#64748B] focus:border-[#159B72] focus:ring-2 focus:ring-[#159B72]/15"
                    />
                  </div>
                </div>

                <div className="mt-7 rounded-xl bg-[#EAF0F6] p-4 sm:p-5">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-[#159B72]">
                      <PiggyBank className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-[#64748B]">Your profile summary</p>
                      <p className="font-semibold text-[#172B4D]">{occupation || 'Occupation not selected'}</p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 border-t border-[#E2E8F0] pt-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                    <span className="text-[#64748B]">{incomeLabel}</span>
                    <span className="font-semibold text-[#172B4D]">
                      {incomeMode === 'none'
                        ? 'No current income'
                        : incomeValue
                          ? `${currencySymbols[currency] || ''}${Number(incomeValue).toLocaleString('en-IN')} ${currency}`
                          : 'Income not configured'}
                    </span>
                  </div>
                </div>

                <ul className="mt-5 grid gap-3 text-xs leading-5 text-[#64748B] sm:grid-cols-3">
                  <li className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#159B72]" />Personalize your budget and cash-flow planning.</li>
                  <li className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#159B72]" />Keep your dashboard based on your real numbers.</li>
                  <li className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#159B72]" />Update your profile later without affecting transactions.</li>
                </ul>
              </section>
            )}

            {error && (
              <div role="alert" className="mt-6 rounded-xl border border-negative/30 bg-negative/10 px-4 py-3 text-sm text-negative">
                {error}
              </div>
            )}
          </div>

          <footer className="flex flex-col-reverse gap-3 border-t border-[#E2E8F0] bg-[#F5F7FA] px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-8">
            <button
              type="button"
              onClick={() => { setError(null); setStep((current) => Math.max(current - 1, 1)); }}
              disabled={step === 1 || saving}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#E2E8F0] bg-white px-5 text-sm font-semibold text-[#172B4D] transition hover:border-[#159B72] hover:text-[#159B72] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
            {step < 3 ? (
              <button
                type="button"
                onClick={continueToNextStep}
                disabled={saving}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#159B72] px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-[#10835F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#159B72] focus-visible:ring-offset-2 disabled:opacity-50"
              >
                Continue <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => saveProfile(false)}
                disabled={saving}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#159B72] px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-[#10835F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#159B72] focus-visible:ring-offset-2 disabled:opacity-50"
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
