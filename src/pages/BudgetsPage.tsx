import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  PiggyBank,
  Plus,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Edit2,
  Trash2,
  TrendingDown,
  TrendingUp,
  Wallet,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { budgetService, transactionService } from '@/services/supabase';
import { Card, Modal, ConfirmDialog, EmptyState, PageHeader, ProgressBar, Badge } from '@/components/ui';
import { formatCurrency, formatPercent, getCurrentMonth, getMonthRange, getCategoryColor } from '@/utils';
import type { Budget, BudgetFormData } from '@/types';
import { EXPENSE_CATEGORIES } from '@/types';

const budgetFormSchema = z.object({
  name: z.string().min(2, 'Budget name must be at least 2 characters'),
  month: z.string().regex(/^\d{4}-\d{2}$/, 'Select a valid month (YYYY-MM)'),
  total_limit: z.number().min(0, 'Total limit must be positive'),
  categories: z.array(
    z.object({
      category: z.string().min(1, 'Category is required'),
      limit_amount: z.number().min(1, 'Limit must be greater than 0'),
    })
  ).min(1, 'Add at least one category budget'),
});

type FormValues = z.infer<typeof budgetFormSchema>;

export default function BudgetsPage() {
  const [currentMonth, setCurrentMonth] = useState(getCurrentMonth());
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [activeBudget, setActiveBudget] = useState<Budget | null>(null);
  const [categorySpending, setCategorySpending] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Budget | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(budgetFormSchema),
    defaultValues: {
      name: `Budget - ${currentMonth}`,
      month: currentMonth,
      total_limit: 0,
      categories: [
        { category: 'Food', limit_amount: 15000 },
        { category: 'Housing', limit_amount: 25000 },
        { category: 'Transport', limit_amount: 6000 },
        { category: 'Entertainment', limit_amount: 5000 },
        { category: 'Utilities', limit_amount: 4000 },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'categories',
  });

  const watchedCategories = watch('categories');

  // Recalculate total_limit when categories change
  useEffect(() => {
    if (watchedCategories && watchedCategories.length > 0) {
      const sum = watchedCategories.reduce((acc, curr) => acc + (Number(curr?.limit_amount) || 0), 0);
      setValue('total_limit', sum, { shouldValidate: true });
    }
  }, [watchedCategories, setValue]);

  useEffect(() => {
    loadBudgetData();
  }, [currentMonth]);

  async function loadBudgetData() {
    setLoading(true);
    try {
      // 1. Fetch budgets for user
      const allBudgets = await budgetService.list();
      setBudgets(allBudgets);

      const matching = allBudgets.find((b) => b.month === currentMonth) || allBudgets[0] || null;
      setActiveBudget(matching);

      // 2. Fetch spending for current month from transactions
      const { start, end } = getMonthRange(currentMonth);
      const summary = await transactionService.getSummary(start, end);

      const spendingMap: Record<string, number> = {};
      summary.spendingByCategory.forEach((item) => {
        spendingMap[item.category] = item.amount;
      });
      setCategorySpending(spendingMap);
    } catch (err) {
      console.error('Failed to load budget data:', err);
    } finally {
      setLoading(false);
    }
  }

  function handleOpenCreate() {
    setEditingBudget(null);
    reset({
      name: `Budget - ${currentMonth}`,
      month: currentMonth,
      total_limit: 55000,
      categories: [
        { category: 'Food', limit_amount: 15000 },
        { category: 'Housing', limit_amount: 25000 },
        { category: 'Transport', limit_amount: 6000 },
        { category: 'Entertainment', limit_amount: 5000 },
        { category: 'Utilities', limit_amount: 4000 },
      ],
    });
    setModalOpen(true);
  }

  function handleOpenEdit(budget: Budget) {
    setEditingBudget(budget);
    reset({
      name: budget.name,
      month: budget.month,
      total_limit: budget.total_limit,
      categories: budget.categories.length > 0
        ? budget.categories.map((c) => ({ category: c.category, limit_amount: c.limit_amount }))
        : [{ category: 'Food', limit_amount: 10000 }],
    });
    setModalOpen(true);
  }

  async function onSubmit(data: FormValues) {
    setSubmitting(true);
    try {
      if (editingBudget) {
        await budgetService.update(editingBudget.id, data as BudgetFormData);
      } else {
        await budgetService.create(data as BudgetFormData);
      }
      setModalOpen(false);
      await loadBudgetData();
    } catch (err) {
      console.error('Failed to save budget:', err);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return;
    try {
      await budgetService.delete(deleteTarget.id);
      setDeleteTarget(null);
      await loadBudgetData();
    } catch (err) {
      console.error('Failed to delete budget:', err);
    }
  }

  const navigateMonth = (direction: 'prev' | 'next') => {
    const [year, month] = currentMonth.split('-').map(Number);
    const date = new Date(year, month - 1 + (direction === 'next' ? 1 : -1), 1);
    const newMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    setCurrentMonth(newMonth);
  };

  // Compute metrics for active budget
  const totalBudgetLimit = activeBudget ? activeBudget.total_limit : 0;
  const totalSpent = Object.values(categorySpending).reduce((a, b) => a + b, 0);
  const remainingBudget = totalBudgetLimit - totalSpent;
  const utilizationRate = totalBudgetLimit > 0 ? (totalSpent / totalBudgetLimit) * 100 : 0;

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader
          title="Budget Management"
          subtitle="Track monthly limits, prevent overspending, and enforce financial discipline"
        />

        <div className="flex items-center gap-3">
          {/* Month Navigator */}
          <div className="flex items-center bg-card border border-card-border rounded-xl px-2 py-1">
            <button
              onClick={() => navigateMonth('prev')}
              className="p-1.5 text-text-muted hover:text-text-primary rounded-lg transition-colors"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-semibold text-text-primary px-3 min-w-[100px] text-center">
              {new Date(currentMonth + '-01').toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
            </span>
            <button
              onClick={() => navigateMonth('next')}
              className="p-1.5 text-text-muted hover:text-text-primary rounded-lg transition-colors"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={handleOpenCreate}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Create Budget
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[350px]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : !activeBudget ? (
        <Card className="text-center py-16">
          <EmptyState
            title={`No Budget Set for ${new Date(currentMonth + '-01').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}`}
            description="Create a monthly budget to set spending limits by category and get alerts before overspending."
            action={{
              label: 'Set Up Budget Now',
              onClick: handleOpenCreate,
            }}
          />
        </Card>
      ) : (
        <>
          {/* Top Overview Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <Card className="p-5 border-l-4 border-l-primary">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-text-muted uppercase tracking-wider">Total Budget</span>
                <div className="p-2 bg-primary/10 rounded-lg text-primary">
                  <Wallet className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-bold text-text-primary">{formatCurrency(totalBudgetLimit)}</p>
              <p className="text-xs text-text-secondary mt-1">{activeBudget.name}</p>
            </Card>

            <Card className="p-5 border-l-4 border-l-secondary">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-text-muted uppercase tracking-wider">Spent So Far</span>
                <div className="p-2 bg-secondary/10 rounded-lg text-secondary">
                  <TrendingDown className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-bold text-text-primary">{formatCurrency(totalSpent)}</p>
              <p className="text-xs text-text-secondary mt-1">Based on this month's recorded transactions</p>
            </Card>

            <Card className={`p-5 border-l-4 ${remainingBudget >= 0 ? 'border-l-positive' : 'border-l-negative'}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-text-muted uppercase tracking-wider">
                  {remainingBudget >= 0 ? 'Remaining Cushion' : 'Over Budget By'}
                </span>
                <div className={`p-2 rounded-lg ${remainingBudget >= 0 ? 'bg-positive/10 text-positive' : 'bg-negative/10 text-negative'}`}>
                  {remainingBudget >= 0 ? <PiggyBank className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                </div>
              </div>
              <p className={`text-2xl font-bold ${remainingBudget >= 0 ? 'text-positive' : 'text-negative'}`}>
                {formatCurrency(Math.abs(remainingBudget))}
              </p>
              <p className="text-xs text-text-secondary mt-1">
                {remainingBudget >= 0 ? 'Safe to spend within planned limits' : 'Immediate expense pruning advised'}
              </p>
            </Card>

            <Card className="p-5 border-l-4 border-l-accent">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-text-muted uppercase tracking-wider">Budget Utilization</span>
                <div className="p-2 bg-accent/10 rounded-lg text-accent">
                  <Sparkles className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-bold text-text-primary">{formatPercent(utilizationRate)}</p>
              <div className="mt-2">
                <ProgressBar
                  value={utilizationRate}
                  color={utilizationRate > 100 ? 'bg-negative' : utilizationRate > 80 ? 'bg-warning' : 'bg-positive'}
                />
              </div>
            </Card>
          </div>

          {/* Action Bar for Active Budget */}
          <div className="flex items-center justify-between bg-card border border-card-border p-4 rounded-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold">
                {activeBudget.categories.length}
              </div>
              <div>
                <h3 className="font-semibold text-text-primary">{activeBudget.name}</h3>
                <p className="text-xs text-text-muted">
                  {activeBudget.categories.length} configured spending categories
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleOpenEdit(activeBudget)}
                className="btn-secondary text-xs flex items-center gap-1.5 py-1.5 px-3"
              >
                <Edit2 className="w-3.5 h-3.5" /> Edit Limits
              </button>
              <button
                onClick={() => setDeleteTarget(activeBudget)}
                className="p-2 text-text-muted hover:text-negative hover:bg-negative/10 rounded-lg transition-colors"
                title="Delete Budget"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Category Breakdown Grid */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-text-primary flex items-center gap-2">
              <span>Category Limits & Progress</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {activeBudget.categories.map((cat, idx) => {
                const spent = categorySpending[cat.category] || 0;
                const limit = cat.limit_amount;
                const catUtilization = limit > 0 ? (spent / limit) * 100 : 0;
                const remaining = limit - spent;
                const isOver = remaining < 0;
                const categoryColor = getCategoryColor(cat.category);

                return (
                  <motion.div
                    key={cat.category || idx}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                  >
                    <Card className="p-5 hover:border-primary/40 transition-all duration-200">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{ backgroundColor: categoryColor }}
                          />
                          <h4 className="font-semibold text-text-primary text-sm">{cat.category}</h4>
                        </div>
                        <Badge
                          variant={isOver ? 'negative' : catUtilization > 85 ? 'warning' : 'positive'}
                        >
                          {isOver ? 'Over Budget' : `${formatPercent(catUtilization)}`}
                        </Badge>
                      </div>

                      <div className="flex items-baseline justify-between text-xs text-text-secondary mb-2">
                        <span>Spent: <strong className="text-text-primary">{formatCurrency(spent)}</strong></span>
                        <span>Limit: <strong className="text-text-primary">{formatCurrency(limit)}</strong></span>
                      </div>

                      <ProgressBar
                        value={catUtilization}
                        color={isOver ? 'bg-negative' : catUtilization > 85 ? 'bg-warning' : 'bg-positive'}
                      />

                      <div className="mt-3 flex items-center justify-between text-xs pt-2 border-t border-card-border/60">
                        <span className="text-text-muted">
                          {isOver ? 'Deficit' : 'Available'}
                        </span>
                        <span className={`font-semibold ${isOver ? 'text-negative' : 'text-positive'}`}>
                          {isOver ? `-${formatCurrency(Math.abs(remaining))}` : formatCurrency(remaining)}
                        </span>
                      </div>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* Modal: Create or Edit Budget */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingBudget ? 'Edit Monthly Budget' : 'Create New Monthly Budget'}
        size="lg"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1.5 uppercase">
                Budget Name
              </label>
              <input
                type="text"
                {...register('name')}
                placeholder="e.g. Master Monthly Budget"
                className="input-field w-full"
              />
              {errors.name && (
                <p className="text-xs text-negative mt-1">{errors.name.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1.5 uppercase">
                Month (YYYY-MM)
              </label>
              <input
                type="month"
                {...register('month')}
                className="input-field w-full"
              />
              {errors.month && (
                <p className="text-xs text-negative mt-1">{errors.month.message}</p>
              )}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-semibold text-text-secondary uppercase">
                Category Allocations
              </label>
              <button
                type="button"
                onClick={() => append({ category: 'Other Expenses', limit_amount: 5000 })}
                className="text-xs text-primary hover:text-primary-light font-semibold flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add Category
              </button>
            </div>

            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 no-scrollbar">
              {fields.map((field, index) => (
                <div key={field.id} className="flex items-center gap-3">
                  <div className="flex-1">
                    <select
                      {...register(`categories.${index}.category` as const)}
                      className="input-field w-full text-xs"
                    >
                      {EXPENSE_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex-1">
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-xs">₹</span>
                      <input
                        type="number"
                        {...register(`categories.${index}.limit_amount` as const, { valueAsNumber: true })}
                        placeholder="Limit Amount"
                        className="input-field w-full pl-7 text-xs"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => remove(index)}
                    className="p-2 text-text-muted hover:text-negative rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            {errors.categories && (
              <p className="text-xs text-negative mt-2">{errors.categories.message}</p>
            )}
          </div>

          <div className="bg-card-border/40 p-4 rounded-xl flex items-center justify-between">
            <span className="text-sm font-semibold text-text-primary">Calculated Total Limit</span>
            <span className="text-lg font-bold text-primary">
              {formatCurrency(watch('total_limit') || 0)}
            </span>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-card-border">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
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
              {editingBudget ? 'Update Budget' : 'Save Budget'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Confirmation Dialog for Delete */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Delete Budget Plan"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? Category allocations will be permanently removed.`}
        confirmText="Delete Plan"
        variant="negative"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
