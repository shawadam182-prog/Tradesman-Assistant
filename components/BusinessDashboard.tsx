import React, { useMemo } from 'react';
import { Quote, Customer, ScheduleEntry } from '../types';
import {
  PoundSterling, TrendingUp, TrendingDown, AlertTriangle,
  Calendar, Clock, FileText, CheckCircle2, XCircle,
  ArrowUpRight, ArrowDownRight, Banknote, Receipt,
  Users, Briefcase, ChevronRight
} from 'lucide-react';

interface BusinessDashboardProps {
  quotes: Quote[];
  customers: Customer[];
  schedule: ScheduleEntry[];
  onNavigateToInvoices?: () => void;
  onNavigateToQuotes?: () => void;
  onNavigateToSchedule?: () => void;
}

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: { value: number; isPositive: boolean };
  color: 'amber' | 'emerald' | 'red' | 'blue' | 'purple' | 'slate';
  onClick?: () => void;
}

const MetricCard: React.FC<MetricCardProps> = ({
  title, value, subtitle, icon, trend, color, onClick
}) => {
  const colorClasses = {
    amber: 'bg-amber-50 text-amber-600 border-amber-100',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    red: 'bg-red-50 text-red-600 border-red-100',
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    purple: 'bg-purple-50 text-purple-600 border-purple-100',
    slate: 'bg-slate-50 text-slate-600 border-slate-100',
  };

  const iconBgClasses = {
    amber: 'bg-amber-500',
    emerald: 'bg-emerald-500',
    red: 'bg-red-500',
    blue: 'bg-blue-500',
    purple: 'bg-purple-500',
    slate: 'bg-slate-500',
  };

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-2xl md:rounded-3xl border-2 ${colorClasses[color]} p-4 md:p-6 transition-all ${onClick ? 'cursor-pointer hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]' : ''}`}
    >
      <div className="flex items-start justify-between mb-3 md:mb-4">
        <div className={`p-2 md:p-3 ${iconBgClasses[color]} text-white rounded-xl md:rounded-2xl`}>
          {icon}
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-xs font-bold ${trend.isPositive ? 'text-emerald-600' : 'text-red-500'}`}>
            {trend.isPositive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
            {Math.abs(trend.value)}%
          </div>
        )}
        {onClick && (
          <ChevronRight size={20} className="text-slate-300" />
        )}
      </div>
      <p className="text-2xl md:text-3xl font-black text-slate-900 leading-none mb-1">
        {value}
      </p>
      <p className="text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-wider">
        {title}
      </p>
      {subtitle && (
        <p className="text-[10px] md:text-xs font-medium text-slate-400 mt-1 italic">
          {subtitle}
        </p>
      )}
    </div>
  );
};

