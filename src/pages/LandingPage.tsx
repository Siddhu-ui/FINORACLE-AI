import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Sparkles,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  PiggyBank,
  Wallet,
  Target,
  FlaskConical,
  Calculator,
  MessageSquareText,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Database,
  EyeOff,
  Layers,
  ChevronRight,
  Menu,
  X,
  CreditCard,
  PieChart as PieChartIcon,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function LandingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-[#09090F] text-text-primary selection:bg-primary/30 selection:text-white overflow-x-hidden">
      {/* 1. Sticky Navigation Bar */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'bg-[#09090F]/85 backdrop-blur-md border-b border-card-border/80 shadow-card py-3'
            : 'bg-transparent py-5'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary-light flex items-center justify-center shadow-glow">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold tracking-tight text-white group-hover:text-primary-light transition-colors">
                  FinOracle
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-primary/20 text-primary border border-primary/30">
                  AI
                </span>
              </div>
              <p className="text-[10px] text-text-muted font-medium tracking-wide">
                FINANCIAL INTELLIGENCE
              </p>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-7 text-xs font-medium text-text-secondary">
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="hover:text-white transition-colors"
            >
              Home
            </button>
            <button
              onClick={() => scrollToSection('features')}
              className="hover:text-white transition-colors"
            >
              Features
            </button>
            <button
              onClick={() => scrollToSection('how-it-works')}
              className="hover:text-white transition-colors"
            >
              How It Works
            </button>
            <button
              onClick={() => scrollToSection('why-finoracle')}
              className="hover:text-white transition-colors"
            >
              Why FinOracle
            </button>
            <button
              onClick={() => scrollToSection('security')}
              className="hover:text-white transition-colors"
            >
              Security
            </button>
          </nav>

          {/* Action CTAs */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <button
                onClick={() => navigate('/dashboard')}
                className="btn-primary text-xs py-2.5 px-5 flex items-center gap-2 shadow-glow"
              >
                <span>Go to Dashboard</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-xs font-semibold text-text-secondary hover:text-white px-3.5 py-2 transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="btn-primary text-xs py-2 px-4 flex items-center gap-1.5 shadow-glow"
                >
                  <span>Get Started</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </>
            )}
          </div>

          {/* Mobile Hamburger Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-xl bg-card border border-card-border text-text-secondary hover:text-white transition-colors"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-background-secondary border-b border-card-border px-6 py-5 space-y-4 shadow-card">
            <nav className="flex flex-col space-y-3 text-sm font-medium text-text-secondary">
              <button
                onClick={() => {
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                  setMobileMenuOpen(false);
                }}
                className="text-left py-1 hover:text-white"
              >
                Home
              </button>
              <button
                onClick={() => scrollToSection('features')}
                className="text-left py-1 hover:text-white"
              >
                Features
              </button>
              <button
                onClick={() => scrollToSection('how-it-works')}
                className="text-left py-1 hover:text-white"
              >
                How It Works
              </button>
              <button
                onClick={() => scrollToSection('why-finoracle')}
                className="text-left py-1 hover:text-white"
              >
                Why FinOracle
              </button>
              <button
                onClick={() => scrollToSection('security')}
                className="text-left py-1 hover:text-white"
              >
                Security
              </button>
            </nav>

            <div className="pt-4 border-t border-card-border/60 flex flex-col gap-2.5">
              {user ? (
                <button
                  onClick={() => navigate('/dashboard')}
                  className="btn-primary w-full text-center text-xs py-2.5"
                >
                  Go to Dashboard →
                </button>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="btn-secondary w-full text-center text-xs py-2.5"
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/register"
                    className="btn-primary w-full text-center text-xs py-2.5"
                  >
                    Get Started — It's Free
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      {/* 2. Hero Section */}
      <section className="relative pt-32 pb-20 sm:pt-40 sm:pb-28 overflow-hidden">
        {/* Ambient background glows */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-1/3 left-1/4 w-[300px] h-[300px] bg-positive/5 rounded-full blur-[100px] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
            {/* Left Column: Headlines & CTAs */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/25 text-xs text-primary-light">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                <span className="font-semibold">Next-Gen Financial Intelligence</span>
                <span className="text-text-muted">•</span>
                <span className="text-text-secondary">RAG Simulation Engine</span>
              </div>

              <h1 className="text-3xl sm:text-5xl lg:text-5xl xl:text-6xl font-extrabold tracking-tight text-white leading-[1.15]">
                Take Control of Your Money.{' '}
                <span className="gradient-text">Design Your Financial Future.</span>
              </h1>

              <p className="text-sm sm:text-base lg:text-lg text-text-secondary max-w-2xl mx-auto lg:mx-0 leading-relaxed font-normal">
                Understand your spending, plan your budgets, simulate financial decisions, and make
                smarter money moves with an intelligent personal finance companion.
              </p>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3.5 pt-2">
                <Link
                  to={user ? '/dashboard' : '/register'}
                  className="w-full sm:w-auto btn-primary py-3.5 px-8 text-sm flex items-center justify-center gap-2 shadow-glow font-semibold"
                >
                  <span>{user ? 'Go to Dashboard' : "Get Started — It's Free"}</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>

                <button
                  onClick={() => scrollToSection('features')}
                  className="w-full sm:w-auto btn-secondary py-3.5 px-6 text-sm flex items-center justify-center gap-2 font-medium"
                >
                  <span>Explore Features</span>
                </button>
              </div>

              {/* Trust Indicators */}
              <div className="pt-6 border-t border-card-border/60 flex flex-wrap items-center justify-center lg:justify-start gap-6 text-xs text-text-muted">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-positive" />
                  <span>Zero Fabricated Figures</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-positive" />
                  <span>Occupation-Aware Profiles</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-positive" />
                  <span>Grounded AI Citations</span>
                </div>
              </div>
            </div>

            {/* Right Column: Premium Illustrative Dashboard Preview */}
            <div className="lg:col-span-5 relative w-full">
              <div className="relative rounded-2xl bg-[#111622] border border-[#1E2638] p-5 shadow-2xl overflow-hidden">
                {/* Visual Label Ribbon */}
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#1E2638]">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-positive animate-pulse" />
                    <span className="text-xs font-semibold text-text-primary tracking-wide">
                      Live Financial Overview
                    </span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-primary/15 text-primary border border-primary/25">
                    Illustrative Product Preview
                  </span>
                </div>

                {/* 2x2 Metric Cards */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="p-3.5 rounded-xl bg-[#171E2E] border border-[#1E2638]">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] text-text-muted uppercase font-semibold">
                        Monthly Income
                      </span>
                      <TrendingUp className="w-3.5 h-3.5 text-positive" />
                    </div>
                    <p className="text-lg font-bold text-text-primary">₹75,000</p>
                    <p className="text-[10px] text-positive mt-0.5">Verified inflow</p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#171E2E] border border-[#1E2638]">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] text-text-muted uppercase font-semibold">
                        Outflows
                      </span>
                      <TrendingDown className="w-3.5 h-3.5 text-negative" />
                    </div>
                    <p className="text-lg font-bold text-text-primary">₹22,500</p>
                    <p className="text-[10px] text-text-muted mt-0.5">Controlled pacing</p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#171E2E] border border-[#1E2638]">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] text-text-muted uppercase font-semibold">
                        Net Cash Flow
                      </span>
                      <Wallet className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <p className="text-lg font-bold text-positive">+₹52,500</p>
                    <p className="text-[10px] text-text-muted mt-0.5">Actual surplus</p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#171E2E] border border-[#1E2638]">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] text-text-muted uppercase font-semibold">
                        Retention Rate
                      </span>
                      <PiggyBank className="w-3.5 h-3.5 text-positive" />
                    </div>
                    <p className="text-lg font-bold text-positive">70.0%</p>
                    <p className="text-[10px] text-positive font-medium mt-0.5">Healthy (≥20%)</p>
                  </div>
                </div>

                {/* Spending Pacing Bar */}
                <div className="p-3.5 rounded-xl bg-[#171E2E] border border-[#1E2638] space-y-2 mb-4">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-text-primary">Budget Cap Utilization</span>
                    <span className="text-text-muted">₹22,500 / ₹45,000 (50%)</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-background-secondary overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-positive to-primary w-1/2 rounded-full" />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-text-muted">
                    <span>Safe spending pacing</span>
                    <span className="text-positive font-semibold">₹22,500 cushion</span>
                  </div>
                </div>

                {/* Ledger preview snippet */}
                <div className="p-3 rounded-xl bg-[#171E2E]/60 border border-[#1E2638] flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-negative/15 text-negative flex items-center justify-center font-bold text-[10px]">
                      ↓
                    </div>
                    <div>
                      <p className="font-semibold text-text-primary text-[11px]">Groceries & Essentials</p>
                      <p className="text-[10px] text-text-muted">Food • Today • UPI</p>
                    </div>
                  </div>
                  <span className="font-bold text-negative text-[11px]">-₹4,500</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Financial Challenges Section */}
      <section className="py-20 bg-[#0E121B] border-y border-card-border/60 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-primary">
              The Reality of Personal Finance
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
              Your Money Deserves a Better Plan.
            </h2>
            <p className="text-sm sm:text-base text-text-secondary leading-relaxed">
              Traditional spreadsheets and basic banking apps only show history after mistakes happen.
              FinOracle AI helps you track, plan, and simulate outcomes before you commit capital.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {[
              {
                icon: AlertTriangle,
                title: 'Untracked Spending',
                desc: 'Micro-expenses accumulate silently, leaving you wondering where your salary disappeared by month-end.',
                color: 'text-warning',
                bg: 'bg-warning/10',
              },
              {
                icon: Wallet,
                title: 'Unclear Monthly Budgets',
                desc: 'Rigid budget rules fail because real-life income and discretionary expenses fluctuate dynamically.',
                color: 'text-primary',
                bg: 'bg-primary/10',
              },
              {
                icon: TrendingDown,
                title: 'Unpredictable Income',
                desc: 'Freelancers, consultants, and gig professionals struggle with irregular payout schedules.',
                color: 'text-secondary',
                bg: 'bg-secondary/10',
              },
              {
                icon: Target,
                title: 'Stalled Savings Goals',
                desc: 'Without automated pacing and target visibility, long-term wealth goals take a back seat.',
                color: 'text-positive',
                bg: 'bg-positive/10',
              },
              {
                icon: FlaskConical,
                title: 'Decision Blindspots',
                desc: 'Committing to big-ticket loans or switching jobs without stress-testing cash flow beforehand.',
                color: 'text-accent',
                bg: 'bg-accent/10',
              },
            ].map((card, i) => (
              <div
                key={i}
                className="p-5 rounded-2xl bg-card border border-card-border/70 hover:border-border-hover transition-all flex flex-col justify-between"
              >
                <div>
                  <div className={`w-10 h-10 rounded-xl ${card.bg} flex items-center justify-center mb-4`}>
                    <card.icon className={`w-5 h-5 ${card.color}`} />
                  </div>
                  <h3 className="text-sm font-bold text-text-primary mb-2">{card.title}</h3>
                  <p className="text-xs text-text-secondary leading-relaxed">{card.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Complete Features Section */}
      <section id="features" className="py-24 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-primary">
              Core Architecture
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
              Eight Integrated Engines. Complete Financial Clarity.
            </h2>
            <p className="text-sm sm:text-base text-text-secondary leading-relaxed">
              Every tool within FinOracle AI is engineered with authentic formulas, verified ledgers,
              and grounded financial intelligence.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: Layers,
                title: 'Smart Dashboard',
                desc: 'Real-time overview of monthly inflows, expenses, net cash flow, and spending distribution with zero fabricated values.',
                badge: 'Real-time',
                color: 'text-primary',
                bg: 'bg-primary/10',
              },
              {
                icon: CreditCard,
                title: 'Transaction Manager',
                desc: 'Record verified inflows and outflows, filter by payment method and custom categories, or import statements via CSV.',
                badge: 'Ledger',
                color: 'text-positive',
                bg: 'bg-positive/10',
              },
              {
                icon: PiggyBank,
                title: 'Budget Management',
                desc: 'Allocate spending caps by category, calculate remaining cushions, and receive overspending breach warnings.',
                badge: 'Pacing',
                color: 'text-accent',
                bg: 'bg-accent/10',
              },
              {
                icon: Target,
                title: 'Goal Guardian',
                desc: 'Set wealth milestones, compute required monthly contributions, and monitor progress bars toward financial milestones.',
                badge: 'Milestones',
                color: 'text-warning',
                bg: 'bg-warning/10',
              },
              {
                icon: FlaskConical,
                title: 'What-If Simulator',
                desc: 'Stress-test salary hikes, career switches, emergency medical expenses, and new EMI obligations before committing.',
                badge: 'RAG Simulation',
                color: 'text-secondary',
                bg: 'bg-secondary/10',
              },
              {
                icon: Calculator,
                title: 'Loan Analyzer',
                desc: 'Calculate exact reducing-balance EMIs, total interest burdens, and explore how prepayment slashes repayment tenure.',
                badge: 'Amortization',
                color: 'text-primary-light',
                bg: 'bg-primary/15',
              },
              {
                icon: MessageSquareText,
                title: 'AI Financial Assistant',
                desc: 'Consult an AI assistant trained on personal finance best practices, delivering grounded responses with source citations.',
                badge: 'Grounded AI',
                color: 'text-positive',
                bg: 'bg-positive/10',
              },
              {
                icon: FileText,
                title: 'Financial Reports',
                desc: 'Generate downloadable financial audits, savings trends, tax preparation breakdowns, and category audit sheets.',
                badge: 'Exportable',
                color: 'text-accent',
                bg: 'bg-accent/10',
              },
            ].map((f, i) => (
              <div
                key={i}
                className="p-6 rounded-2xl bg-card border border-card-border hover:border-border-hover transition-all duration-300 flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className={`w-11 h-11 rounded-xl ${f.bg} flex items-center justify-center group-hover:scale-105 transition-transform`}>
                      <f.icon className={`w-5 h-5 ${f.color}`} />
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-card border border-card-border text-text-muted">
                      {f.badge}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-white mb-2">{f.title}</h3>
                  <p className="text-xs text-text-secondary leading-relaxed">{f.desc}</p>
                </div>

                <div className="mt-5 pt-4 border-t border-card-border/50 flex items-center justify-between text-xs font-semibold text-primary group-hover:text-primary-light transition-colors">
                  <span>Explore Engine</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. How It Works Section */}
      <section id="how-it-works" className="py-20 bg-[#0E121B] border-y border-card-border/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-primary">
              Simple Step-by-Step
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
              How FinOracle AI Works
            </h2>
            <p className="text-sm text-text-secondary">
              A frictionless onboarding and ongoing workflow designed for authentic financial control.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 relative">
            {[
              {
                step: '01',
                title: 'Create Account',
                desc: 'Register in seconds using secure authentication with email or demo credentials.',
              },
              {
                step: '02',
                title: 'Profile Onboarding',
                desc: 'Select your occupation (Student, Salaried, Freelance, Business) and set your baseline.',
              },
              {
                step: '03',
                title: 'Record Ledger',
                desc: 'Add actual income deposits and daily expense outflows manually or via CSV.',
              },
              {
                step: '04',
                title: 'Set Monthly Caps',
                desc: 'Allocate spending limits across categories and protect your monthly cushion.',
              },
              {
                step: '05',
                title: 'Simulate & Grow',
                desc: 'Model future what-if scenarios and consult the grounded AI financial companion.',
              },
            ].map((s, i) => (
              <div
                key={i}
                className="p-5 rounded-2xl bg-card border border-card-border/70 flex flex-col justify-between"
              >
                <div>
                  <span className="text-2xl font-black text-primary/30 block mb-2 font-mono">
                    {s.step}
                  </span>
                  <h3 className="text-sm font-bold text-white mb-2">{s.title}</h3>
                  <p className="text-xs text-text-secondary leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. Why FinOracle Section */}
      <section id="why-finoracle" className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-primary">
              The Value Proposition
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
              Why Disciplined Planners Choose FinOracle AI
            </h2>
            <p className="text-sm text-text-secondary">
              Grounded, transparent, and built to empower your real-world financial decision-making.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                title: 'Personalized Financial Tracking',
                desc: 'Adapts whether you are a salaried employee on a monthly pay cycle, a student with zero income, or a freelancer with irregular billings.',
              },
              {
                title: 'Zero Fabricated Data',
                desc: 'We never fabricate balances, generate fake demo transactions, or guess your salary. Everything reflects your verified records.',
              },
              {
                title: 'Transparent Formulas',
                desc: 'Clear mathematical calculations for reducing-balance EMIs, savings rates, and budget pacing without opaque black-box estimates.',
              },
              {
                title: 'Privacy-Conscious Architecture',
                desc: 'Your financial entries belong strictly to your authenticated account with Row-Level Security and encrypted sessions.',
              },
              {
                title: 'Grounded AI Education',
                desc: 'Get answers to tax, loan, and budgeting queries backed by verifiable citations from reputable financial knowledge bases.',
              },
              {
                title: 'Pre-Commitment Simulation',
                desc: 'Stress-test financial decisions before making commitments, preventing costly long-term cash flow shocks.',
              },
            ].map((item, i) => (
              <div
                key={i}
                className="p-6 rounded-2xl bg-card border border-card-border/80 flex items-start gap-4"
              >
                <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                  <CheckCircle2 className="w-4 h-4 text-positive" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white mb-1.5">{item.title}</h3>
                  <p className="text-xs text-text-secondary leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 7. Security and Trust Section */}
      <section id="security" className="py-20 bg-[#0E121B] border-y border-card-border/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-5 space-y-4">
              <span className="text-xs font-bold uppercase tracking-wider text-positive">
                Security & Data Integrity
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Transparent, User-Centric Security.
              </h2>
              <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
                We believe security should be honest. FinOracle AI uses verified database architecture
                and authenticated session isolation so your money records remain strictly private.
              </p>
            </div>

            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-card border border-card-border flex items-start gap-3">
                <Lock className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-white">Supabase Authentication</h4>
                  <p className="text-[11px] text-text-muted mt-1 leading-relaxed">
                    Industry-standard JWT tokens with secure authentication sessions and encrypted transit.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-card border border-card-border flex items-start gap-3">
                <Database className="w-5 h-5 text-positive shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-white">Row-Level Security (RLS)</h4>
                  <p className="text-[11px] text-text-muted mt-1 leading-relaxed">
                    Database policies enforce strict isolation: you can only read and write your own records.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-card border border-card-border flex items-start gap-3">
                <EyeOff className="w-5 h-5 text-secondary shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-white">Zero Data Monetization</h4>
                  <p className="text-[11px] text-text-muted mt-1 leading-relaxed">
                    We never sell, rent, or distribute your financial entries to advertisers or third parties.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-card border border-card-border flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-warning shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-white">Local-First Fallback</h4>
                  <p className="text-[11px] text-text-muted mt-1 leading-relaxed">
                    Resilient local encryption store ensures you can operate seamlessly even in demo mode.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 8. Final CTA Section */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent pointer-events-none" />

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10 space-y-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary-light flex items-center justify-center mx-auto shadow-glow">
            <Sparkles className="w-7 h-7 text-white" />
          </div>

          <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
            Your Financial Journey Starts Here.
          </h2>

          <p className="text-sm sm:text-base text-text-secondary max-w-xl mx-auto leading-relaxed">
            Take the guesswork out of personal finance. Sign up today and experience the clarity of
            real-time tracking, proactive budgeting, and scenario simulation.
          </p>

          <div className="pt-2">
            <Link
              to={user ? '/dashboard' : '/register'}
              className="btn-primary py-4 px-9 text-sm font-semibold inline-flex items-center gap-2 shadow-glow"
            >
              <span>Build Your Financial Future</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* 9. Footer */}
      <footer className="py-12 bg-[#06070B] border-t border-card-border/60 text-xs text-text-muted">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-lg bg-primary flex items-center justify-center">
                  <Sparkles className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="font-bold text-white text-sm">FinOracle AI</span>
              </div>
              <p className="text-text-muted leading-relaxed">
                RAG-powered scenario analysis and financial simulation platform.
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-white mb-3">Product</h4>
              <ul className="space-y-2">
                <li><Link to="/dashboard" className="hover:text-white transition-colors">Smart Dashboard</Link></li>
                <li><Link to="/transactions" className="hover:text-white transition-colors">Transactions Ledger</Link></li>
                <li><Link to="/budgets" className="hover:text-white transition-colors">Budget Pacing</Link></li>
                <li><Link to="/scenarios" className="hover:text-white transition-colors">What-If Simulator</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-white mb-3">Resources</h4>
              <ul className="space-y-2">
                <li><Link to="/loans" className="hover:text-white transition-colors">Loan EMI Analyzer</Link></li>
                <li><Link to="/assistant" className="hover:text-white transition-colors">AI Financial Assistant</Link></li>
                <li><Link to="/learn" className="hover:text-white transition-colors">Learn Finance</Link></li>
                <li><Link to="/reports" className="hover:text-white transition-colors">Financial Reports</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-white mb-3">Account</h4>
              <ul className="space-y-2">
                <li><Link to="/login" className="hover:text-white transition-colors">Sign In</Link></li>
                <li><Link to="/register" className="hover:text-white transition-colors">Create Account</Link></li>
                <li><Link to="/settings" className="hover:text-white transition-colors">Settings & Profile</Link></li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-card-border/40 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p>© {new Date().getFullYear()} FinOracle AI. All rights reserved.</p>
            <div className="flex items-center gap-2 text-[11px] text-positive">
              <span className="w-2 h-2 rounded-full bg-positive" />
              <span>Platform Systems Active & Online</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
