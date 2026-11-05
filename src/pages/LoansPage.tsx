import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Calculator,
  Percent,
  Calendar,
  DollarSign,
  TrendingDown,
  PieChart as PieIcon,
  Table as TableIcon,
  Sparkles,
  Zap,
  Info,
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from 'recharts';
import { Card, PageHeader, Badge } from '@/components/ui';
import { formatCurrency, formatPercent } from '@/utils';
import type { AmortizationEntry } from '@/types';

const loanSchema = z.object({
  principal: z.number().positive('Principal must be positive'),
  annual_rate: z.number().min(0.1, 'Rate must be > 0.1%').max(100, 'Rate must be reasonable'),
  tenure_years: z.number().min(0.5, 'Tenure must be at least 6 months').max(40, 'Max tenure 40 years'),
  processing_fee_percent: z.number().min(0).max(10).default(0.5),
  extra_monthly_prepayment: z.number().min(0).default(0),
});

type LoanFormValues = z.infer<typeof loanSchema>;

const tooltipStyle = {
  contentStyle: {
    backgroundColor: '#171725',
    border: '1px solid #2A2A3C',
    borderRadius: '12px',
    fontSize: '12px',
    color: '#F8FAFC',
  },
};

export default function LoansPage() {
  const [activeTab, setActiveTab] = useState<'schedule' | 'prepayment'>('schedule');

  const {
    register,
    watch,
    formState: { errors },
  } = useForm<LoanFormValues>({
    resolver: zodResolver(loanSchema),
    defaultValues: {
      principal: 2500000,
      annual_rate: 8.5,
      tenure_years: 15,
      processing_fee_percent: 0.5,
      extra_monthly_prepayment: 0,
    },
  });

  const values = watch();
  const principal = Number(values.principal) || 0;
  const annualRate = Number(values.annual_rate) || 0;
  const tenureYears = Number(values.tenure_years) || 0;
  const processingFeePercent = Number(values.processing_fee_percent) || 0;
  const extraPrepayment = Number(values.extra_monthly_prepayment) || 0;

  // Calculation Engine
  const calculation = useMemo(() => {
    if (principal <= 0 || annualRate <= 0 || tenureYears <= 0) {
      return null;
    }

    const n = Math.round(tenureYears * 12);
    const r = annualRate / 12 / 100;

    // Standard EMI formula: P * r * (1 + r)^n / ((1 + r)^n - 1)
    const factor = Math.pow(1 + r, n);
    const emi = (principal * r * factor) / (factor - 1);

    const processingFee = (principal * processingFeePercent) / 100;
    const totalStandardPayment = emi * n;
    const totalStandardInterest = totalStandardPayment - principal;

    // Build standard amortization
    let balance = principal;
    const amortization: AmortizationEntry[] = [];
    const yearlyTrend: { year: number; balance: number; interestPaid: number; principalPaid: number }[] = [];

    let cumInterest = 0;
    let cumPrincipal = 0;

    for (let m = 1; m <= n; m++) {
      const interestForMonth = balance * r;
      const principalForMonth = emi - interestForMonth;
      balance = Math.max(0, balance - principalForMonth);

      cumInterest += interestForMonth;
      cumPrincipal += principalForMonth;

      amortization.push({
        month: m,
        emi: Math.round(emi),
        principal: Math.round(principalForMonth),
        interest: Math.round(interestForMonth),
        balance: Math.round(balance),
      });

      if (m % 12 === 0 || m === n) {
        yearlyTrend.push({
          year: Math.ceil(m / 12),
          balance: Math.round(balance),
          interestPaid: Math.round(cumInterest),
          principalPaid: Math.round(cumPrincipal),
        });
      }
    }

    // Prepayment simulation
    let prepayBalance = principal;
    let prepayMonths = 0;
    let prepayTotalInterest = 0;
    const prepayEmi = emi + extraPrepayment;

    if (extraPrepayment > 0) {
      while (prepayBalance > 0 && prepayMonths < n) {
        prepayMonths++;
        const interest = prepayBalance * r;
        prepayTotalInterest += interest;
        const princ = Math.min(prepayBalance, prepayEmi - interest);
        prepayBalance = Math.max(0, prepayBalance - princ);
      }
    } else {
      prepayMonths = n;
      prepayTotalInterest = totalStandardInterest;
    }

    const interestSaved = Math.max(0, totalStandardInterest - prepayTotalInterest);
    const monthsSaved = Math.max(0, n - prepayMonths);

    return {
      emi: Math.round(emi),
      totalInterest: Math.round(totalStandardInterest),
      totalRepayment: Math.round(totalStandardPayment),
      processingFee: Math.round(processingFee),
      effectiveCost: Math.round(totalStandardPayment + processingFee),
      amortization,
      yearlyTrend,
      prepay: {
        months: prepayMonths,
        totalInterest: Math.round(prepayTotalInterest),
        interestSaved: Math.round(interestSaved),
        monthsSaved,
      },
    };
  }, [principal, annualRate, tenureYears, processingFeePercent, extraPrepayment]);

  const pieData = calculation
    ? [
        { name: 'Principal Amount', value: principal, color: '#6366F1' },
        { name: 'Total Interest', value: calculation.totalInterest, color: '#EC4899' },
      ]
    : [];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Loan Analyzer & Simulator"
        subtitle="Compute exact EMIs, inspect full amortization schedules, and evaluate accelerated prepayment savings"
      />

      {/* Main Grid: Controls on Left, Metrics & Charts on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Parameter Panel (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <Card className="p-6">
            <h3 className="text-base font-bold text-text-primary mb-4 flex items-center gap-2">
              <Calculator className="w-5 h-5 text-primary" /> Loan Parameters
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1.5 uppercase">
                  Loan Principal Amount (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-sm font-semibold">₹</span>
                  <input
                    type="number"
                    step="10000"
                    {...register('principal', { valueAsNumber: true })}
                    className="input-field w-full pl-8 font-semibold text-base"
                  />
                </div>
                {errors.principal && <p className="text-xs text-negative mt-1">{errors.principal.message}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1.5 uppercase">
                    Interest Rate (% p.a.)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.05"
                      {...register('annual_rate', { valueAsNumber: true })}
                      className="input-field w-full pr-8"
                    />
                    <Percent className="w-4 h-4 text-text-muted absolute right-3 top-1/2 -translate-y-1/2" />
                  </div>
                  {errors.annual_rate && <p className="text-xs text-negative mt-1">{errors.annual_rate.message}</p>}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1.5 uppercase">
                    Tenure (Years)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="1"
                      {...register('tenure_years', { valueAsNumber: true })}
                      className="input-field w-full pr-8"
                    />
                    <Calendar className="w-4 h-4 text-text-muted absolute right-3 top-1/2 -translate-y-1/2" />
                  </div>
                  {errors.tenure_years && <p className="text-xs text-negative mt-1">{errors.tenure_years.message}</p>}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1.5 uppercase">
                  Processing Fee (% of Loan)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    {...register('processing_fee_percent', { valueAsNumber: true })}
                    className="input-field w-full pr-8"
                  />
                  <Percent className="w-4 h-4 text-text-muted absolute right-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              {/* Prepayment Accelerator Box */}
              <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 space-y-2 mt-4">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-primary" />
                  <span className="text-xs font-bold text-primary uppercase tracking-wider">
                    Prepayment Accelerator
                  </span>
                </div>
                <p className="text-xs text-text-secondary">
                  Simulate adding an extra monthly payment towards your principal:
                </p>
                <div className="relative mt-2">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-xs">₹</span>
                  <input
                    type="number"
                    step="1000"
                    {...register('extra_monthly_prepayment', { valueAsNumber: true })}
                    placeholder="Extra amount / month"
                    className="input-field w-full pl-7 text-sm"
                  />
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Output Panel (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {calculation && (
            <>
              {/* Key Results Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="p-4 border-l-4 border-l-primary">
                  <span className="text-xs font-medium text-text-muted uppercase">Monthly EMI</span>
                  <p className="text-2xl font-bold text-primary mt-1">
                    {formatCurrency(calculation.emi)}
                  </p>
                  <p className="text-[11px] text-text-muted mt-0.5">Fixed monthly obligation</p>
                </Card>

                <Card className="p-4 border-l-4 border-l-secondary">
                  <span className="text-xs font-medium text-text-muted uppercase">Total Interest</span>
                  <p className="text-2xl font-bold text-secondary mt-1">
                    {formatCurrency(calculation.totalInterest)}
                  </p>
                  <p className="text-[11px] text-text-muted mt-0.5">
                    {formatPercent((calculation.totalInterest / principal) * 100)} of principal
                  </p>
                </Card>

                <Card className="p-4 border-l-4 border-l-accent">
                  <span className="text-xs font-medium text-text-muted uppercase">Total Repayment</span>
                  <p className="text-2xl font-bold text-text-primary mt-1">
                    {formatCurrency(calculation.totalRepayment)}
                  </p>
                  <p className="text-[11px] text-text-muted mt-0.5">Principal + Interest</p>
                </Card>
              </div>

              {/* Prepayment Impact Banner (if active) */}
              {extraPrepayment > 0 && calculation.prepay.interestSaved > 0 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-gradient-to-r from-positive/10 to-primary/10 border border-positive/30 rounded-2xl p-4 flex items-center justify-between gap-4"
                >
                  <div className="space-y-0.5">
                    <h4 className="text-sm font-bold text-positive flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4" /> Prepayment Impact
                    </h4>
                    <p className="text-xs text-text-secondary">
                      By paying an extra <strong>{formatCurrency(extraPrepayment)}/month</strong>, you finish{' '}
                      <strong>{Math.floor(calculation.prepay.monthsSaved / 12)} years {calculation.prepay.monthsSaved % 12} months</strong> earlier!
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="text-xs text-text-muted block">Total Interest Saved</span>
                    <span className="text-lg font-bold text-positive">
                      {formatCurrency(calculation.prepay.interestSaved)}
                    </span>
                  </div>
                </motion.div>
              )}

              {/* Visual Breakdown: Pie & Area Chart */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Card className="p-4">
                  <h4 className="text-xs font-bold text-text-muted uppercase mb-2 flex items-center gap-1.5">
                    <PieIcon className="w-4 h-4 text-primary" /> Principal vs Interest
                  </h4>
                  <div className="h-[180px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={75}
                          paddingAngle={3}
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <RechartsTooltip
                          formatter={(v: number) => formatCurrency(v)}
                          {...tooltipStyle}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex justify-around text-xs mt-1 pt-2 border-t border-card-border">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                      <span className="text-text-muted">Principal ({formatPercent((principal / calculation.totalRepayment) * 100)})</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-secondary" />
                      <span className="text-text-muted">Interest ({formatPercent((calculation.totalInterest / calculation.totalRepayment) * 100)})</span>
                    </div>
                  </div>
                </Card>

                <Card className="p-4">
                  <h4 className="text-xs font-bold text-text-muted uppercase mb-2 flex items-center gap-1.5">
                    <TrendingDown className="w-4 h-4 text-secondary" /> Balance Payoff Curve
                  </h4>
                  <div className="h-[180px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={calculation.yearlyTrend}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#2A2A3C" opacity={0.5} />
                        <XAxis dataKey="year" stroke="#A1A1AA" tick={{ fontSize: 10 }} unit="y" />
                        <YAxis
                          stroke="#A1A1AA"
                          tick={{ fontSize: 10 }}
                          tickFormatter={(v) => `₹${(v / 100000).toFixed(0)}L`}
                        />
                        <RechartsTooltip
                          formatter={(v: number) => formatCurrency(v)}
                          labelFormatter={(l) => `Year ${l}`}
                          {...tooltipStyle}
                        />
                        <Area
                          type="monotone"
                          dataKey="balance"
                          stroke="#6366F1"
                          fill="url(#primaryGrad)"
                          fillOpacity={0.2}
                          name="Remaining Balance"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Amortization Schedule Table */}
      {calculation && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TableIcon className="w-5 h-5 text-primary" />
              <h3 className="text-base font-bold text-text-primary">Amortization Schedule (First 24 Months)</h3>
            </div>
            <span className="text-xs text-text-muted">
              Displaying initial 2 years of amortization breakdown
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-background-secondary text-text-muted uppercase font-semibold">
                <tr>
                  <th className="p-3 rounded-l-lg">Month</th>
                  <th className="p-3">EMI Paid</th>
                  <th className="p-3">Principal</th>
                  <th className="p-3">Interest</th>
                  <th className="p-3 rounded-r-lg">Remaining Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-card-border/60">
                {calculation.amortization.slice(0, 24).map((row) => (
                  <tr key={row.month} className="hover:bg-card/50 transition-colors">
                    <td className="p-3 font-semibold text-text-primary">Month {row.month}</td>
                    <td className="p-3 font-mono">{formatCurrency(row.emi)}</td>
                    <td className="p-3 font-mono text-positive">{formatCurrency(row.principal)}</td>
                    <td className="p-3 font-mono text-negative">{formatCurrency(row.interest)}</td>
                    <td className="p-3 font-mono font-medium text-text-primary">{formatCurrency(row.balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
