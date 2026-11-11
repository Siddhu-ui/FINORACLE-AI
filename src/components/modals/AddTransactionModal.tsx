import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui';
import { transactionService } from '@/services/supabase';
import type { Transaction, TransactionType } from '@/types';
import { INCOME_CATEGORIES, EXPENSE_CATEGORIES, PAYMENT_METHODS } from '@/types';
import { getToday } from '@/utils';
import {
  TrendingUp,
  TrendingDown,
  Tag,
  CreditCard,
  FileText,
  Calendar,
} from 'lucide-react';

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: (transaction: Transaction) => void;
  initialTransaction?: Transaction | null;
}

export function AddTransactionModal({
  isOpen,
  onClose,
  onSaved,
  initialTransaction,
}: AddTransactionModalProps) {
  const [type, setType] = useState<TransactionType>('expense');
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<string>(EXPENSE_CATEGORIES[0]);
  const [date, setDate] = useState(getToday());
  const [paymentMethod, setPaymentMethod] = useState<string>(PAYMENT_METHODS[0]);
  const [customCategory, setCustomCategory] = useState('');
  const [isCustomCategory, setIsCustomCategory] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialTransaction) {
      setType(initialTransaction.type);
      setTitle(initialTransaction.description);
      setAmount(String(initialTransaction.amount));
      setDate(initialTransaction.date);
      setPaymentMethod(initialTransaction.payment_method || PAYMENT_METHODS[0]);

      const categories: readonly string[] = initialTransaction.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
      if (categories.includes(initialTransaction.category)) {
        setCategory(initialTransaction.category);
        setIsCustomCategory(false);
      } else {
        setIsCustomCategory(true);
        setCustomCategory(initialTransaction.category);
      }
    } else {
      setType('expense');
      setTitle('');
      setAmount('');
      setCategory(EXPENSE_CATEGORIES[0]);
      setDate(getToday());
      setPaymentMethod(PAYMENT_METHODS[0]);
      setIsCustomCategory(false);
      setCustomCategory('');
      setError(null);
    }
  }, [initialTransaction, isOpen]);

  // When type changes, adjust default category
  const handleTypeChange = (newType: TransactionType) => {
    setType(newType);
    if (!isCustomCategory) {
      setCategory(newType === 'income' ? INCOME_CATEGORIES[0] : EXPENSE_CATEGORIES[0]);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError('Please provide a title / merchant description');
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid amount greater than ₹0');
      return;
    }

    const finalCategory = isCustomCategory ? customCategory.trim() : category;
    if (!finalCategory) {
      setError('Please select or specify a category');
      return;
    }

    if (!date) {
      setError('Please specify a transaction date');
      return;
    }

    setSaving(true);
    try {
      let saved: Transaction;
      if (initialTransaction) {
        saved = await transactionService.update(initialTransaction.id, {
          type,
          amount: numAmount,
          category: finalCategory,
          description: title.trim(),
          date,
          payment_method: paymentMethod,
        });
      } else {
        saved = await transactionService.create({
          type,
          amount: numAmount,
          category: finalCategory,
          description: title.trim(),
          date,
          payment_method: paymentMethod,
        });
      }

      if (onSaved) {
        onSaved(saved);
      }
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to save transaction');
    } finally {
      setSaving(false);
    }
  };

  const availableCategories = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title={initialTransaction ? 'Edit Transaction' : 'Record Transaction'}
      size="md"
    >
      <form onSubmit={handleSave} className="space-y-4">
        {error && (
          <div className="p-3 rounded-xl bg-negative/10 border border-negative/25 text-negative text-xs">
            {error}
          </div>
        )}

        {/* Inflow vs Outflow toggle */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-card rounded-xl border border-card-border">
          <button
            type="button"
            onClick={() => handleTypeChange('expense')}
            className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
              type === 'expense'
                ? 'bg-negative text-white shadow-sm'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <TrendingDown className="w-4 h-4" />
            <span>Expense (Outflow)</span>
          </button>
          <button
            type="button"
            onClick={() => handleTypeChange('income')}
            className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
              type === 'income'
                ? 'bg-positive text-white shadow-sm'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>Income (Inflow)</span>
          </button>
        </div>

        {/* Amount */}
        <div>
          <label className="text-xs font-semibold text-text-primary mb-1.5 block">
            Amount (INR) <span className="text-negative">*</span>
          </label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-base font-bold text-text-muted">
              ₹
            </span>
            <input
              type="number"
              step="any"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="input-field pl-8 text-lg font-bold text-text-primary placeholder:font-normal placeholder:text-text-muted/60"
              autoFocus
              required
            />
          </div>
        </div>

        {/* Title / Description */}
        <div>
          <label className="text-xs font-semibold text-text-primary mb-1.5 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-text-muted" />
            <span>Title / Description <span className="text-negative">*</span></span>
          </label>
          <input
            type="text"
            placeholder={type === 'expense' ? 'e.g. Swiggy, Uber, Rent, Netflix' : 'e.g. November Salary, Consulting Fee'}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="input-field text-xs"
            required
          />
        </div>

        {/* Category & Custom Category */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-text-primary flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-text-muted" />
              <span>Category</span>
            </label>
            <button
              type="button"
              onClick={() => setIsCustomCategory(!isCustomCategory)}
              className="text-[11px] font-medium text-primary hover:underline"
            >
              {isCustomCategory ? 'Choose standard' : '+ Custom category'}
            </button>
          </div>

          {isCustomCategory ? (
            <input
              type="text"
              placeholder="e.g. Gym & Fitness, Pet Care, Book Purchase"
              value={customCategory}
              onChange={(e) => setCustomCategory(e.target.value)}
              className="input-field text-xs"
            />
          ) : (
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="select-field text-xs"
            >
              {availableCategories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Date & Payment Method */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-text-primary mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-text-muted" />
              <span>Date</span>
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="input-field text-xs"
              required
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-text-primary mb-1.5 flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5 text-text-muted" />
              <span>Payment Mode</span>
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="select-field text-xs"
            >
              {PAYMENT_METHODS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-card-border">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary text-xs"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn-primary text-xs flex items-center gap-2"
            disabled={saving}
          >
            {saving ? 'Recording...' : initialTransaction ? 'Update Transaction' : 'Record Transaction'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
