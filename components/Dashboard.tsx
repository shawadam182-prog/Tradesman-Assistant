
import React from 'react';
import { Quote, Customer } from '../types';
import { Plus, FileText, TrendingUp, Clock, CheckCircle, MoreVertical, Eye } from 'lucide-react';

interface DashboardProps {
  quotes: Quote[];
  customers: Customer[];
  onEditQuote: (id: string) => void;
  onCreateQuote: () => void;
  onViewQuote: (id: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ 
  quotes, customers, onEditQuote, onCreateQuote, onViewQuote 
}) => {
  const calculateQuoteTotal = (quote: Quote) => {
    // Fix: Aggregate totals from all sections instead of accessing items directly on the quote
    const sections = quote.sections || [];
    const materialsTotal = sections.reduce((sum, section) => 
      sum + (section.items || []).reduce((itemSum, item) => itemSum + (item.totalPrice || 0), 0), 0);
    const labourHoursTotal = sections.reduce((sum, section) => sum + (section.labourHours || 0), 0);
    const labourTotal = labourHoursTotal * (quote.labourRate || 0);
    
    const subtotal = materialsTotal + labourTotal;
    const markup = subtotal * (quote.markupPercent / 100);
    const tax = (subtotal + markup) * (quote.taxPercent / 100);
    return subtotal + markup + tax;
  };

  const stats = [
    { label: 'Total Quotes', value: quotes.length, icon: FileText, color: 'text-blue-700', bg: 'bg-blue-100' },
    { label: 'Pending Jobs', value: quotes.filter(q => q.status === 'draft' || q.status === 'sent').length, icon: Clock, color: 'text-amber-700', bg: 'bg-amber-100' },
    { label: 'Closed/Accepted', value: quotes.filter(q => q.status === 'accepted').length, icon: CheckCircle, color: 'text-green-700', bg: 'bg-green-100' },
    { 
      label: 'Accepted Revenue', 
      value: `£${quotes.filter(q => q.status === 'accepted').reduce((sum, q) => sum + calculateQuoteTotal(q), 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`, 
      icon: TrendingUp, 
      color: 'text-emerald-700', 
      bg: 'bg-emerald-100' 
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Job Dashboard</h2>
          <p className="text-slate-700 font-medium">Manage your active construction estimates</p>
        </div>
        <button
          onClick={onCreateQuote}
          className="flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-8 py-4 rounded-2xl font-black text-lg transition-all shadow-xl shadow-amber-500/25"
        >
          <Plus size={24} />
          <span>New Quote</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex items-center gap-5">
            <div className={`${stat.bg} ${stat.color} p-4 rounded-2xl shadow-inner`}>
              <stat.icon size={28} />
            </div>
            <div>
              <p className="text-xs text-slate-600 font-black uppercase tracking-wider">{stat.label}</p>
              <p className="text-2xl font-black text-slate-900">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h3 className="font-black text-slate-900 text-xl uppercase tracking-tight">Recent Estimates</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-100/50 border-b border-slate-200">
                <th className="px-8 py-4 text-xs font-black text-slate-900 uppercase tracking-widest">Project</th>
                <th className="px-8 py-4 text-xs font-black text-slate-900 uppercase tracking-widest">Customer</th>
                <th className="px-8 py-4 text-xs font-black text-slate-900 uppercase tracking-widest">Status</th>
                <th className="px-8 py-4 text-xs font-black text-slate-900 uppercase tracking-widest text-right">Total</th>
                <th className="px-8 py-4 text-xs font-black text-slate-900 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {quotes.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-8 py-20 text-center text-slate-500 font-bold italic">
                    No quotes found. Tap "New Quote" to get started.
                  </td>
                </tr>
              ) : (
                quotes.slice().reverse().map((quote) => {
                  const customer = customers.find(c => c.id === quote.customerId);
                  const statusColors = {
                    draft: 'bg-slate-200 text-slate-900',
                    sent: 'bg-blue-600 text-white',
                    accepted: 'bg-green-600 text-white',
                    declined: 'bg-red-600 text-white',
                    invoiced: 'bg-emerald-100 text-emerald-600',
                    paid: 'bg-emerald-500 text-white',
                  };
                  return (
                    <tr key={quote.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="px-8 py-6">
                        <p className="font-black text-slate-950 text-lg leading-tight">{quote.title}</p>
                        <p className="text-xs text-slate-600 font-bold mt-1 uppercase tracking-tighter">{quote.date}</p>
                      </td>
                      <td className="px-8 py-6">
                        <p className="font-bold text-slate-900">{customer?.name || 'Unknown'}</p>
                        {customer?.company && <p className="text-xs text-amber-600 font-bold">{customer.company}</p>}
                      </td>
                      <td className="px-8 py-6">
                        <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-sm ${statusColors[quote.status]}`}>
                          {quote.status}
                        </span>
                      </td>
                      <td className="px-8 py-6 font-black text-slate-950 text-right text-lg">
                        £{calculateQuoteTotal(quote).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-8 py-6 text-right">
                        <div className="flex justify-end gap-2">
                          <button 
                            onClick={() => onViewQuote(quote.id)}
                            className="p-3 bg-amber-50 hover:bg-amber-100 rounded-xl text-amber-600 transition-colors shadow-sm"
                            title="View Quote"
                          >
                            <Eye size={22} />
                          </button>
                          <button 
                            onClick={() => onEditQuote(quote.id)}
                            className="p-3 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-700 transition-colors shadow-sm"
                            title="Edit Quote"
                          >
                            <MoreVertical size={22} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
