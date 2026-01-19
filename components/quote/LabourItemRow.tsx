import React from 'react';
import { LabourItem } from '../../types';
import { Plus, Minus, Trash2 } from 'lucide-react';

interface LabourItemRowProps {
  item: LabourItem;
  sectionId: string;
  defaultRate: number;
  onUpdate: (sectionId: string, itemId: string, updates: Partial<LabourItem>) => void;
  onRemove: (sectionId: string, itemId: string) => void;
  onIncrement: (sectionId: string, itemId: string) => void;
  onDecrement: (sectionId: string, itemId: string) => void;
}

export const LabourItemRow: React.FC<LabourItemRowProps> = ({
  item,
  sectionId,
  defaultRate,
  onUpdate,
  onRemove,
  onIncrement,
  onDecrement,
}) => {
  const rate = item.rate || defaultRate;
  const total = item.hours * rate;

  return (
    <div className="bg-blue-50 p-0.5 md:p-3 rounded md:rounded-xl mb-1 md:mb-2">
      {/* Top row: Description and delete button */}
      <div className="flex items-center gap-1 md:gap-3 mb-0.5 md:mb-2">
        <input
          type="text"
          placeholder="Labour description..."
          value={item.description}
          onChange={e => onUpdate(sectionId, item.id, { description: e.target.value })}
          className="flex-1 bg-transparent text-[10px] md:text-base font-medium text-slate-900 outline-none placeholder:text-blue-300 leading-tight md:leading-normal py-0.5 md:py-1 md:border-b md:border-transparent md:focus:border-blue-400 md:transition-colors"
        />
        <button
          onClick={() => onRemove(sectionId, item.id)}
          className="p-0.5 md:p-2 text-slate-300 hover:text-red-500 transition-colors md:bg-white md:rounded-lg md:hover:bg-red-50"
        >
          <Trash2 size={10} className="md:hidden" />
          <Trash2 size={16} className="hidden md:block" />
        </button>
      </div>
      {/* Bottom row: Hours controls and price */}
      <div className="flex items-center justify-between gap-2 md:gap-4">
        <div className="flex items-center gap-0.5 md:gap-1 bg-white rounded md:rounded-lg px-1 md:px-2 py-0.5 md:py-1 border border-blue-200 h-6 md:h-11">
          <button
            type="button"
            onClick={() => onDecrement(sectionId, item.id)}
            className="px-1 md:px-2 h-full hover:bg-blue-50 rounded transition-colors touch-manipulation active:bg-blue-100"
          >
            <Minus size={10} className="text-blue-500 md:hidden" />
            <Minus size={16} className="text-blue-500 hidden md:block" />
          </button>
          <input
            type="number"
            value={item.hours}
            onChange={e => onUpdate(sectionId, item.id, { hours: parseFloat(e.target.value) || 0 })}
            className="w-12 md:w-16 h-full text-center font-black text-xs md:text-lg bg-transparent outline-none text-slate-900"
            step="0.5"
          />
          <span className="text-[8px] md:text-sm text-slate-400 font-bold">hrs</span>
          <button
            type="button"
            onClick={() => onIncrement(sectionId, item.id)}
            className="px-1 md:px-2 h-full hover:bg-blue-50 rounded transition-colors touch-manipulation active:bg-blue-100"
          >
            <Plus size={10} className="text-blue-500 md:hidden" />
            <Plus size={16} className="text-blue-500 hidden md:block" />
          </button>
        </div>
        <div className="flex items-center gap-1 md:gap-2">
          <span className="text-[8px] md:text-sm text-slate-400">@ £{rate}/hr</span>
          <div className="bg-blue-600 text-white px-2 md:px-3 py-0.5 md:py-1.5 rounded md:rounded-lg font-black text-[10px] md:text-base">
            £{total.toFixed(2)}
          </div>
        </div>
      </div>
    </div>
  );
};
