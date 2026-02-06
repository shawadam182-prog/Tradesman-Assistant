import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  ArrowLeft, Mic, MicOff, Camera, Sparkles, ArrowRight,
  Loader2, ChevronDown, ChevronUp, Plus, Trash2, X,
  Check, RotateCcw, Pencil, Building2, Home as HomeIcon,
  Store, Wrench, PaintBucket, HardHat
} from 'lucide-react';
import { Quote, QuoteSection, MaterialItem, LabourItem, Customer, AppSettings } from '../types';
import { analyzeJobRequirements, AIJobContext } from '../src/services/geminiService';
import { useVoiceInput } from '../src/hooks/useVoiceInput';
import { useData } from '../src/contexts/DataContext';
import { useToast } from '../src/contexts/ToastContext';
import { hapticTap, hapticSuccess } from '../src/hooks/useHaptic';

// ─── Types ───────────────────────────────────────────────────────────────────

type WizardStep = 'describe' | 'context' | 'generating' | 'review';

interface PropertyContext {
  propertyType?: 'house' | 'flat' | 'commercial';
  buildType?: 'new_build' | 'renovation' | 'maintenance' | 'repair';
  rooms?: number;
  floors?: number;
}

interface SimilarQuoteRef {
  id: string;
  title: string;
  totalCost: number;
  sections: string[];
}

