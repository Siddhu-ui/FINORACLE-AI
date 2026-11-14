import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Target,
  Plus,
  TrendingUp,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  Coins,
  Edit2,
  Trash2,
  Loader2,
  Sparkles,
  ArrowUpRight,
} from 'lucide-react';
import { goalService } from '@/services/supabase';
import { Card, Modal, ConfirmDialog, EmptyState, PageHeader, ProgressBar, Badge } from '@/components/ui';
import { formatCurrency, formatPercent, formatDate, monthsBetween, getToday } from '@/utils';
import type { FinancialGoal, GoalFormData, GoalStatus } from '@/types';

const goalSchema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters'),
  description: z.string().optional(),
  target_amount: z.number().positive('Target amount must be greater than 0'),
  current_amount: z.number().min(0, 'Current amount cannot be negative'),
  target_date: z.string().min(1, 'Target date is required'),
  monthly_contribution: z.number().positive('Monthly contribution must be greater than 0'),
  color: z.string().optional(),
});

type FormValues = z.infer<typeof goalSchema>;

const contributionSchema = z.object({
  amount: z.number().positive('Contribution must be positive'),
});

type ContributionForm = z.infer<typeof contributionSchema>;

export default function GoalsPage() {
  const [goals, setGoals] = useState<FinancialGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<FinancialGoal | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FinancialGoal | null>(null);
  const [contributeTarget, setContributeTarget] = useState<FinancialGoal | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(goalSchema),
  });

  const {
    register: registerContribute,
    handleSubmit: handleContributeSubmit,
    reset: resetContribute,
    formState: { errors: contributeErrors },
  } = useForm<ContributionForm>({
    resolver: zodResolver(contributionSchema),
  });

  useEffect(() => {
    loadGoals();
  }, []);

  async function loadGoals() {
    setLoading(true);
    try {
      const data = await goalService.list();
      setGoals(data);
    } catch (err) {
      console.error('Failed to load goals:', err);
    } finally {
      setLoading(false);
    }
  }

  function handleOpenCreate() {
    setEditingGoal(null);
    reset({
      title: '',
      description: '',
      target_amount: 100000,
      current_amount: 10000,
      target_date: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      monthly_contribution: 15000,
      color: '#159B72',
    });
    setModalOpen(true);
  }

  function handleOpenEdit(goal: FinancialGoal) {
    setEditingGoal(goal);
    reset({
      title: goal.title,
      description: goal.description || '',
      target_amount: goal.target_amount,
      current_amount: goal.current_amount,
      target_date: goal.target_date,
      monthly_contribution: goal.monthly_contribution,
      color: goal.color || '#159B72',
    });
    setModalOpen(true);
  }

  async function onSubmit(data: FormValues) {
    setSubmitting(true);
    try {
      if (editingGoal) {
        await goalService.update(editingGoal.id, data as GoalFormData);
      } else {
        await goalService.create(data as GoalFormData);
      }
      setModalOpen(false);
      await loadGoals();
    } catch (err) {
      console.error('Failed to save goal:', err);
    } finally {
      setSubmitting(false);
    }
  }

  async function onContribute(data: ContributionForm) {
    if (!contributeTarget) return;
    setSubmitting(true);
    try {
      await goalService.addContribution(contributeTarget.id, data.amount);
      setContributeTarget(null);
      resetContribute();
      await loadGoals();
    } catch (err) {
      console.error('Failed to add contribution:', err);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return;
    try {
      await goalService.delete(deleteTarget.id);
      setDeleteTarget(null);
      await loadGoals();
    } catch (err) {
      console.error('Failed to delete goal:', err);
    }
  }

  // Summary Metrics
  const totalTarget = goals.reduce((s, g) => s + g.target_amount, 0);
  const totalSaved = goals.reduce((s, g) => s + g.current_amount, 0);
  const overallProgress = totalTarget > 0 ? (totalSaved / totalTarget) * 100 : 0;
  const activeCount = goals.filter((g) => g.status === 'active').length;

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader
          title="Goal Guardian"
          subtitle="Define financial aspirations, track real progress, and receive intelligent pacing alerts"
        />

        <button
          onClick={handleOpenCreate}
          className="btn-primary flex items-center gap-2 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> New Financial Goal
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[350px]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* Top Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <Card className="p-5 border-l-4 border-l-primary">
              <span className="text-xs font-medium text-text-muted uppercase tracking-wider">Total Targets</span>
              <p className="text-2xl font-bold text-text-primary mt-1">{formatCurrency(totalTarget)}</p>
              <p className="text-xs text-text-secondary mt-1">Across {goals.length} target goals</p>
            </Card>

            <Card className="p-5 border-l-4 border-l-positive">
              <span className="text-xs font-medium text-text-muted uppercase tracking-wider">Accumulated Funds</span>
              <p className="text-2xl font-bold text-positive mt-1">{formatCurrency(totalSaved)}</p>
              <p className="text-xs text-text-secondary mt-1">Ready capital allocated</p>
            </Card>

            <Card className="p-5 border-l-4 border-l-secondary">
              <span className="text-xs font-medium text-text-muted uppercase tracking-wider">Overall Completion</span>
              <p className="text-2xl font-bold text-text-primary mt-1">{formatPercent(overallProgress)}</p>
              <div className="mt-2">
                <ProgressBar value={overallProgress} color="bg-primary" />
              </div>
            </Card>

            <Card className="p-5 border-l-4 border-l-accent">
              <span className="text-xs font-medium text-text-muted uppercase tracking-wider">Active Guardians</span>
              <p className="text-2xl font-bold text-accent mt-1">{activeCount} Active</p>
              <p className="text-xs text-text-secondary mt-1">Actively receiving contributions</p>
            </Card>
          </div>

          {/* Goals Grid */}
          {goals.length === 0 ? (
            <Card className="text-center py-16">
              <EmptyState
                title="No Financial Goals Configured"
                description="Set milestones for your emergency fund, dream vacation, or investments with Goal Guardian tracking."
                action={{
                  label: 'Create Your First Goal',
                  onClick: handleOpenCreate,
                }}
              />
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {goals.map((goal, idx) => {
                const progress = goal.target_amount > 0 ? (goal.current_amount / goal.target_amount) * 100 : 0;
                const remaining = Math.max(0, goal.target_amount - goal.current_amount);
                const monthsLeft = Math.max(1, monthsBetween(getToday(), goal.target_date));
                const requiredMonthly = remaining / monthsLeft;
                const isOnTrack = goal.monthly_contribution >= requiredMonthly || remaining === 0;

                return (
                  <motion.div
                    key={goal.id}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                  >
                    <Card className="p-6 h-full flex flex-col justify-between hover:border-primary/40 transition-all duration-200">
                      <div>
                        {/* Header */}
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-10 h-10 rounded-xl flex items-center justify-center bg-primary/10 text-primary flex-shrink-0"
                            >
                              <Target className="w-5 h-5" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-text-primary text-base line-clamp-1">
                                {goal.title}
                              </h3>
                              <p className="text-xs text-text-muted flex items-center gap-1 mt-0.5">
                                <Calendar className="w-3 h-3" /> Target: {formatDate(goal.target_date)}
                              </p>
                            </div>
                          </div>

                          <Badge variant={goal.status === 'completed' ? 'positive' : isOnTrack ? 'positive' : 'warning'}>
                            {goal.status === 'completed' ? 'Achieved' : isOnTrack ? 'On Track' : 'Behind Pace'}
                          </Badge>
                        </div>

                        {goal.description && (
                          <p className="text-xs text-text-secondary mb-4 line-clamp-2">
                            {goal.description}
                          </p>
                        )}

                        {/* Progress Bar & Amounts */}
                        <div className="space-y-2 mb-5">
                          <div className="flex justify-between text-xs">
                            <span className="text-text-muted">Saved: <strong className="text-text-primary">{formatCurrency(goal.current_amount)}</strong></span>
                            <span className="text-text-muted">Target: <strong className="text-text-primary">{formatCurrency(goal.target_amount)}</strong></span>
                          </div>

                          <ProgressBar
                            value={progress}
                            color={progress >= 100 ? 'bg-positive' : isOnTrack ? 'bg-primary' : 'bg-warning'}
                          />

                          <div className="flex justify-between items-center text-[11px] text-text-muted pt-1">
                            <span>{formatPercent(progress)} accomplished</span>
                            <span>{formatCurrency(remaining)} remaining</span>
                          </div>
                        </div>

                        {/* Pacing Advice Box */}
                        <div className="bg-background-secondary/80 border border-card-border/60 rounded-xl p-3 mb-5 text-xs space-y-1">
                          <div className="flex justify-between">
                            <span className="text-text-muted">Monthly plan:</span>
                            <span className="font-medium text-text-primary">{formatCurrency(goal.monthly_contribution)}/mo</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-text-muted">Required to hit date:</span>
                            <span className={`font-medium ${isOnTrack ? 'text-positive' : 'text-warning'}`}>
                              {formatCurrency(requiredMonthly)}/mo
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-text-muted">Estimated time left:</span>
                            <span className="font-medium text-text-primary">{monthsLeft} month{monthsLeft !== 1 ? 's' : ''}</span>
                          </div>
                        </div>
                      </div>

                      {/* Card Footer Actions */}
                      <div className="pt-3 border-t border-card-border flex items-center justify-between gap-2">
                        <button
                          onClick={() => {
                            setContributeTarget(goal);
                            resetContribute({ amount: goal.monthly_contribution });
                          }}
                          className="btn-primary text-xs flex items-center gap-1.5 py-1.5 px-3 flex-1 justify-center"
                        >
                          <Coins className="w-3.5 h-3.5" /> Add Funds
                        </button>

                        <button
                          onClick={() => handleOpenEdit(goal)}
                          className="p-2 text-text-muted hover:text-text-primary hover:bg-card rounded-lg transition-colors"
                          title="Edit Goal"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => setDeleteTarget(goal)}
                          className="p-2 text-text-muted hover:text-negative hover:bg-negative/10 rounded-lg transition-colors"
                          title="Delete Goal"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Modal: Create or Edit Goal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingGoal ? 'Edit Financial Goal' : 'Create New Financial Goal'}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1 uppercase">Goal Title</label>
            <input
              type="text"
              {...register('title')}
              placeholder="e.g. Emergency Fund (6 Months)"
              className="input-field w-full"
            />
            {errors.title && <p className="text-xs text-negative mt-1">{errors.title.message}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1 uppercase">Description (Optional)</label>
            <input
              type="text"
              {...register('description')}
              placeholder="e.g. High-yield savings buffer for unforeseen emergencies"
              className="input-field w-full"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1 uppercase">Target Amount (₹)</label>
              <input
                type="number"
                {...register('target_amount', { valueAsNumber: true })}
                className="input-field w-full"
              />
              {errors.target_amount && <p className="text-xs text-negative mt-1">{errors.target_amount.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1 uppercase">Current Saved (₹)</label>
              <input
                type="number"
                {...register('current_amount', { valueAsNumber: true })}
                className="input-field w-full"
              />
              {errors.current_amount && <p className="text-xs text-negative mt-1">{errors.current_amount.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1 uppercase">Target Completion Date</label>
              <input
                type="date"
                {...register('target_date')}
                className="input-field w-full"
              />
              {errors.target_date && <p className="text-xs text-negative mt-1">{errors.target_date.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1 uppercase">Planned Monthly Deposit (₹)</label>
              <input
                type="number"
                {...register('monthly_contribution', { valueAsNumber: true })}
                className="input-field w-full"
              />
              {errors.monthly_contribution && <p className="text-xs text-negative mt-1">{errors.monthly_contribution.message}</p>}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-card-border">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="btn-primary flex items-center gap-2">
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {editingGoal ? 'Update Goal' : 'Create Goal'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Quick Contribution */}
      <Modal
        isOpen={!!contributeTarget}
        onClose={() => setContributeTarget(null)}
        title={`Add Funds to ${contributeTarget?.title}`}
      >
        <form onSubmit={handleContributeSubmit(onContribute)} className="space-y-4">
          <p className="text-xs text-text-secondary">
            Deposit savings directly into this goal's balance. This will accelerate your completion progress.
          </p>

          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1 uppercase">
              Contribution Amount (₹)
            </label>
            <input
              type="number"
              {...registerContribute('amount', { valueAsNumber: true })}
              placeholder="e.g. 10000"
              className="input-field w-full text-lg font-semibold"
              autoFocus
            />
            {contributeErrors.amount && (
              <p className="text-xs text-negative mt-1">{contributeErrors.amount.message}</p>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-card-border">
            <button
              type="button"
              onClick={() => setContributeTarget(null)}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary flex items-center gap-2"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Confirm Deposit
            </button>
          </div>
        </form>
      </Modal>

      {/* Confirmation Dialog for Delete */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Delete Financial Goal"
        message={`Are you sure you want to delete "${deleteTarget?.title}"? All progress logs will be permanently deleted.`}
        confirmText="Delete Goal"
        variant="negative"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
