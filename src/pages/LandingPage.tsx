import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  BarChart3,
  BellRing,
  Building2,
  CheckCircle2,
  CreditCard,
  Landmark,
  Lock,
  Menu,
  PiggyBank,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  Wallet,
  Zap,
} from 'lucide-react';

const navItems = [
  { label: 'Home', href: '#home' },
  { label: 'Features', href: '#features' },
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'Why FinOracle', href: '#why-finoracle' },
  { label: 'Insights', href: '#insights' },
];

const challengeCards = [
  { title: 'Untracked spending', description: 'Hidden gaps in daily cash flow can quietly erode your savings.', icon: CreditCard },
  { title: 'Unclear monthly budgets', description: 'Without a clear allocation plan, categories drift and overspend.', icon: BarChart3 },
  { title: 'Unpredictable income', description: 'Variable earnings need a realistic cash-flow system, not guesses.', icon: TrendingUp },
  { title: 'Savings goals feel distant', description: 'Without milestones and timing, progress remains abstract.', icon: Target },
  { title: 'Big decisions feel risky', description: 'Major financial choices need context, simulation, and confidence.', icon: BellRing },
];

const featureCards = [
  { title: 'Smart Dashboard', description: 'See your real inflows, outflows, and net cash flow in one place.', icon: BarChart3 },
  { title: 'Transaction Manager', description: 'Log expenses and income with clean categories, dates, and notes.', icon: Wallet },
  { title: 'Budget Management', description: 'Set category caps and monitor pacing before overspending occurs.', icon: PiggyBank },
  { title: 'Goal Guardian', description: 'Track key milestones for emergency funds, travel, life events, and wealth goals.', icon: Target },
  { title: 'What-if Simulator', description: 'Stress-test salary changes, large purchases, and major life decisions.', icon: Zap },
  { title: 'Loan Analyzer', description: 'Model EMI patterns, interest, and repayment impact before you commit.', icon: Landmark },
  { title: 'AI Financial Assistant', description: 'Ask money questions with grounded context and relevant financial guidance.', icon: Sparkles },
  { title: 'Financial Reports', description: 'Turn everyday decisions into clearer monthly insights and progress tracking.', icon: Building2 },
];

const steps = [
  'Create your account',
  'Set up your financial profile',
  'Record income and expenses',
  'Set monthly budgets and goals',
  'Explore insights and scenarios',
];

