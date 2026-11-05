import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, AlertCircle } from 'lucide-react';
import { cn } from '@/utils';

// ============================================================
// Card
// ============================================================
interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  onClick?: () => void;
}

export function Card({ children, className, hover = false, padding = 'md', onClick }: CardProps) {
  const paddings = { none: '', sm: 'p-4', md: 'p-5', lg: 'p-6' };
  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-card border border-card-border rounded-2xl',
        paddings[padding],
        hover && 'cursor-pointer transition-all duration-300 hover:bg-card-hover hover:border-border-hover hover:shadow-card-hover',
        onClick && 'cursor-pointer',
        className
      )}
    >
      {children}
    </div>
  );
}

// ============================================================
// Stat Card
// ============================================================
interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ElementType;
  trend?: { value: number; label: string };
  color?: 'primary' | 'positive' | 'negative' | 'warning' | 'secondary' | 'accent';
}

export function StatCard({ title, value, subtitle, icon: Icon, trend, color = 'primary' }: StatCardProps) {
  const colors: Record<string, { bg: string; text: string; border: string }> = {
    primary: { bg: 'bg-primary/10', text: 'text-primary', border: 'border-primary/20' },
    positive: { bg: 'bg-positive/10', text: 'text-positive', border: 'border-positive/20' },
    negative: { bg: 'bg-negative/10', text: 'text-negative', border: 'border-negative/20' },
    warning: { bg: 'bg-warning/10', text: 'text-warning', border: 'border-warning/20' },
    secondary: { bg: 'bg-secondary/10', text: 'text-secondary', border: 'border-secondary/20' },
    accent: { bg: 'bg-accent/10', text: 'text-accent', border: 'border-accent/20' },
  };
  const c = colors[color] || colors.primary;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn('bg-card border border-card-border rounded-2xl p-5')}
    >
      <div className="flex items-start justify-between mb-3">
        <p className="text-sm text-text-secondary font-medium">{title}</p>
        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', c.bg)}>
          <Icon className={cn('w-5 h-5', c.text)} />
        </div>
      </div>
      <p className="text-2xl font-bold text-text-primary mb-1">{value}</p>
      {subtitle && <p className="text-xs text-text-muted">{subtitle}</p>}
      {trend && (
        <div className="mt-2 flex items-center gap-1">
          <span className={cn('text-xs font-medium', trend.value >= 0 ? 'text-positive' : 'text-negative')}>
            {trend.value >= 0 ? '+' : ''}{trend.value}%
          </span>
          <span className="text-xs text-text-muted">{trend.label}</span>
        </div>
      )}
    </motion.div>
  );
}

// ============================================================
// Empty State
// ============================================================
interface EmptyStateProps {
  icon?: React.ElementType;
  title: string;
  description: string;
  action?: { label: string; onClick: () => void };
}

export function EmptyState({ icon: Icon = Sparkles, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-card border border-card-border flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-text-muted" />
      </div>
      <h3 className="text-lg font-semibold text-text-primary mb-2">{title}</h3>
      <p className="text-sm text-text-secondary max-w-md mb-6">{description}</p>
      {action && (
        <button onClick={action.onClick} className="btn-primary">
          {action.label}
        </button>
      )}
    </div>
  );
}

// ============================================================
// Loading Skeleton
// ============================================================
interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return <div className={cn('skeleton', className)} />;
}

export function StatCardSkeleton() {
  return (
    <div className="bg-card border border-card-border rounded-2xl p-5">
      <div className="flex items-start justify-between mb-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-10 w-10 rounded-xl" />
      </div>
      <Skeleton className="h-8 w-32 mb-1" />
      <Skeleton className="h-3 w-20" />
    </div>
  );
}

// ============================================================
// Modal
// ============================================================
interface ModalProps {
  open?: boolean;
  isOpen?: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function Modal({ open, isOpen, onClose, title, children, size = 'md' }: ModalProps) {
  const isVisible = open ?? isOpen ?? false;
  if (!isVisible) return null;

  const sizes = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className={cn(
          'relative w-full bg-background-secondary border border-card-border rounded-2xl shadow-card-hover max-h-[85vh] overflow-hidden flex flex-col',
          sizes[size]
        )}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-card-border">
          <h2 className="text-lg font-semibold text-text-primary">{title}</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-card text-text-muted hover:text-text-secondary transition-colors"
          >
            ✕
          </button>
        </div>
        <div className="px-6 py-4 overflow-y-auto">{children}</div>
      </motion.div>
    </div>
  );
}

