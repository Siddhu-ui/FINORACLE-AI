import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Download,
  Edit2,
  Layers,
  Loader2,
  Plus,
  Search,
  Sparkles,
  Trash2,
  TrendingDown,
  TrendingUp,
  Upload,
} from 'lucide-react';
import Papa from 'papaparse';
import { transactionService } from '@/services/api';
import {
  aiApi,
  type BatchClassifyItemResult,
  type ClassifierEvaluationReport,
} from '@/services/aiApi';
import { Badge, Card, ConfirmDialog, EmptyState, Modal } from '@/components/ui';
import { formatCurrency, formatDate, getToday } from '@/utils';
import type { PaginatedResponse, Transaction, TransactionFormData, TransactionType } from '@/types';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '@/types';
import { AddTransactionModal } from '@/components/modals/AddTransactionModal';
import { SampleLedgerBanner } from '@/components/ai/SampleLedgerBanner';

function pct(v: number | null | undefined): string {
  return v === null || v === undefined ? '—' : `${(v * 100).toFixed(1)}%`;
}

function MlEvaluationCard({ report }: { report: ClassifierEvaluationReport | null }) {
  const [open, setOpen] = useState(false);
  const [showMatrix, setShowMatrix] = useState(false);

  return (
    <Card className="p-0 overflow-hidden border-card-border">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-card-hover transition-colors"
      >
        <span className="flex items-center gap-2 text-xs font-bold text-text-primary">
          <BarChart3 className="w-4 h-4 text-primary" />
          ML Model Evaluation (TF-IDF + Logistic Regression vs Rule Baseline)
        </span>
        <span className="flex items-center gap-2 shrink-0">
          {report && (
            <Badge variant="positive">
              Macro-F1 {pct(report.ml_model.macro_f1)} vs {pct(report.baseline_model.macro_f1)}
            </Badge>
          )}
          {open ? <ChevronUp className="w-4 h-4 text-text-muted" /> : <ChevronDown className="w-4 h-4 text-text-muted" />}
        </span>
      </button>

      {open && (
        <div className="px-4 pb-4 pt-1 space-y-4 border-t border-card-border/60">
          {!report ? (
            <p className="text-xs text-text-secondary pt-3">Loading evaluation from the backend benchmark...</p>
          ) : (
            <>
              <p className="text-[11px] text-text-secondary pt-3">
                Evaluated on a held-out split of the <strong>{report.dataset.name}</strong> benchmark (
                {report.dataset.total_samples} Indian transaction narrations, {report.dataset.num_categories} categories;
                source: <code className="font-mono">{report.dataset.source}</code>). This is seed benchmark data, never
                your personal ledger.
              </p>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="border-b border-card-border text-text-muted uppercase text-[10px]">
                      <th className="py-2 pr-3">Model</th>
                      <th className="py-2 px-2">Accuracy</th>
                      <th className="py-2 px-2">Precision</th>
                      <th className="py-2 px-2">Recall</th>
                      <th className="py-2 px-2">Macro-F1</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-card-border/60">
                    <tr className="font-semibold text-text-primary">
                      <td className="py-2.5 pr-3">{report.ml_model.name}</td>
                      <td className="py-2.5 px-2 text-primary">{pct(report.ml_model.accuracy)}</td>
                      <td className="py-2.5 px-2">{pct(report.ml_model.macro_precision)}</td>
                      <td className="py-2.5 px-2">{pct(report.ml_model.macro_recall)}</td>
                      <td className="py-2.5 px-2 text-primary">{pct(report.ml_model.macro_f1)}</td>
                    </tr>
                    <tr className="text-text-secondary">
                      <td className="py-2.5 pr-3">{report.baseline_model.name}</td>
                      <td className="py-2.5 px-2">{pct(report.baseline_model.accuracy)}</td>
                      <td className="py-2.5 px-2">{pct(report.baseline_model.macro_precision)}</td>
                      <td className="py-2.5 px-2">{pct(report.baseline_model.macro_recall)}</td>
                      <td className="py-2.5 px-2">{pct(report.baseline_model.macro_f1)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <p className="text-[11px] text-text-secondary">
                5-fold CV Macro-F1: {pct(report.ml_model.cv_5fold_macro_f1_mean)} ±{' '}
                {pct(report.ml_model.cv_5fold_macro_f1_std)} · Improvement over baseline:{' '}
                <strong className="text-primary">+{(report.improvement_over_baseline.macro_f1_delta * 100).toFixed(1)} pts</strong>{' '}
                Macro-F1
              </p>

              <div className="overflow-x-auto">
                <table className="w-full text-[11px] text-left border-collapse">
                  <thead>
                    <tr className="border-b border-card-border text-text-muted uppercase text-[10px]">
                      <th className="py-1.5 pr-3">Category</th>
                      <th className="py-1.5 px-2">Precision</th>
                      <th className="py-1.5 px-2">Recall</th>
                      <th className="py-1.5 px-2">F1</th>
                      <th className="py-1.5 px-2">Support</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-card-border/50">
                    {report.ml_model.per_class.map((row) => (
                      <tr key={row.category} className="text-text-primary">
                        <td className="py-1.5 pr-3 font-medium capitalize">{row.category}</td>
                        <td className="py-1.5 px-2">{pct(row.precision)}</td>
                        <td className="py-1.5 px-2">{pct(row.recall)}</td>
                        <td className="py-1.5 px-2">{pct(row.f1)}</td>
                        <td className="py-1.5 px-2 text-text-muted">{row.support}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div>
                <button
                  type="button"
                  onClick={() => setShowMatrix((v) => !v)}
                  className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                >
                  {showMatrix ? 'Hide Confusion Matrix' : 'View Confusion Matrix'}
                  {showMatrix ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
                {showMatrix && (
                  <div className="mt-3 overflow-x-auto">
                    <table className="text-[10px] border-collapse">
                      <thead>
                        <tr>
                          <th className="p-1.5 text-left text-text-muted">Actual \ Pred</th>
                          {report.dataset.categories.map((cat) => (
                            <th key={cat} className="p-1.5 text-center font-medium text-text-secondary capitalize">
                              {cat.slice(0, 5)}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {report.ml_model.confusion_matrix.map((row, r) => (
                          <tr key={report.dataset.categories[r]} className="border-t border-card-border">
                            <td className="p-1.5 font-semibold text-text-primary capitalize">
                              {report.dataset.categories[r]}
                            </td>
                            {row.map((val, c) => (
                              <td
                                key={c}
                                className={`p-1.5 text-center font-mono ${
                                  r === c && val > 0
                                    ? 'bg-primary/15 text-primary font-bold'
                                    : val > 0
                                      ? 'bg-amber-100 text-amber-800 font-semibold'
                                      : 'text-text-muted'
                                }`}
                              >
                                {val}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </Card>
  );
}

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

  // AI Classification & Feedback Loop state
  const [aiPredictions, setAiPredictions] = useState<Record<string, BatchClassifyItemResult>>({});
  const [classifying, setClassifying] = useState(false);
  const [aiMessage, setAiMessage] = useState<string | null>(null);
  const [pendingCorrection, setPendingCorrection] = useState<{
    tx: Transaction;
    newCategory: string;
    predicted?: string;
    confidence?: number;
  } | null>(null);
  const [evalReport, setEvalReport] = useState<ClassifierEvaluationReport | null>(null);
  const [showEval, setShowEval] = useState(false);

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

  // Per-transaction ML classification runs automatically for the visible page
  useEffect(() => {
    if (transactions.data.length > 0) {
      void handleRunAiClassification();
    } else {
      setAiPredictions({});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactions.data]);

  // ML model evaluation (TF-IDF + Logistic Regression vs rule baseline) loads once
  useEffect(() => {
    aiApi
      .getClassifierEvaluation()
      .then(setEvalReport)
      .catch(() => {});
  }, []);

  async function handleRunAiClassification() {
    if (transactions.data.length === 0) return;
    setClassifying(true);
    setAiMessage(null);
    try {
      const res = await aiApi.classifyBatch(
        transactions.data.map((t) => ({
          id: t.id,
          description: t.description,
          category: t.category,
        }))
      );
      const map: Record<string, BatchClassifyItemResult> = {};
      res.predictions.forEach((p) => {
        if (p.id) map[p.id] = p;
      });
      setAiPredictions(map);
      setAiMessage(
        `Classified ${res.predictions.length} transaction(s) with TF-IDF + Logistic Regression (${res.user_corrections_applied} saved correction(s) applied).`
      );
    } catch (err) {
      setAiMessage(
        err instanceof Error
          ? `AI classification unavailable: ${err.message}`
          : 'AI classification unavailable.'
      );
    } finally {
      setClassifying(false);
    }
  }

  async function handleConfirmCorrection() {
    if (!pendingCorrection) return;
    const { tx, newCategory, predicted, confidence } = pendingCorrection;
    try {
      await aiApi.correctCategory({
        transaction_id: tx.id,
        corrected_category: newCategory,
        predicted_category: predicted,
        confidence,
        confirmed: true,
      });
      setPendingCorrection(null);
      setAiMessage(
        `Saved correction for "${tx.description}" → ${newCategory}. Future classifications will prioritize your feedback.`
      );
      await loadTransactions();
    } catch {
      // Fallback to direct transaction update if AI feedback endpoint is unavailable
      await transactionService.update(tx.id, { category: newCategory });
      setPendingCorrection(null);
      await loadTransactions();
    }
  }

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

  const totalInflows = transactions.data
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalOutflows = transactions.data
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const netBalance = totalInflows - totalOutflows;
  const allFilterCategories = Array.from(new Set([...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES]));

  return (
    <div className="space-y-6 min-w-0 w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-card-border/60">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-text-primary tracking-tight">
            Transactions Ledger
          </h1>
          <p className="text-xs sm:text-sm text-text-secondary mt-0.5">
            Verified inflow & outflow ledger with Scikit-learn AI auto-classification and user feedback overrides.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleRunAiClassification}
            disabled={classifying || transactions.data.length === 0}
            className="btn-secondary text-xs flex items-center gap-1.5 py-2 px-3"
          >
            {classifying ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 text-primary" />
            )}
            <span>AI Auto-Classify Page</span>
          </button>

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

      <SampleLedgerBanner
        onChanged={() => {
          setPage(1);
          loadTransactions();
        }}
      />

      {/* ML classification status */}
      {(aiMessage || classifying) && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-card border border-card-border border-l-4 border-l-primary text-xs text-text-primary">
          {classifying ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-primary shrink-0" />
          ) : (
            <Sparkles className="w-3.5 h-3.5 text-primary shrink-0" />
          )}
          <span>{classifying ? 'Running TF-IDF + Logistic Regression on this page...' : aiMessage}</span>
        </div>
      )}

      {/* Collapsible ML Model Evaluation */}
      <MlEvaluationCard report={evalReport} />

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
                {netBalance >= 0 ? '+' : ''}
                {formatCurrency(netBalance)}
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
            {transactions.data.map((tx) => {
              const pred = aiPredictions[tx.id];
              const differs =
                pred && pred.display_category.toLowerCase() !== tx.category.toLowerCase();

              return (
                <motion.div
                  key={tx.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 hover:bg-card-hover transition-colors"
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
                    <div className="min-w-0 space-y-1">
                      <p className="text-xs sm:text-sm font-semibold text-text-primary truncate">
                        {tx.description}
                      </p>
                      <div className="text-[11px] text-text-muted flex items-center gap-1.5 flex-wrap">
                        <span className="font-medium text-text-secondary">{tx.category}</span>
                        <span>•</span>
                        <span>{formatDate(tx.date, 'short')}</span>
                        {tx.payment_method && (
                          <>
                            <span>•</span>
                            <span>{tx.payment_method}</span>
                          </>
                        )}
                        {tx.is_sample && (
                          <span className="px-1.5 py-0.5 rounded-full bg-amber-100 border border-amber-200 text-[9px] font-bold uppercase text-amber-800">
                            Sample
                          </span>
                        )}
                        {pred && (
                          <span
                            className="inline-flex items-center gap-1.5 ml-1"
                            title={`Predicted by ${pred.model} (${pred.source}); alternatives: ${pred.top_alternatives
                              .map((a) => `${a.display_category} ${Math.round(a.confidence * 100)}%`)
                              .join(', ')}`}
                          >
                            <Badge variant={differs ? 'warning' : 'positive'}>
                              ML: {pred.display_category} · {Math.round(pred.confidence * 100)}%
                            </Badge>
                            {differs && (
                              <button
                                type="button"
                                onClick={() =>
                                  setPendingCorrection({
                                    tx,
                                    newCategory: pred.display_category,
                                    predicted: pred.display_category,
                                    confidence: pred.confidence,
                                  })
                                }
                                className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
                              >
                                <Check className="w-3 h-3" /> Apply
                              </button>
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pl-12 sm:pl-3">
                    {pred && (
                      <select
                        aria-label={`Correct category for ${tx.description}`}
                        defaultValue=""
                        onChange={(e) => {
                          if (!e.target.value) return;
                          setPendingCorrection({
                            tx,
                            newCategory: e.target.value,
                            predicted: pred.display_category,
                            confidence: pred.confidence,
                          });
                          e.target.value = '';
                        }}
                        className="text-[11px] bg-[var(--bg)] border border-card-border rounded-lg px-2 py-1 text-text-secondary"
                      >
                        <option value="">Correct...</option>
                        {allFilterCategories.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    )}

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
              );
            })}
          </div>

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

      {/* CSV Import Preview Modal */}
      <Modal
        isOpen={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        title={`Import ${csvPreview.length} CSV Transaction(s)`}
      >
        <div className="space-y-4">
          <p className="text-xs text-text-secondary">
            Review the parsed rows below before inserting into your verified transaction ledger.
          </p>
          <div className="max-h-60 overflow-y-auto divide-y divide-card-border border border-card-border rounded-xl">
            {csvPreview.slice(0, 20).map((row, idx) => (
              <div key={idx} className="px-3 py-2 flex items-center justify-between text-xs">
                <div className="truncate">
                  <span className="font-semibold text-text-primary">{row.description}</span>
                  <span className="text-text-muted ml-2">
                    {row.category} · {row.date}
                  </span>
                </div>
                <span className={row.type === 'income' ? 'text-positive font-semibold' : 'text-negative font-semibold'}>
                  {formatCurrency(row.amount)}
                </span>
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setImportModalOpen(false)} className="btn-secondary text-xs">
              Cancel
            </button>
            <button onClick={importCSV} disabled={saving} className="btn-primary text-xs">
              {saving ? 'Importing...' : 'Confirm Import'}
            </button>
          </div>
        </div>
      </Modal>

      <AddTransactionModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={() => loadTransactions()}
        initialTransaction={editingTxn}
      />

      {/* Explicit User Confirmation Dialog for AI Category Correction */}
      <ConfirmDialog
        open={!!pendingCorrection}
        title="Confirm Category Update & ML Feedback"
        description={
          pendingCorrection
            ? `Update "${pendingCorrection.tx.description}" from "${pendingCorrection.tx.category}" to "${pendingCorrection.newCategory}"? This correction will also be saved to your personal ML feedback overrides.`
            : ''
        }
        confirmLabel="Confirm & Save Feedback"
        onConfirm={handleConfirmCorrection}
        onClose={() => setPendingCorrection(null)}
      />

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