const whyItems = [
  'Personalized financial tracking built around your actual life and objectives.',
  'Real user-entered data only—no fabricated balances or income assumptions.',
  'Transparent calculations that clearly separate planned, actual, and net values.',
  'Privacy-first architecture designed for personal financial records.',
  'Guided AI-powered financial education that helps you decide with confidence.',
  'Scenario simulation to model what changes before you commit financially.',
];

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text-primary)] relative overflow-x-hidden">
      <div className="absolute inset-0 opacity-80 pointer-events-none">
        <div className="absolute left-[-20%] top-[-8%] h-[520px] w-[520px] rounded-full bg-[var(--primary)]/8 blur-[100px]" />
        <div className="absolute right-[-8%] top-[12%] h-[420px] w-[420px] rounded-full bg-[var(--primary-light)]/10 blur-[100px]" />
      </div>

      <header className="sticky top-0 z-50 border-b border-[var(--card-border)] bg-[var(--bg)]/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--primary)] to-[var(--primary-light)] shadow-sm">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="text-base font-bold tracking-tight text-[var(--text-primary)]">FinOracle AI</div>
            </div>
          </Link>

          <nav className="hidden items-center gap-7 text-sm text-[var(--text-secondary)] lg:flex">
            {navItems.map((item) => (
              <a key={item.label} href={item.href} className="transition hover:text-[var(--text-primary)]">
                {item.label}
              </a>
            ))}
          </nav>

          <div className="hidden items-center gap-3 lg:flex">
            <button onClick={() => navigate('/login')} className="btn-ghost text-sm">Login</button>
            <button onClick={() => navigate('/register')} className="btn-primary text-sm">Get Started</button>
          </div>

          <button className="inline-flex items-center justify-center rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-2 text-[var(--text-primary)] lg:hidden" aria-label="Open menu">
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </header>

      <main>
        <section id="home" className="relative mx-auto max-w-7xl px-4 pb-20 pt-14 sm:px-6 lg:px-8 lg:pb-24 lg:pt-20">
          <div className="grid items-center gap-12 lg:grid-cols-[1.08fr_0.92fr]">
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[var(--primary)] border-opacity-20 bg-[var(--primary-muted)] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--primary)]">
                <ShieldCheck className="h-3.5 w-3.5" />
                Trusted personal finance platform
              </div>

              <h1 className="max-w-xl text-4xl font-black tracking-[-0.06em] text-[var(--text-primary)] sm:text-5xl lg:text-6xl">
                Take control of your money.
                <span className="block text-[var(--primary)]">Plan with clarity.</span>
              </h1>

              <p className="mt-6 max-w-xl text-base leading-8 text-[var(--text-secondary)] sm:text-lg">
                Understand your spending, track your cash flow, model life decisions, and build a financially confident future with a cleaner, more human system.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <button onClick={() => navigate('/register')} className="btn-primary inline-flex items-center justify-center gap-2 text-sm">
                  Get Started — It&apos;s Free
                  <ArrowRight className="h-4 w-4" />
                </button>
                <a href="#features" className="btn-secondary inline-flex items-center justify-center gap-2 text-sm">
                  Explore Features
                </a>
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-6 text-xs text-[var(--text-secondary)]">
                <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-[var(--positive)]" /> Real-time tracking</div>
                <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-[var(--positive)]" /> Scenario planning</div>
                <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-[var(--positive)]" /> AI-guided insights</div>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, delay: 0.1 }} className="relative">
              <div className="absolute -inset-4 rounded-[32px] bg-[var(--primary)]/10 blur-2xl" />
              <div className="relative overflow-hidden rounded-[28px] border border-[var(--card-border)] bg-[var(--card)] p-4 shadow-[var(--shadow-soft)]">
                <div className="mb-4 flex items-center justify-between rounded-2xl border border-[var(--card-border)] bg-[var(--bg-secondary)] px-4 py-3">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--text-muted)]">Portfolio snapshot</p>
                    <p className="mt-1 text-lg font-bold text-[var(--text-primary)]">Preview dashboard</p>
                  </div>
                  <div className="rounded-xl border border-[var(--positive)] border-opacity-20 bg-[var(--positive-muted)] px-2 py-1 text-[10px] font-semibold text-[var(--positive)]">Live preview</div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--bg-secondary)] p-4">
                    <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--text-muted)]">Monthly cash flow</p>
                    <p className="mt-2 text-2xl font-bold text-[var(--text-primary)]">₹0</p>
                    <p className="mt-2 text-xs text-[var(--text-secondary)]">Illustrative preview only</p>
                  </div>
                  <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--bg-secondary)] p-4">
                    <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--text-muted)]">Savings rate</p>
                    <p className="mt-2 text-2xl font-bold text-[var(--positive)]">0%</p>
                    <p className="mt-2 text-xs text-[var(--text-secondary)]">User-entered data only</p>
                  </div>
                </div>

                <div className="mt-4 rounded-2xl border border-[var(--card-border)] bg-[var(--bg-secondary)] p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-xs font-semibold text-[var(--text-secondary)]">Budget pacing</span>
                    <span className="text-[11px] text-[var(--text-muted)]">Illustrative</span>
                  </div>
                  <div className="space-y-3">
                    {['Housing', 'Food', 'Travel', 'Savings'].map((item, idx) => (
                      <div key={item}>
                        <div className="mb-1 flex items-center justify-between text-[11px] text-[var(--text-secondary)]">
                          <span>{item}</span>
                          <span>{[35, 42, 28, 61][idx]}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-[var(--card)]">
                          <div className="h-full rounded-full bg-gradient-to-r from-[var(--primary)] to-[var(--primary-light)]" style={{ width: `${[35, 42, 28, 61][idx]}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        <section id="challenges" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="mb-10 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--primary)]">Why it matters</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-[var(--text-primary)] sm:text-4xl">Your money deserves a clearer plan.</h2>
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-5">
            {challengeCards.map(({ title, description, icon: Icon }) => (
              <div key={title} className="group rounded-3xl border border-[var(--card-border)] bg-[var(--card)] p-5 shadow-[var(--shadow-soft)] transition hover:-translate-y-1 hover:border-[var(--primary)] border-opacity-30">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--primary-muted)] text-[var(--primary)]">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="text-base font-semibold text-[var(--text-primary)]">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{description}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="features" className="border-y border-[var(--card-border)] bg-[var(--bg-secondary)] py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-12 text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--primary)]">Features</p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-[var(--text-primary)] sm:text-4xl">The tools you need to grow with confidence.</h2>
            </div>

            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              {featureCards.map(({ title, description, icon: Icon }) => (
                <div key={title} className="rounded-3xl border border-[var(--card-border)] bg-[var(--card)] p-5 shadow-[var(--shadow-soft)] transition hover:border-[var(--primary)] border-opacity-30 hover:-translate-y-0.5">
                  <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--primary-muted)] text-[var(--primary)]">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-lg font-semibold text-[var(--text-primary)]">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="how-it-works" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--primary)]">How it works</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-[var(--text-primary)] sm:text-4xl">A clearer financial rhythm, step by step.</h2>
          </div>

          <div className="grid gap-5 md:grid-cols-5">
            {steps.map((step, index) => (
              <div key={step} className="rounded-3xl border border-[var(--card-border)] bg-[var(--card)] p-5 shadow-[var(--shadow-soft)]">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-[var(--primary-muted)] text-sm font-bold text-[var(--primary)]">{index + 1}</div>
                <p className="text-base font-semibold text-[var(--text-primary)]">{step}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="why-finoracle" className="border-y border-[var(--card-border)] bg-[var(--bg-secondary)] py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-12 text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--primary)]">Why FinOracle</p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-[var(--text-primary)] sm:text-4xl">Built around your real financial life.</h2>
            </div>

            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {whyItems.map((item) => (
                <div key={item} className="flex items-start gap-3 rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-5 shadow-[var(--shadow-soft)]">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[var(--positive)]" />
                  <p className="text-sm leading-6 text-[var(--text-secondary)]">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="insights" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="rounded-[28px] border border-[var(--card-border)] bg-[var(--card)] p-8 shadow-[var(--shadow-soft)]">
            <div className="grid gap-8 lg:grid-cols-[1fr_1.2fr] lg:items-center">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--primary)]">Security & trust</p>
                <h2 className="mt-3 text-3xl font-bold tracking-tight text-[var(--text-primary)]">Your data stays in your hands.</h2>
                <p className="mt-4 text-base leading-7 text-[var(--text-secondary)]">
                  FinOracle uses Supabase authentication and stores user-specific financial records behind user-scoped access patterns. We surface only the information tied to the authenticated account.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--bg-secondary)] p-5">
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--primary-muted)] text-[var(--primary)]">
                    <Lock className="h-5 w-5" />
                  </div>
                  <p className="text-base font-semibold text-[var(--text-primary)]">Secure access</p>
                  <p className="mt-2 text-sm text-[var(--text-secondary)]">Auth-backed sign-in and per-user record access.</p>
                </div>
                <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--bg-secondary)] p-5">
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--primary-muted)] text-[var(--primary)]">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <p className="text-base font-semibold text-[var(--text-primary)]">Privacy-first</p>
                  <p className="mt-2 text-sm text-[var(--text-secondary)]">Financial records remain scoped to the authenticated account.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 pb-20 pt-4 sm:px-6 lg:px-8">
          <div className="rounded-[28px] border border-[var(--card-border)] bg-gradient-to-r from-[var(--primary)] to-[var(--primary-light)] p-[1px] shadow-[var(--shadow-soft)]">
            <div className="rounded-[27px] bg-[var(--card)] px-6 py-10 text-center sm:px-10">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--primary)]">Start now</p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-[var(--text-primary)] sm:text-4xl">Your financial journey starts here.</h2>
              <button onClick={() => navigate('/register')} className="btn-primary mt-8 inline-flex items-center justify-center gap-2 text-sm">
                Build Your Financial Future
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[var(--card-border)] bg-[var(--card)]">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-10 sm:px-6 lg:flex-row lg:items-start lg:justify-between lg:px-8">
          <div className="max-w-md">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--primary)] to-[var(--primary-light)]">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <div className="text-lg font-bold text-[var(--text-primary)]">FinOracle AI</div>
            </div>
            <p className="mt-4 text-sm leading-6 text-[var(--text-secondary)]">
              Your personal finance companion for understanding cash flow, budgets, goals, and smarter financial decisions.
            </p>
          </div>

          <div className="grid gap-8 text-sm text-[var(--text-secondary)] sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <p className="font-semibold text-[var(--text-primary)]">Product</p>
              <div className="mt-3 space-y-2">
                {['Features', 'Reports', 'Goals', 'Insights'].map((item) => (
                  <div key={item}>{item}</div>
                ))}
              </div>
            </div>
            <div>
              <p className="font-semibold text-[var(--text-primary)]">Company</p>
              <div className="mt-3 space-y-2">
                {['About', 'Privacy', 'Support'].map((item) => (
                  <div key={item}>{item}</div>
                ))}
              </div>
            </div>
            <div>
              <p className="font-semibold text-[var(--text-primary)]">Resources</p>
              <div className="mt-3 space-y-2">
                {['Learn Finance', 'Scenario Planner', 'Budgeting'].map((item) => (
                  <div key={item}>{item}</div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
