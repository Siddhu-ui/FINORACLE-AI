import React, { useCallback, useEffect, useState } from 'react';
import { Database, Loader2, Trash2 } from 'lucide-react';
import { sampleDataService, type SampleDataStatus } from '@/services/api';

interface SampleLedgerBannerProps {
  /** Called after sample data is loaded or cleared so the host page can refetch. */
  onChanged?: () => void;
  className?: string;
}

/**
 * Empty-state banner (0 transactions) with a one-click, clearly-tagged sample Indian ledger loader,
 * plus a "Sample data active" notice with a Clear button whenever sample rows exist.
 * Sample rows are flagged in SQLite (`is_sample = 1`) and never mixed with real data silently.
 */
export function SampleLedgerBanner({ onChanged, className = '' }: SampleLedgerBannerProps) {
  const [status, setStatus] = useState<SampleDataStatus | null>(null);
  const [busy, setBusy] = useState<'load' | 'clear' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setStatus(await sampleDataService.status());
    } catch {
      setStatus(null);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function run(kind: 'load' | 'clear') {
    setBusy(kind);
    setError(null);
    try {
      if (kind === 'load') await sampleDataService.load();
      else await sampleDataService.clear();
      await refresh();
      onChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sample data request failed.');
    } finally {
      setBusy(null);
    }
  }

  if (!status) return null;

  if (status.total_count === 0) {
    return (
      <div
        className={`rounded-2xl border border-primary/25 bg-card p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${className}`}
      >
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Database className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-text-primary">No transactions yet — try the AI with a sample ledger</p>
            <p className="text-xs text-text-secondary mt-0.5 max-w-2xl">
              Load 3 months of realistic Indian transactions (UPI, rent, SIP, Swiggy/Zomato, utilities) to see ML
              classification, expense forecasting, unusual-spending detection and insights instantly. Sample rows are
              clearly tagged and removable in one click.
            </p>
            {error && <p className="text-xs text-negative mt-1">{error}</p>}
          </div>
        </div>
        <button
          type="button"
          onClick={() => run('load')}
          disabled={busy !== null}
          className="btn-primary text-xs flex items-center justify-center gap-2 py-2.5 px-4 shrink-0"
        >
          {busy === 'load' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
          <span>Load Sample Indian Transactions (3 Months)</span>
        </button>
      </div>
    );
  }

  if (status.sample_count > 0) {
    return (
      <div
        className={`rounded-2xl border border-amber-200 bg-amber-50/70 px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${className}`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-amber-100 border border-amber-200 text-[10px] font-bold uppercase tracking-wide text-amber-800">
            Sample data
          </span>
          <p className="text-xs text-text-primary">
            {status.sample_count} demo transaction(s) are loaded for demonstration. Insights shown include this sample
            ledger{status.real_count > 0 ? ' and your real entries' : ''}.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {error && <span className="text-xs text-negative">{error}</span>}
          <button
            type="button"
            onClick={() => run('clear')}
            disabled={busy !== null}
            className="btn-secondary text-xs flex items-center gap-1.5 py-1.5 px-3"
          >
            {busy === 'clear' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
            <span>Clear Sample Data</span>
          </button>
        </div>
      </div>
    );
  }

  return null;
}
