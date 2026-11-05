import { clsx, type ClassValue } from 'clsx';

/** Merge class names with clsx */
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}

/** Format a number as currency (INR by default) */
export function formatCurrency(
  amount: number,
  currency = 'INR',
  locale = 'en-IN'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

/** Format a number as compact (1K, 1L, 1Cr) */
export function formatCompact(amount: number): string {
  if (Math.abs(amount) >= 1_00_00_000) {
    return `₹${(amount / 1_00_00_000).toFixed(2)}Cr`;
  }
  if (Math.abs(amount) >= 1_00_000) {
    return `₹${(amount / 1_00_000).toFixed(2)}L`;
  }
  if (Math.abs(amount) >= 1_000) {
    return `₹${(amount / 1_000).toFixed(1)}K`;
  }
  return `₹${amount.toFixed(0)}`;
}

/** Format a percentage */
export function formatPercent(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}

/** Format a date string */
export function formatDate(
  date: string | Date,
  format: 'short' | 'medium' | 'long' = 'medium'
): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const options: Intl.DateTimeFormatOptions =
    format === 'short'
      ? { day: 'numeric', month: 'short' }
      : format === 'medium'
        ? { day: 'numeric', month: 'short', year: 'numeric' }
        : { day: 'numeric', month: 'long', year: 'numeric' };
  return d.toLocaleDateString('en-IN', options);
}

/** Get today's date as ISO string (YYYY-MM-DD) */
export function getToday(): string {
  return new Date().toISOString().split('T')[0];
}

/** Get current month as YYYY-MM */
export function getCurrentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** Get month start and end dates */
export function getMonthRange(yearMonth: string): { start: string; end: string } {
  const [year, month] = yearMonth.split('-').map(Number);
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0);
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  };
}

/** Calculate months between two dates */
export function monthsBetween(from: string | Date, to: string | Date): number {
  const d1 = typeof from === 'string' ? new Date(from) : from;
  const d2 = typeof to === 'string' ? new Date(to) : to;
  return (
    (d2.getFullYear() - d1.getFullYear()) * 12 + (d2.getMonth() - d1.getMonth())
  );
}

/** Debounce a function */
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout>;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), delay);
  };
}

/** Generate a random color from category */
export function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    Salary: '#10B981',
    Freelance: '#06B6D4',
    Business: '#8B5CF6',
    Investments: '#F59E0B',
    Allowance: '#EC4899',
    'Other Income': '#6366F1',
    Food: '#EF4444',
    Housing: '#3B82F6',
    Transport: '#F97316',
    Education: '#8B5CF6',
    Healthcare: '#14B8A6',
    Shopping: '#EC4899',
    Entertainment: '#A855F7',
    Utilities: '#6366F1',
    Subscriptions: '#06B6D4',
    'Other Expenses': '#71717A',
  };
  return colors[category] || '#8B5CF6';
}

/** Safely parse a number, returning 0 for invalid inputs */
export function safeNumber(value: unknown): number {
  const num = Number(value);
  return isNaN(num) || !isFinite(num) ? 0 : num;
}

/** Truncate text with ellipsis */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '…';
}
