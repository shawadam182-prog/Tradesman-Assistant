import React from 'react';
import { X, Percent, PoundSterling } from 'lucide-react';

interface PartPaymentModalProps {
  isOpen: boolean;
  paymentType?: 'percentage' | 'fixed';
  paymentValue?: number;
  paymentLabel?: string;
  total: number;
  onTypeChange: (type: 'percentage' | 'fixed') => void;
  onValueChange: (value: number) => void;
  onLabelChange: (label: string) => void;
  onApply: () => void;
  onClose: () => void;
}

const PRESET_LABELS = ['Deposit', 'Stage 1 Payment', '50% Upfront', 'First Fix Payment'];

export const PartPaymentModal: React.FC<PartPaymentModalProps> = ({
  isOpen,
  paymentType,
  paymentValue,
  paymentLabel,
  total,
  onTypeChange,
  onValueChange,
  onLabelChange,
  onApply,
  onClose,
}) => {
  if (!isOpen) return null;

  const calculatedAmount = paymentValue && paymentType
    ? (paymentType === 'percentage' ? total * (paymentValue / 100) : paymentValue)
    : 0;

  const isCustomLabel = paymentLabel && !PRESET_LABELS.includes(paymentLabel);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-md p-6 animate-in zoom-in-95">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-black text-lg text-slate-900">Request Part Payment</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Payment Type */}
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">
              Payment Type
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => onTypeChange('percentage')}
                className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm transition-all ${
                  paymentType === 'percentage'
                    ? 'bg-blue-500 text-white'
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
              >
                <Percent size={16} className="inline mr-2" /> Percentage
              </button>
              <button
                onClick={() => onTypeChange('fixed')}
                className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm transition-all ${
                  paymentType === 'fixed'
                    ? 'bg-blue-500 text-white'
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
              >
                <PoundSterling size={16} className="inline mr-2" /> Fixed Amount
              </button>
            </div>
          </div>

          {/* Payment Value */}
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">
              {paymentType === 'percentage' ? 'Percentage Required' : 'Amount Required (£)'}
            </label>
            <div className="flex items-center bg-slate-50 border-2 border-slate-100 rounded-xl px-4 focus-within:border-blue-400 transition-all">
              {paymentType === 'fixed' && <span className="text-slate-400 font-bold mr-2">£</span>}
              <input
                type="number"
                className="w-full bg-transparent py-4 outline-none text-slate-900 font-bold text-lg"
                value={paymentValue || ''}
                onChange={e => onValueChange(parseFloat(e.target.value) || 0)}
                placeholder={paymentType === 'percentage' ? '50' : '500.00'}
              />
              {paymentType === 'percentage' && <span className="text-slate-400 font-bold">%</span>}
            </div>
          </div>

          {/* Payment Label */}
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">
              Payment Label
            </label>
            <select
              className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 outline-none text-slate-900 font-medium focus:border-blue-400 transition-all"
              value={isCustomLabel ? '' : (paymentLabel || '')}
              onChange={e => onLabelChange(e.target.value)}
            >
              <option value="">Select a label...</option>
              {PRESET_LABELS.map(label => (
                <option key={label} value={label}>{label}</option>
              ))}
            </select>
          </div>

          {/* Custom Label Input */}
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">
              Or Custom Label
            </label>
            <input
              type="text"
              className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 outline-none text-slate-900 font-medium focus:border-blue-400 transition-all"
              value={isCustomLabel ? paymentLabel : ''}
              onChange={e => onLabelChange(e.target.value)}
              placeholder="e.g. Materials Deposit"
            />
          </div>

          {/* Preview */}
          {paymentValue && paymentType && (
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
              <p className="text-sm text-blue-700">
                Amount Due Now: <span className="font-bold">£{calculatedAmount.toFixed(2)}</span>
                {paymentLabel && (
                  <span className="text-blue-500 ml-1">({paymentLabel})</span>
                )}
              </p>
            </div>
          )}
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onApply}
            disabled={!paymentValue || !paymentType || !paymentLabel}
            className="flex-1 py-3 bg-blue-500 text-white rounded-xl font-bold hover:bg-blue-600 transition-colors disabled:opacity-50"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
};
