import React, { useState, useEffect, useMemo } from 'react';
import {
  ArrowLeft, TrendingUp, TrendingDown, PoundSterling, Calendar,
  CalendarDays, CalendarRange, Download, FileText, FileSpreadsheet,
  Package, Wrench, Fuel, Car, Shield, CreditCard, Briefcase, Tag,
  ChevronDown, Users, Receipt, Minus, Plus, Loader2
} from 'lucide-react';
import { useData } from '../src/contexts/DataContext';
import { Quote, AppSettings } from '../types';

interface ProfitLossPageProps {
  onBack?: () => void;
}

type PeriodType = 'current_month' | 'last_month' | 'current_quarter' | 'last_quarter' | 'current_tax_year' | 'last_tax_year' | 'custom';

interface PeriodOption {
  id: PeriodType;
  label: string;
  icon: React.ReactNode;
}

interface Expense {
  id: string;
  vendor: string;
  description?: string | null;
  amount: number;
  vat_amount: number | null;
  category: string | null;
  expense_date: string;
  is_reconciled: boolean | null;
  payment_method: string | null;
}

interface CategoryBreakdown {
  category: string;
  count: number;
  total: number;
  icon: React.FC<any>;
  color: string;
}

interface MonthlyData {
  month: string;
  monthLabel: string;
  revenue: number;
  revenueCount: number;
  expenses: number;
  expenseCount: number;
  profit: number;
}

// Cost of Sales categories (direct costs)
const COST_OF_SALES_CATEGORIES = ['materials', 'subcontractor', 'tools'];

// Operating expense categories
const OPERATING_EXPENSE_CATEGORIES = ['fuel', 'vehicle', 'insurance', 'office', 'subscriptions', 'other'];

// Category icon mapping
const CATEGORY_ICONS: Record<string, React.FC<any>> = {
  materials: Package,
  subcontractor: Users,
  tools: Wrench,
  fuel: Fuel,
  vehicle: Car,
  insurance: Shield,
  subscriptions: CreditCard,
  office: Briefcase,
  other: Tag,
};

// Category colors
const CATEGORY_COLORS: Record<string, string> = {
  materials: '#3b82f6',
  subcontractor: '#8b5cf6',
  tools: '#a855f7',
  fuel: '#ef4444',
  vehicle: '#06b6d4',
  insurance: '#10b981',
  subscriptions: '#f59e0b',
  office: '#6366f1',
  other: '#64748b',
};

