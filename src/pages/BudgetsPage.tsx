import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
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
  SlidersHorizontal,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { budgetService, transactionService, profileService } from '@/services/supabase';
import { Card, Modal, ConfirmDialog, EmptyState, PageHeader, ProgressBar, Badge } from '@/components/ui';
import { formatCurrency, formatPercent, getCurrentMonth, getMonthRange, getCategoryColor } from '@/utils';
import type { Budget, BudgetFormData, UserProfile } from '@/types';
import { EXPENSE_CATEGORIES } from '@/types';
import { AddTransactionModal } from '@/components/modals/AddTransactionModal';
import { IncomeSetupModal } from '@/components/modals/IncomeSetupModal';

interface CategoryAllocationRow {
  category: string;
  limit_amount: number;
}

export default function BudgetsPage() {
  const [currentMonth, setCurrentMonth] = useState(getCurrentMonth());
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [activeBudget, setActiveBudget] = useState<Budget | null>(null);
  const [categorySpending, setCategorySpending] = useState<Record<string, number>>({});
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Modals
  const [budgetModalOpen, setBudgetModalOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Budget | null>(null);
  const [isAddTxnOpen, setIsAddTxnOpen] = useState(false);
  const [isIncomeModalOpen, setIsIncomeModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state for Budget Modal
  const [budgetName, setBudgetName] = useState('');
  const [budgetMonth, setBudgetMonth] = useState(currentMonth);
  const [budgetPlannedIncome, setBudgetPlannedIncome] = useState<string>('');
  const [categoryRows, setCategoryRows] = useState<CategoryAllocationRow[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  const loadBudgetData = useCallback(async () => {
    setLoading(true);
    try {
      const [allBudgets, userProfile] = await Promise.all([
        budgetService.list(),
        profileService.get(),
      ]);

      setBudgets(allBudgets);
      setProfile(userProfile);

      const matching = allBudgets.find((b) => b.month === currentMonth) || null;
      setActiveBudget(matching);

      // Fetch verified actual spending for current month from transactions
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
  }, [currentMonth]);

  useEffect(() => {
    loadBudgetData();
  }, [loadBudgetData]);

  const handleOpenCreate = () => {
    setEditingBudget(null);
    setBudgetName(`Budget - ${new Date(currentMonth + '-01').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}`);
    setBudgetMonth(currentMonth);
    const defaultIncome = profile?.monthly_income ? String(profile.monthly_income) : '';
    setBudgetPlannedIncome(defaultIncome);

    // Provide default categories with 0 allocated so user decides their own numbers
    setCategoryRows([
      { category: 'Housing', limit_amount: 0 },
      { category: 'Food', limit_amount: 0 },
      { category: 'Transportation', limit_amount: 0 },
      { category: 'Utilities', limit_amount: 0 },
      { category: 'Healthcare', limit_amount: 0 },
    ]);
    setFormError(null);
    setBudgetModalOpen(true);
  };

  const handleOpenEdit = (budget: Budget) => {
    setEditingBudget(budget);
    setBudgetName(budget.name);
    setBudgetMonth(budget.month);
    setBudgetPlannedIncome(budget.planned_income ? String(budget.planned_income) : String(profile?.monthly_income || 0));
    setCategoryRows(
      budget.categories.map((c) => ({
        category: c.category,
        limit_amount: c.limit_amount,
      }))
    );
    setFormError(null);
    setBudgetModalOpen(true);
  };

  const handleAddCategoryRow = (suggestedName?: string) => {
    const name = suggestedName || '';
    if (name && categoryRows.some((r) => r.category.toLowerCase() === name.toLowerCase())) {
      return; // Already added
    }
    setCategoryRows([...categoryRows, { category: name, limit_amount: 0 }]);
  };

  const handleCategoryNameChange = (index: number, name: string) => {
    const updated = [...categoryRows];
    updated[index].category = name;
    setCategoryRows(updated);
  };

  const handleCategoryLimitChange = (index: number, val: string) => {
    const updated = [...categoryRows];
    const parsed = parseFloat(val);
    updated[index].limit_amount = isNaN(parsed) ? 0 : Math.max(0, parsed);
    setCategoryRows(updated);
  };

  const handleRemoveCategoryRow = (index: number) => {
    setCategoryRows(categoryRows.filter((_, i) => i !== index));
  };

  const handleSubmitBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!budgetName.trim()) {
      setFormError('Please enter a budget plan name');
      return;
    }

    if (!budgetMonth) {
      setFormError('Please select a valid month');
      return;
    }

    // Filter out categories without a valid name
    const validCategories = categoryRows.filter((c) => c.category.trim().length > 0);
    if (validCategories.length === 0) {
      setFormError('Please add at least one category allocation');
      return;
    }

    const totalCalculated = validCategories.reduce((sum, c) => sum + c.limit_amount, 0);
    const plannedIncomeVal = parseFloat(budgetPlannedIncome) || 0;

    setSubmitting(true);
    try {
      const payload: BudgetFormData = {
        name: budgetName.trim(),
        month: budgetMonth,
        planned_income: plannedIncomeVal,
        total_limit: totalCalculated,
        categories: validCategories.map((c) => ({
          category: c.category.trim(),
          limit_amount: c.limit_amount,
        })),
      };

      if (editingBudget) {
        await budgetService.update(editingBudget.id, payload);
      } else {
        await budgetService.create(payload);
      }

      setBudgetModalOpen(false);
      setCurrentMonth(budgetMonth);
      await loadBudgetData();
    } catch (err: any) {
      setFormError(err?.message || 'Failed to save budget plan');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      await budgetService.delete(deleteTarget.id);
      setDeleteTarget(null);
      await loadBudgetData();
    } catch (err) {
      console.error('Failed to delete budget:', err);
    }
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const [year, month] = currentMonth.split('-').map(Number);
    const date = new Date(year, month - 1 + (direction === 'next' ? 1 : -1), 1);
    const newMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    setCurrentMonth(newMonth);
  };

  // Financial Calculations for Active Budget
  const monthlyPlannedIncome =
    activeBudget?.planned_income && activeBudget.planned_income > 0
      ? activeBudget.planned_income
      : profile?.monthly_income || 0;

  const totalAllocatedBudget = activeBudget ? activeBudget.total_limit : 0;
  const totalActualExpenses = Object.values(categorySpending).reduce((a, b) => a + b, 0);

  // Unallocated = planned income minus total allocated budget
  const unallocatedAmount = monthlyPlannedIncome - totalAllocatedBudget;

  // Remaining Cushion = total allocated budget minus actual spent
  const remainingCushion = totalAllocatedBudget - totalActualExpenses;
  const utilizationRate = totalAllocatedBudget > 0 ? (totalActualExpenses / totalAllocatedBudget) * 100 : 0;

  // Check overspending categories
  const overspentCategories = activeBudget
    ? activeBudget.categories.filter((c) => {
        const spent = categorySpending[c.category] || 0;
        return c.limit_amount > 0 && spent > c.limit_amount;
      })
    : [];

  return (
    <div className="space-y-6 min-w-0 w-full">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-card-border/60">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-text-primary tracking-tight">
            Budget Management
          </h1>
          <p className="text-xs sm:text-sm text-text-secondary mt-0.5">
            Configure your monthly spending plan, enforce spending discipline, and avoid deficits.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Month Selector */}
          <div className="flex items-center bg-card border border-card-border rounded-xl px-2 py-1">
            <button
              onClick={() => navigateMonth('prev')}
              className="p-1.5 text-text-muted hover:text-text-primary rounded-lg transition-colors"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-semibold text-text-primary px-3 min-w-[110px] text-center">
              {new Date(currentMonth + '-01').toLocaleDateString('en-IN', {
                month: 'short',
                year: 'numeric',
              })}
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
            onClick={() => setIsAddTxnOpen(true)}
            className="btn-secondary text-xs flex items-center gap-1.5 py-2 px-3"
          >
            <Plus className="w-3.5 h-3.5 text-positive" />
            <span>Record Outflow</span>
          </button>

          <button
            onClick={activeBudget ? () => handleOpenEdit(activeBudget) : handleOpenCreate}
            className="btn-primary text-xs flex items-center gap-1.5 py-2 px-3.5"
          >
            {activeBudget ? <Edit2 className="w-3.5 h-3.5" /> : <Plus className="w-4 h-4" />}
            <span>{activeBudget ? 'Edit Limits' : 'Create Budget'}</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : !activeBudget ? (
        /* Empty State */
        <Card className="text-center py-16 p-6">
          <div className="w-16 h-16 rounded-2xl bg-card border border-card-border flex items-center justify-center mx-auto mb-4 text-primary">
            <PiggyBank className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-text-primary mb-2">
            No Budget Configured for {new Date(currentMonth + '-01').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
          </h3>
          <p className="text-xs sm:text-sm text-text-secondary max-w-md mx-auto mb-6 leading-relaxed">
            Create a custom monthly plan to allocate your income into housing, food, savings, and other
            discretionary caps. FinOracle AI will track your real transactions against these caps.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={handleOpenCreate}
              className="btn-primary text-xs py-2.5 px-5 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Set Up This Month's Budget</span>
            </button>
            <button
              onClick={() => setIsIncomeModalOpen(true)}
              className="btn-secondary text-xs py-2.5 px-4 flex items-center gap-2"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-text-muted" />
              <span>Configure Base Income</span>
            </button>
          </div>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Overspending Banner Alert */}
          {overspentCategories.length > 0 && (
            <div className="p-4 rounded-xl bg-negative/10 border border-negative/30 flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-negative shrink-0 mt-0.5" />
              <div className="text-xs">
                <span className="font-semibold text-text-primary block">
                  Category Limit Breached ({overspentCategories.length} {overspentCategories.length === 1 ? 'category' : 'categories'})
                </span>
                <span className="text-text-secondary mt-0.5 block">
                  {overspentCategories.map((c) => c.category).join(', ')} exceeded allocated limits based on your recorded transactions. Review non-essential spending.
                </span>
              </div>
            </div>
          )}

          {/* Top 5 Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
            {/* Card 1: Monthly Income */}
            <Card className="p-4 border-card-border">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-medium text-text-muted uppercase tracking-wider">
                  Monthly Income
                </span>
                <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <Wallet className="w-3.5 h-3.5" />
                </div>
              </div>
              <p className="text-xl font-bold text-text-primary">
                {formatCurrency(monthlyPlannedIncome)}
              </p>
              <div className="mt-1 flex items-center justify-between text-[11px]">
                <span className="text-text-muted">Planned baseline</span>
                <button
                  onClick={() => setIsIncomeModalOpen(true)}
                  className="text-primary hover:underline"
                >
                  Edit
                </button>
              </div>
            </Card>

            {/* Card 2: Allocated Budget */}
            <Card className="p-4 border-card-border">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-medium text-text-muted uppercase tracking-wider">
                  Allocated Caps
                </span>
                <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <PiggyBank className="w-3.5 h-3.5" />
                </div>
              </div>
              <p className="text-xl font-bold text-text-primary">
                {formatCurrency(totalAllocatedBudget)}
              </p>
              <p className="text-[11px] text-text-muted mt-1">
                {activeBudget.categories.length} categories planned
              </p>
            </Card>

            {/* Card 3: Actual Expenses */}
            <Card className="p-4 border-card-border">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-medium text-text-muted uppercase tracking-wider">
                  Actual Expenses
                </span>
                <div className="w-7 h-7 rounded-lg bg-negative/10 text-negative flex items-center justify-center">
                  <TrendingDown className="w-3.5 h-3.5" />
                </div>
              </div>
              <p className="text-xl font-bold text-text-primary">
                {formatCurrency(totalActualExpenses)}
              </p>
              <p className="text-[11px] text-text-muted mt-1">
                From recorded transactions
              </p>
            </Card>

            {/* Card 4: Unallocated Amount */}
            <Card className="p-4 border-card-border">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-medium text-text-muted uppercase tracking-wider">
                  Unallocated
                </span>
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                  unallocatedAmount >= 0 ? 'bg-positive/10 text-positive' : 'bg-negative/10 text-negative'
                }`}>
                  <TrendingUp className="w-3.5 h-3.5" />
                </div>
              </div>
              <p className={`text-xl font-bold ${unallocatedAmount >= 0 ? 'text-positive' : 'text-negative'}`}>
                {formatCurrency(unallocatedAmount)}
              </p>
              <p className="text-[11px] text-text-muted mt-1">
                {unallocatedAmount >= 0 ? 'Free cushion' : 'Over-allocated!'}
              </p>
            </Card>

            {/* Card 5: Remaining Cushion / Deficit */}
            <Card className="p-4 border-card-border">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-medium text-text-muted uppercase tracking-wider">
                  {remainingCushion >= 0 ? 'Budget Cushion' : 'Over Budget'}
                </span>
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                  remainingCushion >= 0 ? 'bg-positive/10 text-positive' : 'bg-negative/10 text-negative'
                }`}>
                  {remainingCushion >= 0 ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                </div>
              </div>
              <p className={`text-xl font-bold ${remainingCushion >= 0 ? 'text-positive' : 'text-negative'}`}>
                {formatCurrency(Math.abs(remainingCushion))}
              </p>
              <p className="text-[11px] text-text-muted mt-1">
                {formatPercent(utilizationRate)} utilized
              </p>
            </Card>
          </div>

          {/* Active Budget Action Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card border border-card-border p-3.5 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                {activeBudget.categories.length}
              </div>
              <div>
                <h3 className="text-xs font-semibold text-text-primary">{activeBudget.name}</h3>
                <p className="text-[11px] text-text-muted">
                  Spending period: {new Date(currentMonth + '-01').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleOpenEdit(activeBudget)}
                className="btn-secondary text-xs flex items-center gap-1.5 py-1.5 px-3"
              >
                <Edit2 className="w-3 h-3" />
                <span>Edit Allocations</span>
              </button>
              <button
                onClick={() => setDeleteTarget(activeBudget)}
                className="p-1.5 text-text-muted hover:text-negative hover:bg-negative/10 rounded-lg transition-colors"
                title="Delete Budget Plan"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Category Allocations Grid */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-text-primary">
                Category Spending Caps & Progress
              </h3>
              <span className="text-xs text-text-muted">
                {activeBudget.categories.length} Active Categories
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeBudget.categories.map((cat, idx) => {
                const spent = categorySpending[cat.category] || 0;
                const limit = cat.limit_amount;
                const catUtilization = limit > 0 ? (spent / limit) * 100 : spent > 0 ? 100 : 0;
                const remaining = limit - spent;
                const isOver = remaining < 0;
                const categoryColor = getCategoryColor(cat.category);

                return (
                  <motion.div
                    key={cat.category || idx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.03 }}
                  >
                    <Card className="p-4 hover:border-border-hover transition-all space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: categoryColor }}
                          />
                          <h4 className="text-xs font-semibold text-text-primary truncate">
                            {cat.category}
                          </h4>
                        </div>
                        <Badge
                          variant={isOver ? 'negative' : catUtilization > 85 ? 'warning' : 'positive'}
                        >
                          {isOver ? 'Over Cap' : `${formatPercent(catUtilization)}`}
                        </Badge>
                      </div>

                      <div className="flex items-baseline justify-between text-xs text-text-secondary">
                        <span>
                          Spent: <strong className="text-text-primary font-semibold">{formatCurrency(spent)}</strong>
                        </span>
                        <span>
                          Cap: <strong className="text-text-primary font-semibold">{formatCurrency(limit)}</strong>
                        </span>
                      </div>

                      <ProgressBar
                        value={catUtilization}
                        color={isOver ? 'bg-negative' : catUtilization > 85 ? 'bg-warning' : 'bg-positive'}
                        size="sm"
                      />

                      <div className="pt-2 border-t border-card-border/60 flex items-center justify-between text-xs">
                        <span className="text-text-muted">
                          {isOver ? 'Over budget by' : 'Remaining cushion'}
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
        </div>
      )}

      {/* Modal: Create or Edit Monthly Budget Plan */}
      <Modal
        open={budgetModalOpen}
        onClose={() => setBudgetModalOpen(false)}
        title={editingBudget ? 'Edit Monthly Budget Plan' : 'Create Monthly Budget Plan'}
        size="lg"
      >
        <form onSubmit={handleSubmitBudget} className="space-y-5">
          {formError && (
            <div className="p-3 rounded-xl bg-negative/10 border border-negative/25 text-negative text-xs">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-text-primary mb-1">
                Plan Name <span className="text-negative">*</span>
              </label>
              <input
                type="text"
                value={budgetName}
                onChange={(e) => setBudgetName(e.target.value)}
                placeholder="e.g. Master Monthly Budget"
                className="input-field text-xs"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-primary mb-1">
                Month (YYYY-MM) <span className="text-negative">*</span>
              </label>
              <input
                type="month"
                value={budgetMonth}
                onChange={(e) => setBudgetMonth(e.target.value)}
                className="input-field text-xs"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-primary mb-1">
              Planned Monthly Income for this Plan (₹)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-text-muted">
                ₹
              </span>
              <input
                type="number"
                value={budgetPlannedIncome}
                onChange={(e) => setBudgetPlannedIncome(e.target.value)}
                placeholder="e.g. 75000"
                className="input-field pl-7 text-xs font-semibold text-text-primary"
              />
            </div>
            <p className="text-[11px] text-text-muted mt-1">
              Used to calculate your unallocated balance cushion.
            </p>
          </div>

          {/* Quick-add category chips */}
          <div className="pt-2 border-t border-card-border/60">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-text-primary">
                Category Allocations
              </label>
              <button
                type="button"
                onClick={() => handleAddCategoryRow('')}
                className="text-xs text-primary hover:text-primary-hover font-semibold flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Custom Category
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5 mb-3">
              <span className="text-[11px] text-text-muted self-center mr-1">Suggestions:</span>
              {EXPENSE_CATEGORIES.map((cat) => {
                const isAdded = categoryRows.some(
                  (r) => r.category.toLowerCase() === cat.toLowerCase()
                );
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => handleAddCategoryRow(cat)}
                    disabled={isAdded}
                    className={`text-[11px] px-2 py-0.5 rounded-lg border transition-all ${
                      isAdded
                        ? 'opacity-40 bg-card border-card-border cursor-not-allowed text-text-muted'
                        : 'bg-card border-card-border hover:border-primary text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    + {cat}
                  </button>
                );
              })}
            </div>

            {/* List of category rows */}
            <div className="space-y-2.5 max-h-[260px] overflow-y-auto pr-1">
              {categoryRows.map((row, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <div className="flex-1">
                    <input
                      type="text"
                      placeholder="Category name (e.g. Rent, Groceries)"
                      value={row.category}
                      onChange={(e) => handleCategoryNameChange(idx, e.target.value)}
                      className="input-field text-xs"
                      required
                    />
                  </div>
                  <div className="w-36 relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-text-muted">
                      ₹
                    </span>
                    <input
                      type="number"
                      placeholder="Limit (₹)"
                      value={row.limit_amount || ''}
                      onChange={(e) => handleCategoryLimitChange(idx, e.target.value)}
                      className="input-field pl-7 text-xs font-medium"
                      min="0"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveCategoryRow(idx)}
                    className="p-2 text-text-muted hover:text-negative rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Allocation math summary */}
          {(() => {
            const totalAllocated = categoryRows.reduce((sum, r) => sum + r.limit_amount, 0);
            const plannedInc = parseFloat(budgetPlannedIncome) || 0;
            const diff = plannedInc - totalAllocated;

            return (
              <div className="p-3 rounded-xl bg-card border border-card-border flex items-center justify-between text-xs">
                <div>
                  <span className="text-text-muted">Total Allocated: </span>
                  <span className="font-bold text-text-primary">{formatCurrency(totalAllocated)}</span>
                </div>
                {plannedInc > 0 && (
                  <div>
                    <span className="text-text-muted">Unallocated: </span>
                    <span className={`font-bold ${diff >= 0 ? 'text-positive' : 'text-negative'}`}>
                      {formatCurrency(diff)}
                    </span>
                  </div>
                )}
              </div>
            );
          })()}

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-card-border">
            <button
              type="button"
              onClick={() => setBudgetModalOpen(false)}
              className="btn-secondary text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary text-xs flex items-center gap-2"
            >
              {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{editingBudget ? 'Update Budget' : 'Save Budget'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Budget Plan"
        description={`Are you sure you want to delete "${deleteTarget?.name}"? Category allocations will be permanently removed.`}
        confirmLabel="Delete Plan"
        danger
        onConfirm={handleDeleteConfirm}
        onClose={() => setDeleteTarget(null)}
      />

      {/* Income Setup Modal */}
      <IncomeSetupModal
        isOpen={isIncomeModalOpen}
        onClose={() => setIsIncomeModalOpen(false)}
        onSaved={() => loadBudgetData()}
        initialProfile={profile}
      />

      {/* Add Transaction Modal */}
      <AddTransactionModal
        isOpen={isAddTxnOpen}
        onClose={() => setIsAddTxnOpen(false)}
        onSaved={() => loadBudgetData()}
      />
    </div>
  );
}
