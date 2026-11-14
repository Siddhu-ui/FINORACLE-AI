import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  FileText,
  Download,
  Calendar,
  TrendingUp,
  TrendingDown,
  PieChart as PieIcon,
  BarChart3,
  Loader2,
  FileSpreadsheet,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Papa from 'papaparse';
import { transactionService, profileService } from '@/services/supabase';
import { Card, PageHeader, Badge } from '@/components/ui';
import { formatCurrency, formatPercent, formatDate, getCurrentMonth, getMonthRange, getCategoryColor } from '@/utils';
import type { Transaction } from '@/types';

const chartTooltipStyle = {
  contentStyle: {
    backgroundColor: 'var(--card)',
    border: '1px solid var(--card-border)',
    borderRadius: '8px',
    fontSize: '12px',
    color: 'var(--text-primary)',
  },
};

export default function ReportsPage() {
  const [timeframe, setTimeframe] = useState<'this_month' | 'last_3_months' | 'year_to_date'>('this_month');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTransactions();
  }, [timeframe]);

  async function loadTransactions() {
    setLoading(true);
    try {
      const now = new Date();
      let start: string;
      const end = now.toISOString().split('T')[0];

      if (timeframe === 'this_month') {
        start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      } else if (timeframe === 'last_3_months') {
        start = new Date(now.getFullYear(), now.getMonth() - 2, 1).toISOString().split('T')[0];
      } else {
        start = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
      }

      const res = await transactionService.list({
        start_date: start,
        end_date: end,
        per_page: 500,
      });
      setTransactions(res.data);
    } catch (err) {
      console.error('Failed to load transactions for report:', err);
    } finally {
      setLoading(false);
    }
  }

  // Calculate metrics
  const totalIncome = transactions
    .filter((t) => t.type === 'income')
    .reduce((s, t) => s + t.amount, 0);

  const totalExpenses = transactions
    .filter((t) => t.type === 'expense')
    .reduce((s, t) => s + t.amount, 0);

  const netSavings = totalIncome - totalExpenses;
  const savingsRate = totalIncome > 0 ? (netSavings / totalIncome) * 100 : 0;

  // Breakdown by category
  const expenseByCategory: Record<string, number> = {};
  transactions
    .filter((t) => t.type === 'expense')
    .forEach((t) => {
      expenseByCategory[t.category] = (expenseByCategory[t.category] || 0) + t.amount;
    });

  const categoryData = Object.entries(expenseByCategory).map(([category, amount]) => ({
    name: category,
    value: amount,
    color: getCategoryColor(category),
  }));

  // Export PDF Report using jsPDF
  function exportPDF() {
    const doc = new jsPDF();

    // Brand Header
    doc.setFillColor(9, 9, 15);
    doc.rect(0, 0, 210, 35, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('FinOracle AI', 14, 20);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(99, 102, 241);
    doc.text('EXECUTIVE FINANCIAL INTELLIGENCE REPORT', 14, 28);

    doc.setTextColor(161, 161, 170);
    doc.text(`Generated on: ${new Date().toLocaleDateString('en-IN')}`, 140, 20);
    doc.text(`Scope: ${timeframe.replace(/_/g, ' ').toUpperCase()}`, 140, 28);

    // Summary Section
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Financial Summary', 14, 48);

    autoTable(doc, {
      startY: 53,
      head: [['Total Inflows (Income)', 'Total Outflows (Expenses)', 'Net Savings', 'Savings Rate']],
      body: [
        [
          formatCurrency(totalIncome),
          formatCurrency(totalExpenses),
          formatCurrency(netSavings),
          formatPercent(savingsRate),
        ],
      ],
      theme: 'grid',
      headStyles: { fillColor: [21, 155, 114], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 10, cellPadding: 5 },
    });

    // Category Breakdown Table
    doc.text('Category Breakdown', 14, (doc as any).lastAutoTable.finalY + 14);

    const catRows = Object.entries(expenseByCategory).map(([cat, amt]) => [
      cat,
      formatCurrency(amt),
      formatPercent(totalExpenses > 0 ? (amt / totalExpenses) * 100 : 0),
    ]);

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 18,
      head: [['Category', 'Total Spent', '% of Total Outflows']],
      body: catRows.length > 0 ? catRows : [['No expense records', '₹0', '0%']],
      theme: 'striped',
      headStyles: { fillColor: [21, 155, 114], textColor: [255, 255, 255] },
      styles: { fontSize: 9 },
    });

    // Recent Transaction Records Table
    doc.text('Transaction Log', 14, (doc as any).lastAutoTable.finalY + 14);

    const txnRows = transactions.slice(0, 25).map((t) => [
      formatDate(t.date),
      t.description,
      t.category,
      t.type.toUpperCase(),
      formatCurrency(t.amount),
    ]);

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 18,
      head: [['Date', 'Description', 'Category', 'Type', 'Amount']],
      body: txnRows.length > 0 ? txnRows : [['-', 'No transactions', '-', '-', '-']],
      theme: 'striped',
      headStyles: { fillColor: [21, 155, 114], textColor: [255, 255, 255] },
      styles: { fontSize: 8 },
    });

    doc.save(`FinOracle_Report_${timeframe}_${new Date().toISOString().split('T')[0]}.pdf`);
  }

  // Export CSV Statement
  function exportCSV() {
    const csvData = transactions.map((t) => ({
      Date: t.date,
      Description: t.description,
      Type: t.type,
      Category: t.category,
      Amount: t.amount,
      PaymentMethod: t.payment_method || 'N/A',
    }));

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `FinOracle_Transactions_${timeframe}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader
          title="Financial Intelligence Reports"
          subtitle="Generate branded executive reports, cash flow summaries, and ledger exports"
        />

        <div className="flex items-center gap-2">
          <button
            onClick={exportCSV}
            disabled={transactions.length === 0}
            className="btn-secondary flex items-center gap-1.5 text-xs py-2 px-3 disabled:opacity-50"
          >
            <FileSpreadsheet className="w-4 h-4 text-positive" /> Export CSV
          </button>
          <button
            onClick={exportPDF}
            disabled={transactions.length === 0}
            className="btn-primary flex items-center gap-1.5 text-xs py-2 px-3 disabled:opacity-50"
          >
            <Download className="w-4 h-4" /> Export PDF Report
          </button>
        </div>
      </div>

      {/* Timeframe Selector */}
      <div className="flex items-center gap-2 bg-card p-1.5 border border-card-border rounded-xl w-fit">
        <button
          onClick={() => setTimeframe('this_month')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            timeframe === 'this_month' ? 'bg-primary text-white' : 'text-text-muted hover:text-text-primary'
          }`}
        >
          This Month
        </button>
        <button
          onClick={() => setTimeframe('last_3_months')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            timeframe === 'last_3_months' ? 'bg-primary text-white' : 'text-text-muted hover:text-text-primary'
          }`}
        >
          Last 3 Months
        </button>
        <button
          onClick={() => setTimeframe('year_to_date')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            timeframe === 'year_to_date' ? 'bg-primary text-white' : 'text-text-muted hover:text-text-primary'
          }`}
        >
          Year to Date
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[350px]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* Key Summary Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <Card className="p-5 border-l-4 border-l-positive">
              <span className="text-xs font-medium text-text-muted uppercase">Total Inflows</span>
              <p className="text-2xl font-bold text-positive mt-1">{formatCurrency(totalIncome)}</p>
              <p className="text-xs text-text-secondary mt-1">Total revenue collected</p>
            </Card>

            <Card className="p-5 border-l-4 border-l-negative">
              <span className="text-xs font-medium text-text-muted uppercase">Total Outflows</span>
              <p className="text-2xl font-bold text-negative mt-1">{formatCurrency(totalExpenses)}</p>
              <p className="text-xs text-text-secondary mt-1">Total operational expenditures</p>
            </Card>

            <Card className={`p-5 border-l-4 ${netSavings >= 0 ? 'border-l-primary' : 'border-l-warning'}`}>
              <span className="text-xs font-medium text-text-muted uppercase">Net Retained Capital</span>
              <p className={`text-2xl font-bold mt-1 ${netSavings >= 0 ? 'text-primary' : 'text-warning'}`}>
                {formatCurrency(netSavings)}
              </p>
              <p className="text-xs text-text-secondary mt-1">Accumulated cash reserve</p>
            </Card>

            <Card className="p-5 border-l-4 border-l-secondary">
              <span className="text-xs font-medium text-text-muted uppercase">Savings Efficiency</span>
              <p className="text-2xl font-bold text-text-primary mt-1">{formatPercent(savingsRate)}</p>
              <p className="text-xs text-text-secondary mt-1">Percentage of income retained</p>
            </Card>
          </div>

          {/* Visual Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Pie Chart (5 cols) */}
            <div className="lg:col-span-5">
              <Card className="p-5 h-full">
                <h4 className="text-sm font-bold text-text-primary mb-3 flex items-center gap-2">
                  <PieIcon className="w-4 h-4 text-primary" /> Spending Allocation by Category
                </h4>

                <div className="h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={3}
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip formatter={(v: number) => formatCurrency(v)} {...chartTooltipStyle} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="space-y-1.5 mt-3 max-h-[160px] overflow-y-auto pr-1 no-scrollbar text-xs">
                  {categoryData.map((item) => (
                    <div key={item.name} className="flex items-center justify-between py-1 border-b border-card-border/40">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-text-secondary">{item.name}</span>
                      </div>
                      <span className="font-semibold text-text-primary">{formatCurrency(item.value)}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            {/* Ledger Table (7 cols) */}
            <div className="lg:col-span-7">
              <Card className="p-5 h-full flex flex-col justify-between">
                <div>
                  <h4 className="text-sm font-bold text-text-primary mb-3 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-secondary" /> Transaction Audit Entries ({transactions.length})
                  </h4>

                  <div className="overflow-x-auto max-h-[380px] overflow-y-auto no-scrollbar">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-background-secondary text-text-muted uppercase sticky top-0">
                        <tr>
                          <th className="p-2.5">Date</th>
                          <th className="p-2.5">Description</th>
                          <th className="p-2.5">Category</th>
                          <th className="p-2.5 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-card-border/60">
                        {transactions.slice(0, 20).map((t) => (
                          <tr key={t.id} className="hover:bg-card/60">
                            <td className="p-2.5 text-text-muted">{formatDate(t.date)}</td>
                            <td className="p-2.5 font-medium text-text-primary truncate max-w-[150px]">{t.description}</td>
                            <td className="p-2.5">
                              <Badge variant="outline">{t.category}</Badge>
                            </td>
                            <td className={`p-2.5 text-right font-semibold font-mono ${
                              t.type === 'income' ? 'text-positive' : 'text-text-primary'
                            }`}>
                              {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
