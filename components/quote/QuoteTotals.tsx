import React from 'react';
import { AppSettings } from '../../types';
import { hapticSuccess } from '../../src/hooks/useHaptic';

interface QuoteTotalsProps {
  totals: {
    materialsTotal: number;
    labourTotal: number;
    subtotal: number;
    markup: number;
    discount: number;
    tax: number;
    cis: number;
    total: number;
  };
  settings: AppSettings;
  documentType: 'estimate' | 'quotation' | 'invoice';
  onSave: () => void;
}

export const QuoteTotals: React.FC<QuoteTotalsProps> = ({
  totals,
  settings,
  documentType,
  onSave,
}) => {
  const handleSave = () => {
    hapticSuccess();
    onSave();
  };

  return (
    <>
      {/* Totals Summary Card */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-4 md:p-5 rounded-2xl shadow-xl border border-slate-700">
        <div className="flex justify-between items-center gap-4 mb-3">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-teal-400"></div>
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Document Total</span>
          </div>
          <span className="text-2xl md:text-3xl font-black tracking-tight">
            £{totals.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
        <div className="space-y-1 text-[10px] font-medium">
          <div className="flex justify-between gap-4 py-1 border-b border-slate-700/50">
            <span className="text-slate-400">Materials</span>
            <span className="text-slate-200">£{totals.materialsTotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between gap-4 py-1 border-b border-slate-700/50">
            <span className="text-slate-400">Labour</span>
            <span className="text-slate-200">£{totals.labourTotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between gap-4 py-1 border-b border-slate-700/50">
            <span className="text-slate-400">Subtotal</span>
            <span className="text-slate-200">£{totals.subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between gap-4 py-1 border-b border-slate-700/50">
            <span className="text-teal-400">Markup</span>
            <span className="text-teal-300">£{totals.markup.toFixed(2)}</span>
          </div>
          {totals.discount > 0 && (
            <div className="flex justify-between gap-4 py-1 border-b border-slate-700/50">
              <span className="text-emerald-400">Discount</span>
              <span className="text-emerald-300">-£{totals.discount.toFixed(2)}</span>
            </div>
          )}
          {settings.enableVat && (
            <div className="flex justify-between gap-4 py-1 border-b border-slate-700/50">
              <span className="text-blue-400">VAT</span>
              <span className="text-blue-300">£{totals.tax.toFixed(2)}</span>
            </div>
          )}
          {settings.enableCis && (
            <div className="flex justify-between gap-4 py-1">
              <span className="text-red-400">CIS</span>
              <span className="text-red-300">-£{totals.cis.toFixed(2)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Sticky Bottom Bar */}
      <div className="fixed bottom-[100px] md:bottom-0 left-0 right-0 bg-slate-900 text-white p-4 flex justify-between items-center shadow-2xl z-40 border-t border-slate-800">
        <div>
          <span className="text-[10px] text-slate-400 uppercase tracking-widest">Document Total</span>
          <p className="text-2xl font-black">
            £{totals.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
        <button
          onClick={handleSave}
          className="bg-teal-500 text-white px-6 py-3 rounded-xl font-black uppercase tracking-widest text-sm hover:bg-teal-400 transition-colors shadow-lg"
        >
          Save {documentType}
        </button>
      </div>
    </>
  );
};
