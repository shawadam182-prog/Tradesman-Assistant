
import React, { useState } from 'react';
import { Quote, Customer, AppSettings, TIER_LIMITS } from '../types';
import { ReceiptText, Search, CheckCircle2, AlertCircle, Plus, Hash, ChevronRight, Trash2, Clock, AlertTriangle, ArrowUpDown, RefreshCw } from 'lucide-react';
import { hapticTap } from '../src/hooks/useHaptic';
import { useToast } from '../src/contexts/ToastContext';
import { useSubscription } from '../src/hooks/useFeatureAccess';
import { UpgradePrompt } from './UpgradePrompt';
import { useData } from '../src/contexts/DataContext';
import { PageHeader } from './common/PageHeader';
import { ConfirmDialog } from './ConfirmDialog';
import { getQuoteGrandTotal } from '../src/utils/quoteCalculations';

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

  // Filter by tab status first
  const filterByTab = (invoice: Quote): boolean => {
    switch (activeTab) {
      case 'draft':
        return invoice.status === 'draft';
      case 'unpaid':
        // Unpaid: sent or accepted, not paid, not draft, not declined, and not overdue
        return invoice.status !== 'paid' &&
               invoice.status !== 'draft' &&
               invoice.status !== 'declined' &&
               !isOverdue(invoice);
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

  const filtered = sortInvoices(
    quotes.filter(q => {
      // First apply tab filter
      if (!filterByTab(q)) return false;

      // Then apply search filter
      const searchLower = searchTerm.toLowerCase();
      const customer = customers.find(c => c.id === q.customerId);
      return (
        q.title.toLowerCase().includes(searchLower) ||
        (customer?.name?.toLowerCase().includes(searchLower) ?? false) ||
        (customer?.company?.toLowerCase().includes(searchLower) ?? false)
      );
    })
  );

  // Count invoices for each tab (for badges)
  const tabCounts = {
    all: quotes.length,
    draft: quotes.filter(q => q.status === 'draft').length,
    unpaid: quotes.filter(q => q.status !== 'paid' && q.status !== 'draft' && q.status !== 'declined' && !isOverdue(q)).length,
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
            all: 'All', draft: 'Draft', unpaid: 'Unpaid', paid: 'Paid', overdue: 'Due', recurring: 'Recur', credit_notes: 'Credits', cancelled: "Canc'd"
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

      {/* Search and Sort Row */}
      <div className="flex gap-3">
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

        {/* Sort Dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              hapticTap();
              setShowSortDropdown(!showSortDropdown);
            }}
            className="flex items-center gap-2 bg-white border-2 border-slate-100 hover:border-slate-200 rounded-2xl px-4 py-4 font-bold text-slate-700 transition-all"
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
              {activeTab === 'unpaid' && 'No unpaid invoices.'}
              {activeTab === 'paid' && 'No paid invoices.'}
              {activeTab === 'overdue' && 'No overdue invoices.'}
              {activeTab === 'recurring' && 'No recurring invoices set up.'}
              {activeTab === 'credit_notes' && 'No credit notes issued.'}
              {activeTab === 'cancelled' && 'No cancelled invoices.'}
            </p>
          </div>
        ) : (
          filtered.map((invoice) => {
            const customer = customers.find(c => c.id === invoice.customerId);
            const isCN = invoice.isCreditNote === true;
            const prefix = isCN ? 'CN-' : (settings.invoicePrefix || 'INV-');
            const numStr = (invoice.referenceNumber || 1).toString().padStart(4, '0');
            const ref = `${prefix}${numStr}`;
            const isPaid = invoice.status === 'paid';
            const overdue = !isCN && isOverdue(invoice);
            const daysOverdue = getDaysOverdue(invoice);

            return (
              <div
                key={invoice.id}
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
                        {isCN ? '-' : ''}£{calculateQuoteTotal(invoice).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
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
