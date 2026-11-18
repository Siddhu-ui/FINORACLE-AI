import React, { useState, useEffect, useCallback } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
  Wallet,
  Plus,
  SlidersHorizontal,
  CheckCircle2,
  Calendar,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { dashboardService, profileService } from '@/services/supabase';
import { StatCardSkeleton } from '@/components/ui';
import { FinanceBentoGrid } from '@/components/dashboard/FinanceBentoGrid';
import type { DashboardData, UserProfile } from '@/types';
import { useNavigate } from 'react-router-dom';
import { AddTransactionModal } from '@/components/modals/AddTransactionModal';
import { IncomeSetupModal } from '@/components/modals/IncomeSetupModal';

type PeriodFilter = 'this_month' | 'last_month' | 'last_3_months' | 'all_time';

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<PeriodFilter>('this_month');

  // Modals
  const [isAddTxnOpen, setIsAddTxnOpen] = useState(false);
  const [isIncomeModalOpen, setIsIncomeModalOpen] = useState(false);

  const { user } = useAuth();
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const now = new Date();
      let start: string | undefined;
      let end: string | undefined = now.toISOString().split('T')[0];

      if (period === 'this_month') {
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        start = monthStart.toISOString().split('T')[0];
      } else if (period === 'last_month') {
        const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
        start = lastMonthStart.toISOString().split('T')[0];
        end = lastMonthEnd.toISOString().split('T')[0];
      } else if (period === 'last_3_months') {
        const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1);
        start = threeMonthsAgo.toISOString().split('T')[0];
      } else {
        // all_time
        start = '2000-01-01';
      }

      const [dashResult, profResult] = await Promise.all([
        dashboardService.getData(start, end),
        profileService.get(),
      ]);

      setData(dashResult);
      setProfile(profResult);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Greeting helper
  const hour = new Date().getHours();
  const timeGreeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const userName = profile?.full_name || user?.user_metadata?.full_name || 'Investor';

  const currentMonthLabel = new Date().toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
  });

  const hasAnyFinancialActivity = data?.has_data ?? false;

  return (
    <div className="space-y-6 min-w-0 w-full">
      {/* 1. Header with Period Selector & Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-card-border/60">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-text-primary tracking-tight">
              {timeGreeting}, {userName}
            </h1>
            <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-primary/10 text-primary border border-primary/20">
              <ShieldCheck className="w-3 h-3" /> Real-time
            </span>
          </div>
          <p className="text-xs sm:text-sm text-text-secondary mt-0.5 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-text-muted" />
            <span>Cycle: {currentMonthLabel}</span>
            {profile?.income_type && (
              <>
                <span className="text-text-muted">•</span>
                <span className="text-text-muted">{profile.income_type}</span>
              </>
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Period Filter Tabs */}
          <div className="flex items-center bg-card border border-card-border rounded-xl p-1 text-xs">
            {(
              [
                { id: 'this_month', label: 'This Month' },
                { id: 'last_month', label: 'Last Month' },
                { id: 'last_3_months', label: '3M' },
                { id: 'all_time', label: 'All' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setPeriod(tab.id)}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                  period === tab.id
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Action buttons */}
          <button
            onClick={() => setIsIncomeModalOpen(true)}
            className="btn-secondary text-xs flex items-center gap-1.5 py-2 px-3"
            title="Configure monthly baseline income"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-text-muted" />
            <span className="hidden sm:inline">Configure</span> Income
          </button>

          <button
            onClick={() => setIsAddTxnOpen(true)}
            className="btn-primary text-xs flex items-center gap-1.5 py-2 px-3.5 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Add Transaction</span>
          </button>
        </div>
      </div>

      {/* 2. Loading State */}
      {loading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <StatCardSkeleton key={i} />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="skeleton h-[300px] rounded-2xl" />
            <div className="skeleton h-[300px] rounded-2xl" />
          </div>
        </div>
      ) : !hasAnyFinancialActivity ? (
        /* 3. Empty State (Zero Fabricated Data) */
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="bg-gradient-to-b from-card to-background-secondary border border-card-border rounded-2xl p-6 sm:p-10 text-center relative overflow-hidden">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-4 text-primary">
              <Sparkles className="w-8 h-8" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-text-primary mb-2">
              Welcome to FinOracle AI
            </h2>
            <p className="text-sm text-text-secondary max-w-lg mx-auto mb-8 leading-relaxed">
              Your financial dashboard is completely clean. FinOracle AI uses only your verified figures—no
              hardcoded assumptions, fake balances, or simulated salaries.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={() => setIsIncomeModalOpen(true)}
                className="w-full sm:w-auto btn-primary flex items-center justify-center gap-2 py-3 px-6 text-sm"
              >
                <Wallet className="w-4 h-4" />
                <span>Configure Monthly Income</span>
              </button>
              <button
                onClick={() => setIsAddTxnOpen(true)}
                className="w-full sm:w-auto btn-secondary flex items-center justify-center gap-2 py-3 px-6 text-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Record First Transaction</span>
              </button>
            </div>

            {/* Feature Highlights Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-12 text-left pt-8 border-t border-card-border/60">
              <div className="p-4 rounded-xl bg-card/60 border border-card-border/40">
                <div className="text-xs font-semibold text-text-primary mb-1 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-positive" />
                  <span>Real Cash Flow Precision</span>
                </div>
                <p className="text-xs text-text-muted leading-relaxed">
                  Track actual inflows and outflows down to the penny. Net savings are calculated with zero fabrication.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-card/60 border border-card-border/40">
                <div className="text-xs font-semibold text-text-primary mb-1 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-positive" />
                  <span>Disciplined Category Budgets</span>
                </div>
                <p className="text-xs text-text-muted leading-relaxed">
                  Set realistic category limits and monitor your spending trajectory before overspending occurs.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-card/60 border border-card-border/40">
                <div className="text-xs font-semibold text-text-primary mb-1 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-positive" />
                  <span>AI Scenario Projections</span>
                </div>
                <p className="text-xs text-text-muted leading-relaxed">
                  Simulate job switches, loan prepayments, and inflation impacts using your actual financial baseline.
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      ) : (
        <FinanceBentoGrid
          data={data!}
          periodLabel={period === 'this_month' ? 'this month' : period === 'last_month' ? 'last month' : period === 'last_3_months' ? 'last three months' : 'all time'}
          onAddTransaction={() => setIsAddTxnOpen(true)}
          onOpenTransactions={() => navigate('/transactions')}
          onOpenBudgets={() => navigate('/budgets')}
          onOpenGoals={() => navigate('/goals')}
          onConfigureIncome={() => setIsIncomeModalOpen(true)}
        />
      )}
      {/* Income Setup Modal */}
      <IncomeSetupModal
        isOpen={isIncomeModalOpen}
        onClose={() => setIsIncomeModalOpen(false)}
        onSaved={() => loadData()}
        initialProfile={profile}
      />

      {/* Add Transaction Modal */}
      <AddTransactionModal
        isOpen={isAddTxnOpen}
        onClose={() => setIsAddTxnOpen(false)}
        onSaved={() => loadData()}
      />
    </div>
  );
}
