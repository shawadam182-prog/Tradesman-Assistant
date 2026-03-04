
import React, { useState, useMemo } from 'react';
import { Quote, Customer, AppSettings, TIER_LIMITS } from '../types';
import { ReceiptText, Search, CheckCircle2, AlertCircle, Plus, Hash, ChevronRight, Trash2, Clock, AlertTriangle, ArrowUpDown, RefreshCw, Calendar } from 'lucide-react';
import { hapticTap } from '../src/hooks/useHaptic';
import { useToast } from '../src/contexts/ToastContext';
import { useSubscription } from '../src/hooks/useFeatureAccess';
import { UpgradePrompt } from './UpgradePrompt';
import { useData } from '../src/contexts/DataContext';
import { PageHeader } from './common/PageHeader';
import { ConfirmDialog } from './ConfirmDialog';
import { getQuoteGrandTotal } from '../src/utils/quoteCalculations';

// UK tax year runs 6 April → 5 April
const getTaxYear = (date: Date): string => {
  const year = date.getFullYear();
  const month = date.getMonth(); // 0-indexed
  const day = date.getDate();
  // Before 6 April = previous tax year
  if (month < 3 || (month === 3 && day < 6)) {
    return `${year - 1}/${year.toString().slice(2)}`;
  }
  return `${year}/${(year + 1).toString().slice(2)}`;
};

type DateFilter = 'all' | 'this_month' | 'last_month' | 'this_quarter' | 'this_tax_year' | 'last_tax_year' | 'custom';

const DATE_FILTER_OPTIONS: { value: DateFilter; label: string }[] = [
  { value: 'all', label: 'All Time' },
  { value: 'this_month', label: 'This Month' },
  { value: 'last_month', label: 'Last Month' },
  { value: 'this_quarter', label: 'This Quarter' },
  { value: 'this_tax_year', label: 'This Tax Year' },
  { value: 'last_tax_year', label: 'Last Tax Year' },
  { value: 'custom', label: 'Custom Range' },
];

// Helper functions for overdue detection
const isOverdue = (invoice: Quote): boolean => {
  if (invoice.status === 'paid' || invoice.status === 'draft') return false;
  if (!invoice.dueDate) return false;
  return new Date(invoice.dueDate) < new Date();
};

const getDaysOverdue = (invoice: Quote): number => {
  if (!invoice.dueDate) return 0;
  const diff = new Date().getTime() - new Date(invoice.dueDate).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
};

const getDaysUntilDue = (invoice: Quote): number => {
  if (!invoice.dueDate) return 0;
  const diff = new Date(invoice.dueDate).getTime() - new Date().getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

interface InvoicesListProps {
  quotes: Quote[];
  customers: Customer[];
  settings: AppSettings;
  onViewQuote: (id: string) => void;
  onCreateInvoice: () => void;
  onDeleteInvoice?: (id: string) => Promise<void>;
  onBack?: () => void;
}

// Tab filter types
type InvoiceFilterTab = 'all' | 'draft' | 'unpaid' | 'paid' | 'overdue' | 'recurring' | 'credit_notes' | 'cancelled';

// Sort options
type SortOption = 'updated_desc' | 'updated_asc' | 'created_desc' | 'created_asc' | 'amount_desc' | 'amount_asc' | 'customer_asc' | 'customer_desc' | 'title_asc' | 'title_desc';

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'updated_desc', label: 'Recently Updated' },
  { value: 'updated_asc', label: 'Oldest Updated' },
  { value: 'created_desc', label: 'Newest Created' },
  { value: 'created_asc', label: 'Oldest Created' },
  { value: 'amount_desc', label: 'Highest Amount' },
  { value: 'amount_asc', label: 'Lowest Amount' },
  { value: 'customer_asc', label: 'Customer A-Z' },
  { value: 'customer_desc', label: 'Customer Z-A' },
  { value: 'title_asc', label: 'Title A-Z' },
  { value: 'title_desc', label: 'Title Z-A' },
];

