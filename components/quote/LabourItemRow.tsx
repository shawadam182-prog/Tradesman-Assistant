import React, { useState } from 'react';
import { LabourItem, LabourRatePreset } from '../../types';
import { Plus, Minus, Trash2, ChevronDown, Sparkles } from 'lucide-react';

interface LabourItemRowProps {
  item: LabourItem;
  sectionId: string;
  defaultRate: number;
  labourRatePresets?: LabourRatePreset[];
  onUpdate: (sectionId: string, itemId: string, updates: Partial<LabourItem>) => void;
  onRemove: (sectionId: string, itemId: string) => void;
  onIncrement: (sectionId: string, itemId: string) => void;
  onDecrement: (sectionId: string, itemId: string) => void;
}

export const LabourItemRow: React.FC<LabourItemRowProps> = ({
  item,
  sectionId,
  defaultRate,
  labourRatePresets = [],
  onUpdate,
  onRemove,
  onIncrement,
  onDecrement,
}) => {
  const [showRateDropdown, setShowRateDropdown] = useState(false);
  const rate = item.rate || defaultRate;
  const total = item.hours * rate;

  // Find if current rate matches a preset
  const currentPreset = labourRatePresets.find(p => p.rate === rate);
  const isCustomRate = item.rate !== undefined && !currentPreset;

  const handlePresetSelect = (preset: LabourRatePreset) => {
    onUpdate(sectionId, item.id, { rate: preset.rate });
    setShowRateDropdown(false);
  };

  const handleCustomRate = (customRate: number) => {
    onUpdate(sectionId, item.id, { rate: customRate });
  };

  const handleUseDefault = () => {
    onUpdate(sectionId, item.id, { rate: undefined });
    setShowRateDropdown(false);
  };

  return (
    <div className={`p-0.5 md:p-3 rounded md:rounded-xl mb-1 md:mb-2 ${item.isAIProposed ? 'bg-teal-50 border-l-2 border-l-teal-400' : 'bg-blue-50'}`}>
      {/* Top row: Description and delete button */}
      <div className="flex items-center gap-1 md:gap-3 mb-0.5 md:mb-2">
        <input
          type="text"
          placeholder="Labour description..."
          value={item.description}
          onChange={e => onUpdate(sectionId, item.id, { description: e.target.value })}
          className="flex-1 bg-transparent text-[10px] md:text-base font-medium text-slate-900 outline-none placeholder:text-blue-300 leading-tight md:leading-normal py-0.5 md:py-1 md:border-b md:border-transparent md:focus:border-blue-400 md:transition-colors"
        />
        {item.isAIProposed && (
          <Sparkles size={10} className="text-teal-400 shrink-0" />
        )}
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
          {/* Rate selector dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowRateDropdown(!showRateDropdown)}
              className={`flex items-center gap-0.5 md:gap-1 text-[8px] md:text-sm px-1.5 md:px-2 py-0.5 md:py-1 rounded md:rounded-lg border transition-all ${isCustomRate
                  ? 'bg-amber-50 border-amber-200 text-amber-700'
                  : currentPreset
                    ? 'bg-blue-100 border-blue-200 text-blue-700'
                    : 'bg-white border-slate-200 text-slate-500 hover:border-blue-300'
                }`}
            >
              <span className="font-bold">
                {currentPreset ? currentPreset.name : isCustomRate ? 'Custom' : 'Default'}
              </span>
              <span className="text-slate-400">£{rate}/hr</span>
              <ChevronDown size={10} className="md:hidden" />
              <ChevronDown size={14} className="hidden md:block" />
            </button>

            {showRateDropdown && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowRateDropdown(false)}
                />
                <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg md:rounded-xl shadow-xl z-50 min-w-[140px] md:min-w-[180px] overflow-hidden">
                  {/* Default rate option */}
                  <button
                    type="button"
                    onClick={handleUseDefault}
                    className={`w-full text-left px-2 md:px-3 py-1.5 md:py-2 text-[10px] md:text-sm hover:bg-slate-50 transition-colors border-b border-slate-100 ${!item.rate ? 'bg-slate-50 font-bold' : ''
                      }`}
                  >
                    <div className="flex justify-between items-center">
                      <span>Default</span>
                      <span className="text-slate-400">£{defaultRate}/hr</span>
                    </div>
                  </button>

                  {/* Preset options */}
                  {labourRatePresets.map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => handlePresetSelect(preset)}
                      className={`w-full text-left px-2 md:px-3 py-1.5 md:py-2 text-[10px] md:text-sm hover:bg-blue-50 transition-colors ${currentPreset?.name === preset.name ? 'bg-blue-50 text-blue-700 font-bold' : ''
                        }`}
                    >
                      <div className="flex justify-between items-center">
                        <span>{preset.name}</span>
                        <span className="text-slate-400">£{preset.rate}/hr</span>
                      </div>
                    </button>
                  ))}

                  {/* Custom rate input */}
                  <div className="px-2 md:px-3 py-1.5 md:py-2 border-t border-slate-100 bg-slate-50">
                    <label className="text-[8px] md:text-xs text-slate-400 font-bold uppercase tracking-wider mb-1 block">
                      Custom Rate
                    </label>
                    <div className="flex items-center gap-1">
                      <span className="text-slate-400 text-[10px] md:text-sm">£</span>
                      <input
                        type="number"
                        step="0.50"
                        placeholder={String(defaultRate)}
                        className="w-full bg-white border border-slate-200 rounded px-1.5 md:px-2 py-0.5 md:py-1 text-[10px] md:text-sm font-bold outline-none focus:border-blue-400"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            const value = parseFloat((e.target as HTMLInputElement).value);
                            if (!isNaN(value) && value > 0) {
                              handleCustomRate(value);
                              setShowRateDropdown(false);
                            }
                          }
                        }}
                        onBlur={(e) => {
                          const value = parseFloat(e.target.value);
                          if (!isNaN(value) && value > 0) {
                            handleCustomRate(value);
                          }
                        }}
                      />
                      <span className="text-slate-400 text-[10px] md:text-sm">/hr</span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="bg-blue-600 text-white px-2 md:px-3 py-0.5 md:py-1.5 rounded md:rounded-lg font-black text-[10px] md:text-base">
            £{total.toFixed(2)}
          </div>
        </div>
      </div>
    </div>
  );
};
