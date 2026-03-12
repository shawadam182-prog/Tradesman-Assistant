import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MaterialItem } from '../../types';
import { Plus, Minus, Trash2, BookmarkPlus, Type, Sparkles, Check, X } from 'lucide-react';
import type { DBMaterialLibraryItem } from '../../types';

interface MaterialItemRowProps {
  item: MaterialItem;
  sectionId: string;
  onUpdate: (sectionId: string, itemId: string, updates: Partial<MaterialItem>) => void;
  onRemove: (sectionId: string, itemId: string) => void;
  onIncrement: (sectionId: string, itemId: string) => void;
  onDecrement: (sectionId: string, itemId: string) => void;
  onSaveToLibrary?: (item: MaterialItem) => void;
  onSearchMaterials?: (query: string) => Promise<DBMaterialLibraryItem[]>;
}

export const MaterialItemRow: React.FC<MaterialItemRowProps> = ({
  item,
  sectionId,
  onUpdate,
  onRemove,
  onIncrement,
  onDecrement,
  onSaveToLibrary,
  onSearchMaterials,
}) => {
  // Track whether to show "Save to materials list?" prompt
  const [showSavePrompt, setShowSavePrompt] = useState(false);
  const initialNameRef = useRef(item.name);
  const promptDismissedRef = useRef(false);
  // Local state for price input to allow typing decimals
  const [priceInput, setPriceInput] = useState<string>(
    item.unitPrice !== undefined && item.unitPrice !== 0 ? String(item.unitPrice) : ''
  );
  const [isEditingPrice, setIsEditingPrice] = useState(false);

  // Auto-suggest state
  const [suggestions, setSuggestions] = useState<DBMaterialLibraryItem[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync local state when external value changes (but not while editing)
  useEffect(() => {
    if (!isEditingPrice) {
      setPriceInput(item.unitPrice !== undefined && item.unitPrice !== 0 ? String(item.unitPrice) : '');
    }
  }, [item.unitPrice, isEditingPrice]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node) &&
          nameInputRef.current && !nameInputRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNameChange = useCallback((value: string) => {
    onUpdate(sectionId, item.id, { name: value });

    // Search for suggestions after 2+ characters
    if (onSearchMaterials && value.trim().length >= 2) {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = setTimeout(async () => {
        try {
          const results = await onSearchMaterials(value.trim());
          setSuggestions(results.slice(0, 6));
          setShowSuggestions(results.length > 0);
          setActiveSuggestionIndex(-1);
        } catch {
          setSuggestions([]);
          setShowSuggestions(false);
        }
      }, 200);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [onUpdate, sectionId, item.id, onSearchMaterials]);

  const handleSelectSuggestion = useCallback((material: DBMaterialLibraryItem) => {
    const price = material.sell_price || material.cost_price || 0;
    onUpdate(sectionId, item.id, {
      name: material.name,
      description: material.description || '',
      unit: material.unit || 'pc',
      unitPrice: price,
      quantity: item.quantity || 1,
      totalPrice: (item.quantity || 1) * price,
    });
    setSuggestions([]);
    setShowSuggestions(false);
    promptDismissedRef.current = true;
    initialNameRef.current = material.name;
  }, [onUpdate, sectionId, item.id, item.quantity]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveSuggestionIndex(prev => Math.min(prev + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveSuggestionIndex(prev => Math.max(prev - 1, -1));
    } else if (e.key === 'Enter' && activeSuggestionIndex >= 0) {
      e.preventDefault();
      handleSelectSuggestion(suggestions[activeSuggestionIndex]);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  }, [showSuggestions, suggestions, activeSuggestionIndex, handleSelectSuggestion]);

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
          <Trash2 size={10} className="md:hidden" />
          <Trash2 size={16} className="hidden md:block" />
        </button>
      </div>
    );
  }

  return (
    <div className={`bg-white p-0.5 md:p-2 rounded-md md:rounded-lg shadow-sm border relative group overflow-visible ${item.isAIProposed ? 'border-l-2 border-l-teal-400 border-slate-100 md:border-slate-200' : 'border-slate-100 md:border-slate-200'}`}>
      {/* Name + Actions row */}
      <div className="flex items-center gap-0.5 md:gap-2 mb-0.5 md:mb-1">
        <div className="flex-[3] min-w-0 flex items-center gap-1 relative">
          <input
            ref={nameInputRef}
            type="text"
            className="flex-1 min-w-0 h-5 md:h-7 font-bold text-[9px] md:text-[13px] text-slate-900 outline-none placeholder:text-slate-300 bg-transparent leading-none md:leading-normal p-0 m-0"
            value={item.name}
            onChange={e => handleNameChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => {
              // Delay to allow suggestion click
              setTimeout(() => {
                setShowSuggestions(false);
                // Show save prompt when user finishes typing a new material name
                if (item.name.trim() && item.name !== initialNameRef.current && onSaveToLibrary && !promptDismissedRef.current) {
                  setShowSavePrompt(true);
                }
              }, 200);
            }}
            onFocus={() => {
              // Re-show suggestions if they exist
              if (suggestions.length > 0 && item.name.trim().length >= 2) {
                setShowSuggestions(true);
              }
            }}
            placeholder="Item Name"
          />
          {/* Auto-suggest dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div
              ref={suggestionsRef}
              className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl z-50 max-h-48 overflow-auto"
            >
              {suggestions.map((s, idx) => (
                <button
                  key={s.id}
                  type="button"
                  className={`w-full text-left px-3 py-2 text-xs hover:bg-teal-50 transition-colors border-b border-slate-50 last:border-0 flex items-center justify-between gap-2 ${idx === activeSuggestionIndex ? 'bg-teal-50' : ''}`}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleSelectSuggestion(s);
                  }}
                >
                  <div className="min-w-0">
                    <p className="font-bold text-slate-900 truncate">{s.name}</p>
                    {s.category && (
                      <span className="text-[9px] text-slate-400 capitalize">{s.category}</span>
                    )}
                  </div>
                  {(s.sell_price || s.cost_price) ? (
                    <span className="text-[10px] font-bold text-teal-600 shrink-0">
                      £{Number(s.sell_price || s.cost_price).toFixed(2)}/{s.unit || 'pc'}
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
          )}
          {item.isAIProposed && (
            <Sparkles size={10} className="text-teal-400 shrink-0" />
          )}
        </div>
        <div className="flex gap-0.5 shrink-0">
          {item.name && onSaveToLibrary && (
            <button
              onClick={() => onSaveToLibrary(item)}
              className="p-0.5 md:p-1.5 text-slate-300 rounded hover:bg-teal-50 hover:text-teal-500 transition-colors touch-manipulation"
              title="Save to price list"
            >
              <BookmarkPlus size={10} className="md:hidden" />
              <BookmarkPlus size={14} className="hidden md:block" />
            </button>
          )}
          <button
            onClick={() => onRemove(sectionId, item.id)}
            className="p-0.5 md:p-1.5 text-slate-300 rounded hover:bg-red-50 hover:text-red-500 transition-colors touch-manipulation"
          >
            <Trash2 size={10} className="md:hidden" />
            <Trash2 size={14} className="hidden md:block" />
          </button>
        </div>
      </div>

      {/* Qty / Price / Total — uniform grid */}
      <div className="grid grid-cols-3 gap-0.5 md:gap-2 bg-slate-50 p-0.5 md:p-1.5 rounded md:rounded-lg">
        <div>
          <label className="text-[6px] md:text-[10px] font-bold text-slate-400 uppercase tracking-wider block leading-none mb-0.5">Qty</label>
          <div className="flex items-center bg-white rounded md:rounded-lg shadow-sm border border-slate-100 h-6 md:h-8">
            <button
              type="button"
              onClick={() => onDecrement(sectionId, item.id)}
              className="px-1 md:px-2 h-full hover:bg-slate-50 rounded-l md:rounded-l-lg transition-colors touch-manipulation active:bg-slate-100"
            >
              <Minus size={10} className="text-slate-400 md:hidden" />
              <Minus size={14} className="text-slate-400 hidden md:block" />
            </button>
            <input
              type="number"
              className="flex-1 min-w-0 h-full bg-transparent text-xs md:text-sm font-black text-center outline-none text-slate-900"
              value={item.quantity || ''}
              onChange={e => onUpdate(sectionId, item.id, { quantity: parseFloat(e.target.value) || 0 })}
              placeholder="0"
            />
            <button
              type="button"
              onClick={() => onIncrement(sectionId, item.id)}
              className="px-1 md:px-2 h-full hover:bg-slate-50 rounded-r md:rounded-r-lg transition-colors touch-manipulation active:bg-slate-100"
            >
              <Plus size={10} className="text-slate-400 md:hidden" />
              <Plus size={14} className="text-slate-400 hidden md:block" />
            </button>
          </div>
        </div>
        <div>
          <label className="text-[6px] md:text-[10px] font-bold text-slate-400 uppercase tracking-wider block leading-none mb-0.5">Price (£)</label>
          <input
            type="text"
            inputMode="decimal"
            className="w-full h-6 md:h-8 bg-white rounded md:rounded-lg text-[10px] md:text-sm font-bold px-0.5 md:px-2 text-center shadow-sm outline-none focus:ring-1 focus:ring-teal-100 border border-slate-100"
            value={isEditingPrice ? priceInput : (item.unitPrice || '')}
            onFocus={() => {
              setIsEditingPrice(true);
              setPriceInput(item.unitPrice !== undefined && item.unitPrice !== 0 ? String(item.unitPrice) : '');
            }}
            onChange={e => {
              const inputValue = e.target.value;
              if (inputValue === '' || /^\d*\.?\d*$/.test(inputValue)) {
                setPriceInput(inputValue);
              }
            }}
            onBlur={() => {
              setIsEditingPrice(false);
              const numValue = parseFloat(priceInput);
              onUpdate(sectionId, item.id, { unitPrice: isNaN(numValue) ? 0 : numValue });
            }}
            placeholder="0.00"
          />
        </div>
        <div>
          <label className="text-[6px] md:text-[10px] font-bold text-slate-400 uppercase tracking-wider block leading-none mb-0.5">Total</label>
          <div className="w-full h-6 md:h-8 bg-slate-900 rounded md:rounded-lg px-0.5 md:px-2 text-center flex items-center justify-center">
            <span className="text-white text-[10px] md:text-sm font-bold leading-none">£{item.totalPrice.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Save to materials list prompt */}
      {showSavePrompt && onSaveToLibrary && (
        <div className="flex items-center gap-1.5 md:gap-2 mt-0.5 md:mt-1 px-1 md:px-2 py-0.5 md:py-1 bg-teal-50 border border-teal-200 rounded md:rounded-lg">
          <BookmarkPlus size={10} className="text-teal-500 shrink-0 md:hidden" />
          <BookmarkPlus size={14} className="text-teal-500 shrink-0 hidden md:block" />
          <span className="text-[8px] md:text-xs font-bold text-teal-700 flex-1">Save to materials list?</span>
          <button
            onClick={() => {
              onSaveToLibrary(item);
              setShowSavePrompt(false);
              promptDismissedRef.current = true;
              initialNameRef.current = item.name;
            }}
            className="p-0.5 md:p-1 bg-teal-500 text-white rounded md:rounded-md hover:bg-teal-400 transition-colors"
          >
            <Check size={10} className="md:hidden" />
            <Check size={12} className="hidden md:block" />
          </button>
          <button
            onClick={() => {
              setShowSavePrompt(false);
              promptDismissedRef.current = true;
            }}
            className="p-0.5 md:p-1 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X size={10} className="md:hidden" />
            <X size={12} className="hidden md:block" />
          </button>
        </div>
      )}
    </div>
  );
};
