import React from 'react';
import { X, Percent, PoundSterling } from 'lucide-react';

interface DiscountModalProps {
  isOpen: boolean;
  discountType?: 'percentage' | 'fixed';
  discountValue?: number;
  discountDescription?: string;
  subtotalWithMarkup: number;
  onTypeChange: (type: 'percentage' | 'fixed') => void;
  onValueChange: (value: number) => void;
  onDescriptionChange: (description: string) => void;
  onApply: () => void;
  onClose: () => void;
}

export const DiscountModal: React.FC<DiscountModalProps> = ({
  isOpen,
  discountType,
  discountValue,
  discountDescription,
  subtotalWithMarkup,
  onTypeChange,
  onValueChange,
  onDescriptionChange,
  onApply,
  onClose,
}) => {
  if (!isOpen) return null;

  const calculatedDiscount = discountValue && discountType
    ? (discountType === 'percentage' ? subtotalWithMarkup * (discountValue / 100) : discountValue)
    : 0;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-md p-6 animate-in zoom-in-95">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-black text-lg text-slate-900">Add Discount</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Discount Type */}
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">
              Discount Type
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => onTypeChange('percentage')}
                className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm transition-all ${
                  discountType === 'percentage'
                    ? 'bg-emerald-500 text-white'
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
              >
                <Percent size={16} className="inline mr-2" /> Percentage
              </button>
              <button
                onClick={() => onTypeChange('fixed')}
                className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm transition-all ${
                  discountType === 'fixed'
                    ? 'bg-emerald-500 text-white'
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
              >
                <PoundSterling size={16} className="inline mr-2" /> Fixed Amount
              </button>
            </div>
          </div>

          {/* Discount Value */}
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">
              {discountType === 'percentage' ? 'Percentage Off' : 'Amount Off (£)'}
            </label>
            <div className="flex items-center bg-slate-50 border-2 border-slate-100 rounded-xl px-4 focus-within:border-emerald-400 transition-all">
              {discountType === 'fixed' && <span className="text-slate-400 font-bold mr-2">£</span>}
              <input
                type="number"
                className="w-full bg-transparent py-4 outline-none text-slate-900 font-bold text-lg"
                value={discountValue || ''}
                onChange={e => onValueChange(parseFloat(e.target.value) || 0)}
                placeholder={discountType === 'percentage' ? '10' : '50.00'}
              />
              {discountType === 'percentage' && <span className="text-slate-400 font-bold">%</span>}
            </div>
          </div>

          {/* Discount Description */}
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">
              Reason (Optional)
            </label>
            <input
              type="text"
              className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 outline-none text-slate-900 font-medium focus:border-emerald-400 transition-all"
              value={discountDescription || ''}
              onChange={e => onDescriptionChange(e.target.value)}
              placeholder="e.g. Early payment, Returning customer"
            />
          </div>

          {/* Preview */}
          {discountValue && discountType && (
            <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
              <p className="text-sm text-emerald-700">
                Discount: <span className="font-bold">-£{calculatedDiscount.toFixed(2)}</span>
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
            disabled={!discountValue || !discountType}
            className="flex-1 py-3 bg-emerald-500 text-white rounded-xl font-bold hover:bg-emerald-600 transition-colors disabled:opacity-50"
          >
            Apply Discount
          </button>
        </div>
      </div>
    </div>
  );
};
