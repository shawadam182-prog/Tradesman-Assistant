import React, { useState, useEffect } from 'react';
import { RefreshCw, FileText, Clock, ChevronRight, Play, Loader2 } from 'lucide-react';
import { recurringInvoiceService, generateNextInvoice } from '../../src/services/recurringInvoiceService';
import type { Quote } from '../../types';
import { getQuoteGrandTotal } from '../../src/utils/quoteCalculations';
import { useData } from '../../src/contexts/DataContext';

interface RecurringInvoiceListProps {
  quotes: Quote[];
  onViewQuote: (id: string) => void;
  onGenerated?: () => void;
}

export const RecurringInvoiceList: React.FC<RecurringInvoiceListProps> = ({
  quotes,
  onViewQuote,
  onGenerated,
}) => {
  const { settings } = useData();
  const recurringQuotes = quotes.filter(q => q.isRecurring && q.type === 'invoice');
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [generatedCounts, setGeneratedCounts] = useState<Record<string, number>>({});

  // Load generated invoice counts
  useEffect(() => {
    recurringQuotes.forEach(async (q) => {
      try {
        const generated = await recurringInvoiceService.getGeneratedInvoices(q.id);
        setGeneratedCounts(prev => ({ ...prev, [q.id]: generated.length }));
      } catch {
        // ignore
      }
    });
  }, [quotes]);

  const handleGenerateNow = async (template: Quote) => {
    setGeneratingId(template.id);
    try {
      await generateNextInvoice(template);
      onGenerated?.();
    } catch (err) {
      console.error('Failed to generate invoice:', err);
    } finally {
      setGeneratingId(null);
    }
  };

  if (recurringQuotes.length === 0) {
    return (
      <div className="py-8 text-center text-slate-400">
        <RefreshCw size={32} className="mx-auto mb-3 opacity-30" />
        <p className="text-xs font-bold uppercase tracking-wider">No recurring invoices</p>
        <p className="text-[10px] mt-1">Set up recurring on any invoice to auto-generate</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {recurringQuotes.map(q => {
        const total = getQuoteGrandTotal(q, {
          enableVat: settings.enableVat ?? false,
          enableCis: settings.enableCis ?? false,
          defaultLabourRate: settings.defaultLabourRate ?? 0,
        });
        return (
          <div
            key={q.id}
            className="bg-white rounded-xl border border-slate-200 p-3 hover:border-purple-300 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <RefreshCw size={18} className="text-purple-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-900 truncate">{q.title}</span>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-purple-100 text-purple-700">
                    {q.recurringFrequency}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="text-xs font-bold text-slate-600">£{total.toFixed(2)}</span>
                  {q.recurringNextDate && (
                    <span className="text-[10px] text-slate-400 flex items-center gap-1">
                      <Clock size={10} /> Next: {new Date(q.recurringNextDate).toLocaleDateString('en-GB')}
                    </span>
                  )}
                  {generatedCounts[q.id] !== undefined && (
                    <span className="text-[10px] text-slate-400 flex items-center gap-1">
                      <FileText size={10} /> {generatedCounts[q.id]} generated
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handleGenerateNow(q)}
                  disabled={generatingId === q.id}
                  className="p-2 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 transition-colors"
                  title="Generate Now"
                >
                  {generatingId === q.id ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
                </button>
                <button
                  onClick={() => onViewQuote(q.id)}
                  className="p-2 bg-slate-50 text-slate-400 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