export const BusinessDashboard: React.FC<BusinessDashboardProps> = ({
  quotes,
  customers,
  schedule,
  onNavigateToInvoices,
  onNavigateToQuotes,
  onNavigateToSchedule,
}) => {
  // Calculate quote total helper
  const calculateQuoteTotal = (quote: Quote): number => {
    const sections = quote.sections || [];
    const materialsTotal = sections.reduce((sum, section) =>
      sum + (section.items || []).reduce((itemSum, item) => itemSum + (item.totalPrice || 0), 0), 0);
    const labourHoursTotal = sections.reduce((sum, section) => sum + (section.labourHours || 0), 0);
    const labourTotal = labourHoursTotal * (quote.labourRate || 0);
    const subtotal = materialsTotal + labourTotal;
    const markup = subtotal * ((quote.markupPercent || 0) / 100);
    const tax = (subtotal + markup) * ((quote.taxPercent || 0) / 100);
    return subtotal + markup + tax;
  };

  // Calculate all business metrics
  const metrics = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Week boundaries
    const dayOfWeek = now.getDay();
    const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const startOfThisWeek = new Date(today);
    startOfThisWeek.setDate(today.getDate() - mondayOffset);
    const endOfThisWeek = new Date(startOfThisWeek);
    endOfThisWeek.setDate(startOfThisWeek.getDate() + 7);

    // Last week
    const startOfLastWeek = new Date(startOfThisWeek);
    startOfLastWeek.setDate(startOfThisWeek.getDate() - 7);

    // Month boundaries
    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    // === INVOICES ===
    const invoices = quotes.filter(q => q.type === 'invoice');

    // Outstanding invoices (sent or accepted, not paid)
    const outstandingInvoices = invoices.filter(
      inv => inv.status === 'sent' || inv.status === 'accepted'
    );
    const outstandingTotal = outstandingInvoices.reduce(
      (sum, inv) => sum + calculateQuoteTotal(inv), 0
    );

    // Overdue invoices (unpaid and > 14 days old)
    const overdueInvoices = outstandingInvoices.filter(inv => {
      const invoiceDate = new Date(inv.date);
      const dueDate = new Date(invoiceDate.getTime() + 14 * 24 * 60 * 60 * 1000);
      return now > dueDate;
    });
    const overdueTotal = overdueInvoices.reduce(
      (sum, inv) => sum + calculateQuoteTotal(inv), 0
    );

    // Paid this week
    const paidThisWeek = invoices
      .filter(inv => inv.status === 'paid')
      .filter(inv => {
        const paidDate = new Date(inv.updatedAt);
        return paidDate >= startOfThisWeek && paidDate < endOfThisWeek;
      });
    const paidThisWeekTotal = paidThisWeek.reduce(
      (sum, inv) => sum + calculateQuoteTotal(inv), 0
    );

    // Paid last week (for trend)
    const paidLastWeek = invoices
      .filter(inv => inv.status === 'paid')
      .filter(inv => {
        const paidDate = new Date(inv.updatedAt);
        return paidDate >= startOfLastWeek && paidDate < startOfThisWeek;
      });
    const paidLastWeekTotal = paidLastWeek.reduce(
      (sum, inv) => sum + calculateQuoteTotal(inv), 0
    );

    // Monthly revenue
    const paidThisMonth = invoices
      .filter(inv => inv.status === 'paid')
      .filter(inv => {
        const paidDate = new Date(inv.updatedAt);
        return paidDate >= startOfThisMonth;
      });
    const monthlyRevenue = paidThisMonth.reduce(
      (sum, inv) => sum + calculateQuoteTotal(inv), 0
    );

    const paidLastMonthInvoices = invoices
      .filter(inv => inv.status === 'paid')
      .filter(inv => {
        const paidDate = new Date(inv.updatedAt);
        return paidDate >= startOfLastMonth && paidDate <= endOfLastMonth;
      });
    const lastMonthRevenue = paidLastMonthInvoices.reduce(
      (sum, inv) => sum + calculateQuoteTotal(inv), 0
    );

    // === QUOTES ===
    const estimatesAndQuotes = quotes.filter(
      q => q.type === 'estimate' || q.type === 'quotation'
    );

    // Pending quotes (sent, awaiting response)
    const pendingQuotes = estimatesAndQuotes.filter(q => q.status === 'sent');
    const pendingQuotesValue = pendingQuotes.reduce(
      (sum, q) => sum + calculateQuoteTotal(q), 0
    );

    // Quotes needing follow-up (sent > 7 days ago)
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const needsFollowUp = pendingQuotes.filter(q => new Date(q.updatedAt) < sevenDaysAgo);

    // Quote conversion rate (last 30 days)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const recentQuotes = estimatesAndQuotes.filter(q => new Date(q.createdAt) >= thirtyDaysAgo);
    const acceptedRecent = recentQuotes.filter(q => q.status === 'accepted' || q.status === 'invoiced' || q.status === 'paid');
    const conversionRate = recentQuotes.length > 0
      ? Math.round((acceptedRecent.length / recentQuotes.length) * 100)
      : 0;

    // === SCHEDULE ===
    const endOfWeek = new Date(today);
    endOfWeek.setDate(today.getDate() + 7);

    const jobsThisWeek = schedule.filter(entry => {
      const start = new Date(entry.start);
      return start >= today && start < endOfWeek;
    });

    const jobsToday = schedule.filter(entry => {
      const start = new Date(entry.start);
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      return start >= today && start < tomorrow;
    });

    // Calculate weekly revenue trend
    const weeklyTrend = paidLastWeekTotal > 0
      ? Math.round(((paidThisWeekTotal - paidLastWeekTotal) / paidLastWeekTotal) * 100)
      : paidThisWeekTotal > 0 ? 100 : 0;

    // Calculate monthly revenue trend
    const monthlyTrend = lastMonthRevenue > 0
      ? Math.round(((monthlyRevenue - lastMonthRevenue) / lastMonthRevenue) * 100)
      : monthlyRevenue > 0 ? 100 : 0;

    return {
      // Money owed to you
      outstandingTotal,
      outstandingCount: outstandingInvoices.length,
      overdueTotal,
      overdueCount: overdueInvoices.length,

      // Revenue
      paidThisWeekTotal,
      weeklyTrend,
      monthlyRevenue,
      monthlyTrend,

      // Quotes pipeline
      pendingQuotesValue,
      pendingQuotesCount: pendingQuotes.length,
      needsFollowUpCount: needsFollowUp.length,
      conversionRate,

      // Schedule
      jobsThisWeekCount: jobsThisWeek.length,
      jobsTodayCount: jobsToday.length,

      // Customers
      totalCustomers: customers.length,
    };
  }, [quotes, customers, schedule]);

  const formatCurrency = (value: number) => {
    if (value >= 1000) {
      return `£${(value / 1000).toFixed(1)}k`;
    }
    return `£${value.toLocaleString('en-GB', { maximumFractionDigits: 0 })}`;
  };

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">Business Overview</h2>
          <p className="text-xs md:text-sm text-slate-500 font-medium italic">Your financial health at a glance</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-wider">Updated</p>
          <p className="text-sm md:text-base font-black text-slate-700">
            {new Date().toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
          </p>
        </div>
      </div>

      {/* Critical Alerts */}
      {(metrics.overdueCount > 0 || metrics.needsFollowUpCount > 0) && (
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl md:rounded-3xl p-4 md:p-6 text-white shadow-lg shadow-amber-500/20">
          <div className="flex items-center gap-3 mb-3">
            <AlertTriangle size={24} className="animate-pulse" />
            <h3 className="font-black uppercase tracking-wider text-sm">Action Required</h3>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {metrics.overdueCount > 0 && (
              <div
                onClick={onNavigateToInvoices}
                className="bg-white/20 backdrop-blur rounded-xl p-3 cursor-pointer hover:bg-white/30 transition-all"
              >
                <p className="text-2xl md:text-3xl font-black">{metrics.overdueCount}</p>
                <p className="text-[10px] md:text-xs font-bold opacity-90">Overdue invoices</p>
                <p className="text-sm md:text-base font-black mt-1">{formatCurrency(metrics.overdueTotal)}</p>
              </div>
            )}
            {metrics.needsFollowUpCount > 0 && (
              <div
                onClick={onNavigateToQuotes}
                className="bg-white/20 backdrop-blur rounded-xl p-3 cursor-pointer hover:bg-white/30 transition-all"
              >
                <p className="text-2xl md:text-3xl font-black">{metrics.needsFollowUpCount}</p>
                <p className="text-[10px] md:text-xs font-bold opacity-90">Quotes need follow-up</p>
                <p className="text-[10px] md:text-xs opacity-75 mt-1">Sent 7+ days ago</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Primary Metrics */}
      <div className="grid grid-cols-2 gap-3 md:gap-4">
        <MetricCard
          title="Outstanding"
          value={formatCurrency(metrics.outstandingTotal)}
          subtitle={`${metrics.outstandingCount} unpaid invoice${metrics.outstandingCount !== 1 ? 's' : ''}`}
          icon={<Banknote size={20} className="md:w-6 md:h-6" />}
          color="amber"
          onClick={onNavigateToInvoices}
        />
        <MetricCard
          title="This Week"
          value={formatCurrency(metrics.paidThisWeekTotal)}
          subtitle="Payments received"
          icon={<PoundSterling size={20} className="md:w-6 md:h-6" />}
          trend={metrics.weeklyTrend !== 0 ? { value: metrics.weeklyTrend, isPositive: metrics.weeklyTrend > 0 } : undefined}
          color="emerald"
        />
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <MetricCard
          title="Monthly Revenue"
          value={formatCurrency(metrics.monthlyRevenue)}
          icon={<TrendingUp size={18} className="md:w-5 md:h-5" />}
          trend={metrics.monthlyTrend !== 0 ? { value: metrics.monthlyTrend, isPositive: metrics.monthlyTrend > 0 } : undefined}
          color="blue"
        />
        <MetricCard
          title="Quote Pipeline"
          value={formatCurrency(metrics.pendingQuotesValue)}
          subtitle={`${metrics.pendingQuotesCount} pending`}
          icon={<FileText size={18} className="md:w-5 md:h-5" />}
          color="purple"
          onClick={onNavigateToQuotes}
        />
        <MetricCard
          title="Jobs This Week"
          value={metrics.jobsThisWeekCount}
          subtitle={`${metrics.jobsTodayCount} today`}
          icon={<Briefcase size={18} className="md:w-5 md:h-5" />}
          color="slate"
          onClick={onNavigateToSchedule}
        />
        <MetricCard
          title="Conversion Rate"
          value={`${metrics.conversionRate}%`}
          subtitle="Last 30 days"
          icon={<CheckCircle2 size={18} className="md:w-5 md:h-5" />}
          color={metrics.conversionRate >= 50 ? 'emerald' : metrics.conversionRate >= 25 ? 'amber' : 'red'}
        />
      </div>

      {/* Quick Stats Footer */}
      <div className="bg-slate-50 rounded-2xl p-4 flex items-center justify-around text-center">
        <div>
          <p className="text-lg md:text-xl font-black text-slate-900">{metrics.totalCustomers}</p>
          <p className="text-[9px] md:text-[10px] font-bold text-slate-500 uppercase tracking-wider">Customers</p>
        </div>
        <div className="w-px h-8 bg-slate-200" />
        <div>
          <p className="text-lg md:text-xl font-black text-slate-900">{quotes.filter(q => q.type === 'invoice').length}</p>
          <p className="text-[9px] md:text-[10px] font-bold text-slate-500 uppercase tracking-wider">Invoices</p>
        </div>
        <div className="w-px h-8 bg-slate-200" />
        <div>
          <p className="text-lg md:text-xl font-black text-slate-900">{quotes.filter(q => q.type !== 'invoice').length}</p>
          <p className="text-[9px] md:text-[10px] font-bold text-slate-500 uppercase tracking-wider">Quotes</p>
        </div>
      </div>
    </div>
  );
};
