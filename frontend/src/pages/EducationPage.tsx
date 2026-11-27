import React, { useState } from 'react';
import {
  BookOpen,
  Calculator,
  ChevronDown,
  ChevronUp,
  Coins,
  ExternalLink,
  GraduationCap,
  Loader2,
  Search,
  ShieldAlert,
  TrendingUp,
} from 'lucide-react';
import { Badge, Card, PageHeader } from '@/components/ui';
import { aiApi, type RagQueryResponse } from '@/services/aiApi';
import { formatCurrency } from '@/utils';

interface AcademyModule {
  id: string;
  title: string;
  tag: string;
  authority: string;
  summary: string;
  keyPoints: string[];
  indianExample: string;
  ragPrompt: string;
}

const ACADEMY_MODULES: AcademyModule[] = [
  {
    id: 'mutual-funds-sip',
    title: 'Mutual Funds & Systematic Investment Plans (SIP)',
    tag: 'Core Investing',
    authority: 'SEBI & AMFI',
    summary:
      'Mutual funds pool investor capital into SEBI-regulated diversified portfolios managed by AMCs. SIPs automate fixed monthly investments to harness rupee cost averaging.',
    keyPoints: [
      'Regulated by SEBI under Mutual Funds Regulations; overseen by independent Trustees.',
      'SIP buys more units when markets dip and fewer when markets peak, smoothing average purchase cost.',
      'Direct Plans carry lower expense ratios than Regular Plans because they omit distributor commissions.',
    ],
    indianExample:
      'A ₹10,000/month SIP in a diversified Nifty 50 index fund over 15 years at 12% annualized return invests ₹18,00,000 and grows to ~₹50,45,760.',
    ragPrompt: 'Explain mutual funds, SIP rupee cost averaging, and Direct vs Regular plans under SEBI guidelines.',
  },
  {
    id: 'nav-aum-ter-exit-load',
    title: 'NAV, AUM, Expense Ratio (TER) & Exit Load',
    tag: 'Fund Mechanics',
    authority: 'SEBI',
    summary:
      'Understanding per-unit valuation (NAV), total scheme size (AUM), ongoing annual management fees (TER), and early redemption fees (Exit Load).',
    keyPoints: [
      'NAV = (Market Value of Assets − Liabilities & Expenses) ÷ Outstanding Units. A lower NAV does not mean a fund is cheaper.',
      'AUM measures total assets managed by the scheme; SEBI caps maximum TER slabs inversely with AUM.',
      'Exit Load (typically 1% for equity redemptions within 12 months) discourages short-term churn.',
    ],
    indianExample:
      'A 1% difference in Total Expense Ratio (0.2% Direct Index vs 1.2% Regular Active) can compound into several lakhs of difference over 20 years.',
    ragPrompt: 'Explain NAV, AUM, Total Expense Ratio (TER), and Exit Load in Indian mutual funds.',
  },
  {
    id: 'fund-categories-elss',
    title: 'Equity, Debt, Index & ELSS Funds',
    tag: 'Asset Classes',
    authority: 'AMFI & SEBI',
    summary:
      'Matching SEBI mutual fund categories—Equity, Debt, Passive Index, and Tax-Saving ELSS—to goal horizons and SEBI Riskometer levels.',
    keyPoints: [
      'Equity Funds (≥65% domestic equities) suit 5+ year wealth goals; Debt Funds suit short/medium horizons and liquidity.',
      'Index Funds passively track benchmarks like Nifty 50 or Sensex at minimal TER.',
      'ELSS offers Section 80C tax deduction up to ₹1,50,000 (Old Tax Regime) with a 3-year lock-in per installment.',
    ],
    indianExample:
      'Park a 6-month emergency fund in Liquid/Overnight Debt funds or Sweep-in FDs, while using Nifty 50 Index or Flexi-Cap SIPs for 10-year goals.',
    ragPrompt: 'Compare Equity, Debt, Index, and ELSS mutual funds in India including lock-in and Riskometer.',
  },
  {
    id: 'inflation-compounding',
    title: 'Inflation & Power of Compound Interest',
    tag: 'Wealth Math',
    authority: 'NCFE',
    summary:
      'Why inflation steadily erodes idle cash purchasing power and how early compounding accelerates long-term wealth.',
    keyPoints: [
      'Real return = Nominal Return adjusted for inflation and taxes.',
      'At 6% annual inflation, ₹50,000/month expenses become ~₹89,542/month in 10 years.',
      'Rule of 72 estimates doubling time: 72 ÷ annual return rate (e.g., 72 ÷ 12 = 6 years).',
    ],
    indianExample:
      'Starting a ₹5,000 SIP at age 25 instead of age 35 adds 10 extra compounding years—often more than doubling final retirement corpus.',
    ragPrompt: 'How does inflation impact purchasing power and how does compound interest work according to NCFE?',
  },
  {
    id: 'indian-taxation',
    title: 'Mutual Fund Taxation (STCG, LTCG, 80C & Tax Regimes)',
    tag: 'Tax Planning',
    authority: 'Income Tax Department',
    summary:
      'Capital gains rules for equity vs debt funds, Section 80C deductions, and comparing Old vs New Tax Regimes.',
    keyPoints: [
      'Equity funds held ≤12 months incur STCG (Section 111A); >12 months incur LTCG (Section 112A) above the ₹1,25,000 annual exemption.',
      'Specified Debt funds acquired on/after 1 April 2023 (Section 50AA) are taxed at applicable slab rates.',
      'Compare Old Regime (80C, 80D, HRA) vs New Regime (Section 115BAC lower slabs) every financial year.',
    ],
    indianExample:
      'Redeeming long-term equity gains up to ₹1,25,000 in a financial year remains exempt under Section 112A.',
    ragPrompt: 'Explain Indian mutual fund STCG, LTCG taxation, debt fund Section 50AA, and Old vs New Tax Regime.',
  },
  {
    id: 'diversification-retirement',
    title: 'Diversification, Emergency Reserves & NPS',
    tag: 'Risk Management',
    authority: 'RBI & PFRDA',
    summary:
      'Protecting downside risk with 3–6 month liquid buffers, spreading exposure across asset classes, and using PFRDA-regulated NPS for retirement.',
    keyPoints: [
      'RBI guidelines recommend 3–6 months of mandatory living expenses in liquid reserves before aggressive investing.',
      'Diversify across Equity, Debt, and Gold so single-sector drawdowns do not derail financial goals.',
      'NPS Tier I offers low-cost Active or Lifecycle allocation plus Section 80CCD(1B) / 80CCD(2) retirement benefits.',
    ],
    indianExample:
      'Keep total loan EMIs under 35%–40% of net take-home pay and maintain a 6-month liquid reserve before increasing small-cap equity exposure.',
    ragPrompt: 'Explain diversification, RBI emergency fund guidelines, and PFRDA National Pension System (NPS).',
  },
];