// ============================================================
// Confirm Dialog
// ============================================================
interface ConfirmDialogProps {
  open?: boolean;
  isOpen?: boolean;
  onClose?: () => void;
  onCancel?: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description?: string;
  message?: string;
  confirmLabel?: string;
  confirmText?: string;
  danger?: boolean;
  variant?: string;
  loading?: boolean;
}

export function ConfirmDialog({
  open,
  isOpen,
  onClose,
  onCancel,
  onConfirm,
  title,
  description,
  message,
  confirmLabel,
  confirmText,
  danger,
  variant,
  loading = false,
}: ConfirmDialogProps) {
  const isVisible = open ?? isOpen ?? false;
  if (!isVisible) return null;

  const handleClose = onCancel || onClose || (() => {});
  const bodyText = description || message || 'Are you sure you want to proceed?';
  const label = confirmText || confirmLabel || 'Confirm';
  const isDanger = danger || variant === 'negative';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div onClick={handleClose} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative w-full max-w-md bg-background-secondary border border-card-border rounded-2xl p-6"
      >
        <h3 className="text-lg font-semibold text-text-primary mb-2">{title}</h3>
        <p className="text-sm text-text-secondary mb-6">{bodyText}</p>
        <div className="flex justify-end gap-3">
          <button onClick={handleClose} className="btn-secondary" disabled={loading}>
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={isDanger ? 'btn-danger' : 'btn-primary'}
            disabled={loading}
          >
            {loading ? 'Processing...' : label}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ============================================================
// Page Header
// ============================================================
interface PageHeaderProps {
  title: string;
  description?: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export function PageHeader({ title, description, subtitle, action }: PageHeaderProps) {
  const desc = description || subtitle;
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">{title}</h1>
        {desc && <p className="text-sm text-text-secondary mt-1">{desc}</p>}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}

// ============================================================
// Progress Bar
// ============================================================
interface ProgressBarProps {
  value: number;
  max?: number;
  color?: 'primary' | 'positive' | 'negative' | 'warning' | 'secondary' | 'accent' | string;
  size?: 'sm' | 'md';
  showLabel?: boolean;
}

export function ProgressBar({ value, max = 100, color = 'primary', size = 'md', showLabel = false }: ProgressBarProps) {
  const pct = Math.min((value / max) * 100, 100);
  
  const colors: Record<string, string> = {
    primary: 'bg-primary',
    positive: 'bg-positive',
    negative: 'bg-negative',
    warning: 'bg-warning',
    secondary: 'bg-secondary',
    accent: 'bg-accent',
  };

  const barColor = colors[color] || (color.startsWith('bg-') ? color : 'bg-primary');
  const heights = { sm: 'h-1.5', md: 'h-2.5' };

  return (
    <div className="w-full">
      <div className={cn('w-full bg-card-border rounded-full overflow-hidden', heights[size])}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className={cn('h-full rounded-full', barColor)}
        />
      </div>
      {showLabel && (
        <p className="text-xs text-text-muted mt-1 text-right">{pct.toFixed(0)}%</p>
      )}
    </div>
  );
}

// ============================================================
// Badge
// ============================================================
interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'positive' | 'negative' | 'warning' | 'primary' | 'secondary' | 'accent' | 'outline';
}

export function Badge({ children, variant = 'default' }: BadgeProps) {
  const variants: Record<string, string> = {
    default: 'bg-card text-text-secondary border-card-border',
    positive: 'bg-positive/10 text-positive border-positive/20',
    negative: 'bg-negative/10 text-negative border-negative/20',
    warning: 'bg-warning/10 text-warning border-warning/20',
    primary: 'bg-primary/10 text-primary border-primary/20',
    secondary: 'bg-secondary/10 text-secondary border-secondary/20',
    accent: 'bg-accent/10 text-accent border-accent/20',
    outline: 'bg-transparent text-text-secondary border-card-border',
  };

  return (
    <span className={cn('inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-lg border', variants[variant] || variants.default)}>
      {children}
    </span>
  );
}

// ============================================================
// Tooltip
// ============================================================
interface TooltipProps {
  content: string;
  children: React.ReactNode;
}

export function Tooltip({ content, children }: TooltipProps) {
  return (
    <div className="relative group">
      {children}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-card border border-card-border rounded-lg text-xs text-text-secondary whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-200 z-50">
        {content}
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-card-border" />
      </div>
    </div>
  );
}