interface AIQuoteBuilderProps {
  customers: Customer[];
  quotes: Quote[];
  settings: AppSettings;
  onComplete: (draft: Partial<Quote>) => void;
  onCancel: () => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function genId(): string {
  return Math.random().toString(36).substr(2, 9);
}

function findSimilarQuotes(description: string, allQuotes: Quote[]): SimilarQuoteRef[] {
  if (!description || description.length < 4) return [];
  const keywords = description.toLowerCase().split(/\s+/).filter(w => w.length > 3);
  if (keywords.length === 0) return [];

  const scored = allQuotes
    .filter(q => q.type !== 'invoice' && q.status !== 'draft')
    .map(q => {
      const searchText = [q.title, ...q.sections.map(s => s.title), ...(q.sections.flatMap(s => s.description ? [s.description] : []))].join(' ').toLowerCase();
      const matchCount = keywords.filter(kw => searchText.includes(kw)).length;
      if (matchCount === 0) return null;

      // Calculate total cost
      let totalCost = 0;
      q.sections.forEach(s => {
        const matCost = s.items.reduce((sum, i) => sum + (i.quantity * i.unitPrice), 0);
        const labCost = s.labourHours * (s.labourRate || q.labourRate || 0);
        totalCost += s.subsectionPrice ?? (matCost + labCost);
      });

      return {
        id: q.id,
        title: q.title,
        totalCost,
        sections: q.sections.map(s => s.title),
        matchCount,
      };
    })
    .filter(Boolean) as (SimilarQuoteRef & { matchCount: number })[];

  return scored
    .sort((a, b) => b.matchCount - a.matchCount)
    .slice(0, 3)
    .map(({ matchCount, ...rest }) => rest);
}

const STATUS_MESSAGES = [
  'Analyzing your job description...',
  'Checking your materials library...',
  'Calculating labour requirements...',
  'Building your quote...',
];

// ─── Step Indicator ──────────────────────────────────────────────────────────

const STEPS: WizardStep[] = ['describe', 'context', 'generating', 'review'];

const StepIndicator: React.FC<{ current: WizardStep }> = ({ current }) => {
  const currentIdx = STEPS.indexOf(current);
  return (
    <div className="flex items-center gap-2 justify-center">
      {STEPS.map((s, i) => (
        <React.Fragment key={s}>
          <div className={`w-2.5 h-2.5 rounded-full transition-colors ${
            i <= currentIdx ? 'bg-teal-500' : 'bg-slate-200'
          }`} />
          {i < STEPS.length - 1 && <div className={`w-6 h-0.5 transition-colors ${
            i < currentIdx ? 'bg-teal-300' : 'bg-slate-200'
          }`} />}
        </React.Fragment>
      ))}
    </div>
  );
};

// ─── Step 1: Job Description ─────────────────────────────────────────────────

const DescribeStep: React.FC<{
  description: string;
  onDescriptionChange: (val: string) => void;
  attachedPhoto: string | null;
  onAttachPhoto: (base64: string | null) => void;
  similarQuotes: SimilarQuoteRef[];
  onNext: () => void;
}> = ({ description, onDescriptionChange, attachedPhoto, onAttachPhoto, similarQuotes, onNext }) => {
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { isListening, isSupported, startListening, stopListening } = useVoiceInput({
    onResult: (text) => {
      onDescriptionChange(description ? description + ' ' + text : text);
    },
    onError: (err) => toast.error(err),
  });

  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      onAttachPhoto(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex flex-col items-center gap-6 p-4 animate-slide-up">
      <div className="text-center">
        <h2 className="text-2xl font-black text-slate-900">What job are you quoting for?</h2>
        <p className="text-sm text-slate-500 mt-1">Describe the work or use voice input</p>
      </div>

      {/* Voice button */}
      {isSupported && (
        <button
          onClick={() => { hapticTap(); isListening ? stopListening() : startListening(); }}
          className={`w-24 h-24 rounded-full flex items-center justify-center transition-all shadow-lg ${
            isListening
              ? 'bg-red-500 shadow-red-500/30 animate-pulse'
              : 'bg-gradient-to-br from-teal-500 to-cyan-500 shadow-teal-500/30 hover:shadow-xl'
          }`}
        >
          {isListening ? <MicOff size={36} className="text-white" /> : <Mic size={36} className="text-white" />}
        </button>
      )}
      {isListening && (
        <p className="text-xs text-red-500 font-medium animate-pulse">Listening... tap to stop</p>
      )}

      {/* Text area */}
      <textarea
        value={description}
        onChange={(e) => onDescriptionChange(e.target.value)}
        placeholder="e.g. Full rewire of a 3-bed semi, new consumer unit, downlights throughout..."
        className="w-full min-h-[120px] p-4 rounded-2xl border border-slate-200 bg-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-300"
        style={{ fontSize: '16px' }}
      />

      {/* Photo + actions row */}
      <div className="flex gap-3 w-full">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handlePhotoCapture}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            attachedPhoto
              ? 'bg-teal-50 text-teal-700 border border-teal-200'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <Camera size={14} />
          {attachedPhoto ? 'Photo Attached' : 'Add Photo'}
        </button>
        {attachedPhoto && (
          <button onClick={() => onAttachPhoto(null)} className="text-slate-400 hover:text-red-500 p-2">
            <X size={14} />
          </button>
        )}
      </div>

      {/* Photo preview */}
      {attachedPhoto && (
        <div className="w-full">
          <img src={attachedPhoto} alt="Job photo" className="w-full h-32 object-cover rounded-xl border border-slate-200" />
        </div>
      )}

      {/* Similar past quotes */}
      {similarQuotes.length > 0 && (
        <div className="w-full bg-blue-50 border border-blue-100 rounded-2xl p-4">
          <p className="text-xs font-bold text-blue-800 mb-2">Similar past quotes found:</p>
          {similarQuotes.map(sq => (
            <div key={sq.id} className="flex items-center justify-between py-1.5">
              <span className="text-xs text-blue-700 truncate mr-2">{sq.title}</span>
              <span className="text-xs font-bold text-blue-900 whitespace-nowrap">£{sq.totalCost.toFixed(0)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Next */}
      <button
        onClick={() => { hapticTap(); onNext(); }}
        disabled={!description.trim() && !attachedPhoto}
        className="w-full bg-slate-900 text-white py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-30 shadow-lg hover:bg-black transition-all"
      >
        Next <ArrowRight size={16} />
      </button>
    </div>
  );
};

// ─── Step 2: Context Questions ───────────────────────────────────────────────

const ContextStep: React.FC<{
  settings: AppSettings;
  propertyContext: PropertyContext;
  onPropertyContextChange: (ctx: PropertyContext) => void;
  selectedCustomerId: string | undefined;
  onCustomerChange: (id: string | undefined) => void;
  customers: Customer[];
  similarQuotes: SimilarQuoteRef[];
  selectedSimilarIds: string[];
  onToggleSimilar: (id: string) => void;
  onGenerate: () => void;
  onBack: () => void;
}> = ({ settings, propertyContext, onPropertyContextChange, selectedCustomerId, onCustomerChange, customers, similarQuotes, selectedSimilarIds, onToggleSimilar, onGenerate, onBack }) => {
  const tradeDisplay = settings.tradeType?.replace('other:', '') || 'tradesperson';

  return (
    <div className="space-y-5 p-4 animate-slide-up">
      {/* Context info */}
      <div className="bg-slate-50 rounded-2xl p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center">
          <Sparkles size={18} className="text-teal-600" />
        </div>
        <div>
          <p className="text-xs font-bold text-slate-800">AI will use your settings</p>
          <p className="text-[10px] text-slate-500">£{settings.defaultLabourRate}/hr as {tradeDisplay} · {settings.defaultMarkupPercent}% markup{settings.enableVat ? ' · +VAT' : ''}</p>
        </div>
      </div>

      {/* Customer (optional) */}
      <div>
        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Customer (optional)</label>
        <select
          value={selectedCustomerId || ''}
          onChange={(e) => onCustomerChange(e.target.value || undefined)}
          className="w-full p-3 rounded-xl border border-slate-200 bg-white text-sm"
          style={{ fontSize: '16px' }}
        >
          <option value="">Assign later</option>
          {customers.map(c => (
            <option key={c.id} value={c.id}>{c.name}{c.company ? ` (${c.company})` : ''}</option>
          ))}
        </select>
      </div>

      {/* Property type */}
      <div>
        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 block">Property type</label>
        <div className="grid grid-cols-3 gap-2">
          {([
            { value: 'house', label: 'House', icon: HomeIcon },
            { value: 'flat', label: 'Flat', icon: Building2 },
            { value: 'commercial', label: 'Commercial', icon: Store },
          ] as const).map(opt => (
            <button
              key={opt.value}
              onClick={() => { hapticTap(); onPropertyContextChange({ ...propertyContext, propertyType: propertyContext.propertyType === opt.value ? undefined : opt.value }); }}
              className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${
                propertyContext.propertyType === opt.value
                  ? 'border-teal-500 bg-teal-50 text-teal-700'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
              }`}
            >
              <opt.icon size={20} />
              <span className="text-[10px] font-bold">{opt.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Build type */}
      <div>
        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 block">Type of work</label>
        <div className="grid grid-cols-2 gap-2">
          {([
            { value: 'new_build', label: 'New Build', icon: HardHat },
            { value: 'renovation', label: 'Renovation', icon: PaintBucket },
            { value: 'maintenance', label: 'Maintenance', icon: Wrench },
            { value: 'repair', label: 'Repair', icon: Wrench },
          ] as const).map(opt => (
            <button
              key={opt.value}
              onClick={() => { hapticTap(); onPropertyContextChange({ ...propertyContext, buildType: propertyContext.buildType === opt.value ? undefined : opt.value }); }}
              className={`flex items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                propertyContext.buildType === opt.value
                  ? 'border-teal-500 bg-teal-50 text-teal-700'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
              }`}
            >
              <opt.icon size={16} />
              <span className="text-xs font-bold">{opt.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Rooms */}
      <div>
        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 block">Number of rooms (optional)</label>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5, 6].map(n => (
            <button
              key={n}
              onClick={() => { hapticTap(); onPropertyContextChange({ ...propertyContext, rooms: propertyContext.rooms === n ? undefined : n }); }}
              className={`w-11 h-11 rounded-xl border-2 text-sm font-bold transition-all ${
                propertyContext.rooms === n
                  ? 'border-teal-500 bg-teal-50 text-teal-700'
                  : 'border-slate-200 bg-white text-slate-600'
              }`}
            >
              {n}{n === 6 ? '+' : ''}
            </button>
          ))}
        </div>
      </div>

      {/* Similar quotes to reference */}
      {similarQuotes.length > 0 && (
        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 block">Use past quotes as reference</label>
          <div className="space-y-2">
            {similarQuotes.map(sq => (
              <button
                key={sq.id}
                onClick={() => { hapticTap(); onToggleSimilar(sq.id); }}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                  selectedSimilarIds.includes(sq.id)
                    ? 'border-teal-500 bg-teal-50'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 ${
                  selectedSimilarIds.includes(sq.id) ? 'border-teal-500 bg-teal-500' : 'border-slate-300'
                }`}>
                  {selectedSimilarIds.includes(sq.id) && <Check size={12} className="text-white" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-800 truncate">{sq.title}</p>
                  <p className="text-[10px] text-slate-500">{sq.sections.join(' · ')}</p>
                </div>
                <span className="text-xs font-bold text-slate-600 whitespace-nowrap">£{sq.totalCost.toFixed(0)}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button onClick={() => { hapticTap(); onBack(); }} className="px-4 py-3.5 rounded-2xl border border-slate-200 text-sm font-bold text-slate-600">
          Back
        </button>
        <button
          onClick={() => { hapticTap(); onGenerate(); }}
          className="flex-1 bg-gradient-to-r from-teal-500 to-cyan-500 text-white py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-teal-500/20 hover:shadow-xl transition-all"
        >
          <Sparkles size={16} /> Generate Quote
        </button>
      </div>

      <button
        onClick={() => { hapticTap(); onGenerate(); }}
        className="w-full text-center text-xs text-slate-400 py-1"
      >
        Skip details — AI will figure it out
      </button>
    </div>
  );
};

// ─── Step 3: Generation Loading ──────────────────────────────────────────────

const GeneratingStep: React.FC<{
  materialsCount: number;
  labourRate: number;
  error: string | null;
  onRetry: () => void;
  onManual: () => void;
}> = ({ materialsCount, labourRate, error, onRetry, onManual }) => {
  const [messageIdx, setMessageIdx] = useState(0);

  useEffect(() => {
    if (error) return;
    const interval = setInterval(() => {
      setMessageIdx(prev => (prev + 1) % STATUS_MESSAGES.length);
    }, 2500);
    return () => clearInterval(interval);
  }, [error]);

  // Personalize messages
  const messages = useMemo(() => [
    'Analyzing your job description...',
    materialsCount > 0 ? `Checking your materials library (${materialsCount} items)...` : 'Estimating material costs...',
    `Calculating labour at £${labourRate}/hr...`,
    'Building your quote...',
  ], [materialsCount, labourRate]);

  if (error) {
    return (
      <div className="flex flex-col items-center gap-6 p-8 animate-slide-up">
        <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center">
          <X size={32} className="text-red-500" />
        </div>
        <div className="text-center">
          <h3 className="text-lg font-bold text-slate-900 mb-1">Generation Failed</h3>
          <p className="text-sm text-slate-500">{error}</p>
        </div>
        <div className="flex gap-3 w-full">
          <button onClick={onRetry} className="flex-1 bg-slate-900 text-white py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2">
            <RotateCcw size={14} /> Try Again
          </button>
          <button onClick={onManual} className="px-4 py-3 rounded-2xl border border-slate-200 text-sm font-bold text-slate-600">
            Manual Editor
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6 p-8 animate-slide-up">
      <div className="relative">
        <Loader2 size={64} className="text-teal-500 animate-spin" />
        <Sparkles size={20} className="text-teal-400 absolute -top-1 -right-1 animate-pulse" />
      </div>
      <div className="text-center">
        <h3 className="text-lg font-bold text-slate-900 mb-1">{messages[messageIdx]}</h3>
        <p className="text-xs text-slate-400">This usually takes 5-10 seconds</p>
      </div>
    </div>
  );
};

// ─── Step 4: Review & Refine ─────────────────────────────────────────────────

const ReviewStep: React.FC<{
  sections: QuoteSection[];
  suggestedTitle: string;
  settings: AppSettings;
  onUpdateSections: (sections: QuoteSection[]) => void;
  onAddMore: () => void;
  onComplete: () => void;
  onStartOver: () => void;
  isAddingMore: boolean;
  addMoreDescription: string;
  onAddMoreDescriptionChange: (val: string) => void;
  onSubmitAddMore: () => void;
  onCancelAddMore: () => void;
}> = ({ sections, suggestedTitle, settings, onUpdateSections, onAddMore, onComplete, onStartOver, isAddingMore, addMoreDescription, onAddMoreDescriptionChange, onSubmitAddMore, onCancelAddMore }) => {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const toast = useToast();

  // Calculate totals
  const totals = useMemo(() => {
    let materials = 0;
    let labour = 0;
    sections.forEach(s => {
      materials += s.items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
      labour += s.labourHours * (s.labourRate || settings.defaultLabourRate || 0);
    });
    const subtotal = materials + labour;
    const markup = subtotal * ((settings.defaultMarkupPercent || 0) / 100);
    const beforeVat = subtotal + markup;
    const vat = settings.enableVat ? beforeVat * ((settings.defaultTaxRate || 20) / 100) : 0;
    return { materials, labour, subtotal, markup, beforeVat, vat, total: beforeVat + vat };
  }, [sections, settings]);

  const toggleSection = (id: string) => {
    setExpandedSections(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const removeItem = (sectionId: string, itemId: string) => {
    hapticTap();
    onUpdateSections(sections.map(s =>
      s.id === sectionId
        ? { ...s, items: s.items.filter(i => i.id !== itemId) }
        : s
    ));
  };

  const removeLabourItem = (sectionId: string, labourId: string) => {
    hapticTap();
    onUpdateSections(sections.map(s => {
      if (s.id !== sectionId) return s;
      const newLabour = (s.labourItems || []).filter(l => l.id !== labourId);
      return { ...s, labourItems: newLabour, labourHours: newLabour.reduce((sum, l) => sum + l.hours, 0) };
    }));
  };

  const updateItemQuantity = (sectionId: string, itemId: string, newQty: number) => {
    if (newQty <= 0) return;
    onUpdateSections(sections.map(s =>
      s.id === sectionId
        ? { ...s, items: s.items.map(i => i.id === itemId ? { ...i, quantity: newQty, totalPrice: newQty * i.unitPrice } : i) }
        : s
    ));
  };

  const handleQuantityEdit = (itemId: string, currentQty: number) => {
    setEditingItem(itemId);
    setEditValue(String(currentQty));
  };

  const commitQuantityEdit = (sectionId: string, itemId: string) => {
    const newQty = parseFloat(editValue);
    if (!isNaN(newQty) && newQty > 0) {
      updateItemQuantity(sectionId, itemId, newQty);
    }
    setEditingItem(null);
  };

  const removeSection = (sectionId: string) => {
    hapticTap();
    const filtered = sections.filter(s => s.id !== sectionId);
    if (filtered.length === 0) {
      toast.error('Cannot remove the last section');
      return;
    }
    onUpdateSections(filtered);
  };

  const { isListening, isSupported, startListening, stopListening } = useVoiceInput({
    onResult: (text) => onAddMoreDescriptionChange(text),
    onError: (err) => toast.error(err),
  });

  return (
    <div className="space-y-4 p-4 animate-slide-up">
      {/* Title */}
      <h2 className="text-lg font-black text-slate-900">{suggestedTitle || 'Your AI Quote'}</h2>

      {/* Total estimate card */}
      <div className="bg-gradient-to-br from-teal-500 to-cyan-600 text-white rounded-2xl p-5 shadow-lg shadow-teal-500/20">
        <p className="text-[10px] uppercase tracking-wider opacity-80 font-bold">Estimated Total</p>
        <p className="text-3xl font-black mt-1">£{totals.total.toFixed(2)}</p>
        <div className="flex gap-4 mt-2 text-[10px] opacity-80">
          <span>Materials: £{totals.materials.toFixed(0)}</span>
          <span>Labour: £{totals.labour.toFixed(0)}</span>
          {settings.enableVat && <span>VAT: £{totals.vat.toFixed(0)}</span>}
        </div>
      </div>

      {/* Sections */}
      {sections.map(section => {
        const isExpanded = expandedSections[section.id];
        const sectionMatTotal = section.items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
        const sectionLabTotal = section.labourHours * (section.labourRate || settings.defaultLabourRate || 0);

        return (
          <div key={section.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            {/* Section header */}
            <button
              onClick={() => toggleSection(section.id)}
              className="w-full flex items-center gap-3 p-4 text-left"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-900 truncate">{section.title}</p>
                <p className="text-[10px] text-slate-500">
                  {section.items.length} material{section.items.length !== 1 ? 's' : ''} · {section.labourHours}hrs labour · £{(sectionMatTotal + sectionLabTotal).toFixed(0)}
                </p>
              </div>
              {isExpanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
            </button>

            {/* Expanded content */}
            {isExpanded && (
              <div className="border-t border-slate-100 px-4 pb-3">
                {/* Materials */}
                {section.items.length > 0 && (
                  <div className="mt-3">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-2">Materials</p>
                    {section.items.map(item => (
                      <div key={item.id} className="flex items-center gap-2 py-1.5 border-b border-slate-50 last:border-0">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-slate-800 truncate">{item.name}</p>
                          <p className="text-[10px] text-slate-400">{item.description}</p>
                        </div>
                        {editingItem === item.id ? (
                          <input
                            type="number"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={() => commitQuantityEdit(section.id, item.id)}
                            onKeyDown={(e) => e.key === 'Enter' && commitQuantityEdit(section.id, item.id)}
                            className="w-16 text-xs text-center p-1 rounded border border-teal-300 focus:outline-none"
                            autoFocus
                            style={{ fontSize: '16px' }}
                          />
                        ) : (
                          <button
                            onClick={() => handleQuantityEdit(item.id, item.quantity)}
                            className="text-xs font-bold text-slate-600 px-2 py-1 rounded-lg hover:bg-slate-100 min-w-[48px] text-center"
                          >
                            {item.quantity} {item.unit}
                          </button>
                        )}
                        <span className="text-xs font-bold text-slate-700 w-16 text-right">£{(item.quantity * item.unitPrice).toFixed(2)}</span>
                        <button onClick={() => removeItem(section.id, item.id)} className="p-1.5 text-slate-300 hover:text-red-500">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Labour */}
                {(section.labourItems || []).length > 0 && (
                  <div className="mt-3">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-2">Labour</p>
                    {(section.labourItems || []).map(labour => (
                      <div key={labour.id} className="flex items-center gap-2 py-1.5 border-b border-slate-50 last:border-0">
                        <p className="flex-1 text-xs text-slate-800 truncate">{labour.description}</p>
                        <span className="text-xs font-bold text-slate-600 min-w-[48px] text-center">{labour.hours}hrs</span>
                        <span className="text-xs font-bold text-slate-700 w-16 text-right">£{(labour.hours * (section.labourRate || settings.defaultLabourRate || 0)).toFixed(2)}</span>
                        <button onClick={() => removeLabourItem(section.id, labour.id)} className="p-1.5 text-slate-300 hover:text-red-500">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Remove section */}
                {sections.length > 1 && (
                  <button
                    onClick={() => removeSection(section.id)}
                    className="mt-3 text-[10px] text-red-400 hover:text-red-600 font-bold"
                  >
                    Remove Section
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Add more work */}
      {isAddingMore ? (
        <div className="bg-white rounded-2xl border-2 border-dashed border-teal-300 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Plus size={14} className="text-teal-500" />
            <span className="text-xs font-bold text-teal-700">Describe additional work</span>
          </div>
          <div className="flex gap-2">
            <textarea
              value={addMoreDescription}
              onChange={(e) => onAddMoreDescriptionChange(e.target.value)}
              placeholder="e.g. Also need to install bathroom extractor fan..."
              className="flex-1 min-h-[60px] p-3 rounded-xl border border-slate-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-teal-500/50"
              style={{ fontSize: '16px' }}
            />
            {isSupported && (
              <button
                onClick={() => { hapticTap(); isListening ? stopListening() : startListening(); }}
                className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {isListening ? <MicOff size={16} /> : <Mic size={16} />}
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={onCancelAddMore} className="px-3 py-2 rounded-xl text-xs font-bold text-slate-500">Cancel</button>
            <button
              onClick={() => { hapticTap(); onSubmitAddMore(); }}
              disabled={!addMoreDescription.trim()}
              className="flex-1 bg-teal-500 text-white py-2 rounded-xl text-xs font-bold disabled:opacity-30"
            >
              Add to Quote
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => { hapticTap(); onAddMore(); }}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-dashed border-slate-300 text-sm font-bold text-slate-500 hover:border-teal-300 hover:text-teal-600 transition-all"
        >
          <Plus size={16} /> Add More Work
        </button>
      )}

      {/* Complete */}
      <button
        onClick={() => { hapticSuccess(); onComplete(); }}
        className="w-full bg-slate-900 text-white py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg hover:bg-black transition-all"
      >
        <Pencil size={14} /> Open in Editor
      </button>

      <button
        onClick={() => { hapticTap(); onStartOver(); }}
        className="w-full text-center text-xs text-slate-400 py-1 hover:text-slate-600"
      >
        <RotateCcw size={10} className="inline mr-1" /> Start Over
      </button>
    </div>
  );
};

// ─── Main Component ──────────────────────────────────────────────────────────

export const AIQuoteBuilder: React.FC<AIQuoteBuilderProps> = ({
  customers,
  quotes,
  settings,
  onComplete,
  onCancel,
}) => {
  const { services } = useData();
  const toast = useToast();

  // Wizard state
  const [step, setStep] = useState<WizardStep>('describe');
  const [jobDescription, setJobDescription] = useState('');
  const [attachedPhoto, setAttachedPhoto] = useState<string | null>(null);
  const [propertyContext, setPropertyContext] = useState<PropertyContext>({});
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | undefined>();
  const [generatedSections, setGeneratedSections] = useState<QuoteSection[]>([]);
  const [suggestedTitle, setSuggestedTitle] = useState('');
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [selectedSimilarIds, setSelectedSimilarIds] = useState<string[]>([]);

  // Add more state
  const [isAddingMore, setIsAddingMore] = useState(false);
  const [addMoreDescription, setAddMoreDescription] = useState('');

  // Find similar quotes based on description
  const similarQuotes = useMemo(
    () => findSimilarQuotes(jobDescription, quotes),
    [jobDescription, quotes]
  );

  const toggleSimilarQuote = useCallback((id: string) => {
    setSelectedSimilarIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  }, []);

  // AI generation
  const runGeneration = useCallback(async () => {
    setStep('generating');
    setGenerationError(null);

    try {
      // Fetch materials library for price context
      let priceList: { name: string; unit: string; unitPrice: number }[] = [];
      try {
        const libraryItems = await services.materialsLibrary.getAll();
        priceList = libraryItems.map((item: any) => ({
          name: item.name,
          unit: item.unit || 'each',
          unitPrice: item.sell_price || item.cost_price || 0,
        }));
      } catch { /* continue without price list */ }

      // Build similar quotes context
      const similarRef = selectedSimilarIds
        .map(id => similarQuotes.find(sq => sq.id === id))
        .filter(Boolean) as SimilarQuoteRef[];

      // Get existing items if adding more
      const existingItems = generatedSections.flatMap(s =>
        s.items.map(i => ({ name: i.name, quantity: i.quantity, unit: i.unit }))
      );

      const context: AIJobContext = {
        tradeType: settings.tradeType,
        labourRate: settings.defaultLabourRate || 65,
        existingItems: existingItems.length > 0 ? existingItems : undefined,
        priceList,
        propertyContext: Object.keys(propertyContext).length > 0 ? propertyContext : undefined,
        similarQuotes: similarRef.length > 0 ? similarRef : undefined,
      };

      const prompt = isAddingMore && addMoreDescription
        ? addMoreDescription
        : jobDescription;

      const result = await analyzeJobRequirements(prompt, attachedPhoto || undefined, context);

      // Convert AI result to QuoteSection
      const sectionId = genId();
      const newSection: QuoteSection = {
        id: sectionId,
        title: result.suggestedTitle || 'Work Section',
        items: result.materials.map(m => ({
          id: genId(),
          name: m.name,
          description: m.description || '',
          quantity: m.quantity,
          unit: m.unit,
          unitPrice: m.estimatedUnitPrice,
          totalPrice: m.quantity * m.estimatedUnitPrice,
          isAIProposed: true,
        })),
        labourHours: result.labourItems?.reduce((sum, l) => sum + l.hours, 0) || result.laborHoursEstimate || 0,
        labourItems: (result.labourItems || []).map(l => ({
          id: genId(),
          description: l.description,
          hours: l.hours,
          isAIProposed: true,
        })),
      };

      if (isAddingMore) {
        // Append new section
        setGeneratedSections(prev => [...prev, newSection]);
        setIsAddingMore(false);
        setAddMoreDescription('');
        toast.success(`Added: ${newSection.title}`);
      } else {
        // First generation
        setGeneratedSections([newSection]);
        setSuggestedTitle(result.suggestedTitle || jobDescription.slice(0, 50));
      }

      setStep('review');
      hapticSuccess();
    } catch (error: any) {
      console.error('AI generation failed:', error);
      setGenerationError(error.message || 'AI generation failed. Please try again.');
    }
  }, [jobDescription, attachedPhoto, propertyContext, selectedSimilarIds, similarQuotes, settings, services, generatedSections, isAddingMore, addMoreDescription, toast]);

  // Handle "Add More" submission
  const handleSubmitAddMore = useCallback(() => {
    if (!addMoreDescription.trim()) return;
    setIsAddingMore(true);
    runGeneration();
  }, [addMoreDescription, runGeneration]);

  // Build and hand off the quote
  const handleComplete = useCallback(() => {
    const defaultDisplayOptions = settings.defaultDisplayOptions || {
      showMaterials: true, showMaterialItems: true, showMaterialQty: true,
      showMaterialUnitPrice: true, showMaterialLineTotals: true, showMaterialSectionTotal: true,
      showLabour: true, showLabourItems: true, showLabourQty: true,
      showLabourUnitPrice: true, showLabourLineTotals: true, showLabourSectionTotal: true,
      showVat: settings.enableVat, showCis: settings.enableCis,
      showNotes: true, showLogo: true, showTotalsBreakdown: true, showWorkSectionTotal: true,
    };

    const draft: Partial<Quote> = {
      title: suggestedTitle || 'AI Generated Quote',
      customerId: selectedCustomerId || '',
      sections: generatedSections,
      labourRate: settings.defaultLabourRate || 65,
      markupPercent: settings.defaultMarkupPercent || 0,
      taxPercent: settings.enableVat ? (settings.defaultTaxRate || 20) : 0,
      cisPercent: settings.enableCis ? (settings.defaultCisRate || 0) : 0,
      status: 'draft' as const,
      type: 'estimate' as const,
      notes: settings.defaultQuoteNotes || '',
      displayOptions: defaultDisplayOptions,
      date: new Date().toISOString().split('T')[0],
    };

    onComplete(draft);
  }, [suggestedTitle, selectedCustomerId, generatedSections, settings, onComplete]);

  // Manual fallback — open empty QuoteCreator
  const handleManualFallback = useCallback(() => {
    onComplete({
      title: jobDescription.slice(0, 50) || 'New Estimate',
      customerId: selectedCustomerId || '',
      sections: [{ id: genId(), title: 'Work Section', items: [], labourHours: 0 }],
      labourRate: settings.defaultLabourRate || 65,
      markupPercent: settings.defaultMarkupPercent || 0,
      taxPercent: settings.enableVat ? (settings.defaultTaxRate || 20) : 0,
      cisPercent: settings.enableCis ? (settings.defaultCisRate || 0) : 0,
      status: 'draft' as const,
      type: 'estimate' as const,
      notes: settings.defaultQuoteNotes || '',
      date: new Date().toISOString().split('T')[0],
    });
  }, [jobDescription, selectedCustomerId, settings, onComplete]);

  const handleStartOver = useCallback(() => {
    setStep('describe');
    setJobDescription('');
    setAttachedPhoto(null);
    setPropertyContext({});
    setSelectedCustomerId(undefined);
    setGeneratedSections([]);
    setSuggestedTitle('');
    setGenerationError(null);
    setSelectedSimilarIds([]);
    setIsAddingMore(false);
    setAddMoreDescription('');
  }, []);

  return (
    <div className="max-w-2xl mx-auto pb-40 md:pb-32 bg-slate-50 min-h-screen">
      {/* Sticky header */}
      <div className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-100 px-4 py-3">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={onCancel} className="p-1.5 -ml-1.5 hover:bg-slate-100 rounded-lg">
            <ArrowLeft size={20} className="text-slate-600" />
          </button>
          <div className="flex-1">
            <h1 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
              <Sparkles size={14} className="text-teal-500" /> AI Quote Builder
            </h1>
          </div>
        </div>
        <StepIndicator current={step} />
      </div>

      {/* Step content */}
      <div className="mt-4">
        {step === 'describe' && (
          <DescribeStep
            description={jobDescription}
            onDescriptionChange={setJobDescription}
            attachedPhoto={attachedPhoto}
            onAttachPhoto={setAttachedPhoto}
            similarQuotes={similarQuotes}
            onNext={() => setStep('context')}
          />
        )}
        {step === 'context' && (
          <ContextStep
            settings={settings}
            propertyContext={propertyContext}
            onPropertyContextChange={setPropertyContext}
            selectedCustomerId={selectedCustomerId}
            onCustomerChange={setSelectedCustomerId}
            customers={customers}
            similarQuotes={similarQuotes}
            selectedSimilarIds={selectedSimilarIds}
            onToggleSimilar={toggleSimilarQuote}
            onGenerate={runGeneration}
            onBack={() => setStep('describe')}
          />
        )}
        {step === 'generating' && (
          <GeneratingStep
            materialsCount={0}
            labourRate={settings.defaultLabourRate || 65}
            error={generationError}
            onRetry={runGeneration}
            onManual={handleManualFallback}
          />
        )}
        {step === 'review' && (
          <ReviewStep
            sections={generatedSections}
            suggestedTitle={suggestedTitle}
            settings={settings}
            onUpdateSections={setGeneratedSections}
            onAddMore={() => setIsAddingMore(true)}
            onComplete={handleComplete}
            onStartOver={handleStartOver}
            isAddingMore={isAddingMore}
            addMoreDescription={addMoreDescription}
            onAddMoreDescriptionChange={setAddMoreDescription}
            onSubmitAddMore={handleSubmitAddMore}
            onCancelAddMore={() => { setIsAddingMore(false); setAddMoreDescription(''); }}
          />
        )}
      </div>
    </div>
  );
};

export default AIQuoteBuilder;
