
import React, { useState } from 'react';
import { Quote } from '../types';
import { X, PoundSterling, CreditCard, Banknote, Building2, FileText, Calendar, CheckCircle2 } from 'lucide-react';
import { hapticTap, hapticSuccess } from '../src/hooks/useHaptic';

interface PaymentRecorderProps {
  invoice: Quote;
  invoiceTotal: number;
  onRecordPayment: (payment: {
    amount: number;
    method: 'cash' | 'card' | 'bank_transfer' | 'cheque';
    date: string;
    markAsPaid: boolean;
  }) => void;
  onClose: () => void;
}

const paymentMethods = [
  { id: 'bank_transfer', label: 'Bank Transfer', icon: Building2, color: 'blue' },
  { id: 'card', label: 'Card', icon: CreditCard, color: 'purple' },
  { id: 'cash', label: 'Cash', icon: Banknote, color: 'emerald' },
  { id: 'cheque', label: 'Cheque', icon: FileText, color: 'amber' },
] as const;

export const PaymentRecorder: React.FC<PaymentRecorderProps> = ({
  invoice,
  invoiceTotal,
  onRecordPayment,
  onClose
}) => {
  const amountOwed = invoiceTotal - (invoice.amountPaid || 0);
  const [amount, setAmount] = useState(amountOwed);
  const [method, setMethod] = useState<'cash' | 'card' | 'bank_transfer' | 'cheque'>('bank_transfer');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [markAsPaid, setMarkAsPaid] = useState(true);

  const handleSubmit = () => {
    hapticSuccess();
    onRecordPayment({
      amount,
      method,
      date,
      markAsPaid: markAsPaid && amount >= amountOwed
    });
  };

  const isFullPayment = amount >= amountOwed;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
      <div className="bg-white rounded-[32px] p-6 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-black text-slate-900">Record Payment</h3>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-1">
              {invoice.title}
            </p>
          </div>
          <button
            onClick={() => { hapticTap(); onClose(); }}
            className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <X size={20} className="text-slate-400" />
          </button>
        </div>

        {/* Amount Summary */}
        <div className="bg-slate-50 rounded-2xl p-4 mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-bold text-slate-400 uppercase">Invoice Total</span>
            <span className="text-sm font-black text-slate-600">£{invoiceTotal.toFixed(2)}</span>
          </div>
          {(invoice.amountPaid || 0) > 0 && (
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-bold text-emerald-500 uppercase">Already Paid</span>
              <span className="text-sm font-black text-emerald-600">-£{(invoice.amountPaid || 0).toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between items-center pt-2 border-t border-slate-200">
            <span className="text-xs font-bold text-slate-900 uppercase">Amount Owed</span>
            <span className="text-lg font-black text-slate-900">£{amountOwed.toFixed(2)}</span>
          </div>
        </div>

        {/* Payment Amount */}
        <div className="mb-6">
          <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">
            <PoundSterling size={12} className="inline mr-1" />
            Payment Amount
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg text-slate-400 font-bold">£</span>
            <input
              type="number"
              step="0.01"
              value={amount ? parseFloat(amount.toFixed(2)) : ''}
              onChange={e => setAmount(parseFloat(e.target.value) || 0)}
              className="w-full bg-white border-2 border-slate-200 rounded-xl p-4 pl-11 text-xl font-black text-slate-900 outline-none focus:border-emerald-400 transition-colors"
              placeholder="0.00"
            />
          </div>
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => { hapticTap(); setAmount(amountOwed); }}
              className="flex-1 py-2 bg-emerald-50 text-emerald-600 rounded-lg text-xs font-black uppercase hover:bg-emerald-100 transition-colors"
            >
              Full Amount
            </button>
            <button
              onClick={() => { hapticTap(); setAmount(amountOwed / 2); }}
              className="flex-1 py-2 bg-slate-50 text-slate-600 rounded-lg text-xs font-black uppercase hover:bg-slate-100 transition-colors"
            >
              50%
            </button>
          </div>
        </div>

        {/* Payment Method */}
        <div className="mb-6">
          <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">
            Payment Method
          </label>
          <div className="grid grid-cols-2 gap-2">
            {paymentMethods.map(pm => {
              const Icon = pm.icon;
              const isSelected = method === pm.id;
              return (
                <button
                  key={pm.id}
                  onClick={() => { hapticTap(); setMethod(pm.id); }}
                  className={`flex items-center gap-2 p-3 rounded-xl font-bold text-sm transition-all ${
                    isSelected
                      ? `bg-${pm.color}-500 text-white shadow-lg`
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                  }`}
                  style={isSelected ? {
                    backgroundColor: pm.color === 'blue' ? '#3b82f6' :
                                     pm.color === 'purple' ? '#a855f7' :
                                     pm.color === 'emerald' ? '#10b981' : '#f59e0b'
                  } : {}}
                >
                  <Icon size={18} />
                  {pm.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Payment Date */}
        <div className="mb-6">
          <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">
            <Calendar size={12} className="inline mr-1" />
            Date Received
          </label>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="w-full bg-white border-2 border-slate-200 rounded-xl p-3 font-bold text-slate-900 outline-none focus:border-emerald-400 transition-colors"
          />
        </div>

        {/* Mark as Paid checkbox */}
        {isFullPayment && (
          <label className="flex items-center gap-3 p-4 bg-emerald-50 rounded-xl mb-6 cursor-pointer group">
            <input
              type="checkbox"
              checked={markAsPaid}
              onChange={e => setMarkAsPaid(e.target.checked)}
              className="w-5 h-5 rounded border-emerald-300 text-emerald-500 focus:ring-emerald-500"
            />
            <div>
              <span className="font-bold text-emerald-700 group-hover:text-emerald-800">
                Mark invoice as paid
              </span>
              <p className="text-xs text-emerald-600">This payment settles the full amount</p>
            </div>
          </label>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={() => { hapticTap(); onClose(); }}
            className="flex-1 p-4 bg-slate-100 text-slate-600 rounded-xl font-black uppercase text-sm hover:bg-slate-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={amount <= 0}
            className="flex-1 p-4 bg-emerald-500 text-white rounded-xl font-black uppercase text-sm shadow-lg shadow-emerald-500/30 hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <CheckCircle2 size={18} />
            Record Payment
          </button>
        </div>
      </div>
    </div>
  );
};
