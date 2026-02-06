import React from 'react';
import { RefreshCw, Calendar, X } from 'lucide-react';
import { getNextDate } from '../../src/services/recurringInvoiceService';

interface RecurringInvoiceSetupProps {
  isRecurring: boolean;
  frequency?: 'weekly' | 'fortnightly' | 'monthly' | 'quarterly' | 'annually';
  startDate?: string;
  endDate?: string;
  onToggle: (enabled: boolean) => void;
  onFrequencyChange: (freq: 'weekly' | 'fortnightly' | 'monthly' | 'quarterly' | 'annually') => void;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string | undefined) => void;
}

const FREQUENCY_OPTIONS: { value: 'weekly' | 'fortnightly' | 'monthly' | 'quarterly' | 'annually'; label: string }[] = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'fortnightly', label: 'Fortnightly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'annually', label: 'Annually' },
];

export const RecurringInvoiceSetup: React.FC<RecurringInvoiceSetupProps> = ({
  isRecurring,
  frequency = 'monthly',
  startDate,
  endDate,
  onToggle,
  onFrequencyChange,
  onStartDateChange,
  onEndDateChange,
}) => {
  const today = new Date().toISOString().split('T')[0];
  const effectiveStart = startDate || today;

  // Preview next 3 dates
  const previewDates: string[] = [];
  if (isRecurring) {
    let nextDate = effectiveStart;
    for (let i = 0; i < 3; i++) {
      nextDate = getNextDate(nextDate, frequency);
      if (endDate && new Date(nextDate) > new Date(endDate)) break;
      previewDates.push(nextDate);
    }
  }

  return (
    <div className="space-y-3">
      {/* Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <RefreshCw size={16} className="text-purple-500" />
          <div>
            <p className="text-sm font-bold text-slate-900">Make Recurring</p>
            <p className="text-[10px] text-slate-500">Auto-generate this invoice on a schedule</p>
          </div>
        </div>
        <button
          onClick={() => onToggle(!isRecurring)}
          className={`relative w-11 h-6 rounded-full transition-colors ${isRecurring ? 'bg-purple-500' : 'bg-slate-200'}`}
        >
          <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${isRecurring ? 'left-[22px]' : 'left-0.5'}`} />
        </button>
      </div>

      {isRecurring && (
        <div className="pl-7 space-y-3">
          {/* Frequency */}
          <div>
            <p className="text-xs text-slate-500 mb-1.5">Frequency</p>
            <div className="flex flex-wrap gap-1.5">
              {FREQUENCY_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => onFrequencyChange(opt.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                    frequency === opt.value
                      ? 'bg-purple-500 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Start Date</label>
              <div className="relative">
                <Calendar size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="date"
                  value={effectiveStart}
                  onChange={(e) => onStartDateChange(e.target.value)}
                  className="w-full pl-8 pr-2 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">
                End Date <span className="text-slate-300">(optional)</span>
              </label>
              <div className="relative">
                <Calendar size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="date"
                  value={endDate || ''}
                  onChange={(e) => onEndDateChange(e.target.value || undefined)}
                  className="w-full pl-8 pr-2 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
                {endDate && (
                  <button
                    onClick={() => onEndDateChange(undefined)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Preview */}
          {previewDates.length > 0 && (
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-3">
              <p className="text-[10px] font-bold text-purple-700 uppercase tracking-wider mb-1.5">Next invoices will be generated:</p>
              <div className="flex flex-wrap gap-1.5">
                {previewDates.map((date, idx) => (
                  <span key={idx} className="px-2 py-1 bg-white text-purple-700 rounded-lg text-xs font-bold border border-purple-100">
                    {new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                ))}
                {!endDate && <span className="px-2 py-1 text-purple-400 text-xs italic">...ongoing</span>}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
