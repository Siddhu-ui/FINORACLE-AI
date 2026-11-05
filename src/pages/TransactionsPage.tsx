import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Plus, Search, Filter, Download, Upload, ArrowUpRight, ArrowDownRight,
  Edit2, Trash2, Loader2, ChevronLeft, ChevronRight, X,
} from 'lucide-react';
import Papa from 'papaparse';
import { transactionService } from '@/services/supabase';
import {
  Card, Modal, ConfirmDialog, EmptyState, PageHeader, Badge,
} from '@/components/ui';
import {
  formatCurrency, formatDate, getToday, getCategoryColor,
} from '@/utils';
import type { Transaction, TransactionFormData, TransactionType, PaginatedResponse } from '@/types';
import { INCOME_CATEGORIES, EXPENSE_CATEGORIES, PAYMENT_METHODS } from '@/types';

const txnSchema = z.object({
  type: z.enum(['income', 'expense']),
  amount: z.number({ invalid_type_error: 'Enter a valid amount' }).positive('Amount must be positive'),
  category: z.string().min(1, 'Select a category'),
  description: z.string().min(1, 'Enter a description'),
  date: z.string().min(1, 'Select a date'),
  payment_method: z.string().optional(),
});

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<PaginatedResponse<Transaction>>({
    data: [], total: 0, page: 1, per_page: 15, total_pages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTxn, setEditingTxn] = useState<Transaction | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Transaction | null>(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [saving, setSaving] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [csvPreview, setCsvPreview] = useState<TransactionFormData[]>([]);

  const loadTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const result = await transactionService.list({
        page,
        per_page: 15,
        type: typeFilter || undefined,
        search: search || undefined,
      });
      setTransactions(result);
    } catch (err) {
      console.error('Failed to load transactions:', err);
    } finally {
      setLoading(false);
    }
  }, [page, typeFilter, search]);

  useEffect(() => { loadTransactions(); }, [loadTransactions]);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<TransactionFormData>({
    resolver: zodResolver(txnSchema),
    defaultValues: { type: 'expense', date: getToday() },
  });

  const txnType = watch('type');
  const categories = txnType === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  function openAdd() {
    setEditingTxn(null);
    reset({ type: 'expense', amount: undefined as unknown as number, category: '', description: '', date: getToday(), payment_method: '' });
    setModalOpen(true);
  }

  function openEdit(txn: Transaction) {
    setEditingTxn(txn);
    reset({
      type: txn.type,
      amount: txn.amount,
      category: txn.category,
      description: txn.description,
      date: txn.date,
      payment_method: txn.payment_method || '',
    });
    setModalOpen(true);
  }

  async function onSubmit(data: TransactionFormData) {
    setSaving(true);
    try {
      if (editingTxn) {
        await transactionService.update(editingTxn.id, data);
      } else {
        await transactionService.create(data);
      }
      setModalOpen(false);
      loadTransactions();
    } catch (err) {
      console.error('Save error:', err);
    } finally {
      setSaving(false);
    }
  }

  async function onDelete() {
    if (!deleteTarget) return;
    try {
      await transactionService.delete(deleteTarget.id);
      setDeleteTarget(null);
      loadTransactions();
    } catch (err) {
      console.error('Delete error:', err);
    }
  }

  function exportCSV() {
    const csvData = transactions.data.map((t) => ({
      Date: t.date,
      Type: t.type,
      Category: t.category,
      Description: t.description,
      Amount: t.amount,
      'Payment Method': t.payment_method || '',
    }));
    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions_${getToday()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleCSVUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rows: TransactionFormData[] = [];
        for (const row of results.data as Record<string, string>[]) {
          const type = (row.Type || row.type || '').toLowerCase();
          if (type !== 'income' && type !== 'expense') continue;
          const amount = parseFloat(row.Amount || row.amount || '0');
          if (isNaN(amount) || amount <= 0) continue;

          rows.push({
            type: type as TransactionType,
            amount,
            category: row.Category || row.category || 'Other Expenses',
            description: row.Description || row.description || 'Imported',
            date: row.Date || row.date || getToday(),
            payment_method: row['Payment Method'] || row.payment_method || '',
          });
        }
        setCsvPreview(rows);
        setImportModalOpen(true);
      },
    });
    e.target.value = '';
  }

  async function importCSV() {
    if (csvPreview.length === 0) return;
    setSaving(true);
    try {
      await transactionService.bulkCreate(csvPreview);
      setImportModalOpen(false);
      setCsvPreview([]);
      loadTransactions();
    } catch (err) {
      console.error('Import error:', err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Transactions"
        description="Track your income and expenses"
        action={
          <div className="flex items-center gap-2">
            <label className="btn-secondary flex items-center gap-2 cursor-pointer">
              <Upload className="w-4 h-4" /> Import
              <input type="file" accept=".csv" className="hidden" onChange={handleCSVUpload} />
            </label>
            <button onClick={exportCSV} className="btn-secondary flex items-center gap-2">
              <Download className="w-4 h-4" /> Export
            </button>
            <button onClick={openAdd} className="btn-primary flex items-center gap-2">
              <Plus className="w-4 h-4" /> Add Transaction
            </button>
          </div>
        }
      />

      {/* Filters */}
      <Card className="mb-6" padding="sm">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              type="text"
              placeholder="Search transactions..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="input-field pl-10"
            />
          </div>
          <div className="flex items-center gap-2">
            {['', 'income', 'expense'].map((t) => (
              <button
                key={t}
                onClick={() => { setTypeFilter(t); setPage(1); }}
                className={`px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                  typeFilter === t ? 'bg-primary text-white' : 'bg-card border border-card-border text-text-secondary hover:text-text-primary'
                }`}
              >
                {t === '' ? 'All' : t === 'income' ? 'Income' : 'Expenses'}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Transaction List */}
      {loading ? (
        <Card>
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 py-3">
                <div className="skeleton w-10 h-10 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <div className="skeleton h-4 w-40" />
                  <div className="skeleton h-3 w-24" />
                </div>
                <div className="skeleton h-5 w-20" />
              </div>
            ))}
          </div>
        </Card>
      ) : transactions.data.length === 0 ? (
        <EmptyState
          icon={ArrowUpRight}
          title="No transactions yet"
          description="Start by adding your income and expenses to track your financial activity."
          action={{ label: 'Add Transaction', onClick: openAdd }}
        />
      ) : (
        <Card padding="none">
          <div className="divide-y divide-card-border">
            {transactions.data.map((tx) => (
              <motion.div
                key={tx.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center justify-between px-5 py-4 hover:bg-card-hover transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      tx.type === 'income' ? 'bg-positive/10' : 'bg-negative/10'
                    }`}
                  >
                    {tx.type === 'income' ? (
                      <ArrowUpRight className="w-5 h-5 text-positive" />
                    ) : (
                      <ArrowDownRight className="w-5 h-5 text-negative" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-text-primary">{tx.description}</p>
                    <p className="text-xs text-text-muted">
                      {tx.category} · {formatDate(tx.date, 'short')}
                      {tx.payment_method && ` · ${tx.payment_method}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span
                    className={`text-sm font-semibold ${
                      tx.type === 'income' ? 'text-positive' : 'text-negative'
                    }`}
                  >
                    {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEdit(tx)}
                      className="p-1.5 rounded-lg hover:bg-card text-text-muted hover:text-text-secondary transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(tx)}
                      className="p-1.5 rounded-lg hover:bg-negative/10 text-text-muted hover:text-negative transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Pagination */}
          {transactions.total_pages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-card-border">
              <p className="text-xs text-text-muted">
                Showing {(page - 1) * 15 + 1}–{Math.min(page * 15, transactions.total)} of {transactions.total}
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-1.5 rounded-lg hover:bg-card text-text-muted disabled:opacity-30"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs text-text-secondary px-2">
                  Page {page} of {transactions.total_pages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(transactions.total_pages, p + 1))}
                  disabled={page === transactions.total_pages}
                  className="p-1.5 rounded-lg hover:bg-card text-text-muted disabled:opacity-30"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Add/Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingTxn ? 'Edit Transaction' : 'Add Transaction'}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Type Toggle */}
          <div className="flex bg-background rounded-xl p-1">
            {(['income', 'expense'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => { setValue('type', t); setValue('category', ''); }}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  txnType === t
                    ? t === 'income' ? 'bg-positive/20 text-positive' : 'bg-negative/20 text-negative'
                    : 'text-text-secondary'
                }`}
              >
                {t === 'income' ? '↑ Income' : '↓ Expense'}
              </button>
            ))}
          </div>

          <div>
            <label className="label-text">Amount (₹)</label>
            <input
              type="number"
              step="0.01"
              className="input-field"
              placeholder="0.00"
              {...register('amount', { valueAsNumber: true })}
            />
            {errors.amount && <p className="text-xs text-negative mt-1">{errors.amount.message}</p>}
          </div>

          <div>
            <label className="label-text">Category</label>
            <select className="select-field" {...register('category')}>
              <option value="">Select category</option>
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            {errors.category && <p className="text-xs text-negative mt-1">{errors.category.message}</p>}
          </div>

          <div>
            <label className="label-text">Description</label>
            <input
              type="text"
              className="input-field"
              placeholder="What is this transaction for?"
              {...register('description')}
            />
            {errors.description && <p className="text-xs text-negative mt-1">{errors.description.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-text">Date</label>
              <input type="date" className="input-field" {...register('date')} />
              {errors.date && <p className="text-xs text-negative mt-1">{errors.date.message}</p>}
            </div>
            <div>
              <label className="label-text">Payment Method</label>
              <select className="select-field" {...register('payment_method')}>
                <option value="">Select method</option>
                {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn-primary flex items-center gap-2" disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {editingTxn ? 'Update' : 'Add Transaction'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Import Preview Modal */}
      <Modal
        open={importModalOpen}
        onClose={() => { setImportModalOpen(false); setCsvPreview([]); }}
        title="Import Transactions"
        size="lg"
      >
        <p className="text-sm text-text-secondary mb-4">
          Preview: {csvPreview.length} transaction(s) found in the CSV file.
        </p>
        <div className="max-h-[300px] overflow-y-auto border border-card-border rounded-xl mb-4">
          <table className="w-full text-sm">
            <thead className="bg-background sticky top-0">
              <tr className="text-left text-text-muted text-xs">
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Description</th>
                <th className="px-3 py-2">Category</th>
                <th className="px-3 py-2">Amount</th>
                <th className="px-3 py-2">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-card-border">
              {csvPreview.slice(0, 50).map((row, i) => (
                <tr key={i} className="text-text-primary">
                  <td className="px-3 py-2">
                    <Badge variant={row.type === 'income' ? 'positive' : 'negative'}>{row.type}</Badge>
                  </td>
                  <td className="px-3 py-2">{row.description}</td>
                  <td className="px-3 py-2">{row.category}</td>
                  <td className="px-3 py-2">{formatCurrency(row.amount)}</td>
                  <td className="px-3 py-2">{row.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex justify-end gap-3">
          <button onClick={() => { setImportModalOpen(false); setCsvPreview([]); }} className="btn-secondary">
            Cancel
          </button>
          <button onClick={importCSV} className="btn-primary flex items-center gap-2" disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Import {csvPreview.length} Transactions
          </button>
        </div>
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={onDelete}
        title="Delete Transaction"
        description={`Are you sure you want to delete "${deleteTarget?.description}"? This action cannot be undone.`}
        confirmLabel="Delete"
        danger
      />
    </div>
  );
}
