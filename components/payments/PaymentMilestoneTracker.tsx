import React from 'react';
import { Check, Clock, FileText, Banknote } from 'lucide-react';
import type { PaymentMilestone } from '../../types';

interface PaymentMilestoneTrackerProps {
  milestones: PaymentMilestone[];
  totalAmount: number;
  onMarkPaid?: (milestoneId: string) => void;
  onGenerateInvoice?: (milestone: PaymentMilestone) => void;
  compact?: boolean;
}

const STATUS_ICONS: Record<string, React.ReactNode> = {
  pending: <Clock size={14} className="text-slate-400" />,
  invoiced: <FileText size={14} className="text-blue-500" />,
  paid: <Check size={14} className="text-emerald-500" />,
};

export const PaymentMilestoneTracker: React.FC<PaymentMilestoneTrackerProps> = ({
  milestones,
  totalAmount,
  onMarkPaid,
  onGenerateInvoice,
  compact = false,
}) => {
  if (milestones.length === 0) return null;

  const paidAmount = milestones
    .filter(m => m.status === 'paid')
    .reduce((s, m) => s + (m.fixedAmount || (m.percentage ? m.percentage / 100 * totalAmount : 0)), 0);
  const paidPercent = totalAmount > 0 ? (paidAmount / totalAmount) * 100 : 0;

  if (compact) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
        <Banknote size={14} className="text-blue-600 flex-shrink-0" />
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-800">
              {milestones.filter(m => m.status === 'paid').length}/{milestones.length} payments
            </span>
            <span className="text-xs font-bold text-blue-600">£{paidAmount.toFixed(2)} / £{totalAmount.toFixed(2)}</span>
          </div>
          <div className="w-full bg-blue-200 rounded-full h-1.5 mt-1">
            <div className="bg-blue-600 h-1.5 rounded-full transition-all" style={{ width: `${Math.min(100, paidPercent)}%` }} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Banknote size={14} className="text-slate-500" />
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Payment Schedule</h4>
        </div>
        <span className="text-xs font-bold text-blue-600">£{paidAmount.toFixed(2)} / £{totalAmount.toFixed(2)}</span>
      </div>

      {/* Progress bar */}
      <div className="px-4 py-2">
        <div className="w-full bg-slate-100 rounded-full h-2">
          <div className="bg-emerald-500 h-2 rounded-full transition-all" style={{ width: `${Math.min(100, paidPercent)}%` }} />
        </div>
      </div>

      {/* Milestone list */}
      <div className="divide-y divide-slate-100">
        {milestones.map(milestone => {
          const amount = milestone.fixedAmount || (milestone.percentage ? milestone.percentage / 100 * totalAmount : 0);
          return (
            <div key={milestone.id} className="px-4 py-3 flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                milestone.status === 'paid' ? 'bg-emerald-100' :
                milestone.status === 'invoiced' ? 'bg-blue-100' : 'bg-slate-100'
              }`}>
                {STATUS_ICONS[milestone.status]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-900">{milestone.label}</span>
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                    milestone.status === 'paid' ? 'bg-emerald-100 text-emerald-700' :
                    milestone.status === 'invoiced' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {milestone.status}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs font-bold text-slate-600">£{amount.toFixed(2)}</span>
                  {milestone.percentage && <span className="text-[10px] text-slate-400">({milestone.percentage}%)</span>}
                  {milestone.dueDate && (
                    <span className="text-[10px] text-slate-400">Due: {new Date(milestone.dueDate).toLocaleDateString('en-GB')}</span>
                  )}
                  {milestone.paidAt && (
                    <span className="text-[10px] text-emerald-600">Paid: {new Date(milestone.paidAt).toLocaleDateString('en-GB')}</span>
                  )}
                </div>
              </div>
              {milestone.status === 'pending' && onGenerateInvoice && (
                <button
                  onClick={() => onGenerateInvoice(milestone)}
                  className="px-2 py-1 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-bold hover:bg-blue-100 transition-colors"
                >
                  Invoice
                </button>
              )}
              {milestone.status === 'invoiced' && onMarkPaid && (
                <button
                  onClick={() => onMarkPaid(milestone.id)}
                  className="px-2 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-[10px] font-bold hover:bg-emerald-100 transition-colors"
                >
                  Mark Paid
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
