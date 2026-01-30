
import React, { useState } from 'react';
import { Quote, Customer, AppSettings, TIER_LIMITS } from '../types';
import { FileText, Plus, Search, Hash, ChevronRight, Trash2, ArrowUpDown, ChevronDown } from 'lucide-react';
import { hapticTap } from '../src/hooks/useHaptic';
import { useToast } from '../src/contexts/ToastContext';
import { useSubscription } from '../src/hooks/useFeatureAccess';
import { UpgradePrompt } from './UpgradePrompt';
import { useData } from '../src/contexts/DataContext';
import { PageHeader } from './common/PageHeader';
import { getQuoteGrandTotal } from '../src/utils/quoteCalculations';
import { ConfirmDialog } from './ConfirmDialog';

interface QuotesListProps {
  quotes: Quote[];
  customers: Customer[];
  settings: AppSettings;
  onViewQuote: (id: string) => void;
  onEditQuote: (id: string) => void;
  onCreateQuote: () => void;
  onDeleteQuote?: (id: string) => Promise<void>;
  onBack?: () => void;
}

// Tab filter types for quotes
type QuoteFilterTab = 'all' | 'draft' | 'pending' | 'accepted' | 'declined';

// Sort options
type SortOption = 'updated_desc' | 'updated_asc' | 'created_desc' | 'created_asc' | 'amount_desc' | 'amount_asc' | 'customer_asc' | 'customer_desc' | 'title_asc' | 'title_desc';

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'updated_desc', label: 'Last Updated (Newest)' },
  { value: 'updated_asc', label: 'Last Updated (Oldest)' },
  { value: 'created_desc', label: 'Date Created (Newest)' },
  { value: 'created_asc', label: 'Date Created (Oldest)' },
  { value: 'amount_desc', label: 'Amount (Highest)' },
  { value: 'amount_asc', label: 'Amount (Lowest)' },
  { value: 'customer_asc', label: 'Customer (A-Z)' },
  { value: 'customer_desc', label: 'Customer (Z-A)' },
  { value: 'title_asc', label: 'Title (A-Z)' },
  { value: 'title_desc', label: 'Title (Z-A)' },
];