export const InvoicesList: React.FC<InvoicesListProps> = ({
  quotes, customers, settings, onViewQuote, onCreateInvoice, onDeleteInvoice, onBack
}) => {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [activeTab, setActiveTab] = React.useState<InvoiceFilterTab>('all');
  const [showUpgradePrompt, setShowUpgradePrompt] = React.useState(false);
  const [sortBy, setSortBy] = React.useState<SortOption>('updated_desc');
  const [showSortDropdown, setShowSortDropdown] = React.useState(false);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; title: string; customerName: string } | null>(null);
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [showDateDropdown, setShowDateDropdown] = useState(false);
  const [customDateFrom, setCustomDateFrom] = useState('');
  const [customDateTo, setCustomDateTo] = useState('');
  const toast = useToast();

  // Get all invoices for limit checking
  const { quotes: allQuotes } = useData();
  const subscription = useSubscription();
  const limits = subscription.usageLimits || TIER_LIMITS[subscription.tier];
  const invoiceLimit = limits.invoices;
  const currentInvoiceCount = allQuotes.filter(q => q.type === 'invoice').length;
  const canCreateInvoice = invoiceLimit === null || currentInvoiceCount < invoiceLimit;

  const handleDelete = (e: React.MouseEvent, invoice: Quote) => {
    e.stopPropagation();
    hapticTap();
    const customer = customers.find(c => c.id === invoice.customerId);
    setConfirmDelete({ id: invoice.id, title: invoice.title, customerName: customer?.name || 'Unknown' });
  };

  const handleConfirmDelete = async () => {
    if (!confirmDelete) return;
    const { id, title } = confirmDelete;
    setConfirmDelete(null);
    try {
      await onDeleteInvoice?.(id);
      toast.success('Invoice Deleted', `"${title}" has been removed`);
    } catch (err) {
      toast.error('Delete Failed', 'Could not delete invoice');
    }
  };

  const calculateQuoteTotal = (quote: Quote) => {
    return getQuoteGrandTotal(quote, {
      enableVat: settings.enableVat ?? false,
      enableCis: settings.enableCis ?? false,
      defaultLabourRate: settings.defaultLabourRate ?? 0,
    });
  };

  // Sort function
  const sortInvoices = (invoices: Quote[]): Quote[] => {
    return [...invoices].sort((a, b) => {
      const customerA = customers.find(c => c.id === a.customerId);
      const customerB = customers.find(c => c.id === b.customerId);

      switch (sortBy) {
        case 'updated_desc':
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        case 'updated_asc':
          return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
        case 'created_desc':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'created_asc':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'amount_desc':
          return calculateQuoteTotal(b) - calculateQuoteTotal(a);
        case 'amount_asc':
          return calculateQuoteTotal(a) - calculateQuoteTotal(b);
        case 'customer_asc':
          return (customerA?.name || '').localeCompare(customerB?.name || '');
        case 'customer_desc':
          return (customerB?.name || '').localeCompare(customerA?.name || '');
        case 'title_asc':
          return a.title.localeCompare(b.title);
        case 'title_desc':
          return b.title.localeCompare(a.title);
        default:
          return 0;
      }
    });
  };

  // Date filter function
  const filterByDate = (invoice: Quote): boolean => {
    if (dateFilter === 'all') return true;

    const now = new Date();
    const invoiceDate = new Date(invoice.createdAt);

    switch (dateFilter) {
      case 'this_month': {
        return invoiceDate.getMonth() === now.getMonth() && invoiceDate.getFullYear() === now.getFullYear();
      }
      case 'last_month': {
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        return invoiceDate.getMonth() === lastMonth.getMonth() && invoiceDate.getFullYear() === lastMonth.getFullYear();
      }
      case 'this_quarter': {
        const qStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
        return invoiceDate >= qStart;
      }
      case 'this_tax_year': {
        // UK tax year: 6 April to 5 April
        const year = now.getMonth() < 3 || (now.getMonth() === 3 && now.getDate() < 6) ? now.getFullYear() - 1 : now.getFullYear();
        const tyStart = new Date(year, 3, 6); // 6 April
        return invoiceDate >= tyStart;
      }
      case 'last_tax_year': {
        const year = now.getMonth() < 3 || (now.getMonth() === 3 && now.getDate() < 6) ? now.getFullYear() - 1 : now.getFullYear();
        const lastTyStart = new Date(year - 1, 3, 6);
        const lastTyEnd = new Date(year, 3, 5, 23, 59, 59);
        return invoiceDate >= lastTyStart && invoiceDate <= lastTyEnd;
      }
      case 'custom': {
        if (customDateFrom && invoiceDate < new Date(customDateFrom)) return false;
        if (customDateTo) {
          const toEnd = new Date(customDateTo);
          toEnd.setHours(23, 59, 59, 999);
          if (invoiceDate > toEnd) return false;
        }
        return true;
      }
      default:
        return true;
    }
  };

  // Filter by tab status first
  const filterByTab = (invoice: Quote): boolean => {
    switch (activeTab) {
      case 'draft':
        return invoice.status === 'draft';
      case 'unpaid':
        // Sent: all sent invoices regardless of due date (not paid, not draft, not declined)
        return invoice.status !== 'paid' &&
               invoice.status !== 'draft' &&
               invoice.status !== 'declined';
      case 'paid':
        return invoice.status === 'paid';
      case 'overdue':
        return isOverdue(invoice);
      case 'recurring':
        return invoice.isRecurring === true;
      case 'credit_notes':
        return invoice.isCreditNote === true;
      case 'cancelled':
        return invoice.status === 'declined';
      case 'all':
      default:
        return true;
    }
  };

  // Status group ordering for the ALL tab: Draft=0, Sent=1, Paid=2
  const statusGroupOrder = (invoice: Quote): number => {
    if (invoice.status === 'draft') return 0;
    if (invoice.status === 'paid') return 2;
    return 1; // sent, accepted, invoiced, declined — all in "sent" group
  };

  const filtered = useMemo(() => {
    const baseFiltered = quotes.filter(q => {
      if (!filterByTab(q)) return false;
      if (!filterByDate(q)) return false;
      const searchLower = searchTerm.toLowerCase();
      const customer = customers.find(c => c.id === q.customerId);
      return (
        q.title.toLowerCase().includes(searchLower) ||
        (customer?.name?.toLowerCase().includes(searchLower) ?? false) ||
        (customer?.company?.toLowerCase().includes(searchLower) ?? false)
      );
    });

    // For the ALL tab, group by status (Drafts → Sent → Paid) then sort within groups
    if (activeTab === 'all') {
      const sorted = sortInvoices(baseFiltered);
      return [...sorted].sort((a, b) => statusGroupOrder(a) - statusGroupOrder(b));
    }

    return sortInvoices(baseFiltered);
  }, [quotes, activeTab, searchTerm, sortBy, dateFilter, customDateFrom, customDateTo, customers, settings]);

  // Count invoices for each tab (for badges)
  const tabCounts = {
    all: quotes.length,
    draft: quotes.filter(q => q.status === 'draft').length,
    unpaid: quotes.filter(q => q.status !== 'paid' && q.status !== 'draft' && q.status !== 'declined').length,
    paid: quotes.filter(q => q.status === 'paid').length,
    overdue: quotes.filter(q => isOverdue(q)).length,
    recurring: quotes.filter(q => q.isRecurring === true).length,
    credit_notes: quotes.filter(q => q.isCreditNote === true).length,
    cancelled: quotes.filter(q => q.status === 'declined').length,
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Final Invoices"
        subtitle="Billed jobs and financial history."
        onBack={onBack}
        actions={
          <button
            onClick={() => {
              if (canCreateInvoice) {
                onCreateInvoice();
              } else {
                setShowUpgradePrompt(true);
              }
            }}
            className="flex items-center justify-center gap-2 bg-teal-500 hover:bg-teal-600 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-teal-500/20"
          >
            <Plus size={18} />
            <span>New Invoice</span>
            {invoiceLimit !== null && (
              <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">
                {currentInvoiceCount}/{invoiceLimit}
              </span>
            )}
          </button>
        }
      />

      {/* Status Filter Tabs */}
      <div className="flex gap-1 pb-2 overflow-x-auto">
        {(['all', 'draft', 'unpaid', 'paid', 'overdue', 'recurring', 'credit_notes', 'cancelled'] as const)
          .filter(tab => tab === 'all' || tab === 'draft' || tab === 'unpaid' || tab === 'paid' || tab === 'overdue' || tabCounts[tab] > 0)
          .map(tab => {
          const label: Record<InvoiceFilterTab, string> = {
            all: 'All', draft: 'Draft', unpaid: 'Sent', paid: 'Paid', overdue: 'O/Due', recurring: 'Recur', credit_notes: 'Credits', cancelled: "Canc'd"
          };
          return (
          <button
            key={tab}
            onClick={() => {
              hapticTap();
              setActiveTab(tab);
            }}
            className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-wide transition-all whitespace-nowrap flex items-center justify-center gap-1 ${
              activeTab === tab
                ? tab === 'overdue'
                  ? 'bg-red-500 text-white shadow-md shadow-red-500/20'
                  : tab === 'paid'
                    ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                    : tab === 'recurring'
                      ? 'bg-purple-500 text-white shadow-md shadow-purple-500/20'
                      : tab === 'credit_notes'
                        ? 'bg-red-600 text-white shadow-md shadow-red-600/20'
                        : 'bg-slate-900 text-white shadow-md'
                : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
            }`}
          >
            {label[tab]}
            {tabCounts[tab] > 0 && (
              <span className={`text-[9px] min-w-[14px] text-center px-0.5 py-px rounded-full leading-none ${
                activeTab === tab
                  ? 'bg-white/20'
                  : tab === 'overdue' && tabCounts.overdue > 0
                    ? 'bg-red-100 text-red-600'
                    : tab === 'paid' && tabCounts.paid > 0
                      ? 'bg-emerald-100 text-emerald-600'
                      : tab === 'recurring' && tabCounts.recurring > 0
                        ? 'bg-purple-100 text-purple-600'
                        : tab === 'credit_notes' && tabCounts.credit_notes > 0
                          ? 'bg-red-100 text-red-600'
                          : 'bg-slate-100'
              }`}>
                {tabCounts[tab]}
              </span>
            )}
          </button>
          );
        })}
      </div>

      {/* Search, Date Filter, and Sort Row */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 hidden sm:block" size={20} />
          <input
            type="text"
            placeholder="Search invoices..."
            className="w-full bg-white border-2 border-slate-100 rounded-2xl py-4 px-4 sm:pl-12 pr-4 font-bold text-slate-900 focus:border-teal-200 outline-none shadow-sm transition-all"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Date / Tax Year Filter */}
        <div className="relative">
          <button
            onClick={() => {
              hapticTap();
              setShowDateDropdown(!showDateDropdown);
              setShowSortDropdown(false);
            }}
            className={`flex items-center gap-2 bg-white border-2 hover:border-slate-200 rounded-2xl px-3 py-4 font-bold text-sm transition-all ${
              dateFilter !== 'all' ? 'border-teal-300 text-teal-700' : 'border-slate-100 text-slate-700'
            }`}
          >
            <Calendar size={18} className={dateFilter !== 'all' ? 'text-teal-500' : 'text-slate-400'} />
            <span className="hidden sm:inline">{DATE_FILTER_OPTIONS.find(o => o.value === dateFilter)?.label}</span>
          </button>

          {showDateDropdown && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowDateDropdown(false)}
              />
              <div className="absolute right-0 top-full mt-2 bg-white rounded-2xl shadow-xl border-2 border-slate-100 py-2 z-50 min-w-[200px]">
                {DATE_FILTER_OPTIONS.map(option => (
                  <button
                    key={option.value}
                    onClick={() => {
                      hapticTap();
                      setDateFilter(option.value);
                      if (option.value !== 'custom') setShowDateDropdown(false);
                    }}
                    className={`w-full text-left px-4 py-2.5 text-sm font-bold transition-all ${
                      dateFilter === option.value
                        ? 'bg-teal-50 text-teal-700'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
                {dateFilter === 'custom' && (
                  <div className="px-4 py-3 border-t border-slate-100 space-y-2">
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase">From</label>
                      <input
                        type="date"
                        value={customDateFrom}
                        onChange={e => setCustomDateFrom(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase">To</label>
                      <input
                        type="date"
                        value={customDateTo}
                        onChange={e => setCustomDateTo(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium"
                      />
                    </div>
                    <button
                      onClick={() => setShowDateDropdown(false)}
                      className="w-full py-2 bg-teal-500 text-white rounded-lg font-bold text-sm hover:bg-teal-400 transition-colors"
                    >
                      Apply
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Sort Dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              hapticTap();
              setShowSortDropdown(!showSortDropdown);
              setShowDateDropdown(false);
            }}
            className="flex items-center gap-2 bg-white border-2 border-slate-100 hover:border-slate-200 rounded-2xl px-3 py-4 font-bold text-slate-700 transition-all"
          >
            <ArrowUpDown size={18} className="text-slate-400" />
            <span className="hidden sm:inline text-sm">{SORT_OPTIONS.find(o => o.value === sortBy)?.label}</span>
          </button>

          {showSortDropdown && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowSortDropdown(false)}
              />
              <div className="absolute right-0 top-full mt-2 bg-white rounded-2xl shadow-xl border-2 border-slate-100 py-2 z-50 min-w-[200px]">
                {SORT_OPTIONS.map(option => (
                  <button
                    key={option.value}
                    onClick={() => {
                      hapticTap();
                      setSortBy(option.value);
                      setShowSortDropdown(false);
                    }}
                    className={`w-full text-left px-4 py-2.5 text-sm font-bold transition-all ${
                      sortBy === option.value
                        ? 'bg-teal-50 text-teal-700'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Summary Tally */}
      <div className="flex items-center justify-between bg-slate-50 rounded-2xl px-5 py-4 border border-slate-100">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-teal-500 rounded-xl flex items-center justify-center">
            <ReceiptText size={18} className="text-white" />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Invoices</p>
            <p className="text-xl font-black text-slate-900">{filtered.length}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Combined Value</p>
          <p className="text-xl font-black text-teal-600">
            £{filtered.reduce((sum, q) => sum + calculateQuoteTotal(q), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="py-20 text-center bg-white rounded-[32px] border-2 border-dashed border-slate-100 opacity-60">
            <ReceiptText size={48} className="mx-auto text-slate-200 mb-4" />
            <p className="text-slate-400 font-black uppercase tracking-widest text-sm italic">
              {activeTab === 'all' && 'No invoices recorded yet.'}
              {activeTab === 'draft' && 'No draft invoices.'}
              {activeTab === 'unpaid' && 'No sent invoices.'}
              {activeTab === 'paid' && 'No paid invoices.'}
              {activeTab === 'overdue' && 'No overdue invoices.'}
              {activeTab === 'recurring' && 'No recurring invoices set up.'}
              {activeTab === 'credit_notes' && 'No credit notes issued.'}
              {activeTab === 'cancelled' && 'No cancelled invoices.'}
            </p>
          </div>
        ) : (
          filtered.map((invoice, idx) => {
            // Show group header in ALL tab
            const groupLabel = activeTab === 'all' ? (() => {
              const group = statusGroupOrder(invoice);
              const prevGroup = idx > 0 ? statusGroupOrder(filtered[idx - 1]) : -1;
              if (group !== prevGroup) {
                return group === 0 ? 'Drafts' : group === 1 ? 'Sent' : 'Paid';
              }
              return null;
            })() : null;
            const customer = customers.find(c => c.id === invoice.customerId);
            const isCN = invoice.isCreditNote === true;
            const prefix = isCN ? 'CN-' : (settings.invoicePrefix || 'INV-');
            const numStr = (invoice.referenceNumber || 1).toString().padStart(4, '0');
            const ref = `${prefix}${numStr}`;
            const isPaid = invoice.status === 'paid';
            const overdue = !isCN && isOverdue(invoice);
            const daysOverdue = getDaysOverdue(invoice);

            return (
              <React.Fragment key={invoice.id}>
                {groupLabel && (
                  <div className="flex items-center gap-3 pt-2 pb-1">
                    <span className={`text-[10px] font-black uppercase tracking-widest ${
                      groupLabel === 'Drafts' ? 'text-amber-500' : groupLabel === 'Sent' ? 'text-blue-500' : 'text-emerald-500'
                    }`}>{groupLabel}</span>
                    <div className="flex-1 h-px bg-slate-100" />
                  </div>
                )}
              <div
                onClick={() => onViewQuote(invoice.id)}
                className={`bg-white px-4 py-4 rounded-2xl border-2 transition-all group cursor-pointer shadow-sm hover:shadow-md ${
                  isCN
                    ? 'border-red-200 hover:border-red-400 bg-red-50/20'
                    : overdue
                      ? 'border-red-200 hover:border-red-400 bg-red-50/30'
                      : 'border-slate-100 hover:border-teal-500'
                }`}
              >
                {/* Top row: Reference badge + Amount + Status */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className={`text-white text-[10px] font-black px-2 py-1 rounded flex items-center gap-1 ${isCN ? 'bg-red-500' : 'bg-teal-500'}`}>
                      <Hash size={10} /> {ref}
                    </span>
                    {isCN && (
                      <span className="bg-red-100 text-red-700 text-[9px] font-black px-2 py-1 rounded">
                        CREDIT NOTE
                      </span>
                    )}
                    {invoice.isRecurring && (
                      <span className="bg-purple-500 text-white text-[9px] font-black px-2 py-1 rounded flex items-center gap-1">
                        <RefreshCw size={10} /> {invoice.recurringFrequency}
                      </span>
                    )}
                    {overdue && (
                      <span className="bg-red-500 text-white text-[9px] font-black px-2 py-1 rounded flex items-center gap-1">
                        <AlertTriangle size={10} /> {daysOverdue}d overdue
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className={`font-black text-base ${isCN ? 'text-red-600' : overdue ? 'text-red-700' : 'text-slate-900'}`}>
                        {isCN ? '-' : ''}£{calculateQuoteTotal(invoice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                      <div className={`text-[10px] font-bold uppercase ${
                        isCN ? 'text-red-500' : isPaid ? 'text-emerald-600' : overdue ? 'text-red-500' : invoice.status === 'sent' || invoice.status === 'accepted' ? 'text-blue-600' : invoice.status === 'draft' ? 'text-amber-600' : 'text-slate-400'
                      }`}>
                        {isCN ? 'Credit Note' : overdue ? 'Overdue' : invoice.status}
                      </div>
                    </div>
                    {onDeleteInvoice && (
                      <button
                        onClick={(e) => handleDelete(e, invoice)}
                        className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                        title="Delete invoice"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                    <ChevronRight size={20} className="text-slate-300 group-hover:text-teal-500 transition-all" />
                  </div>
                </div>

                {/* Title - full width, no truncation */}
                <h3 className={`font-bold text-base mb-2 transition-colors ${
                  overdue ? 'text-red-700 group-hover:text-red-600' : 'text-slate-900 group-hover:text-teal-600'
                }`}>
                  {invoice.title}
                </h3>

                {/* Customer info - stacked for clarity */}
                <div className="space-y-1 text-sm text-slate-600">
                  <p className="font-semibold">{customer?.name || 'Unknown'}</p>
                  {customer?.address && (
                    <p className="text-slate-400">{customer.address}</p>
                  )}
                  {invoice.dueDate && !isPaid && (
                    <p className={`text-sm ${overdue ? 'text-red-500 font-bold' : 'text-slate-400'}`}>
                      Due {new Date(invoice.dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                    </p>
                  )}
                  {invoice.isRecurring && invoice.recurringNextDate && (
                    <p className="text-sm text-purple-500">
                      Next: {new Date(invoice.recurringNextDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                    </p>
                  )}
                </div>
              </div>
              </React.Fragment>
            );
          })
        )}
      </div>

      {/* Upgrade Prompt for Free Tier Limit */}
      {showUpgradePrompt && invoiceLimit !== null && (
        <UpgradePrompt
          resourceName="invoices"
          currentCount={currentInvoiceCount}
          limit={invoiceLimit}
          onClose={() => setShowUpgradePrompt(false)}
        />
      )}
      <ConfirmDialog
        open={!!confirmDelete}
        title="Delete Invoice"
        message={`Delete invoice "${confirmDelete?.title}" for ${confirmDelete?.customerName}? This cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
};
