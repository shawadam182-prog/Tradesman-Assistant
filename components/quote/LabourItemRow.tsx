import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { LabourItem, LabourRatePreset } from '../../types';
import { Plus, Minus, Trash2, ChevronDown, Sparkles } from 'lucide-react';

const DEFAULT_LABOUR_UNITS = ['hrs', 'days', 'week'];

// Units that represent "day" type rates
const DAY_UNITS = ['days', 'day'];
const HOUR_UNITS = ['hrs', 'hr', 'hours', 'hour'];

interface LabourItemRowProps {
  item: LabourItem;
  sectionId: string;
  defaultRate: number;
  defaultDayRate?: number;
  labourRatePresets?: LabourRatePreset[];
  labourUnitPresets?: string[];
  onUpdate: (sectionId: string, itemId: string, updates: Partial<LabourItem>) => void;
  onRemove: (sectionId: string, itemId: string) => void;
  onIncrement: (sectionId: string, itemId: string) => void;
  onDecrement: (sectionId: string, itemId: string) => void;
}

export const LabourItemRow: React.FC<LabourItemRowProps> = ({
  item,
  sectionId,
  defaultRate,
  defaultDayRate,
  labourRatePresets = [],
  labourUnitPresets,
  onUpdate,
  onRemove,
  onIncrement,
  onDecrement,
}) => {
  const [showRateDropdown, setShowRateDropdown] = useState(false);
  const [isEditingRate, setIsEditingRate] = useState(false);
  const [rateInputValue, setRateInputValue] = useState('');
  const rateBtnRef = useRef<HTMLButtonElement>(null);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, right: 0 });

  useEffect(() => {
    if (showRateDropdown && rateBtnRef.current) {
      const rect = rateBtnRef.current.getBoundingClientRect();
      setDropdownPos({
        top: rect.bottom + 4,
        right: window.innerWidth - rect.right,
      });
    }
  }, [showRateDropdown]);

  const isDayUnit = DAY_UNITS.includes((item.unit || 'hrs').toLowerCase());
  // Use the appropriate default rate based on unit type
  const effectiveDefaultRate = isDayUnit && defaultDayRate ? defaultDayRate : defaultRate;
  const rate = item.rate || effectiveDefaultRate;
  const total = item.hours * rate;

  // Find if current rate matches a preset
  const currentPreset = labourRatePresets.find(p => p.rate === rate);
  const isCustomRate = item.rate !== undefined && !currentPreset;
  const isUsingDefault = item.rate === undefined;

  const handlePresetSelect = (preset: LabourRatePreset) => {
    const updates: Partial<LabourItem> = { rate: preset.rate };
    if (!item.description || item.description === 'Labour' || item.description === 'Labour Work' || item.description === 'Labour work') {
      updates.description = preset.name;
    }
    onUpdate(sectionId, item.id, updates);
    setShowRateDropdown(false);
  };

  const handleUseDefault = () => {
    onUpdate(sectionId, item.id, { rate: undefined });
    setShowRateDropdown(false);
  };

  const handleUnitChange = (newUnit: string) => {
    const wasDay = DAY_UNITS.includes((item.unit || 'hrs').toLowerCase());
    const isNowDay = DAY_UNITS.includes(newUnit.toLowerCase());
    const wasHour = HOUR_UNITS.includes((item.unit || 'hrs').toLowerCase());
    const isNowHour = HOUR_UNITS.includes(newUnit.toLowerCase());

    const updates: Partial<LabourItem> = { unit: newUnit };

    // If switching between hours and days and using default rate, clear custom rate
    // so the appropriate default kicks in
    if (wasDay !== isNowDay || wasHour !== isNowHour) {
      if (isUsingDefault) {
        // Already using default — it will auto-switch via effectiveDefaultRate
        // Just update the unit
      } else {
        // User had a custom/preset rate — clear it so the right default applies
        updates.rate = undefined;
      }
    }

    onUpdate(sectionId, item.id, updates);
  };

  const startEditingRate = () => {
    setRateInputValue(String(rate));
    setIsEditingRate(true);
  };

  const finishEditingRate = () => {
    setIsEditingRate(false);
    const value = parseFloat(rateInputValue);
    if (!isNaN(value) && value > 0) {
      // If it matches the effective default, clear the override
      if (value === effectiveDefaultRate) {
        onUpdate(sectionId, item.id, { rate: undefined });
      } else {
        onUpdate(sectionId, item.id, { rate: value });
      }
    }
  };

  const unitLabel = item.unit || 'hr';

  return (
    <div className={`p-0.5 md:p-3 rounded md:rounded-xl mb-1 md:mb-2 overflow-hidden ${item.isAIProposed ? 'bg-teal-50 border-l-2 border-l-teal-400' : 'bg-blue-50'}`}>
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
      {/* Bottom row: Hours controls, rate, and total — wraps on mobile */}
      <div className="flex items-center gap-1 md:gap-4 flex-wrap">
        {/* Quantity + unit selector */}
        <div className="flex items-center gap-0.5 md:gap-1 bg-white rounded md:rounded-lg px-1 md:px-2 py-0.5 md:py-1 border border-blue-200 h-6 md:h-11 shrink-0">
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
            className="w-10 md:w-16 h-full text-center font-black text-xs md:text-lg bg-transparent outline-none text-slate-900"
            step="0.5"
          />
          <select
            value={item.unit || 'hrs'}
            onChange={e => handleUnitChange(e.target.value)}
            className="text-[10px] md:text-sm text-slate-500 font-bold bg-white outline-none cursor-pointer rounded px-1 py-0.5 border border-slate-200 min-w-[40px] md:min-w-[55px]"
          >
            {(labourUnitPresets || DEFAULT_LABOUR_UNITS).map(u => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => onIncrement(sectionId, item.id)}
            className="px-1 md:px-2 h-full hover:bg-blue-50 rounded transition-colors touch-manipulation active:bg-blue-100"
          >
            <Plus size={10} className="text-blue-500 md:hidden" />
            <Plus size={16} className="text-blue-500 hidden md:block" />
          </button>
        </div>

        {/* Rate — inline editable */}
        <div className="flex items-center gap-1 md:gap-2">
          <div className="relative">
            {isEditingRate ? (
              <div className="flex items-center bg-white border-2 border-blue-400 rounded md:rounded-lg px-1 md:px-2 py-0.5 h-6 md:h-9">
                <span className="text-slate-400 text-[9px] md:text-sm">£</span>
                <input
                  type="number"
                  step="0.50"
                  autoFocus
                  value={rateInputValue}
                  onChange={e => setRateInputValue(e.target.value)}
                  onBlur={finishEditingRate}
                  onKeyDown={e => {
                    if (e.key === 'Enter') finishEditingRate();
                  }}
                  className="w-14 md:w-20 bg-transparent text-[10px] md:text-sm font-bold outline-none text-slate-900 text-center"
                />
                <span className="text-slate-400 text-[8px] md:text-xs">/{unitLabel}</span>
              </div>
            ) : (
              <button
                ref={rateBtnRef}
                type="button"
                onClick={startEditingRate}
                onContextMenu={e => {
                  e.preventDefault();
                  setShowRateDropdown(!showRateDropdown);
                }}
                className={`flex items-center gap-0.5 md:gap-1 text-[9px] md:text-sm px-1.5 md:px-2 py-0.5 md:py-1 rounded md:rounded-lg border transition-all h-6 md:h-9 ${isCustomRate
                    ? 'bg-amber-50 border-amber-200 text-amber-700'
                    : currentPreset
                      ? 'bg-blue-100 border-blue-200 text-blue-700'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-blue-300'
                  }`}
              >
                <span className="font-bold">£{rate}</span>
                <span className="text-slate-400">/{unitLabel}</span>
                <ChevronDown
                  size={10}
                  className="ml-0.5 text-slate-300 md:hidden"
                  onClick={e => {
                    e.stopPropagation();
                    setShowRateDropdown(!showRateDropdown);
                  }}
                />
                <ChevronDown
                  size={14}
                  className="ml-0.5 text-slate-300 hidden md:block"
                  onClick={e => {
                    e.stopPropagation();
                    setShowRateDropdown(!showRateDropdown);
                  }}
                />
              </button>
            )}

            {showRateDropdown && createPortal(
              <>
                <div
                  className="fixed inset-0 z-[9998]"
                  onClick={() => setShowRateDropdown(false)}
                />
                <div
                  className="fixed bg-white border border-slate-200 rounded-lg md:rounded-xl shadow-xl z-[9999] min-w-[140px] md:min-w-[180px] overflow-hidden"
                  style={{ top: dropdownPos.top, right: dropdownPos.right }}
                >
                  {/* Default rate option */}
                  <button
                    type="button"
                    onClick={handleUseDefault}
                    className={`w-full text-left px-2 md:px-3 py-1.5 md:py-2 text-[10px] md:text-sm hover:bg-slate-50 transition-colors border-b border-slate-100 ${isUsingDefault ? 'bg-slate-50 font-bold' : ''}`}
                  >
                    <div className="flex justify-between items-center">
                      <span>Default</span>
                      <span className="text-slate-400">£{effectiveDefaultRate}/{unitLabel}</span>
                    </div>
                  </button>

                  {/* Preset options */}
                  {labourRatePresets.map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => handlePresetSelect(preset)}
                      className={`w-full text-left px-2 md:px-3 py-1.5 md:py-2 text-[10px] md:text-sm hover:bg-blue-50 transition-colors ${currentPreset?.name === preset.name ? 'bg-blue-50 text-blue-700 font-bold' : ''}`}
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
                        placeholder={String(effectiveDefaultRate)}
                        className="w-full bg-white border border-slate-200 rounded px-1.5 md:px-2 py-0.5 md:py-1 text-[10px] md:text-sm font-bold outline-none focus:border-blue-400"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            const value = parseFloat((e.target as HTMLInputElement).value);
                            if (!isNaN(value) && value > 0) {
                              onUpdate(sectionId, item.id, { rate: value });
                              setShowRateDropdown(false);
                            }
                          }
                        }}
                        onBlur={(e) => {
                          const value = parseFloat(e.target.value);
                          if (!isNaN(value) && value > 0) {
                            onUpdate(sectionId, item.id, { rate: value });
                          }
                        }}
                      />
                      <span className="text-slate-400 text-[10px] md:text-sm">/{unitLabel}</span>
                    </div>
                  </div>
                </div>
              </>,
              document.body
            )}
          </div>
        </div>

        {/* Total — always visible, pushed to end */}
        <div className="bg-blue-600 text-white px-2 md:px-3 py-0.5 md:py-1.5 rounded md:rounded-lg font-black text-[10px] md:text-base shrink-0 whitespace-nowrap ml-auto">
          £{total.toFixed(2)}
        </div>
      </div>
    </div>
  );
};