export const QuotesList: React.FC<QuotesListProps> = ({
  quotes, customers, settings, onViewQuote, onEditQuote, onCreateQuote, onDeleteQuote, onBack
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<QuoteFilterTab>('all');
  const [sortBy, setSortBy] = useState<SortOption>('updated_desc');
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; title: string; customerName: string } | null>(null);
  const toast = useToast();

  // Get all quotes (estimates + quotations) for limit checking
  const { quotes: allQuotes } = useData();
  const subscription = useSubscription();
  const limits = subscription.usageLimits || TIER_LIMITS[subscription.tier];
  const quoteLimit = limits.quotes;
  const currentQuoteCount = allQuotes.filter(q => q.type === 'estimate' || q.type === 'quotation').length;
  const canCreateQuote = quoteLimit === null || currentQuoteCount < quoteLimit;

  const handleDelete = (e: React.MouseEvent, quote: Quote) => {
    e.stopPropagation();
    hapticTap();
    const customer = customers.find(c => c.id === quote.customerId);
    setConfirmDelete({ id: quote.id, title: quote.title, customerName: customer?.name || 'Unknown' });
  };

  const handleConfirmDelete = async () => {
    if (!confirmDelete) return;
    const { id, title } = confirmDelete;
    setConfirmDelete(null);
    try {
      await onDeleteQuote?.(id);
      toast.success('Quote Deleted', `"${title}" has been removed`);
    } catch (err) {
      toast.error('Delete Failed', 'Could not delete quote');
    }
  };

  // Filter by tab status first
  const filterByTab = (quote: Quote): boolean => {
    switch (activeTab) {
      case 'draft':
        return quote.status === 'draft';
      case 'pending':
        return quote.status === 'sent';
      case 'accepted':
        return quote.status === 'accepted' || quote.status === 'invoiced';
      case 'declined':
        return quote.status === 'declined';
      case 'all':
      default:
        return true;
    }
  };

  // Sort function based on selected option
  const sortQuotes = (a: Quote, b: Quote): number => {
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
        return getQuoteGrandTotal(b, settings) - getQuoteGrandTotal(a, settings);
      case 'amount_asc':
        return getQuoteGrandTotal(a, settings) - getQuoteGrandTotal(b, settings);
      case 'customer_asc':
        return (customerA?.name || '').localeCompare(customerB?.name || '');
      case 'customer_desc':
        return (customerB?.name || '').localeCompare(customerA?.name || '');
      case 'title_asc':
        return a.title.localeCompare(b.title);
      case 'title_desc':
        return b.title.localeCompare(a.title);
      default:
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    }
  };

  const filtered = quotes
    .filter(q => {
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
    .sort(sortQuotes);

  // Count quotes for each tab (for badges)
  const tabCounts = {
    all: quotes.length,
    draft: quotes.filter(q => q.status === 'draft').length,
    pending: quotes.filter(q => q.status === 'sent').length,
    accepted: quotes.filter(q => q.status === 'accepted' || q.status === 'invoiced').length,
    declined: quotes.filter(q => q.status === 'declined').length,
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Estimates & Quotes"
        subtitle="Active project estimates and site proposals."
        onBack={onBack}
        actions={
          <button
            onClick={() => {
              if (canCreateQuote) {
                onCreateQuote();
              } else {
                setShowUpgradePrompt(true);
              }
            }}
            className="flex items-center justify-center gap-2 bg-teal-500 hover:bg-teal-600 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-teal-500/20"
          >
            <Plus size={18} />
            <span>New Estimate</span>
            {quoteLimit !== null && (
              <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">
                {currentQuoteCount}/{quoteLimit}
              </span>
            )}
          </button>
        }
      />

      {/* Status Filter Tabs */}
      <div className="flex gap-1 pb-2">
        {(['all', 'draft', 'pending', 'accepted', 'declined'] as const).map(tab => {
          const label: Record<QuoteFilterTab, string> = {
            all: 'All', draft: 'Draft', pending: 'Pending', accepted: 'Accepted', declined: "Dec'd"
          };
          return (
          <button
            key={tab}
            onClick={() => {
              hapticTap();
              setActiveTab(tab);
            }}
            className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-wide transition-all whitespace-nowrap flex items-center justify-center gap-1 ${activeTab === tab
                ? tab === 'declined'
                  ? 'bg-red-500 text-white shadow-md shadow-red-500/20'
                  : tab === 'accepted'
                    ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                    : 'bg-slate-900 text-white shadow-md'
                : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
              }`}
          >
            {label[tab]}
            {tabCounts[tab] > 0 && (
              <span className={`text-[9px] min-w-[14px] text-center px-0.5 py-px rounded-full leading-none ${activeTab === tab
                  ? 'bg-white/20'
                  : tab === 'declined' && tabCounts.declined > 0
                    ? 'bg-red-100 text-red-600'
                    : tab === 'accepted' && tabCounts.accepted > 0
                      ? 'bg-emerald-100 text-emerald-600'
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
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 hidden sm:block" size={20} />
          <input
            type="text"
            placeholder="Search quotes or customers..."
            className="w-full bg-white border-2 border-slate-100 rounded-2xl py-4 px-4 sm:pl-14 pr-4 font-bold text-slate-900 focus:border-teal-200 outline-none shadow-sm transition-all"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Sort Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowSortDropdown(!showSortDropdown)}
            className="h-full flex items-center gap-2 bg-white border-2 border-slate-100 rounded-2xl px-4 font-bold text-slate-600 hover:border-slate-200 transition-all shadow-sm"
          >
            <ArrowUpDown size={18} className="text-slate-400" />
            <span className="hidden md:inline text-sm">{SORT_OPTIONS.find(o => o.value === sortBy)?.label.split(' (')[0]}</span>
            <ChevronDown size={16} className="text-slate-400" />
          </button>

          {showSortDropdown && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowSortDropdown(false)} />
              <div className="absolute right-0 top-full mt-2 bg-white border border-slate-200 rounded-xl shadow-xl z-50 min-w-[200px] overflow-hidden">
                {SORT_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      setSortBy(option.value);
                      setShowSortDropdown(false);
                    }}
                    className={`w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 transition-colors ${
                      sortBy === option.value ? 'bg-teal-50 text-teal-700 font-bold' : 'text-slate-600'
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
          <div className="h-10 w-10 bg-slate-900 rounded-xl flex items-center justify-center">
            <FileText size={18} className="text-teal-500" />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Quotes</p>
            <p className="text-xl font-black text-slate-900">{filtered.length}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Combined Value</p>
          <p className="text-xl font-black text-teal-600">
            £{filtered.reduce((sum, q) => sum + getQuoteGrandTotal(q, settings), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="py-20 text-center bg-white rounded-[32px] border-2 border-dashed border-slate-100 opacity-60">
            <FileText size={48} className="mx-auto text-slate-200 mb-4" />
            <p className="text-slate-400 font-black uppercase tracking-widest text-sm italic">
              {activeTab === 'all' && 'No quotes found.'}
              {activeTab === 'draft' && 'No draft quotes.'}
              {activeTab === 'pending' && 'No pending quotes.'}
              {activeTab === 'accepted' && 'No accepted quotes.'}
              {activeTab === 'declined' && 'No declined quotes.'}
            </p>
          </div>
        ) : (
          filtered.map((quote) => {
            const customer = customers.find(c => c.id === quote.customerId);
            const prefix = settings.quotePrefix || 'EST-';
            const numStr = (quote.referenceNumber || 1).toString().padStart(4, '0');
            const ref = `${prefix}${numStr}`;

            // Status badge configuration
            const statusConfig: Record<string, { text: string; label: string }> = {
              draft: { text: 'text-slate-600', label: 'Draft' },
              sent: { text: 'text-blue-600', label: 'Pending' },
              accepted: { text: 'text-green-600', label: 'Accepted' },
              declined: { text: 'text-red-600', label: 'Declined' },
              invoiced: { text: 'text-emerald-600', label: 'Invoiced' },
            };
            const status = statusConfig[quote.status] || statusConfig.draft;

            return (
              <div
                key={quote.id}
                onClick={() => onViewQuote(quote.id)}
                className={`bg-white px-4 py-4 rounded-2xl border-2 transition-all group cursor-pointer shadow-sm hover:shadow-md ${quote.status === 'declined'
                    ? 'border-red-100 hover:border-red-300'
                    : quote.status === 'accepted'
                      ? 'border-green-100 hover:border-green-300'
                      : 'border-slate-100 hover:border-teal-500'
                  }`}
              >
                {/* Top row: Reference badge + Amount + Status */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="bg-slate-900 text-teal-500 text-[10px] font-black px-2 py-1 rounded flex items-center gap-1">
                      <Hash size={10} /> {ref}
                    </span>
                    <span className={`text-[10px] font-bold uppercase ${status.text}`}>
                      {status.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="font-black text-base text-slate-900">
                        £{getQuoteGrandTotal(quote, settings).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </p>
                      <p className="text-[10px] text-slate-400 font-medium">
                        {new Date(quote.updatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      </p>
                    </div>
                    {onDeleteQuote && (
                      <button
                        onClick={(e) => handleDelete(e, quote)}
                        className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                        title="Delete quote"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                    <ChevronRight size={20} className="text-slate-300 group-hover:text-teal-500 transition-all" />
                  </div>
                </div>

                {/* Title - full width, no truncation */}
                <h3 className="font-bold text-base mb-2 text-slate-900 group-hover:text-teal-600 transition-colors">
                  {quote.title}
                </h3>

                {/* Customer info - stacked for clarity */}
                <div className="space-y-1 text-sm text-slate-600">
                  <p className="font-semibold">{customer?.name || 'Unknown Client'}</p>
                  {customer?.address && (
                    <p className="text-slate-400">{customer.address}</p>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Upgrade Prompt for Free Tier Limit */}
      {showUpgradePrompt && quoteLimit !== null && (
        <UpgradePrompt
          resourceName="quotes"
          currentCount={currentQuoteCount}
          limit={quoteLimit}
          onClose={() => setShowUpgradePrompt(false)}
        />
      )}
      <ConfirmDialog
        open={!!confirmDelete}
        title="Delete Quote"
        message={`Delete quote "${confirmDelete?.title}" for ${confirmDelete?.customerName}? This cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
};
