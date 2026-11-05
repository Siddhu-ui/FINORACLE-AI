import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  GraduationCap,
  Calculator,
  BookOpen,
  TrendingUp,
  ShieldAlert,
  Coins,
  CheckCircle2,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { Card, PageHeader } from '@/components/ui';
import { formatCurrency, formatPercent } from '@/utils';

export default function EducationPage() {
  // SIP Calculator State
  const [sipMonthly, setSipMonthly] = useState(10000);
  const [sipRate, setSipRate] = useState(12);
  const [sipYears, setSipYears] = useState(15);

  // Emergency Fund Calculator State
  const [monthlyNeeds, setMonthlyNeeds] = useState(45000);
  const [monthsCushion, setMonthsCushion] = useState(6);

  // Rule of 72 State
  const [doublingRate, setDoublingRate] = useState(12);

  // SIP Computation: M = P * [ (1 + i)^n - 1 ] * (1 + i) / i
  const i = sipRate / 12 / 100;
  const n = sipYears * 12;
  const sipTotalInvested = sipMonthly * n;
  const sipFutureValue =
    i > 0
      ? sipMonthly * ((Math.pow(1 + i, n) - 1) / i) * (1 + i)
      : sipTotalInvested;
  const sipWealthGain = sipFutureValue - sipTotalInvested;

  // Emergency Fund Needed
  const emergencyFundTarget = monthlyNeeds * monthsCushion;

  // Rule of 72 Doubling Years
  const doublingYears = doublingRate > 0 ? (72 / doublingRate).toFixed(1) : '∞';

  return (
    <div className="space-y-8">
      <PageHeader
        title="Financial Literacy & Simulation Lab"
        subtitle="Empower your decisions with foundational personal finance principles and interactive models"
      />

      {/* Interactive Calculators Section */}
      <div>
        <h3 className="text-base font-bold text-text-primary mb-4 flex items-center gap-2">
          <Calculator className="w-5 h-5 text-primary" /> Financial Simulation Tools
        </h3>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* SIP Wealth Compounder */}
          <Card className="p-5 flex flex-col justify-between border-t-4 border-t-primary">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Coins className="w-4 h-4 text-primary" />
                <h4 className="font-bold text-text-primary text-sm">SIP Wealth Compounder</h4>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <div className="flex justify-between text-text-muted mb-1">
                    <span>Monthly Investment:</span>
                    <strong className="text-text-primary">{formatCurrency(sipMonthly)}</strong>
                  </div>
                  <input
                    type="range"
                    min="1000"
                    max="100000"
                    step="1000"
                    value={sipMonthly}
                    onChange={(e) => setSipMonthly(Number(e.target.value))}
                    className="w-full accent-primary"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-text-muted mb-1">
                    <span>Expected Return:</span>
                    <strong className="text-text-primary">{sipRate}% p.a.</strong>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="20"
                    step="0.5"
                    value={sipRate}
                    onChange={(e) => setSipRate(Number(e.target.value))}
                    className="w-full accent-primary"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-text-muted mb-1">
                    <span>Time Horizon:</span>
                    <strong className="text-text-primary">{sipYears} Years</strong>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="30"
                    step="1"
                    value={sipYears}
                    onChange={(e) => setSipYears(Number(e.target.value))}
                    className="w-full accent-primary"
                  />
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-card-border bg-background-secondary p-3 rounded-xl space-y-1.5 text-xs">
              <div className="flex justify-between text-text-muted">
                <span>Total Invested:</span>
                <span className="font-semibold text-text-primary">{formatCurrency(sipTotalInvested)}</span>
              </div>
              <div className="flex justify-between text-text-muted">
                <span>Wealth Created:</span>
                <span className="font-semibold text-positive">+{formatCurrency(sipWealthGain)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold pt-1 border-t border-card-border/50">
                <span className="text-text-primary">Maturity Value:</span>
                <span className="text-primary">{formatCurrency(sipFutureValue)}</span>
              </div>
            </div>
          </Card>

          {/* Emergency Fund Sizer */}
          <Card className="p-5 flex flex-col justify-between border-t-4 border-t-positive">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <ShieldAlert className="w-4 h-4 text-positive" />
                <h4 className="font-bold text-text-primary text-sm">Emergency Fund Sizer</h4>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <div className="flex justify-between text-text-muted mb-1">
                    <span>Essential Monthly Outflows:</span>
                    <strong className="text-text-primary">{formatCurrency(monthlyNeeds)}</strong>
                  </div>
                  <input
                    type="range"
                    min="10000"
                    max="200000"
                    step="5000"
                    value={monthlyNeeds}
                    onChange={(e) => setMonthlyNeeds(Number(e.target.value))}
                    className="w-full accent-positive"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-text-muted mb-1">
                    <span>Months of Buffer:</span>
                    <strong className="text-text-primary">{monthsCushion} Months</strong>
                  </div>
                  <input
                    type="range"
                    min="3"
                    max="12"
                    step="1"
                    value={monthsCushion}
                    onChange={(e) => setMonthsCushion(Number(e.target.value))}
                    className="w-full accent-positive"
                  />
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-card-border bg-background-secondary p-3 rounded-xl space-y-1 text-xs">
              <span className="text-text-muted block">Recommended Emergency Target:</span>
              <p className="text-2xl font-bold text-positive">{formatCurrency(emergencyFundTarget)}</p>
              <p className="text-[11px] text-text-secondary">
                Keep in liquid savings accounts & instant fixed deposits.
              </p>
            </div>
          </Card>

          {/* Rule of 72 */}
          <Card className="p-5 flex flex-col justify-between border-t-4 border-t-secondary">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-4 h-4 text-secondary" />
                <h4 className="font-bold text-text-primary text-sm">The Rule of 72</h4>
              </div>

              <p className="text-xs text-text-secondary mb-4">
                A simple mental math shortcut to estimate how many years it takes for your investment to double at a given annual interest rate.
              </p>

              <div className="space-y-3 text-xs">
                <div>
                  <div className="flex justify-between text-text-muted mb-1">
                    <span>Annual Return Rate:</span>
                    <strong className="text-text-primary">{doublingRate}% p.a.</strong>
                  </div>
                  <input
                    type="range"
                    min="4"
                    max="24"
                    step="1"
                    value={doublingRate}
                    onChange={(e) => setDoublingRate(Number(e.target.value))}
                    className="w-full accent-secondary"
                  />
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-card-border bg-background-secondary p-3 rounded-xl space-y-1 text-xs">
              <span className="text-text-muted block">Time to 2x (Double) Capital:</span>
              <p className="text-2xl font-bold text-secondary">{doublingYears} Years</p>
              <p className="text-[11px] text-text-secondary">
                Formula: 72 ÷ Annual Return Rate = Years
              </p>
            </div>
          </Card>
        </div>
      </div>

      {/* Foundational Lessons Grid */}
      <div>
        <h3 className="text-base font-bold text-text-primary mb-4 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-primary" /> Key Financial Frameworks
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Card className="p-5 space-y-2">
            <h4 className="font-bold text-text-primary text-sm flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" /> The 50/30/20 Cash Allocation Rule
            </h4>
            <p className="text-xs text-text-secondary leading-relaxed">
              Allocate 50% of net post-tax income to survival essentials (rent, groceries, basic utilities), 30% to discretionary lifestyle desires (dining, hobbies, subscriptions), and preserve at least 20% strictly for savings and accelerated debt reduction.
            </p>
          </Card>

          <Card className="p-5 space-y-2">
            <h4 className="font-bold text-text-primary text-sm flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-positive" /> Debt Avalanche vs Snowball
            </h4>
            <p className="text-xs text-text-secondary leading-relaxed">
              <strong>Debt Avalanche</strong> targets high-interest liabilities first (credit cards, personal loans) to mathematically minimize total interest paid. <strong>Debt Snowball</strong> knocks out smallest balances first to generate immediate psychological wins.
            </p>
          </Card>

          <Card className="p-5 space-y-2">
            <h4 className="font-bold text-text-primary text-sm flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-accent" /> Opportunity Cost in Major Purchases
            </h4>
            <p className="text-xs text-text-secondary leading-relaxed">
              Every ₹1,00,000 spent today on a depreciating luxury item is not just ₹1,00,000 lost—it is also the lost future wealth that ₹1,00,000 could have generated compounded at 12% over 15 years (approx. ₹5,47,000). Always factor in opportunity cost before non-essential outlays.
            </p>
          </Card>

          <Card className="p-5 space-y-2">
            <h4 className="font-bold text-text-primary text-sm flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-secondary" /> Pure Term Life & Health Insurance
            </h4>
            <p className="text-xs text-text-secondary leading-relaxed">
              Never mix investment with insurance (avoid traditional ULIPs and endowment plans). Instead, buy a high-cover pure Term Life policy and comprehensive Family Health Insurance. Invest the remaining surplus directly in low-cost index funds.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