export const ProfitLossPage: React.FC<ProfitLossPageProps> = ({ onBack }) => {
  const { quotes, settings, services } = useData();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>('current_tax_year');
  const [showPeriodDropdown, setShowPeriodDropdown] = useState(false);
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    revenue: true,
    costOfSales: true,
    operatingExpenses: true,
    monthly: false,
  });

  const periodOptions: PeriodOption[] = [
    { id: 'current_month', label: 'Current Month', icon: <CalendarDays size={16} /> },
    { id: 'last_month', label: 'Last Month', icon: <CalendarDays size={16} /> },
    { id: 'current_quarter', label: 'Current Quarter', icon: <CalendarRange size={16} /> },
    { id: 'last_quarter', label: 'Last Quarter', icon: <CalendarRange size={16} /> },
    { id: 'current_tax_year', label: 'Current Tax Year', icon: <Calendar size={16} /> },
    { id: 'last_tax_year', label: 'Last Tax Year', icon: <Calendar size={16} /> },
    { id: 'custom', label: 'Custom Range', icon: <Calendar size={16} /> },
  ];

  // Load expenses
  useEffect(() => {
    const loadExpenses = async () => {
      setLoading(true);
      try {
        const data = await services.expenses.getAll();
        setExpenses(data || []);
      } catch (error) {
        console.error('Failed to load expenses:', error);
      } finally {
        setLoading(false);
      }
    };
    loadExpenses();
  }, [services.expenses]);

  // Calculate quote total helper
  const calculateQuoteTotal = (quote: Quote): number => {
    const sections = quote.sections || [];
    const materialsTotal = sections.reduce((sum, section) =>
      sum + (section.items || []).reduce((itemSum, item) => itemSum + (item.totalPrice || 0), 0), 0);
    const labourHoursTotal = sections.reduce((sum, section) => sum + (section.labourHours || 0), 0);
    const labourTotal = labourHoursTotal * (quote.labourRate || 0);
    const subtotal = materialsTotal + labourTotal;
    const markup = subtotal * ((quote.markupPercent || 0) / 100);

    // Handle discount
    let discountAmount = 0;
    if (quote.discountValue && quote.discountValue > 0) {
      if (quote.discountType === 'percentage') {
        discountAmount = (subtotal + markup) * (quote.discountValue / 100);
      } else {
        discountAmount = quote.discountValue;
      }
    }

    const afterDiscount = subtotal + markup - discountAmount;
    const tax = afterDiscount * ((quote.taxPercent || 0) / 100);
    return afterDiscount + tax;
  };

  // Get period boundaries
  const getPeriodBoundaries = (period: PeriodType): { start: Date; end: Date; label: string } => {
    const now = new Date();
    const taxMonth = (settings.taxYearStartMonth || 4) - 1;
    const taxDay = settings.taxYearStartDay || 6;

    // Calculate current tax year start
    let currentTaxYearStart = new Date(now.getFullYear(), taxMonth, taxDay);
    if (now < currentTaxYearStart) {
      currentTaxYearStart = new Date(now.getFullYear() - 1, taxMonth, taxDay);
    }

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    switch (period) {
      case 'current_month': {
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        return { start, end, label: `${monthNames[now.getMonth()]} ${now.getFullYear()}` };
      }
      case 'last_month': {
        const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
        return { start, end, label: `${monthNames[start.getMonth()]} ${start.getFullYear()}` };
      }
      case 'current_quarter': {
        const quarter = Math.floor(now.getMonth() / 3);
        const start = new Date(now.getFullYear(), quarter * 3, 1);
        const end = new Date(now.getFullYear(), quarter * 3 + 3, 0, 23, 59, 59);
        return { start, end, label: `Q${quarter + 1} ${now.getFullYear()}` };
      }
      case 'last_quarter': {
        const quarter = Math.floor(now.getMonth() / 3) - 1;
        const year = quarter < 0 ? now.getFullYear() - 1 : now.getFullYear();
        const adjustedQuarter = quarter < 0 ? 3 : quarter;
        const start = new Date(year, adjustedQuarter * 3, 1);
        const end = new Date(year, adjustedQuarter * 3 + 3, 0, 23, 59, 59);
        return { start, end, label: `Q${adjustedQuarter + 1} ${year}` };
      }
      case 'current_tax_year': {
        const end = new Date(currentTaxYearStart.getFullYear() + 1, taxMonth, taxDay - 1, 23, 59, 59);
        return {
          start: currentTaxYearStart,
          end,
          label: `${monthNames[taxMonth]} ${currentTaxYearStart.getFullYear()} - ${monthNames[taxMonth]} ${currentTaxYearStart.getFullYear() + 1}`
        };
      }
      case 'last_tax_year': {
        const start = new Date(currentTaxYearStart.getFullYear() - 1, taxMonth, taxDay);
        const end = new Date(currentTaxYearStart.getFullYear(), taxMonth, taxDay - 1, 23, 59, 59);
        return {
          start,
          end,
          label: `${monthNames[taxMonth]} ${start.getFullYear()} - ${monthNames[taxMonth]} ${start.getFullYear() + 1}`
        };
      }
      case 'custom': {
        const start = customStartDate ? new Date(customStartDate) : new Date(now.getFullYear(), 0, 1);
        const end = customEndDate ? new Date(customEndDate + 'T23:59:59') : now;
        return {
          start,
          end,
          label: `${start.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} - ${end.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`
        };
      }
      default:
        return { start: new Date(now.getFullYear(), 0, 1), end: now, label: 'All Time' };
    }
  };

  // Calculate P&L data
  const plData = useMemo(() => {
    const { start, end, label } = getPeriodBoundaries(selectedPeriod);

    // Filter paid invoices in period
    const paidInvoices = quotes.filter(q => {
      if (q.type !== 'invoice' || q.status !== 'paid') return false;
      const paymentDate = q.paymentDate ? new Date(q.paymentDate) : new Date(q.updatedAt);
      return paymentDate >= start && paymentDate <= end;
    });

    // Filter expenses in period
    const periodExpenses = expenses.filter(e => {
      const expenseDate = new Date(e.expense_date);
      return expenseDate >= start && expenseDate <= end;
    });

    // Calculate revenue
    const totalRevenue = paidInvoices.reduce((sum, inv) => sum + calculateQuoteTotal(inv), 0);

    // Group expenses by category
    const expensesByCategory = periodExpenses.reduce((acc, exp) => {
      const cat = exp.category || 'other';
      if (!acc[cat]) acc[cat] = { count: 0, total: 0 };
      acc[cat].count += 1;
      acc[cat].total += exp.amount;
      return acc;
    }, {} as Record<string, { count: number; total: number }>);

    // Calculate Cost of Sales
    const costOfSales = COST_OF_SALES_CATEGORIES.reduce((sum, cat) => {
      return sum + (expensesByCategory[cat]?.total || 0);
    }, 0);

    const costOfSalesBreakdown: CategoryBreakdown[] = COST_OF_SALES_CATEGORIES
      .filter(cat => expensesByCategory[cat])
      .map(cat => ({
        category: cat,
        count: expensesByCategory[cat].count,
        total: expensesByCategory[cat].total,
        icon: CATEGORY_ICONS[cat] || Tag,
        color: CATEGORY_COLORS[cat] || '#64748b',
      }));

    // Calculate Operating Expenses
    const operatingExpenses = Object.entries(expensesByCategory)
      .filter(([cat]) => !COST_OF_SALES_CATEGORIES.includes(cat))
      .reduce((sum, [, data]) => sum + data.total, 0);

    const operatingExpensesBreakdown: CategoryBreakdown[] = Object.entries(expensesByCategory)
      .filter(([cat]) => !COST_OF_SALES_CATEGORIES.includes(cat))
      .map(([cat, data]) => ({
        category: cat,
        count: data.count,
        total: data.total,
        icon: CATEGORY_ICONS[cat] || Tag,
        color: CATEGORY_COLORS[cat] || '#64748b',
      }))
      .sort((a, b) => b.total - a.total);

    // Calculate Gross and Net Profit
    const grossProfit = totalRevenue - costOfSales;
    const netProfit = grossProfit - operatingExpenses;
    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    // Monthly breakdown
    const monthlyData: MonthlyData[] = [];
    const monthMap = new Map<string, MonthlyData>();
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    paidInvoices.forEach(inv => {
      const date = inv.paymentDate ? new Date(inv.paymentDate) : new Date(inv.updatedAt);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const existing = monthMap.get(monthKey) || {
        month: monthKey,
        monthLabel: `${monthNames[date.getMonth()]} ${date.getFullYear()}`,
        revenue: 0,
        revenueCount: 0,
        expenses: 0,
        expenseCount: 0,
        profit: 0,
      };
      existing.revenue += calculateQuoteTotal(inv);
      existing.revenueCount += 1;
      monthMap.set(monthKey, existing);
    });

    periodExpenses.forEach(exp => {
      const date = new Date(exp.expense_date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const existing = monthMap.get(monthKey) || {
        month: monthKey,
        monthLabel: `${monthNames[date.getMonth()]} ${date.getFullYear()}`,
        revenue: 0,
        revenueCount: 0,
        expenses: 0,
        expenseCount: 0,
        profit: 0,
      };
      existing.expenses += exp.amount;
      existing.expenseCount += 1;
      monthMap.set(monthKey, existing);
    });

    // Calculate profit for each month and sort
    monthMap.forEach((data, key) => {
      data.profit = data.revenue - data.expenses;
      monthlyData.push(data);
    });
    monthlyData.sort((a, b) => b.month.localeCompare(a.month));

    return {
      periodLabel: label,
      totalRevenue,
      revenueCount: paidInvoices.length,
      costOfSales,
      costOfSalesBreakdown,
      grossProfit,
      operatingExpenses,
      operatingExpensesBreakdown,
      netProfit,
      profitMargin,
      totalExpenses: costOfSales + operatingExpenses,
      totalExpenseCount: periodExpenses.length,
      monthlyData,
    };
  }, [quotes, expenses, selectedPeriod, customStartDate, customEndDate, settings]);

  // Format currency
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  // Toggle section expansion
  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Export as CSV
  const handleExportCSV = () => {
    const { start, end } = getPeriodBoundaries(selectedPeriod);

    // Revenue lines
    const revenueLines = quotes
      .filter(q => {
        if (q.type !== 'invoice' || q.status !== 'paid') return false;
        const paymentDate = q.paymentDate ? new Date(q.paymentDate) : new Date(q.updatedAt);
        return paymentDate >= start && paymentDate <= end;
      })
      .map(inv => ({
        date: inv.paymentDate || inv.updatedAt,
        type: 'Revenue',
        category: 'Paid Invoice',
        description: `Invoice ${inv.referenceNumber || inv.id.slice(0, 8)}`,
        amount: calculateQuoteTotal(inv),
      }));

    // Expense lines
    const expenseLines = expenses
      .filter(e => {
        const expenseDate = new Date(e.expense_date);
        return expenseDate >= start && expenseDate <= end;
      })
      .map(exp => ({
        date: exp.expense_date,
        type: COST_OF_SALES_CATEGORIES.includes(exp.category || 'other') ? 'Cost of Sales' : 'Operating Expense',
        category: exp.category || 'other',
        description: exp.vendor + (exp.description ? ` - ${exp.description}` : ''),
        amount: -exp.amount,
      }));

    const allLines = [...revenueLines, ...expenseLines].sort((a, b) =>
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    const headers = ['Date', 'Type', 'Category', 'Description', 'Amount'];
    const rows = allLines.map(line => [
      new Date(line.date).toLocaleDateString('en-GB'),
      line.type,
      line.category,
      `"${line.description.replace(/"/g, '""')}"`,
      line.amount.toFixed(2),
    ]);

    // Add summary
    rows.push([]);
    rows.push(['', '', '', 'Total Revenue', plData.totalRevenue.toFixed(2)]);
    rows.push(['', '', '', 'Cost of Sales', (-plData.costOfSales).toFixed(2)]);
    rows.push(['', '', '', 'Gross Profit', plData.grossProfit.toFixed(2)]);
    rows.push(['', '', '', 'Operating Expenses', (-plData.operatingExpenses).toFixed(2)]);
    rows.push(['', '', '', 'Net Profit', plData.netProfit.toFixed(2)]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `profit-loss-${selectedPeriod}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Export as PDF (print)
  const handleExportPDF = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto pb-20 print:pb-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8 print:mb-4">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2.5 text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors print:hidden"
            >
              <ArrowLeft size={20} />
            </button>
          )}
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Profit & Loss</h1>
            <p className="text-slate-500 text-sm font-medium">Business financial summary</p>
          </div>
        </div>

        {/* Export Buttons */}
        <div className="flex gap-2 print:hidden">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs uppercase tracking-wide transition-colors"
          >
            <FileSpreadsheet size={16} />
            CSV
          </button>
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs uppercase tracking-wide transition-colors"
          >
            <FileText size={16} />
            Print
          </button>
        </div>
      </div>

      {/* Period Selector */}
      <div className="mb-6 print:hidden">
        <div className="relative inline-block">
          <button
            onClick={() => setShowPeriodDropdown(!showPeriodDropdown)}
            className="flex items-center gap-3 px-5 py-3 bg-white border-2 border-slate-200 rounded-2xl hover:border-teal-300 transition-colors"
          >
            {periodOptions.find(p => p.id === selectedPeriod)?.icon}
            <span className="font-bold text-slate-900">
              {periodOptions.find(p => p.id === selectedPeriod)?.label}
            </span>
            <ChevronDown size={18} className={`text-slate-400 transition-transform ${showPeriodDropdown ? 'rotate-180' : ''}`} />
          </button>

          {showPeriodDropdown && (
            <div className="absolute top-full left-0 mt-2 w-64 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden">
              {periodOptions.map(option => (
                <button
                  key={option.id}
                  onClick={() => {
                    setSelectedPeriod(option.id);
                    setShowPeriodDropdown(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors ${
                    selectedPeriod === option.id ? 'bg-teal-50 text-teal-700' : 'text-slate-700'
                  }`}
                >
                  {option.icon}
                  <span className="font-medium">{option.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Custom Date Range */}
        {selectedPeriod === 'custom' && (
          <div className="flex flex-wrap gap-4 mt-4">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Start Date</label>
              <input
                type="date"
                value={customStartDate}
                onChange={e => setCustomStartDate(e.target.value)}
                className="px-4 py-2 border-2 border-slate-200 rounded-xl focus:border-teal-400 outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">End Date</label>
              <input
                type="date"
                value={customEndDate}
                onChange={e => setCustomEndDate(e.target.value)}
                className="px-4 py-2 border-2 border-slate-200 rounded-xl focus:border-teal-400 outline-none"
              />
            </div>
          </div>
        )}
      </div>

      {/* Main P&L Card */}
      <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden mb-6 print:shadow-none print:border-slate-300">
        <div className="p-6 sm:p-8 bg-gradient-to-r from-slate-900 to-slate-800 text-white print:bg-slate-900">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-black uppercase tracking-widest">Profit & Loss Statement</h2>
            <span className="text-slate-400 text-sm font-medium">{plData.periodLabel}</span>
          </div>
        </div>

        <div className="p-6 sm:p-8 space-y-6">
          {/* Revenue */}
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 text-emerald-600 rounded-xl">
                <TrendingUp size={20} />
              </div>
              <div>
                <p className="font-black text-slate-900">Revenue (Paid Invoices)</p>
                <p className="text-xs text-slate-500">{plData.revenueCount} invoice{plData.revenueCount !== 1 ? 's' : ''}</p>
              </div>
            </div>
            <p className="text-xl sm:text-2xl font-black text-emerald-600">{formatCurrency(plData.totalRevenue)}</p>
          </div>

          {/* Cost of Sales */}
          <div className="flex items-center justify-between py-3 border-t border-slate-100">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 text-blue-600 rounded-xl">
                <Package size={20} />
              </div>
              <div>
                <p className="font-black text-slate-900">Cost of Sales</p>
                <p className="text-xs text-slate-500">Materials, tools, subcontractors</p>
              </div>
            </div>
            <p className="text-xl sm:text-2xl font-black text-slate-700">({formatCurrency(plData.costOfSales)})</p>
          </div>

          {/* Gross Profit Line */}
          <div className="flex items-center justify-between py-4 border-t-2 border-slate-200 bg-slate-50 -mx-6 sm:-mx-8 px-6 sm:px-8">
            <p className="font-black text-slate-900 uppercase tracking-wide">Gross Profit</p>
            <p className={`text-xl sm:text-2xl font-black ${plData.grossProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {formatCurrency(plData.grossProfit)}
            </p>
          </div>

          {/* Operating Expenses */}
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 text-amber-600 rounded-xl">
                <Receipt size={20} />
              </div>
              <div>
                <p className="font-black text-slate-900">Operating Expenses</p>
                <p className="text-xs text-slate-500">Fuel, insurance, office, etc.</p>
              </div>
            </div>
            <p className="text-xl sm:text-2xl font-black text-slate-700">({formatCurrency(plData.operatingExpenses)})</p>
          </div>

          {/* Net Profit Line */}
          <div className={`flex items-center justify-between py-5 border-t-4 -mx-6 sm:-mx-8 px-6 sm:px-8 ${
            plData.netProfit >= 0 ? 'border-emerald-500 bg-emerald-50' : 'border-red-500 bg-red-50'
          }`}>
            <div>
              <p className="font-black text-slate-900 uppercase tracking-wide text-lg">Net Profit</p>
              <p className="text-sm text-slate-500">
                {plData.profitMargin >= 0 ? '+' : ''}{plData.profitMargin.toFixed(1)}% margin
              </p>
            </div>
            <p className={`text-2xl sm:text-3xl font-black ${plData.netProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {plData.netProfit >= 0 ? '' : '-'}{formatCurrency(Math.abs(plData.netProfit))}
            </p>
          </div>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6 print:hidden">
        <div className="bg-white rounded-2xl p-4 border border-slate-200">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Revenue</p>
          <p className="text-xl font-black text-emerald-600">{formatCurrency(plData.totalRevenue)}</p>
          <p className="text-xs text-slate-500">{plData.revenueCount} paid</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-200">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Expenses</p>
          <p className="text-xl font-black text-red-600">{formatCurrency(plData.totalExpenses)}</p>
          <p className="text-xs text-slate-500">{plData.totalExpenseCount} items</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-200">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Net Profit</p>
          <p className={`text-xl font-black ${plData.netProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {formatCurrency(plData.netProfit)}
          </p>
          <p className="text-xs text-slate-500">{plData.profitMargin.toFixed(1)}% margin</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-200">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Gross Margin</p>
          <p className={`text-xl font-black ${plData.grossProfit >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
            {plData.totalRevenue > 0 ? ((plData.grossProfit / plData.totalRevenue) * 100).toFixed(1) : 0}%
          </p>
          <p className="text-xs text-slate-500">After CoS</p>
        </div>
      </div>

      {/* Cost of Sales Breakdown */}
      {plData.costOfSalesBreakdown.length > 0 && (
        <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden mb-6 print:shadow-none">
          <button
            onClick={() => toggleSection('costOfSales')}
            className="w-full flex items-center justify-between p-6 hover:bg-slate-50 transition-colors print:hover:bg-white"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 text-blue-600 rounded-xl">
                <Package size={20} />
              </div>
              <div className="text-left">
                <h3 className="font-black text-slate-900 uppercase tracking-tight">Cost of Sales Breakdown</h3>
                <p className="text-xs text-slate-500">{plData.costOfSalesBreakdown.length} categories</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <p className="font-black text-slate-700 text-lg">{formatCurrency(plData.costOfSales)}</p>
              {expandedSections.costOfSales ? <Minus size={20} className="text-slate-400 print:hidden" /> : <Plus size={20} className="text-slate-400 print:hidden" />}
            </div>
          </button>

          {expandedSections.costOfSales && (
            <div className="border-t border-slate-100 p-6 pt-0">
              <div className="space-y-3 mt-4">
                {plData.costOfSalesBreakdown.map(item => {
                  const Icon = item.icon;
                  return (
                    <div key={item.category} className="flex items-center justify-between py-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: item.color + '20' }}>
                          <Icon size={18} style={{ color: item.color }} />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 capitalize">{item.category}</p>
                          <p className="text-xs text-slate-500">{item.count} expense{item.count !== 1 ? 's' : ''}</p>
                        </div>
                      </div>
                      <p className="font-black text-slate-700">{formatCurrency(item.total)}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Operating Expenses Breakdown */}
      {plData.operatingExpensesBreakdown.length > 0 && (
        <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden mb-6 print:shadow-none">
          <button
            onClick={() => toggleSection('operatingExpenses')}
            className="w-full flex items-center justify-between p-6 hover:bg-slate-50 transition-colors print:hover:bg-white"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 text-amber-600 rounded-xl">
                <Receipt size={20} />
              </div>
              <div className="text-left">
                <h3 className="font-black text-slate-900 uppercase tracking-tight">Operating Expenses Breakdown</h3>
                <p className="text-xs text-slate-500">{plData.operatingExpensesBreakdown.length} categories</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <p className="font-black text-slate-700 text-lg">{formatCurrency(plData.operatingExpenses)}</p>
              {expandedSections.operatingExpenses ? <Minus size={20} className="text-slate-400 print:hidden" /> : <Plus size={20} className="text-slate-400 print:hidden" />}
            </div>
          </button>

          {expandedSections.operatingExpenses && (
            <div className="border-t border-slate-100 p-6 pt-0">
              <div className="space-y-3 mt-4">
                {plData.operatingExpensesBreakdown.map(item => {
                  const Icon = item.icon;
                  return (
                    <div key={item.category} className="flex items-center justify-between py-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: item.color + '20' }}>
                          <Icon size={18} style={{ color: item.color }} />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 capitalize">{item.category}</p>
                          <p className="text-xs text-slate-500">{item.count} expense{item.count !== 1 ? 's' : ''}</p>
                        </div>
                      </div>
                      <p className="font-black text-slate-700">{formatCurrency(item.total)}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Monthly Breakdown */}
      {plData.monthlyData.length > 0 && (
        <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden print:shadow-none">
          <button
            onClick={() => toggleSection('monthly')}
            className="w-full flex items-center justify-between p-6 hover:bg-slate-50 transition-colors print:hover:bg-white"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 text-purple-600 rounded-xl">
                <CalendarDays size={20} />
              </div>
              <div className="text-left">
                <h3 className="font-black text-slate-900 uppercase tracking-tight">Monthly Breakdown</h3>
                <p className="text-xs text-slate-500">{plData.monthlyData.length} month{plData.monthlyData.length !== 1 ? 's' : ''}</p>
              </div>
            </div>
            {expandedSections.monthly ? <Minus size={20} className="text-slate-400 print:hidden" /> : <Plus size={20} className="text-slate-400 print:hidden" />}
          </button>

          {expandedSections.monthly && (
            <div className="border-t border-slate-100 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="text-left p-4 font-black text-slate-600 text-xs uppercase tracking-wide">Month</th>
                    <th className="text-right p-4 font-black text-slate-600 text-xs uppercase tracking-wide">Revenue</th>
                    <th className="text-right p-4 font-black text-slate-600 text-xs uppercase tracking-wide">Expenses</th>
                    <th className="text-right p-4 font-black text-slate-600 text-xs uppercase tracking-wide">Profit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {plData.monthlyData.map(month => (
                    <tr key={month.month} className="hover:bg-slate-50">
                      <td className="p-4 font-bold text-slate-900">{month.monthLabel}</td>
                      <td className="p-4 text-right text-emerald-600 font-bold">{formatCurrency(month.revenue)}</td>
                      <td className="p-4 text-right text-red-600 font-bold">({formatCurrency(month.expenses)})</td>
                      <td className={`p-4 text-right font-black ${month.profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {formatCurrency(month.profit)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-200 bg-slate-50">
                    <td className="p-4 font-black text-slate-900 uppercase">Total</td>
                    <td className="p-4 text-right text-emerald-600 font-black">{formatCurrency(plData.totalRevenue)}</td>
                    <td className="p-4 text-right text-red-600 font-black">({formatCurrency(plData.totalExpenses)})</td>
                    <td className={`p-4 text-right font-black ${plData.netProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {formatCurrency(plData.netProfit)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Print Styles */}
      <style>{`
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print\\:hidden { display: none !important; }
          .print\\:pb-0 { padding-bottom: 0 !important; }
          .print\\:shadow-none { box-shadow: none !important; }
          .print\\:border-slate-300 { border-color: #cbd5e1 !important; }
          .print\\:bg-slate-900 { background-color: #0f172a !important; }
          .print\\:mb-4 { margin-bottom: 1rem !important; }
          .print\\:hover\\:bg-white:hover { background-color: white !important; }
        }
      `}</style>
    </div>
  );
};
