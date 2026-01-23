import React from 'react';
import { MaterialItem } from '../../types';
import { Plus, Minus, Trash2, BookmarkPlus, Type } from 'lucide-react';

interface MaterialItemRowProps {
  item: MaterialItem;
  sectionId: string;
  onUpdate: (sectionId: string, itemId: string, updates: Partial<MaterialItem>) => void;
  onRemove: (sectionId: string, itemId: string) => void;
  onIncrement: (sectionId: string, itemId: string) => void;
  onDecrement: (sectionId: string, itemId: string) => void;
  onSaveToLibrary?: (item: MaterialItem) => void;
}

export const MaterialItemRow: React.FC<MaterialItemRowProps> = ({
  item,
  sectionId,
  onUpdate,
  onRemove,
  onIncrement,
  onDecrement,
  onSaveToLibrary,
}) => {
  if (item.isHeading) {
    return (
      <div className="bg-slate-100 px-2 md:px-4 py-0.5 md:py-2 rounded md:rounded-lg my-0.5 md:my-2 flex items-center gap-1 md:gap-3">
        <Type size={10} className="text-slate-400 md:hidden" />
        <Type size={16} className="text-slate-400 hidden md:block" />
        <input
          type="text"
          className="bg-transparent text-[9px] md:text-sm font-black uppercase tracking-widest text-slate-500 flex-1 outline-none placeholder:text-slate-300 leading-tight md:leading-normal py-0.5 md:py-1"
          value={item.name}
          onChange={e => onUpdate(sectionId, item.id, { name: e.target.value })}
          placeholder="SECTION HEADING"
        />
        <button
          onClick={() => onRemove(sectionId, item.id)}
          className="p-0.5 md:p-1.5 text-slate-300 hover:text-red-500 transition-colors md:hover:bg-red-50 md:rounded-lg"
        >
          <Trash2 size={10} className="md:hidden"/>
          <Trash2 size={16} className="hidden md:block"/>
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white p-0.5 md:p-3 rounded-md md:rounded-xl shadow-sm border border-slate-100 md:border-slate-200 relative group overflow-hidden">
      <div className="flex justify-between items-center gap-1 md:gap-3 mb-0.5 md:mb-2">
        <div className="flex-1 min-w-0">
          <input
            type="text"
            className="w-full h-4 md:h-auto font-bold text-[10px] md:text-base text-slate-900 outline-none placeholder:text-slate-300 bg-transparent leading-none md:leading-normal p-0 m-0 md:pb-1 md:border-b md:border-transparent md:focus:border-teal-400 md:transition-colors"
            value={item.name}
            onChange={e => onUpdate(sectionId, item.id, { name: e.target.value })}
            placeholder="Item Name"
          />
          <input
            type="text"
            className="w-full h-3 md:h-auto text-[8px] md:text-sm text-slate-500 outline-none placeholder:text-slate-300 bg-transparent leading-none md:leading-normal p-0 m-0 mt-0.5 md:mt-1"
            value={item.description}
            onChange={e => onUpdate(sectionId, item.id, { description: e.target.value })}
            placeholder="Description (optional)"
          />
        </div>
        <div className="flex gap-0.5 md:gap-2 shrink-0">
          {item.name && onSaveToLibrary && (
            <button
              onClick={() => onSaveToLibrary(item)}
              className="p-1 md:p-2 bg-slate-50 text-slate-300 rounded md:rounded-lg hover:bg-teal-50 hover:text-teal-500 transition-colors touch-manipulation"
              title="Save to price list"
            >
              <BookmarkPlus size={10} className="md:hidden"/>
              <BookmarkPlus size={16} className="hidden md:block"/>
            </button>
          )}
          <button
            onClick={() => onRemove(sectionId, item.id)}
            className="p-1 md:p-2 bg-slate-50 text-slate-300 rounded md:rounded-lg hover:bg-red-50 hover:text-red-500 transition-colors touch-manipulation"
          >
            <Trash2 size={10} className="md:hidden"/>
            <Trash2 size={16} className="hidden md:block"/>
          </button>
        </div>
      </div>

      <div className="flex gap-0.5 md:gap-3 bg-slate-50 p-0.5 md:p-3 rounded md:rounded-xl">
        {/* Quantity with +/- buttons */}
        <div className="flex-1">
          <label className="text-[6px] md:text-xs font-bold text-slate-400 uppercase tracking-wider block leading-none mb-0.5 md:mb-1.5">Qty</label>
          <div className="flex items-center bg-white rounded md:rounded-lg shadow-sm border border-slate-100 md:border-slate-200 h-6 md:h-11">
            <button
              type="button"
              onClick={() => onDecrement(sectionId, item.id)}
              className="px-1.5 md:px-3 h-full hover:bg-slate-50 rounded-l md:rounded-l-lg transition-colors touch-manipulation active:bg-slate-100"
            >
              <Minus size={10} className="text-slate-400 md:hidden" />
              <Minus size={16} className="text-slate-400 hidden md:block" />
            </button>
            <input
              type="number"
              className="w-10 md:w-16 h-full bg-transparent text-sm md:text-lg font-black text-center outline-none text-slate-900"
              value={item.quantity || ''}
              onChange={e => onUpdate(sectionId, item.id, { quantity: parseFloat(e.target.value) || 0 })}
              placeholder="0"
            />
            <button
              type="button"
              onClick={() => onIncrement(sectionId, item.id)}
              className="px-1.5 md:px-3 h-full hover:bg-slate-50 rounded-r md:rounded-r-lg transition-colors touch-manipulation active:bg-slate-100"
            >
              <Plus size={10} className="text-slate-400 md:hidden" />
              <Plus size={16} className="text-slate-400 hidden md:block" />
            </button>
          </div>
        </div>
        <div className="flex-1">
          <label className="text-[6px] md:text-xs font-bold text-slate-400 uppercase tracking-wider block leading-none mb-0.5 md:mb-1.5">Price (£)</label>
          <input
            type="text"
            inputMode="decimal"
            className="w-full h-6 md:h-11 bg-white rounded md:rounded-lg text-[10px] md:text-lg font-bold px-0.5 md:px-3 text-center shadow-sm outline-none focus:ring-1 focus:ring-teal-100 md:focus:ring-2 md:focus:ring-teal-200 border border-slate-100 md:border-slate-200"
            value={item.unitPrice || ''}
            onChange={e => {
              const numValue = parseFloat(e.target.value);
              onUpdate(sectionId, item.id, { unitPrice: isNaN(numValue) ? 0 : numValue });
            }}
            placeholder="0.00"
          />
        </div>
        <div className="flex-1 flex flex-col justify-end">
          <label className="hidden md:block text-xs font-bold text-slate-400 uppercase tracking-wider leading-none mb-1.5">Total</label>
          <div className="w-full h-6 md:h-11 bg-slate-900 rounded md:rounded-lg px-0.5 md:px-3 text-center flex items-center justify-center">
            <span className="text-white text-[10px] md:text-lg font-bold leading-none">£{item.totalPrice.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