export default function EducationPage() {
  // Interactive Calculators State
  const [sipMonthly, setSipMonthly] = useState(10000);
  const [sipRate, setSipRate] = useState(12);
  const [sipYears, setSipYears] = useState(15);

  const [monthlyNeeds, setMonthlyNeeds] = useState(45000);
  const [monthsCushion, setMonthsCushion] = useState(6);

  const [doublingRate, setDoublingRate] = useState(12);

  // Academy & Live RAG Q&A state
  const [openModuleId, setOpenModuleId] = useState<string>('mutual-funds-sip');
  const [ragQuestion, setRagQuestion] = useState('');
  const [ragLoading, setRagLoading] = useState(false);
  const [ragResponse, setRagResponse] = useState<RagQueryResponse | null>(null);
  const [ragError, setRagError] = useState<string | null>(null);

  const i = sipRate / 12 / 100;
  const n = sipYears * 12;
  const sipTotalInvested = sipMonthly * n;
  const sipFutureValue =
    i > 0 ? sipMonthly * ((Math.pow(1 + i, n) - 1) / i) * (1 + i) : sipTotalInvested;
  const sipWealthGain = sipFutureValue - sipTotalInvested;

  const emergencyFundTarget = monthlyNeeds * monthsCushion;
  const doublingYears = doublingRate > 0 ? (72 / doublingRate).toFixed(1) : '∞';

  async function askAcademyRag(question: string) {
    const q = question.trim();
    if (!q || ragLoading) return;
    setRagQuestion(q);
    setRagLoading(true);
    setRagError(null);
    try {
      const res = await aiApi.queryRag(q, 4);
      setRagResponse(res);
    } catch (err) {
      setRagError(err instanceof Error ? err.message : 'Unable to query verified RAG knowledge base.');
    } finally {
      setRagLoading(false);
    }
  }

  return (
    <div className="space-y-8 min-w-0 w-full">
      <PageHeader
        title="Mutual Funds & Indian Finance Academy"
        subtitle="Structured interactive modules covering SEBI, AMFI, RBI, NCFE, PFRDA, and Income Tax fundamentals — backed by live RAG citations"
      />

      {/* Structured Interactive Curriculum */}
      <section className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-primary" />
            Interactive Learning Modules ({ACADEMY_MODULES.length})
          </h3>
          <span className="text-xs text-text-muted">
            Click any module to explore Indian ₹ examples or query the verified RAG assistant
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {ACADEMY_MODULES.map((mod) => {
            const isOpen = openModuleId === mod.id;
            return (
              <Card key={mod.id} className="p-5 space-y-3">
                <button
                  type="button"
                  onClick={() => setOpenModuleId(isOpen ? '' : mod.id)}
                  className="w-full text-left flex items-start justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="positive">{mod.tag}</Badge>
                      <span className="text-[11px] font-medium text-text-muted">Source: {mod.authority}</span>
                    </div>
                    <h4 className="text-sm font-bold text-text-primary">{mod.title}</h4>
                    <p className="text-xs text-text-secondary leading-relaxed">{mod.summary}</p>
                  </div>
                  {isOpen ? (
                    <ChevronUp className="w-4 h-4 text-text-muted shrink-0 mt-1" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-text-muted shrink-0 mt-1" />
                  )}
                </button>

                {isOpen && (
                  <div className="pt-3 border-t border-card-border space-y-3">
                    <ul className="list-disc pl-4 text-xs text-text-primary space-y-1.5">
                      {mod.keyPoints.map((pt, idx) => (
                        <li key={idx}>{pt}</li>
                      ))}
                    </ul>
                    <div className="p-3 rounded-xl bg-[var(--bg)] border border-card-border text-xs text-text-secondary">
                      <strong className="text-text-primary">Indian Example: </strong>
                      {mod.indianExample}
                    </div>
                    <button
                      type="button"
                      onClick={() => askAcademyRag(mod.ragPrompt)}
                      className="btn-secondary text-xs py-2 px-3.5 inline-flex items-center gap-1.5"
                    >
                      <BookOpen className="w-3.5 h-3.5 text-primary" />
                      <span>Verify with RAG Knowledge Assistant</span>
                    </button>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </section>

      {/* Live RAG Q&A Panel inside Academy */}
      <Card className="p-6 space-y-4 border-l-4 border-l-primary">
        <div>
          <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-primary" />
            Ask the Verified Finance Academy RAG Assistant
          </h3>
          <p className="text-xs text-text-secondary mt-0.5">
            Queries are strictly answered from indexed SEBI, AMFI, RBI, NCFE, PFRDA, and Income Tax excerpts with clickable citations.
          </p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            askAcademyRag(ragQuestion);
          }}
          className="flex flex-col sm:flex-row gap-2"
        >
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={ragQuestion}
              onChange={(e) => setRagQuestion(e.target.value)}
              placeholder="Ask about SIP, NAV, Expense Ratio, Exit Load, ELSS, Inflation, LTCG/STCG, or NPS..."
              className="input-field pl-9 text-xs py-2.5"
            />
          </div>
          <button
            type="submit"
            disabled={ragLoading || !ragQuestion.trim()}
            className="btn-primary text-xs px-5 flex items-center justify-center gap-2"
          >
            {ragLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <BookOpen className="w-4 h-4" />}
            <span>Retrieve Verified Answer</span>
          </button>
        </form>

        {ragError && (
          <p className="text-xs text-negative bg-negative/5 p-3 rounded-xl border border-negative/25">
            {ragError}
          </p>
        )}

        {ragResponse && (
          <div className="space-y-3 pt-2">
            {ragResponse.provider_error && (
              <div className="p-3 rounded-xl bg-warning/10 border border-warning/30 text-xs text-text-primary">
                <strong>LLM Provider Notice:</strong> {ragResponse.provider_error}
              </div>
            )}
            {(ragResponse.answer || ragResponse.retrieved_excerpts_summary) && (
              <div className="p-4 rounded-xl bg-[var(--bg)] border border-card-border text-xs text-text-primary leading-relaxed whitespace-pre-wrap">
                {ragResponse.answer || ragResponse.retrieved_excerpts_summary}
              </div>
            )}
            {ragResponse.citations.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {ragResponse.citations.map((cit) => (
                  <div
                    key={cit.chunk_id}
                    className="p-3.5 rounded-xl bg-card border border-card-border space-y-1 text-xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-text-primary">{cit.organization}</span>
                      <span className="text-[10px] font-mono text-primary">
                        {(cit.similarity * 100).toFixed(0)}% match
                      </span>
                    </div>
                    <p className="text-[11px] font-medium text-text-secondary">
                      {cit.source_title} · {cit.section}
                    </p>
                    <p className="text-[11px] text-text-muted line-clamp-3">{cit.chunk_text}</p>
                    {cit.url && (
                      <a
                        href={cit.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline pt-1"
                      >
                        Open Official Source <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Interactive Deterministic Calculators */}
      <section>
        <h3 className="text-base font-bold text-text-primary mb-4 flex items-center gap-2">
          <Calculator className="w-5 h-5 text-primary" /> Interactive Financial Calculators
        </h3>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="p-5 flex flex-col justify-between border-t-4 border-t-primary">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Coins className="w-4 h-4 text-primary" />
                <h4 className="font-bold text-text-primary text-sm">SIP Wealth Compounder</h4>
              </div>
              <div className="space-y-3 text-xs">
                <div>
                  <div className="flex justify-between text-text-muted mb-1">
                    <span>Monthly SIP:</span>
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
                    <span>Expected Annual Return:</span>
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
            <div className="mt-5 pt-3 border-t border-card-border bg-[var(--bg)] p-3 rounded-xl space-y-1.5 text-xs">
              <div className="flex justify-between text-text-muted">
                <span>Total Invested:</span>
                <span className="font-semibold text-text-primary">{formatCurrency(sipTotalInvested)}</span>
              </div>
              <div className="flex justify-between text-text-muted">
                <span>Est. Wealth Gain:</span>
                <span className="font-semibold text-positive">+{formatCurrency(sipWealthGain)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold pt-1 border-t border-card-border">
                <span className="text-text-primary">Maturity Value:</span>
                <span className="text-primary">{formatCurrency(sipFutureValue)}</span>
              </div>
            </div>
          </Card>

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
                    <span>Months of Cushion:</span>
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
            <div className="mt-5 pt-3 border-t border-card-border bg-[var(--bg)] p-3 rounded-xl space-y-1 text-xs">
              <span className="text-text-muted block">Recommended Emergency Reserve:</span>
              <p className="text-2xl font-bold text-positive">{formatCurrency(emergencyFundTarget)}</p>
              <p className="text-[11px] text-text-secondary">
                Keep in liquid savings, sweep-in FDs, or liquid mutual funds.
              </p>
            </div>
          </Card>

          <Card className="p-5 flex flex-col justify-between border-t-4 border-t-secondary">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-4 h-4 text-text-primary" />
                <h4 className="font-bold text-text-primary text-sm">The Rule of 72</h4>
              </div>
              <p className="text-xs text-text-secondary mb-4">
                Estimate how many years it takes for your capital to double at a steady annual rate of return.
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
                    className="w-full accent-primary"
                  />
                </div>
              </div>
            </div>
            <div className="mt-5 pt-3 border-t border-card-border bg-[var(--bg)] p-3 rounded-xl space-y-1 text-xs">
              <span className="text-text-muted block">Time to Double Capital:</span>
              <p className="text-2xl font-bold text-text-primary">{doublingYears} Years</p>
              <p className="text-[11px] text-text-secondary">Formula: 72 ÷ Annual Return Rate</p>
            </div>
          </Card>
        </div>
      </section>
    </div>
  );
}
