import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Search,
  Download,
  Upload,
  ArrowUpRight,
  ArrowDownRight,
  Edit2,
  Trash2,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Filter,
  TrendingUp,
  TrendingDown,
  Layers,
} from 'lucide-react';
import Papa from 'papaparse';
import { transactionService } from '@/services/supabase';
import {
  Card,
  ConfirmDialog,
  EmptyState,
  PageHeader,
  Badge,
} from '@/components/ui';
import {
  formatCurrency,
  formatDate,
  getToday,
} from '@/utils';
import type { Transaction, TransactionFormData, TransactionType, PaginatedResponse } from '@/types';
import { INCOME_CATEGORIES, EXPENSE_CATEGORIES } from '@/types';
import { AddTransactionModal } from '@/components/modals/AddTransactionModal';

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<PaginatedResponse<Transaction>>({
    data: [],
    total: 0,
    page: 1,
    per_page: 15,
    total_pages: 0,
  });
  const [loading, setLoading] = useState(true);

  // Modals
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTxn, setEditingTxn] = useState<Transaction | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Transaction | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [page, setPage] = useState(1);

  // CSV Import
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
        category: categoryFilter || undefined,
        search: search || undefined,
      });
      setTransactions(result);
    } catch (err) {
      console.error('Failed to load transactions:', err);
    } finally {
      setLoading(false);
    }
  }, [page, typeFilter, categoryFilter, search]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  function openAdd() {
    setEditingTxn(null);
    setModalOpen(true);
  }

  function openEdit(txn: Transaction) {
    setEditingTxn(txn);
    setModalOpen(true);
  }

  async function onDeleteConfirm() {
    if (!deleteTarget) return;
    try {
      await transactionService.delete(deleteTarget.id);
      setDeleteTarget(null);
      await loadTransactions();
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
            category: row.Category || row.category || 'Other',
            description: row.Description || row.description || 'Imported Entry',
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
      await loadTransactions();
    } catch (err) {
      console.error('Import error:', err);
    } finally {
      setSaving(false);
    }
  }

  // Summary of currently loaded transactions
  const totalInflows = transactions.data
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalOutflows = transactions.data
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const netBalance = totalInflows - totalOutflows;

  // Categories list for filter
  const allFilterCategories = Array.from(
    new Set([...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES])
  );

  return (
    <div className="space-y-6 min-w-0 w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-card-border/60">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-text-primary tracking-tight">
            Transactions Ledger
          </h1>
          <p className="text-xs sm:text-sm text-text-secondary mt-0.5">
            Verified manual and imported inflow & outflow ledger.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <label className="btn-secondary text-xs flex items-center gap-1.5 py-2 px-3 cursor-pointer">
            <Upload className="w-3.5 h-3.5" />
            <span>Import CSV</span>
            <input type="file" accept=".csv" className="hidden" onChange={handleCSVUpload} />
          </label>

          <button
            onClick={exportCSV}
            className="btn-secondary text-xs flex items-center gap-1.5 py-2 px-3"
            disabled={transactions.data.length === 0}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={openAdd}
            className="btn-primary text-xs flex items-center gap-1.5 py-2 px-3.5 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Add Transaction</span>
          </button>
        </div>
      </div>

      {/* Quick Summary Cards */}
      {transactions.data.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Card className="p-3.5 border-card-border flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-text-muted uppercase">Inflows (Page)</p>
              <p className="text-lg font-bold text-positive">{formatCurrency(totalInflows)}</p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-positive/10 text-positive flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </Card>

          <Card className="p-3.5 border-card-border flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-text-muted uppercase">Outflows (Page)</p>
              <p className="text-lg font-bold text-negative">{formatCurrency(totalOutflows)}</p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-negative/10 text-negative flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </div>
          </Card>

          <Card className="p-3.5 border-card-border flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-text-muted uppercase">Net Differential</p>
              <p className={`text-lg font-bold ${netBalance >= 0 ? 'text-positive' : 'text-negative'}`}>
                {netBalance >= 0 ? '+' : ''}{formatCurrency(netBalance)}
              </p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </Card>
        </div>
      )}

      {/* Filter Bar */}
      <Card className="p-3.5 border-card-border">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              type="text"
              placeholder="Search by title, merchant, or notes..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="input-field pl-9 text-xs"
            />
          </div>

          {/* Type Filter Buttons */}
          <div className="flex items-center gap-1.5 bg-card border border-card-border rounded-xl p-1 text-xs">
            {[
              { id: '', label: 'All' },
              { id: 'income', label: 'Inflows' },
              { id: 'expense', label: 'Outflows' },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  setTypeFilter(t.id);
                  setPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                  typeFilter === t.id
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Category Filter */}
          <div className="w-full sm:w-48">
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setPage(1);
              }}
              className="select-field text-xs"
            >
              <option value="">All Categories</option>
              {allFilterCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Transaction List */}
      {loading ? (
        <Card className="p-5">
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 py-2">
                <div className="skeleton w-9 h-9 rounded-xl shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="skeleton h-3.5 w-44" />
                  <div className="skeleton h-2.5 w-28" />
                </div>
                <div className="skeleton h-4 w-20 shrink-0" />
              </div>
            ))}
          </div>
        </Card>
      ) : transactions.data.length === 0 ? (
        <EmptyState
          icon={ArrowUpRight}
          title={search || typeFilter || categoryFilter ? 'No matching records found' : 'No transactions recorded yet'}
          description={
            search || typeFilter || categoryFilter
              ? 'Try adjusting your search query or filters to find specific entries.'
              : 'Add your first transaction manually or import a bank statement CSV to begin tracking real cash flow.'
          }
          action={{ label: 'Record Transaction', onClick: openAdd }}
        />
      ) : (
        <Card className="p-0 overflow-hidden border-card-border">
          <div className="divide-y divide-card-border/60">
            {transactions.data.map((tx) => (
              <motion.div
                key={tx.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center justify-between p-4 hover:bg-card-hover transition-colors"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      tx.type === 'income'
                        ? 'bg-positive/10 text-positive'
                        : 'bg-negative/10 text-negative'
                    }`}
                  >
                    {tx.type === 'income' ? (
                      <ArrowUpRight className="w-4 h-4" />
                    ) : (
                      <ArrowDownRight className="w-4 h-4" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-semibold text-text-primary truncate">
                      {tx.description}
                    </p>
                    <p className="text-[11px] text-text-muted flex items-center gap-1.5 flex-wrap">
                      <span className="font-medium text-text-secondary">{tx.category}</span>
                      <span>•</span>
                      <span>{formatDate(tx.date, 'short')}</span>
                      {tx.payment_method && (
                        <>
                          <span>•</span>
                          <span className="text-text-muted">{tx.payment_method}</span>
                        </>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0 pl-3">
                  <span
                    className={`text-xs sm:text-sm font-bold ${
                      tx.type === 'income' ? 'text-positive' : 'text-negative'
                    }`}
                  >
                    {tx.type === 'income' ? '+' : '-'}
                    {formatCurrency(tx.amount)}
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEdit(tx)}
                      className="p-1.5 rounded-lg hover:bg-card text-text-muted hover:text-text-primary transition-colors"
                      title="Edit transaction"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(tx)}
                      className="p-1.5 rounded-lg hover:bg-negative/10 text-text-muted hover:text-negative transition-colors"
                      title="Delete transaction"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Pagination Bar */}
          {transactions.total_pages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-card-border/60 bg-background-secondary/30">
              <p className="text-xs text-text-muted">
                Showing {(page - 1) * 15 + 1}–{Math.min(page * 15, transactions.total)} of{' '}
                {transactions.total} records
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

      {/* Add / Edit Transaction Modal */}
      <AddTransactionModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={() => loadTransactions()}
        initialTransaction={editingTxn}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Transaction"
        description={`Are you sure you want to delete "${deleteTarget?.description}" (${deleteTarget ? formatCurrency(deleteTarget.amount) : ''})? This will update your dashboard and budget figures immediately.`}
        confirmLabel="Delete Record"
        danger
        onConfirm={onDeleteConfirm}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}
