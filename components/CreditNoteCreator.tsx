import React, { useState, useMemo } from 'react';
import { ArrowLeft, Minus, AlertTriangle, Check } from 'lucide-react';
import type { Quote, QuoteSection, Customer, AppSettings } from '../types';
import { getQuoteGrandTotal } from '../src/utils/quoteCalculations';

interface CreditNoteCreatorProps {
  originalInvoice: Quote;
  customer: Customer;
  settings: AppSettings;
  onSave: (creditNote: Quote) => void;
  onCancel: () => void;
}

export const CreditNoteCreator: React.FC<CreditNoteCreatorProps> = ({
  originalInvoice,
  customer,
  settings,
  onSave,
  onCancel,
}) => {
  const [reason, setReason] = useState('');
  const [creditType, setCreditType] = useState<'full' | 'partial'>('full');
  // Deep clone sections for editing
  const [sections, setSections] = useState<QuoteSection[]>(() =>
    JSON.parse(JSON.stringify(originalInvoice.sections))
  );

  const originalTotal = useMemo(() =>
    getQuoteGrandTotal(originalInvoice, {
      enableVat: settings.enableVat ?? false,
      enableCis: settings.enableCis ?? false,
      defaultLabourRate: settings.defaultLabourRate ?? 0,
    }),
    [originalInvoice, settings]
  );

  const creditNoteQuote = useMemo<Quote>(() => ({
    ...originalInvoice,
    id: '', // New quote
    sections: creditType === 'full' ? originalInvoice.sections : sections,
    isCreditNote: true,
    originalInvoiceId: originalInvoice.id,
    creditNoteReason: reason,
    status: 'paid' as const, // Credit notes are immediately effective
    date: new Date().toISOString().split('T')[0],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    referenceNumber: undefined, // Will be auto-assigned
    parentQuoteId: undefined,
    shareToken: undefined,
    acceptedAt: undefined,
    declinedAt: undefined,
    isRecurring: false,
  }), [originalInvoice, sections, creditType, reason]);

  const creditTotal = useMemo(() =>
    getQuoteGrandTotal(creditNoteQuote, {
      enableVat: settings.enableVat ?? false,
      enableCis: settings.enableCis ?? false,
      defaultLabourRate: settings.defaultLabourRate ?? 0,
    }),
    [creditNoteQuote, settings]
  );

  const updateItemQuantity = (sectionIdx: number, itemIdx: number, qty: number) => {
    setSections(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      const item = next[sectionIdx].items[itemIdx];
      item.quantity = Math.max(0, qty);
      item.totalPrice = item.quantity * item.unitPrice;
      return next;
    });
  };

  const updateSectionLabourHours = (sectionIdx: number, hours: number) => {
    setSections(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      next[sectionIdx].labourHours = Math.max(0, hours);
      return next;
    });
  };

  const handleSave = () => {
    if (creditTotal <= 0) return;
    onSave(creditNoteQuote);
  };

  const invoiceRef = `${settings.invoicePrefix || 'INV-'}${(originalInvoice.referenceNumber || 1).toString().padStart(4, '0')}`;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onCancel} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
          <ArrowLeft size={20} className="text-slate-600" />
        </button>
        <div>
          <h1 className="text-xl font-black text-slate-900">Issue Credit Note</h1>
          <p className="text-sm text-slate-500">Against {invoiceRef} — {customer.name}</p>
        </div>
      </div>

      {/* Warning Banner */}
      <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-2xl">
        <AlertTriangle size={20} className="text-amber-500 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-bold text-amber-800">Credit notes cannot be edited after creation</p>
          <p className="text-xs text-amber-600 mt-0.5">This will create a negative invoice linked to {invoiceRef}. It will reduce the outstanding balance and affect financial reports.</p>
        </div>
      </div>

      {/* Credit Type */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
        <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Credit Amount</h3>
        <div className="flex gap-3">
          <button
            onClick={() => setCreditType('full')}
            className={`flex-1 py-3 rounded-xl text-sm font-bold transition-colors border ${
              creditType === 'full'
                ? 'bg-red-500 text-white border-red-500 shadow-lg shadow-red-500/20'
                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
            }`}
          >
            Full Credit
          </button>
          <button
            onClick={() => setCreditType('partial')}
            className={`flex-1 py-3 rounded-xl text-sm font-bold transition-colors border ${
              creditType === 'partial'
                ? 'bg-red-500 text-white border-red-500 shadow-lg shadow-red-500/20'
                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
            }`}
          >
            Partial Credit
          </button>
        </div>
      </div>

      {/* Partial: Adjust line items */}
      {creditType === 'partial' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-3 bg-slate-50 border-b border-slate-200">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Adjust Quantities</h3>
            <p className="text-xs text-slate-500 mt-0.5">Set quantities to 0 to exclude items from the credit</p>
          </div>
          <div className="divide-y divide-slate-100">
            {sections.map((section, sIdx) => (
              <div key={section.id} className="p-4 space-y-3">
                <h4 className="text-sm font-bold text-slate-800">{section.title}</h4>

                {/* Material items */}
                {section.items.filter(i => !i.isHeading).map((item, iIdx) => (
                  <div key={item.id} className="flex items-center gap-3 pl-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-700 truncate">{item.name}</p>
                      <p className="text-xs text-slate-400">£{item.unitPrice.toFixed(2)} / {item.unit}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => updateItemQuantity(sIdx, section.items.indexOf(item), item.quantity - 1)}
                        className="w-8 h-8 flex items-center justify-center bg-slate-100 rounded-lg text-slate-600 hover:bg-slate-200 active:bg-slate-300 transition-colors"
                      >
                        <Minus size={14} />
                      </button>
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateItemQuantity(sIdx, section.items.indexOf(item), Number(e.target.value) || 0)}
                        className="w-16 text-center py-1.5 border border-slate-200 rounded-lg text-sm font-bold"
                        min={0}
                      />
                      <button
                        onClick={() => updateItemQuantity(sIdx, section.items.indexOf(item), item.quantity + 1)}
                        className="w-8 h-8 flex items-center justify-center bg-slate-100 rounded-lg text-slate-600 hover:bg-slate-200 active:bg-slate-300 transition-colors"
                      >
                        +
                      </button>
                    </div>
                    <span className="text-sm font-bold text-slate-900 w-20 text-right">
                      £{item.totalPrice.toFixed(2)}
                    </span>
                  </div>
                ))}

                {/* Labour hours */}
                {(section.labourHours > 0 || (section.labourItems && section.labourItems.length > 0)) && (
                  <div className="flex items-center gap-3 pl-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-700">Labour</p>
                      <p className="text-xs text-slate-400">
                        £{(section.labourRate || originalInvoice.labourRate).toFixed(2)} / hr
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => updateSectionLabourHours(sIdx, section.labourHours - 1)}
                        className="w-8 h-8 flex items-center justify-center bg-slate-100 rounded-lg text-slate-600 hover:bg-slate-200 active:bg-slate-300 transition-colors"
                      >
                        <Minus size={14} />
                      </button>
                      <input
                        type="number"
                        value={section.labourHours}
                        onChange={(e) => updateSectionLabourHours(sIdx, Number(e.target.value) || 0)}
                        className="w-16 text-center py-1.5 border border-slate-200 rounded-lg text-sm font-bold"
                        min={0}
                      />
                      <button
                        onClick={() => updateSectionLabourHours(sIdx, section.labourHours + 1)}
                        className="w-8 h-8 flex items-center justify-center bg-slate-100 rounded-lg text-slate-600 hover:bg-slate-200 active:bg-slate-300 transition-colors"
                      >
                        +
                      </button>
                    </div>
                    <span className="text-sm font-bold text-slate-900 w-20 text-right">
                      £{(section.labourHours * (section.labourRate || originalInvoice.labourRate)).toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reason */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
        <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Reason for Credit</h3>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. Customer overcharged, work not completed, goodwill discount..."
          className="w-full p-3 border border-slate-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
          rows={3}
        />
      </div>

      {/* Summary */}
      <div className="bg-red-50 rounded-2xl border border-red-200 p-5 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-red-700">Original Invoice Total</span>
          <span className="text-sm font-bold text-slate-900">£{originalTotal.toFixed(2)}</span>
        </div>
        <div className="flex items-center justify-between border-t border-red-200 pt-3">
          <span className="text-base font-black text-red-800">Credit Note Total</span>
          <span className="text-xl font-black text-red-700">-£{creditTotal.toFixed(2)}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pb-8">
        <button
          onClick={onCancel}
          className="flex-1 py-3.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={creditTotal <= 0}
          className="flex-1 py-3.5 bg-red-500 text-white rounded-xl text-sm font-bold hover:bg-red-600 disabled:bg-red-300 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-red-500/20"
        >
          <Check size={16} /> Issue Credit Note
        </button>
      </div>
    </div>
  );
};
