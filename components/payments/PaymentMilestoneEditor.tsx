import React, { useState } from 'react';
import { Plus, Trash2, GripVertical, Percent, PoundSterling, Calendar } from 'lucide-react';

export interface MilestoneData {
  id: string;
  label: string;
  percentage?: number;
  fixedAmount?: number;
  dueDate?: string;
}

interface PaymentMilestoneEditorProps {
  milestones: MilestoneData[];
  onChange: (milestones: MilestoneData[]) => void;
  totalAmount: number;
}

export const PaymentMilestoneEditor: React.FC<PaymentMilestoneEditorProps> = ({
  milestones,
  onChange,
  totalAmount,
}) => {
  const [usePercentage, setUsePercentage] = useState(true);

  const addMilestone = () => {
    const remaining = usePercentage
      ? 100 - milestones.reduce((s, m) => s + (m.percentage || 0), 0)
      : totalAmount - milestones.reduce((s, m) => s + (m.fixedAmount || 0), 0);

    onChange([
      ...milestones,
      {
        id: Math.random().toString(36).substr(2, 9),
        label: `Payment ${milestones.length + 1}`,
        percentage: usePercentage ? Math.max(0, remaining) : undefined,
        fixedAmount: !usePercentage ? Math.max(0, remaining) : undefined,
      },
    ]);
  };

  const updateMilestone = (id: string, updates: Partial<MilestoneData>) => {
    onChange(milestones.map(m => m.id === id ? { ...m, ...updates } : m));
  };

  const removeMilestone = (id: string) => {
    onChange(milestones.filter(m => m.id !== id));
  };

  const totalPercent = milestones.reduce((s, m) => s + (m.percentage || 0), 0);
  const totalFixed = milestones.reduce((s, m) => s + (m.fixedAmount || 0), 0);
  const isValid = usePercentage ? Math.abs(totalPercent - 100) < 0.01 : Math.abs(totalFixed - totalAmount) < 0.01;

  return (
    <div className="space-y-3">
      {/* Mode toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setUsePercentage(true)}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-colors ${
            usePercentage ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500'
          }`}
        >
          <Percent size={14} /> Percentage
        </button>
        <button
          onClick={() => setUsePercentage(false)}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-colors ${
            !usePercentage ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500'
          }`}
        >
          <PoundSterling size={14} /> Fixed Amount
        </button>
      </div>

      {/* Milestones */}
      <div className="space-y-2">
        {milestones.map((milestone, idx) => (
          <div key={milestone.id} className="flex items-start gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100">
            <GripVertical size={16} className="text-slate-300 mt-2 flex-shrink-0" />
            <div className="flex-1 grid grid-cols-12 gap-2">
              {/* Label */}
              <div className="col-span-12 md:col-span-4">
                <input
                  type="text"
                  value={milestone.label}
                  onChange={(e) => updateMilestone(milestone.id, { label: e.target.value })}
                  placeholder="e.g. Deposit"
                  className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              {/* Amount */}
              <div className="col-span-6 md:col-span-3">
                <div className="relative">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                    {usePercentage ? '%' : '£'}
                  </span>
                  <input
                    type="number"
                    value={usePercentage ? (milestone.percentage ?? '') : (milestone.fixedAmount ?? '')}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      updateMilestone(milestone.id, usePercentage ? { percentage: val } : { fixedAmount: val });
                    }}
                    className="w-full pl-6 pr-2 py-1.5 border border-slate-200 rounded-lg text-sm text-right focus:outline-none focus:ring-1 focus:ring-blue-500"
                    min="0"
                    step={usePercentage ? '5' : '0.01'}
                  />
                </div>
              </div>
              {/* Computed amount */}
              <div className="col-span-3 md:col-span-2 flex items-center">
                <span className="text-xs font-bold text-slate-500">
                  = £{(usePercentage
                    ? ((milestone.percentage || 0) / 100 * totalAmount)
                    : (milestone.fixedAmount || 0)
                  ).toFixed(2)}
                </span>
              </div>
              {/* Due date */}
              <div className="col-span-9 md:col-span-3">
                <div className="relative">
                  <Calendar size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="date"
                    value={milestone.dueDate || ''}
                    onChange={(e) => updateMilestone(milestone.id, { dueDate: e.target.value })}
                    className="w-full pl-7 pr-2 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
            <button
              onClick={() => removeMilestone(milestone.id)}
              className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg transition-colors flex-shrink-0 mt-1"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>

      {/* Add button */}
      <button
        onClick={addMilestone}
        className="w-full flex items-center justify-center gap-2 py-2.5 bg-white border-2 border-dashed border-slate-200 rounded-xl text-slate-500 text-sm font-bold hover:border-blue-300 hover:text-blue-600 transition-colors"
      >
        <Plus size={16} />
        Add Milestone
      </button>

      {/* Validation */}
      {milestones.length > 0 && (
        <div className={`flex items-center justify-between p-2.5 rounded-xl border text-xs font-bold ${
          isValid ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-amber-50 border-amber-200 text-amber-700'
        }`}>
          <span>Total: {usePercentage ? `${totalPercent.toFixed(0)}%` : `£${totalFixed.toFixed(2)}`}</span>
          <span>{isValid ? 'Adds up correctly' : usePercentage ? 'Should total 100%' : `Should total £${totalAmount.toFixed(2)}`}</span>
        </div>
      )}
    </div>
  );
};
