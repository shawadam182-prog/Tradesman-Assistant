import React, { useState, useRef, useCallback, useEffect } from 'react';
import { JobPack, ProjectMaterial, Quote, AppSettings } from '../types';
import {
  ShoppingCart, Loader2, Sparkles,
  Mic, MicOff, CheckCircle2, Trash2,
  Plus, Minus, X, Send, ListPlus, PencilLine,
  Info, ClipboardList, ChevronDown, ChevronUp
} from 'lucide-react';
import { parseVoiceCommandForItems } from '../src/services/geminiService';
import { useVoiceInput } from '../src/hooks/useVoiceInput';
import { hapticTap } from '../src/hooks/useHaptic';
import { useToast } from '../src/contexts/ToastContext';

interface MaterialsTrackerProps {
  project: JobPack;
  quotes: Quote[];
  settings: AppSettings;
  onSaveProject: (project: JobPack) => void;
}

// Default quick picks as fallback
const DEFAULT_QUICK_PICKS = [
  'C24 Timber', 'Cement', 'Ballast', 'Plasterboard', 'Multi-finish',
  'Screws', 'PVA', 'Expanding Foam', 'Sealant', 'Sand'
];

export const MaterialsTracker: React.FC<MaterialsTrackerProps> = ({
  project, quotes, settings, onSaveProject
}) => {
  const toast = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [showScratchpad, setShowScratchpad] = useState(false);
  const [scratchpadText, setScratchpadText] = useState('');
  const [quickInput, setQuickInput] = useState('');
  const voiceTargetRef = useRef<'quick' | 'scratch'>('quick');

  // Order List state (simple notepad-style list)
  const [orderListContent, setOrderListContent] = useState(project.orderList || '');
  const [isOrderListExpanded, setIsOrderListExpanded] = useState(true);
  const orderListRef = useRef<HTMLTextAreaElement>(null);
  const orderListSaveRef = useRef<NodeJS.Timeout | null>(null);
  const orderListLocalRef = useRef(false);

  // Sync order list from prop when changed externally
  useEffect(() => {
    if (!orderListLocalRef.current) {
      setOrderListContent(project.orderList || '');
    }
    orderListLocalRef.current = false;
  }, [project.orderList]);

  const handleSaveOrderList = useCallback((content: string) => {
    if (orderListSaveRef.current) clearTimeout(orderListSaveRef.current);
    orderListSaveRef.current = setTimeout(() => {
      orderListLocalRef.current = true;
      onSaveProject({ ...project, orderList: content, updatedAt: new Date().toISOString() });
    }, 800);
  }, [project, onSaveProject]);

  // Auto-resize order list textarea
  useEffect(() => {
    const el = orderListRef.current;
    if (el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; }
  }, [orderListContent, isOrderListExpanded]);

  // Quick pick materials from settings (with fallback)
  const quickPickItems = settings.quickPickMaterials || DEFAULT_QUICK_PICKS;

  // Handle voice result based on target
  const handleVoiceResult = useCallback((text: string) => {
    if (voiceTargetRef.current === 'scratch') {
      setScratchpadText(prev => (prev + ' ' + text).trim());
    } else {
      setQuickInput(text);
      handleQuickAdd(text);
    }
  }, []);

  const handleVoiceError = useCallback((error: string) => {
    toast.error('Voice Input', error);
  }, [toast]);

  const { isListening, isSupported, startListening: startVoice, stopListening } = useVoiceInput({
    onResult: handleVoiceResult,
    onError: handleVoiceError,
  });

  const startListening = (target: 'quick' | 'scratch') => {
    if (!isSupported) {
      toast.error('Not Supported', 'Voice input is not available in this browser.');
      return;
    }
    voiceTargetRef.current = target;
    if (isListening) {
      stopListening();
    } else {
      startVoice();
    }
  };

  const handleQuickAdd = async (text: string) => {
    const val = text.trim();
    if (!val) return;

    // Simple direct add - preserve user's exact input as the item name
    // No AI, no parsing - just add what they typed with qty 1
    const newItem: ProjectMaterial = {
      id: Math.random().toString(36).substr(2, 9),
      name: val,
      unit: 'pc',
      quotedQty: 1,
      orderedQty: 0,
      deliveredQty: 0,
      usedQty: 0,
      status: 'pending'
    };
    onSaveProject({
      ...project,
      materials: [newItem, ...(project.materials || [])]
    });
    setQuickInput('');
  };

  const processScratchpad = async () => {
    if (!scratchpadText.trim()) return;
    setIsProcessing(true);
    try {
      const items = await parseVoiceCommandForItems(scratchpadText);
      if (items && items.length > 0) {
        const newItems: ProjectMaterial[] = items.map((item: any) => ({
          id: Math.random().toString(36).substr(2, 9),
          name: item.name,
          unit: item.unit || 'pc',
          quotedQty: Number(item.quantity) || 1,
          orderedQty: 0,
          deliveredQty: 0,
          usedQty: 0,
          status: 'pending'
        }));
        onSaveProject({
          ...project,
          materials: [...newItems, ...(project.materials || [])]
        });
        setScratchpadText('');
        setShowScratchpad(false);
      }
    } catch (err) {
      alert("AI was unable to parse those notes. Try a simpler list.");
    } finally {
      setIsProcessing(false);
    }
  };

  const updateQuantity = (id: string, delta: number) => {
    const updated = (project.materials || []).map(m => {
      if (m.id === id) {
        return { ...m, quotedQty: Math.max(0, m.quotedQty + delta) };
      }
      return m;
    });
    onSaveProject({ ...project, materials: updated });
  };

  const toggleStatus = (id: string) => {
    hapticTap();
    const updated = (project.materials || []).map(m =>
      m.id === id ? { ...m, status: m.status === 'delivered' ? 'pending' : 'delivered' } : m
    );
    onSaveProject({ ...project, materials: updated as any });
  };

  const removeMaterial = (id: string) => {
    onSaveProject({
      ...project,
      materials: (project.materials || []).filter(m => m.id !== id)
    });
  };

  const materials = project.materials || [];

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Search and Quick Add */}
      <div className="flex gap-2 w-full">
        <div className="flex-1 min-w-0 bg-white rounded-2xl border border-slate-200 shadow-sm p-1.5 flex items-center gap-1.5 sm:gap-2 focus-within:border-amber-400 transition-all">
          <input
            type="text"
            className="flex-1 min-w-0 bg-transparent border-none text-sm font-bold text-slate-900 outline-none px-2 sm:px-3 placeholder:text-slate-400 placeholder:italic"
            placeholder="Quick add (e.g. 10 Timber)..."
            value={quickInput}
            onChange={(e) => setQuickInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleQuickAdd(quickInput)}
          />
          <button
            onClick={() => startListening('quick')}
            className={`p-2 sm:p-2.5 rounded-xl transition-all shrink-0 ${isListening && !showScratchpad ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-100 text-slate-400 hover:text-amber-600'}`}
          >
            <Mic size={18} />
          </button>
          <button
            onClick={() => handleQuickAdd(quickInput)}
            disabled={!quickInput.trim() || isProcessing}
            className="p-2 sm:p-2.5 bg-slate-900 text-white rounded-xl hover:bg-black disabled:opacity-20 transition-all shrink-0"
          >
            {isProcessing ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
          </button>
        </div>

        <button
          onClick={() => setShowScratchpad(!showScratchpad)}
          className={`p-2.5 sm:px-4 rounded-2xl border font-bold text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-sm shrink-0 ${showScratchpad ? 'bg-amber-500 border-amber-600 text-white' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
        >
          <PencilLine size={16} />
          <span className="hidden sm:inline">{showScratchpad ? 'Close' : 'Scratchpad'}</span>
        </button>
      </div>


      {/* Quick Picks - The "Easy Way" */}
      <div className="flex flex-wrap gap-2 pb-1">
        {quickPickItems.map(item => (
          <button
            key={item}
            onClick={() => handleQuickAdd(item)}
            className="whitespace-nowrap px-4 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-black text-slate-500 uppercase tracking-widest hover:border-amber-400 hover:text-amber-600 transition-all shadow-sm"
          >
            + {item}
          </button>
        ))}
      </div>

      {showScratchpad && (
        <div className="bg-amber-50 rounded-2xl border border-amber-200 p-4 space-y-3 animate-in fade-in slide-in-from-top-2">
          <div className="flex justify-between items-center">
            <h4 className="text-[10px] font-black text-amber-800 uppercase tracking-widest flex items-center gap-1.5">
              <Sparkles size={12}/> Material Scratchpad
            </h4>
            <button 
              onClick={() => startListening('scratch')}
              className={`flex items-center gap-2 px-3 py-1 rounded-full text-[9px] font-black uppercase transition-all ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-white text-amber-600 border border-amber-200 shadow-sm'}`}
            >
              {isListening ? <MicOff size={12}/> : <Mic size={12}/>}
              {isListening ? 'Listening...' : 'Dictate List'}
            </button>
          </div>
          <textarea 
            className="w-full bg-white border border-amber-200 rounded-xl p-4 text-sm font-medium text-slate-900 outline-none min-h-[120px] focus:ring-2 focus:ring-amber-400/20 shadow-inner"
            placeholder="Describe several items at once..."
            value={scratchpadText}
            onChange={(e) => setScratchpadText(e.target.value)}
          />
          <button 
            onClick={processScratchpad}
            disabled={!scratchpadText.trim() || isProcessing}
            className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg hover:bg-black transition-all flex items-center justify-center gap-2 disabled:opacity-30"
          >
            {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <ListPlus size={16} />}
            Convert to Job Materials
          </button>
        </div>
      )}

      <div className="space-y-3">
        <div className="flex justify-between items-center px-1 pt-2">
          <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Materials ({materials.length} items)</h5>
          {materials.length > 0 && (
            <button onClick={() => confirm('Clear list?') && onSaveProject({...project, materials: []})} className="text-[9px] font-black text-slate-300 uppercase tracking-widest hover:text-red-500 transition-colors">Clear All</button>
          )}
        </div>

        {materials.length === 0 ? (
          <div className="py-20 text-center bg-white rounded-3xl border-2 border-dashed border-slate-100 flex flex-col items-center justify-center opacity-60">
            <ShoppingCart size={32} className="text-slate-200 mb-3" />
            <p className="text-slate-400 font-bold text-sm italic">Your materials list is empty.</p>
            <p className="text-[10px] text-slate-300 font-bold mt-2 uppercase">Type, Speak, or use Quick Picks above</p>
          </div>
        ) : (
          <div className="space-y-2">
            {materials.map((item) => (
              <div 
                key={item.id} 
                className={`group relative bg-white rounded-2xl p-4 border transition-all flex items-center justify-between ${item.status === 'delivered' ? 'bg-slate-50 border-transparent opacity-60' : 'border-slate-200 shadow-sm hover:border-amber-400'}`}
              >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <button 
                    onClick={() => toggleStatus(item.id)}
                    className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${item.status === 'delivered' ? 'bg-green-500 text-white' : 'bg-slate-100 text-slate-300 hover:bg-amber-100 hover:text-amber-500'}`}
                  >
                    <CheckCircle2 size={18} />
                  </button>
                  <div className="truncate">
                    <h6 className={`font-bold text-sm truncate ${item.status === 'delivered' ? 'line-through text-slate-500' : 'text-slate-900'}`}>
                      {item.name}
                    </h6>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-tight">{item.unit}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex items-center bg-slate-50 rounded-xl p-1 gap-1 border border-slate-100 shadow-inner">
                    <button onClick={() => updateQuantity(item.id, -1)} className="w-8 h-8 rounded-lg bg-white text-slate-400 hover:bg-slate-900 hover:text-white transition-all flex items-center justify-center shadow-sm">
                      <Minus size={14} />
                    </button>
                    <span className="px-3 min-w-[32px] text-center text-sm font-black text-slate-900">{item.quotedQty}</span>
                    <button onClick={() => updateQuantity(item.id, 1)} className="w-8 h-8 rounded-lg bg-white text-slate-400 hover:bg-slate-900 hover:text-white transition-all flex items-center justify-center shadow-sm">
                      <Plus size={14} />
                    </button>
                  </div>
                  <button onClick={() => removeMaterial(item.id)} className="p-2 text-slate-200 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={18} /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Order List - simple notepad-style list */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <button
          onClick={() => setIsOrderListExpanded(!isOrderListExpanded)}
          className="w-full flex items-center justify-between p-4"
        >
          <div className="flex items-center gap-2">
            <ClipboardList size={16} className="text-amber-500" />
            <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Order List</h5>
            {orderListContent && (
              <span className="text-[9px] font-bold text-slate-300">{orderListContent.split('\n').filter(l => l.trim()).length} items</span>
            )}
          </div>
          {isOrderListExpanded ? <ChevronUp size={16} className="text-slate-300" /> : <ChevronDown size={16} className="text-slate-300" />}
        </button>

        {isOrderListExpanded && (
          <div className="px-4 pb-4 space-y-2">
            <textarea
              ref={orderListRef}
              className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 text-sm font-medium text-slate-800 outline-none resize-none min-h-[120px] overflow-hidden focus:border-amber-400 transition-all placeholder:text-slate-300 placeholder:italic leading-relaxed"
              placeholder={"Items to order...\ne.g.\n- 50x C24 timber\n- 10 bags cement\n- Box of 100mm screws"}
              value={orderListContent}
              onChange={(e) => {
                setOrderListContent(e.target.value);
                handleSaveOrderList(e.target.value);
              }}
            />
            {orderListContent && (
              <button
                onClick={() => { if (confirm('Clear order list?')) { setOrderListContent(''); handleSaveOrderList(''); } }}
                className="text-[9px] font-black text-slate-300 uppercase tracking-widest hover:text-red-500 transition-colors"
              >
                Clear List
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};