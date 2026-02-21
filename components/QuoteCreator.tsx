import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Quote, Customer, AppSettings, MaterialItem, QuoteSection, LabourItem, DBMaterialLibraryItem } from '../types';
import {
  analyzeJobRequirements,
  parseVoiceCommandForItems,
  parseCustomerVoiceInput
} from '../src/services/geminiService';
import {
  ArrowLeft, Mic, Sparkles, Plus,
  Loader2, Camera, UserPlus, ChevronDown, X, MicOff,
  PoundSterling, Percent, FileText,
  Calendar, Layers, Tag, MapPin, Banknote
} from 'lucide-react';
import { AddressAutocomplete } from './AddressAutocomplete';
import { hapticTap, hapticSuccess } from '../src/hooks/useHaptic';
import { MaterialsLibrary } from './MaterialsLibrary';
import { MaterialKitPicker } from './materials/MaterialKitPicker';
import { PaymentMilestoneEditor, MilestoneData } from './payments/PaymentMilestoneEditor';
import { RecurringInvoiceSetup } from './invoices/RecurringInvoiceSetup';
import { useData } from '../src/contexts/DataContext';
import { useToast } from '../src/contexts/ToastContext';
import { useVoiceInput } from '../src/hooks/useVoiceInput';

// Detect iOS for voice input fallback
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

// Draft auto-save key prefix
const DRAFT_STORAGE_KEY = 'quote_creator_draft';

// Import extracted components
import {
  QuoteSectionEditor,
  CustomerModal,
  DiscountModal,
  PartPaymentModal,
  QuoteTotals,
} from './quote';

interface QuoteCreatorProps {
  existingQuote?: Quote;
  projectId?: string;
  projectTitle?: string;
  projectCustomerId?: string;
  initialType?: 'estimate' | 'quotation' | 'invoice';
  customers: Customer[];
  settings: AppSettings;
  onSave: (quote: Quote) => void;
  onAddCustomer: (customer: Customer) => Promise<Customer>;
  onCancel: () => void;
}

export const QuoteCreator: React.FC<QuoteCreatorProps> = ({
  existingQuote, projectId, projectTitle, projectCustomerId, initialType = 'estimate', customers, settings, onSave, onAddCustomer, onCancel
}) => {
  const { services, saveQuote } = useData();
  const toast = useToast();

  // Track if we've saved to DB yet (for new quotes)
  const hasSavedToDbRef = useRef(!!existingQuote);
  const dbSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isListeningTitle, setIsListeningTitle] = useState(false);
  const [aiInput, setAiInput] = useState('');
  const [aiSectionTitle, setAiSectionTitle] = useState('');
  const [targetSectionId, setTargetSectionId] = useState<string | null>(null);
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

  const [isAddingCustomer, setIsAddingCustomer] = useState(false);
  const [newCustomer, setNewCustomer] = useState<Partial<Customer>>({});
  const [isListeningCustomer, setIsListeningCustomer] = useState(false);
  const [isProcessingCustomer, setIsProcessingCustomer] = useState(false);
  const [customerError, setCustomerError] = useState<string | null>(null);

  // Materials Library modal
  const [showMaterialsLibrary, setShowMaterialsLibrary] = useState(false);
  const [targetSectionForMaterial, setTargetSectionForMaterial] = useState<string | null>(null);

  // Material Kit picker modal
  const [showKitPicker, setShowKitPicker] = useState(false);
  const [targetSectionForKit, setTargetSectionForKit] = useState<string | null>(null);

  // Discount modal
  const [showDiscountModal, setShowDiscountModal] = useState(false);

  // Part Payment modal
  const [showPartPaymentModal, setShowPartPaymentModal] = useState(false);

  // Payment milestones
  const [paymentMilestones, setPaymentMilestones] = useState<MilestoneData[]>([]);

  // Generate a unique storage key for this draft
  // For new quotes: based on projectId or 'new'
  // For existing quotes: based on the quote ID
  const getDraftStorageKey = useCallback(() => {
    if (existingQuote?.id) {
      return `${DRAFT_STORAGE_KEY}_edit_${existingQuote.id}`;
    }
    return `${DRAFT_STORAGE_KEY}_new_${projectId || 'standalone'}`;
  }, [existingQuote?.id, projectId]);

  // Check for saved draft on mount
  const getSavedDraft = useCallback((): Partial<Quote> | null => {
    try {
      const key = getDraftStorageKey();
      const saved = localStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Check if the draft is less than 7 days old
        if (parsed._draftSavedAt && Date.now() - parsed._draftSavedAt < 7 * 24 * 60 * 60 * 1000) {
          // Remove the internal timestamp before returning
          const { _draftSavedAt, ...draftData } = parsed;
          return draftData;
        } else {
          // Draft is too old, remove it
          localStorage.removeItem(key);
        }
      }
    } catch (e) {
      console.error('Failed to load draft:', e);
    }
    return null;
  }, [getDraftStorageKey]);

  // Migration logic for old flat quotes
  const getInitialData = (): Partial<Quote> => {
    // First check for a saved draft
    const savedDraft = getSavedDraft();
    if (savedDraft) {
      // We'll show a toast after mount via useEffect
      return savedDraft;
    }

    if (!existingQuote || !existingQuote.id) {
      // New quote — or AI-generated draft (has data but no id)
      const defaultDueDate = initialType === 'invoice'
        ? (() => { const d = new Date(); d.setDate(d.getDate() + 14); return d.toISOString().split('T')[0]; })()
        : undefined;

      const defaults: Partial<Quote> = {
        id: Math.random().toString(36).substr(2, 9),
        projectId,
        date: new Date().toISOString().split('T')[0],
        updatedAt: new Date().toISOString(),
        title: projectTitle || '',
        customerId: projectCustomerId || '',
        sections: [{ id: Math.random().toString(36).substr(2, 9), title: 'Work Section 1', items: [], labourHours: 0 }],
        labourRate: settings.defaultLabourRate,
        markupPercent: settings.defaultMarkupPercent ?? 0,
        taxPercent: settings.enableVat ? settings.defaultTaxRate : 0,
        cisPercent: settings.enableCis ? settings.defaultCisRate : 0,
        status: 'draft',
        type: initialType,
        notes: initialType === 'invoice' ? settings.defaultInvoiceNotes : settings.defaultQuoteNotes,
        displayOptions: { ...settings.defaultDisplayOptions },
        dueDate: defaultDueDate
      };

      // Merge AI draft data over defaults (AI draft provides sections, title, rates, etc.)
      if (existingQuote && !existingQuote.id) {
        return { ...defaults, ...existingQuote, id: defaults.id, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
      }

      return defaults;
    }

    if ((existingQuote as any).items) {
      return {
        ...existingQuote,
        sections: [{ id: 'legacy-section', title: existingQuote.title || 'Work Section', items: (existingQuote as any).items, labourHours: (existingQuote as any).labourHours || 0 }]
      };
    }

    return existingQuote;
  };

  const [formData, setFormData] = useState<Partial<Quote>>(getInitialData());
  const [draftRestored, setDraftRestored] = useState<boolean>(() => getSavedDraft() !== null);
  const [showDraftBanner, setShowDraftBanner] = useState<boolean>(() => getSavedDraft() !== null && !existingQuote);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const titleRecognitionRef = useRef<any>(null);
  const customerRecognitionRef = useRef<any>(null);
  const voiceTargetRef = useRef<'command' | 'title' | 'customer'>('command');

  // Voice input hook for iOS fallback
  const handleVoiceResult = useCallback((text: string) => {
    const target = voiceTargetRef.current;
    if (target === 'command') {
      handleVoiceCommand(text);
    } else if (target === 'title') {
      setFormData(prev => ({ ...prev, title: text }));
    } else if (target === 'customer') {
      handleCustomerVoiceResult(text);
    }
    setIsListening(false);
    setIsListeningTitle(false);
    setIsListeningCustomer(false);
  }, []);

  const handleVoiceError = useCallback((error: string) => {
    toast.error('Voice Input', error);
    setIsListening(false);
    setIsListeningTitle(false);
    setIsListeningCustomer(false);
  }, [toast]);

  const { isListening: isHookListening, startListening: startHookListening, stopListening: stopHookListening } = useVoiceInput({
    onResult: handleVoiceResult,
    onError: handleVoiceError,
  });

  // Helper for customer voice (async)
  const handleCustomerVoiceResult = async (transcript: string) => {
    setIsProcessingCustomer(true);
    setCustomerError(null);
    try {
      const details = await parseCustomerVoiceInput(transcript);
      setNewCustomer(prev => ({ ...prev, ...details }));
    } catch (err) {
      setCustomerError("Magic fill failed.");
    } finally {
      setIsProcessingCustomer(false);
    }
  };

  useEffect(() => {
    if (formData.customerId) {
      const c = customers.find(cust => cust.id === formData.customerId);
      if (c) setCustomerSearch(c.name);
    }
  }, [formData.customerId, customers]);

  // Show toast when draft is restored on mount (only for edits, not new — new shows banner)
  useEffect(() => {
    if (draftRestored && existingQuote) {
      toast.success('Draft Restored', 'Your unsaved changes have been recovered');
      setDraftRestored(false);
    }
  }, [draftRestored, existingQuote, toast]);

  // Load existing milestones when editing
  useEffect(() => {
    if (existingQuote?.id) {
      services.paymentMilestones.getForQuote(existingQuote.id)
        .then(ms => {
          if (ms.length > 0) {
            setPaymentMilestones(ms.map(m => ({
              id: m.id,
              label: m.label,
              percentage: m.percentage,
              fixedAmount: m.fixedAmount,
              dueDate: m.dueDate,
            })));
          }
        })
        .catch(err => console.warn('Failed to load milestones:', err));
    }
  }, [existingQuote?.id, services.paymentMilestones]);

  // Clear draft from localStorage
  const clearDraft = useCallback(() => {
    try {
      const key = getDraftStorageKey();
      localStorage.removeItem(key);
    } catch (e) {
      console.error('Failed to clear draft:', e);
    }
  }, [getDraftStorageKey]);

  // Discard draft and start fresh
  const discardDraft = useCallback(() => {
    clearDraft();
    setShowDraftBanner(false);
    const defaultDueDate = initialType === 'invoice'
      ? (() => { const d = new Date(); d.setDate(d.getDate() + 14); return d.toISOString().split('T')[0]; })()
      : undefined;
    setFormData({
      id: Math.random().toString(36).substr(2, 9),
      projectId,
      date: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString(),
      title: projectTitle || '',
      customerId: projectCustomerId || '',
      sections: [{ id: Math.random().toString(36).substr(2, 9), title: 'Work Section 1', items: [], labourHours: 0 }],
      labourRate: settings.defaultLabourRate,
      markupPercent: settings.defaultMarkupPercent ?? 0,
      taxPercent: settings.enableVat ? settings.defaultTaxRate : 0,
      cisPercent: settings.enableCis ? settings.defaultCisRate : 0,
      status: 'draft',
      type: initialType,
      notes: initialType === 'invoice' ? settings.defaultInvoiceNotes : settings.defaultQuoteNotes,
      displayOptions: { ...settings.defaultDisplayOptions },
      dueDate: defaultDueDate
    });
    toast.success('Draft Discarded', 'Starting fresh');
  }, [clearDraft, initialType, projectId, projectTitle, settings, toast]);

  // Helper function to save draft immediately
  const saveDraftNow = useCallback(() => {
    const hasContent = formData.title ||
      formData.customerId ||
      formData.jobAddress ||
      formData.dueDate ||
      formData.sections?.some(s => s.items.some(i => i.name) || s.labourItems?.some(l => l.description));

    if (!hasContent) return;

    try {
      const key = getDraftStorageKey();
      const dataToSave = {
        ...formData,
        _draftSavedAt: Date.now()
      };
      localStorage.setItem(key, JSON.stringify(dataToSave));
    } catch (e) {
      console.error('Failed to save draft:', e);
    }
  }, [formData, getDraftStorageKey]);

  // Auto-save draft to localStorage whenever formData changes (debounced)
  useEffect(() => {
    // Don't save if form is essentially empty (no meaningful content)
    const hasContent = formData.title ||
      formData.customerId ||
      formData.jobAddress ||
      formData.dueDate ||
      formData.sections?.some(s => s.items.some(i => i.name) || s.labourItems?.some(l => l.description));

    if (!hasContent) return;

    const timeoutId = setTimeout(() => {
      saveDraftNow();
    }, 1000); // Debounce: save 1 second after last change

    return () => clearTimeout(timeoutId);
  }, [formData, saveDraftNow]);

  // Save draft immediately when page becomes hidden (mobile app switch) or before unload
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        saveDraftNow();
      }
    };

    const handleBeforeUnload = () => {
      saveDraftNow();
    };

    const handlePageHide = () => {
      saveDraftNow();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handlePageHide);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handlePageHide);
    };
  }, [saveDraftNow]);

  // Auto-save to database (debounced, longer delay)
  // This makes the quote appear in the list view
  useEffect(() => {
    // Don't auto-save if form is essentially empty
    const hasContent = formData.title ||
      formData.customerId ||
      formData.jobAddress ||
      formData.sections?.some(s => s.items.some(i => i.name) || s.labourItems?.some(l => l.description));

    if (!hasContent) return;

    // Clear any pending save
    if (dbSaveTimeoutRef.current) {
      clearTimeout(dbSaveTimeoutRef.current);
    }

    // Debounce database saves (3 seconds after last change)
    dbSaveTimeoutRef.current = setTimeout(async () => {
      try {
        // Prepare the quote for saving
        const quoteToSave: Quote = {
          ...formData,
          id: formData.id || crypto.randomUUID(),
          status: formData.status || 'draft',
          createdAt: formData.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        } as Quote;

        // Save to database
        const savedQuote = await saveQuote(quoteToSave);

        // Update formData with the saved quote's ID (for new quotes)
        if (!hasSavedToDbRef.current && savedQuote.id) {
          setFormData(prev => ({ ...prev, id: savedQuote.id }));
          hasSavedToDbRef.current = true;
        }
      } catch (e) {
        console.error('Failed to auto-save to database:', e);
      }
    }, 3000);

    return () => {
      if (dbSaveTimeoutRef.current) {
        clearTimeout(dbSaveTimeoutRef.current);
      }
    };
  }, [formData, saveQuote]);

  const handleTypeChange = (newType: 'estimate' | 'quotation' | 'invoice') => {
    setFormData(prev => {
      let updatedNotes = prev.notes;
      const isCurrentlyDefaultQuote = prev.notes === settings.defaultQuoteNotes;
      const isCurrentlyDefaultInvoice = prev.notes === settings.defaultInvoiceNotes;

      if (isCurrentlyDefaultQuote || isCurrentlyDefaultInvoice || !prev.notes) {
        updatedNotes = (newType === 'invoice') ? settings.defaultInvoiceNotes : settings.defaultQuoteNotes;
      }

      let dueDate = prev.dueDate;
      if (newType === 'invoice' && !prev.dueDate) {
        const defaultDue = new Date();
        defaultDue.setDate(defaultDue.getDate() + 14);
        dueDate = defaultDue.toISOString().split('T')[0];
      }

      return { ...prev, type: newType, notes: updatedNotes, dueDate };
    });
  };

  // Speech Recognition Setup (non-iOS only)
  useEffect(() => {
    if (isIOS) return; // Skip native setup on iOS
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-GB';
      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onerror = () => setIsListening(false);
      recognition.onresult = (event: any) => {
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal && event.results[i][0]?.transcript) {
            handleVoiceCommand(event.results[i][0].transcript);
          }
        }
      };
      recognitionRef.current = recognition;

      const titleRec = new SpeechRecognition();
      titleRec.continuous = false;
      titleRec.lang = 'en-GB';
      titleRec.onstart = () => setIsListeningTitle(true);
      titleRec.onend = () => setIsListeningTitle(false);
      titleRec.onerror = () => setIsListeningTitle(false);
      titleRec.onresult = (event: any) => {
        if (event.results?.[0]?.[0]?.transcript) {
          setFormData(prev => ({ ...prev, title: event.results[0][0].transcript }));
        }
      };
      titleRecognitionRef.current = titleRec;

      const custRec = new SpeechRecognition();
      custRec.continuous = false;
      custRec.lang = 'en-GB';
      custRec.onstart = () => setIsListeningCustomer(true);
      custRec.onend = () => setIsListeningCustomer(false);
      custRec.onerror = () => setIsListeningCustomer(false);
      custRec.onresult = async (event: any) => {
        if (event.results?.[0]?.[0]?.transcript) {
          const transcript = event.results[0][0].transcript;
          setIsProcessingCustomer(true);
          setCustomerError(null);
          try {
            const details = await parseCustomerVoiceInput(transcript);
            setNewCustomer(prev => ({ ...prev, ...details }));
          } catch (err) {
            setCustomerError("Magic fill failed.");
          } finally {
            setIsProcessingCustomer(false);
          }
        }
      };
      customerRecognitionRef.current = custRec;
    }
    return () => {
      recognitionRef.current?.abort();
      titleRecognitionRef.current?.abort();
      customerRecognitionRef.current?.abort();
    };
  }, []);

  const handleVoiceCommand = async (transcript: string) => {
    const lowerTranscript = transcript.toLowerCase();
    if (lowerTranscript.includes('add') || lowerTranscript.includes('plus')) {
      if (!targetSectionId && formData.sections?.length) {
        setTargetSectionId(formData.sections[0].id);
      }
      setLoading(true);
      try {
        const items = await parseVoiceCommandForItems(transcript);
        if (items && items.length > 0) {
          const newItems = items.map((m: any) => ({
            id: Math.random().toString(36).substr(2, 9),
            name: m.name, description: `Voice added`, quantity: m.quantity || 1,
            unit: m.unit || 'pc', unitPrice: m.unitPrice || 0,
            totalPrice: (m.quantity || 1) * (m.unitPrice || 0), isAIProposed: true
          }));

          setFormData(prev => ({
            ...prev,
            sections: prev.sections?.map(s =>
              s.id === (targetSectionId || prev.sections?.[0].id)
                ? { ...s, items: [...s.items, ...newItems] } : s
            )
          }));
        }
      } catch (error) { console.error('Voice command parsing failed:', error); }
      finally { setLoading(false); }
    } else { setAiInput(prev => (prev + ' ' + transcript).trim()); }
  };

  const runAIAnalysis = async () => {
    if (!aiInput && !attachedImage) return;
    if (!targetSectionId && formData.sections?.length) {
      setTargetSectionId(formData.sections[0].id);
    }
    setLoading(true);
    try {
      // Get the target section for existing items
      const targetSection = formData.sections?.find(s => s.id === (targetSectionId || formData.sections?.[0].id));
      const existingItems = targetSection?.items.map(i => ({
        name: i.name,
        quantity: i.quantity,
        unit: i.unit
      })) || [];

      // Fetch materials library for price matching
      let priceList: { name: string; unit: string; unitPrice: number }[] = [];
      try {
        const libraryItems = await services.materialsLibrary.getAll();
        priceList = libraryItems.map((item: any) => ({
          name: item.name,
          unit: item.unit || 'each',
          unitPrice: item.unit_price || 0
        }));
      } catch (err) {
        console.warn('Could not load materials library for AI context:', err);
      }

      // Build context from settings
      const context = {
        tradeType: settings.tradeType,
        labourRate: settings.defaultLabourRate || 65,
        existingItems,
        priceList
      };

      const result = await analyzeJobRequirements(aiInput, attachedImage || undefined, context);

      const newItems = result.materials.map((m: any) => ({
        id: Math.random().toString(36).substr(2, 9),
        name: m.name,
        description: m.description || '',
        quantity: m.quantity,
        unit: m.unit,
        unitPrice: m.estimatedUnitPrice,
        totalPrice: m.quantity * m.estimatedUnitPrice,
        isAIProposed: true
      }));

      // Create labour items from AI result with isAIProposed flag
      const newLabourItems = (result.labourItems || []).map((l: any) => ({
        id: Math.random().toString(36).substr(2, 9),
        description: l.description,
        hours: l.hours,
        isAIProposed: true
      }));

      // Calculate total labour hours from items
      const totalLabourHours = newLabourItems.reduce((sum: number, l: any) => sum + l.hours, 0) || result.laborHoursEstimate || 0;

      setFormData(prev => ({
        ...prev,
        sections: prev.sections?.map(s =>
          s.id === (targetSectionId || prev.sections?.[0].id)
            ? {
              ...s,
              title: aiSectionTitle.trim() || result.suggestedTitle || s.title,
              labourHours: s.labourHours + totalLabourHours,
              labourItems: [...(s.labourItems || []), ...newLabourItems],
              items: [...s.items, ...newItems]
            } : s
        )
      }));

      // Show toast with counts
      const materialCount = newItems.length;
      const labourCount = newLabourItems.length;
      toast.success(`Added ${materialCount} material${materialCount !== 1 ? 's' : ''} and ${labourCount} labour item${labourCount !== 1 ? 's' : ''}`);

      setAiInput('');
      setAiSectionTitle('');
      setAttachedImage(null);
    } catch (error: any) {
      console.error('AI analysis failed:', error);
      toast.error(error.message || 'AI analysis failed. Please try again.');
    }
    finally { setLoading(false); }
  };

  // Clear all AI-proposed items from a section
  const clearAIItems = (sectionId: string) => {
    setFormData(prev => ({
      ...prev,
      sections: prev.sections?.map(s =>
        s.id === sectionId
          ? {
            ...s,
            items: s.items.filter(item => !item.isAIProposed),
            labourItems: (s.labourItems || []).filter(item => !item.isAIProposed),
            labourHours: (s.labourItems || [])
              .filter(item => !item.isAIProposed)
              .reduce((sum, l) => sum + l.hours, 0)
          }
          : s
      )
    }));
    toast.info('AI items cleared');
  };

  // Section handlers
  const addSection = () => {
    const newSection: QuoteSection = {
      id: Math.random().toString(36).substr(2, 9),
      title: `Work Section ${(formData.sections?.length || 0) + 1}`,
      items: [], labourHours: 0
    };
    setFormData(prev => ({ ...prev, sections: [...(prev.sections || []), newSection] }));
    setTargetSectionId(newSection.id);
  };

  const removeSection = (id: string) => {
    if (formData.sections?.length === 1) return;
    setFormData(prev => ({ ...prev, sections: prev.sections?.filter(s => s.id !== id) }));
    if (targetSectionId === id) setTargetSectionId(null);
  };

  const updateSectionTitle = (id: string, title: string) => {
    setFormData(prev => ({ ...prev, sections: prev.sections?.map(s => s.id === id ? { ...s, title } : s) }));
  };

  const updateSectionDescription = (id: string, description: string) => {
    setFormData(prev => ({ ...prev, sections: prev.sections?.map(s => s.id === id ? { ...s, description } : s) }));
  };

  // Material item handlers
  const addMaterialToSection = (sectionId: string) => {
    setFormData(prev => ({
      ...prev,
      sections: prev.sections?.map(s => s.id === sectionId ? {
        ...s, items: [...s.items, { id: Math.random().toString(36).substr(2, 9), name: '', description: '', quantity: 1, unit: 'pc', unitPrice: 0, totalPrice: 0 }]
      } : s)
    }));
  };

  const updateItem = (sectionId: string, itemId: string, updates: Partial<MaterialItem>) => {
    setFormData(prev => ({
      ...prev,
      sections: prev.sections?.map(s => s.id === sectionId ? {
        ...s, items: s.items.map(item => item.id === itemId ? {
          ...item, ...updates, totalPrice: (updates.quantity ?? item.quantity) * (updates.unitPrice ?? item.unitPrice)
        } : item)
      } : s)
    }));
  };

  const removeItem = (sectionId: string, itemId: string) => {
    setFormData(prev => ({ ...prev, sections: prev.sections?.map(s => s.id === sectionId ? { ...s, items: s.items.filter(i => i.id !== itemId) } : s) }));
  };

  const incrementQuantity = (sectionId: string, itemId: string) => {
    setFormData(prev => ({
      ...prev,
      sections: prev.sections?.map(s => s.id === sectionId ? {
        ...s, items: s.items.map(item => item.id === itemId ? {
          ...item, quantity: item.quantity + 1, totalPrice: (item.quantity + 1) * item.unitPrice
        } : item)
      } : s)
    }));
  };

  const decrementQuantity = (sectionId: string, itemId: string) => {
    setFormData(prev => ({
      ...prev,
      sections: prev.sections?.map(s => s.id === sectionId ? {
        ...s, items: s.items.map(item => item.id === itemId ? {
          ...item, quantity: Math.max(0, item.quantity - 1), totalPrice: Math.max(0, item.quantity - 1) * item.unitPrice
        } : item)
      } : s)
    }));
  };

  const addHeadingToSection = (sectionId: string) => {
    const newItem: MaterialItem = { id: Math.random().toString(36).substr(2, 9), name: '', description: '', quantity: 0, unit: '', unitPrice: 0, totalPrice: 0, isHeading: true };
    setFormData(prev => ({ ...prev, sections: prev.sections?.map(s => s.id === sectionId ? { ...s, items: [...s.items, newItem] } : s) }));
  };

  const addMaterialFromLibrary = (sectionId: string, material: DBMaterialLibraryItem) => {
    const newItem: MaterialItem = { id: Math.random().toString(36).substr(2, 9), name: material.name, description: material.description || '', quantity: 1, unit: material.unit || 'pc', unitPrice: material.sell_price || material.cost_price || 0, totalPrice: material.sell_price || material.cost_price || 0 };
    setFormData(prev => ({ ...prev, sections: prev.sections?.map(s => s.id === sectionId ? { ...s, items: [...s.items, newItem] } : s) }));
    setShowMaterialsLibrary(false);
    hapticSuccess();
  };

  const saveItemToLibrary = async (item: MaterialItem) => {
    try {
      await services.materialsLibrary.create({ name: item.name, description: item.description, unit: item.unit, sell_price: item.unitPrice });
      toast.success('Saved', `${item.name} added to price list`);
      hapticSuccess();
    } catch (err) { toast.error('Failed', 'Could not save to price list'); }
  };

  // Labour item handlers
  const addLabourItem = (sectionId: string) => {
    const newLabourItem: LabourItem = { id: Math.random().toString(36).substr(2, 9), description: '', hours: 1 };
    setFormData(prev => ({ ...prev, sections: prev.sections?.map(s => s.id === sectionId ? { ...s, labourItems: [...(s.labourItems || []), newLabourItem] } : s) }));
  };

  const updateLabourItem = (sectionId: string, itemId: string, updates: Partial<LabourItem>) => {
    setFormData(prev => ({ ...prev, sections: prev.sections?.map(s => s.id === sectionId ? { ...s, labourItems: s.labourItems?.map(item => item.id === itemId ? { ...item, ...updates } : item) } : s) }));
  };

  const removeLabourItem = (sectionId: string, itemId: string) => {
    setFormData(prev => ({ ...prev, sections: prev.sections?.map(s => s.id === sectionId ? { ...s, labourItems: s.labourItems?.filter(i => i.id !== itemId) } : s) }));
  };

  const incrementLabourHours = (sectionId: string, itemId: string) => {
    const current = formData.sections?.find(s => s.id === sectionId)?.labourItems?.find(i => i.id === itemId)?.hours || 0;
    updateLabourItem(sectionId, itemId, { hours: current + 0.5 });
  };

  const decrementLabourHours = (sectionId: string, itemId: string) => {
    const current = formData.sections?.find(s => s.id === sectionId)?.labourItems?.find(i => i.id === itemId)?.hours || 0;
    updateLabourItem(sectionId, itemId, { hours: Math.max(0, current - 0.5) });
  };

  const updateLabourCost = (sectionId: string, labourCost: number) => {
    setFormData(prev => ({ ...prev, sections: prev.sections?.map(s => s.id === sectionId ? { ...s, labourCost } : s) }));
  };

  const updateSubsectionPrice = (sectionId: string, subsectionPrice: number | undefined) => {
    setFormData(prev => ({ ...prev, sections: prev.sections?.map(s => s.id === sectionId ? { ...s, subsectionPrice } : s) }));
  };

  // Calculation helpers
  const calculateSectionLabour = (section: QuoteSection) => {
    const defaultRate = section.labourRate || formData.labourRate || settings.defaultLabourRate;
    if (section.labourItems && section.labourItems.length > 0) {
      return section.labourItems.reduce((sum, item) => sum + (item.hours * (item.rate || defaultRate)), 0);
    }
    return section.labourCost || (section.labourHours || 0) * defaultRate;
  };

  const getTotalLabourHours = (section: QuoteSection) => {
    if (section.labourItems && section.labourItems.length > 0) {
      return section.labourItems.reduce((sum, item) => sum + item.hours, 0);
    }
    return section.labourHours || 0;
  };

  // Calculate totals
  const totals = (() => {
    const sections = formData.sections || [];
    let materialsTotal = 0, labourTotal = 0, sectionsTotal = 0;

    sections.forEach(s => {
      const sectionMaterials = s.items.filter(i => !i.isHeading).reduce((sum, i) => sum + i.totalPrice, 0);
      const sectionLabour = calculateSectionLabour(s);
      const sectionPrice = s.subsectionPrice !== undefined ? s.subsectionPrice : (sectionMaterials + sectionLabour);
      materialsTotal += sectionMaterials;
      labourTotal += sectionLabour;
      sectionsTotal += sectionPrice;
    });

    const subtotal = sectionsTotal;
    const markup = subtotal * ((formData.markupPercent || 0) / 100);
    const clientSubtotal = subtotal + markup;
    const discount = formData.discountValue
      ? (formData.discountType === 'percentage' ? clientSubtotal * (formData.discountValue / 100) : formData.discountValue)
      : 0;
    const afterDiscount = clientSubtotal - discount;
    const tax = afterDiscount * ((formData.taxPercent || 0) / 100);
    // CIS is calculated on labour only, not materials (per HMRC rules)
    const cis = labourTotal * ((formData.cisPercent || 0) / 100);
    const total = afterDiscount + tax - cis;

    return { materialsTotal, labourTotal, subtotal, markup, discount, tax, cis, total };
  })();

  // Customer handlers
  const handleQuickAddCustomer = async () => {
    if (!newCustomer.name) { setCustomerError("Name required"); return; }
    try {
      const created = await onAddCustomer({ id: '', name: newCustomer.name || '', company: newCustomer.company, email: newCustomer.email || '', phone: newCustomer.phone || '', address: newCustomer.address || '' });
      setFormData(prev => ({ ...prev, customerId: created.id }));
      setCustomerSearch(created.name);
      setIsAddingCustomer(false);
      setNewCustomer({});
      hapticSuccess();
    } catch (err) { setCustomerError("Failed to add customer"); }
  };

  const handleToggleCustomerVoice = () => {
    if (isListeningCustomer || isHookListening) {
      if (isIOS) stopHookListening();
      else customerRecognitionRef.current?.stop();
      return;
    }
    voiceTargetRef.current = 'customer';
    if (isIOS) {
      setIsListeningCustomer(true);
      startHookListening();
    } else {
      customerRecognitionRef.current?.start();
    }
  };

  const handleSave = async () => {
    clearDraft(); // Clear the draft on successful save
    onSave(formData as Quote);

    // Save payment milestones (fire-and-forget after quote save)
    if (paymentMilestones.length > 0 && formData.id) {
      try {
        await services.paymentMilestones.saveBatch(
          formData.id,
          paymentMilestones.map((m, idx) => ({
            label: m.label,
            percentage: m.percentage,
            fixedAmount: m.fixedAmount,
            dueDate: m.dueDate,
            sortOrder: idx,
          }))
        );
      } catch (err) {
        console.warn('Failed to save milestones:', err);
      }
    }
  };

  const handleCancel = () => {
    clearDraft(); // Clear the draft when cancelling
    hapticTap();
    onCancel();
  };

  return (
    <div className="max-w-4xl mx-auto pb-40 md:pb-32 bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-100 p-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={handleCancel} className="p-2 -ml-2 text-slate-400 hover:text-slate-700">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
            {existingQuote ? `Edit ${formData.type === 'invoice' ? 'Invoice' : formData.type === 'quotation' ? 'Quotation' : 'Estimate'}` : `New ${formData.type === 'invoice' ? 'Invoice' : formData.type === 'quotation' ? 'Quotation' : 'Estimate'}`}
          </h1>
        </div>
        <button onClick={() => { hapticTap(); handleSave(); }} className="text-teal-600 font-bold text-sm px-3 py-1.5 bg-teal-50 rounded-lg">Save</button>
      </div>

      <div className="p-4 space-y-6">
        {/* Draft Restored Banner */}
        {showDraftBanner && (
          <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-4 flex items-center justify-between gap-3 animate-in slide-in-from-top-2 duration-300">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-10 w-10 bg-amber-100 rounded-xl flex items-center justify-center shrink-0">
                <FileText size={18} className="text-amber-600" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-black text-amber-900">Previous draft restored</p>
                <p className="text-xs text-amber-600 truncate">Unsaved changes from your last session</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setShowDraftBanner(false)}
                className="px-3 py-2 text-xs font-black text-amber-700 bg-amber-100 hover:bg-amber-200 rounded-xl transition-all uppercase tracking-wider"
              >
                Keep
              </button>
              <button
                onClick={() => { hapticTap(); discardDraft(); }}
                className="px-3 py-2 text-xs font-black text-white bg-red-500 hover:bg-red-600 rounded-xl transition-all uppercase tracking-wider shadow-sm"
              >
                Discard
              </button>
            </div>
          </div>
        )}

        {/* AI-Generated Quote Banner */}
        {!existingQuote?.id && formData.sections?.some(s => s.items.some(i => i.isAIProposed) || (s.labourItems || []).some(l => l.isAIProposed)) && (
          <div className="bg-teal-50 border border-teal-200 rounded-2xl p-3 flex items-center gap-2.5 animate-in slide-in-from-top-2 duration-300">
            <Sparkles size={16} className="text-teal-500 flex-shrink-0" />
            <span className="text-xs font-medium text-teal-800">AI-generated quote — review and edit before saving</span>
          </div>
        )}

        {/* Document Info Card */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="col-span-1 md:col-span-2">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Project Title</label>
              <input type="text" className="w-full text-lg font-bold text-slate-900 border-b border-slate-100 pb-2 outline-none focus:border-teal-500 transition-colors placeholder:text-slate-300" value={formData.title || ''} onChange={e => setFormData({ ...formData, title: e.target.value })} placeholder="Enter title..." />
            </div>

            {/* Document Type Selector */}
            <div className="col-span-1 md:col-span-2">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Document Type</label>
              <div className="flex gap-1.5 sm:gap-2">
                {(['estimate', 'quotation', 'invoice'] as const).map(type => (
                  <button key={type} type="button" onClick={() => { hapticTap(); handleTypeChange(type); }}
                    className={`flex-1 py-2 sm:py-3 px-2 sm:px-4 rounded-lg sm:rounded-xl font-bold text-xs sm:text-sm transition-all ${formData.type === type
                      ? type === 'estimate' ? 'bg-teal-500 text-white shadow-lg' : type === 'quotation' ? 'bg-blue-500 text-white shadow-lg' : 'bg-slate-900 text-white shadow-lg'
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                      }`}>
                    {type === 'estimate' ? <><span className="sm:hidden">Est.</span><span className="hidden sm:inline">Estimate</span></> : type === 'quotation' ? <><span className="sm:hidden">Quote</span><span className="hidden sm:inline">Quotation</span></> : 'Invoice'}
                  </button>
                ))}
              </div>
            </div>

            {/* Client Selector */}
            <div className="relative" ref={dropdownRef}>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Client</label>
              <div className="flex items-center gap-2">
                <input type="text" className="w-full font-medium text-slate-900 border-b border-slate-100 pb-2 outline-none focus:border-teal-500 transition-colors placeholder:text-slate-300" value={customerSearch} onFocus={() => setShowCustomerDropdown(true)} onChange={e => setCustomerSearch(e.target.value)} placeholder="Select client" />
                <button onClick={() => setIsAddingCustomer(true)} className="p-1 bg-slate-50 text-teal-600 rounded-md"><UserPlus size={14} /></button>
              </div>
              {showCustomerDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-100 rounded-xl shadow-xl z-50 max-h-60 overflow-y-auto">
                  {customers.filter(c => c.name.toLowerCase().includes(customerSearch.toLowerCase())).map(c => (
                    <button key={c.id} onClick={() => { setFormData({ ...formData, customerId: c.id }); setCustomerSearch(c.name); setShowCustomerDropdown(false); }} className="w-full text-left p-3 hover:bg-slate-50 border-b border-slate-50 flex flex-col">
                      <span className="font-bold text-slate-900">{c.name}</span>
                      {c.company && <span className="text-xs text-slate-500">{c.company}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Date field(s) - side-by-side for invoices */}
            {formData.type === 'invoice' ? (
              <div className="col-span-1 md:col-span-2">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Invoice Date</label>
                    <input type="date" className="w-full font-medium text-slate-900 border-b border-slate-100 pb-2 outline-none focus:border-teal-500 transition-colors" value={formData.date || ''} onChange={e => setFormData({ ...formData, date: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-emerald-600 uppercase tracking-wider mb-1 flex items-center gap-1"><Calendar size={12} /> Due Date</label>
                    <input type="date" className="w-full font-medium text-slate-900 border-b border-emerald-200 pb-2 outline-none focus:border-emerald-400 transition-colors" value={formData.dueDate || ''} onChange={e => setFormData({ ...formData, dueDate: e.target.value })} />
                    {formData.dueDate && formData.date && (
                      <div className="text-xs text-emerald-600 font-bold mt-1">
                        Payment due in {Math.ceil((new Date(formData.dueDate).getTime() - new Date(formData.date).getTime()) / (1000 * 60 * 60 * 24))} days
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Date</label>
                <input type="date" className="w-full font-medium text-slate-900 border-b border-slate-100 pb-2 outline-none focus:border-teal-500 transition-colors" value={formData.date || ''} onChange={e => setFormData({ ...formData, date: e.target.value })} />
              </div>
            )}

            {/* Job Address */}
            <div className="col-span-1 md:col-span-2 mt-2">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <MapPin size={12} className="text-teal-500" /> Job Site Address <span className="text-slate-300 font-normal normal-case">(if different from client)</span>
                </label>
                <AddressAutocomplete value={formData.jobAddress || ''} onChange={(address) => setFormData(prev => ({ ...prev, jobAddress: address }))} placeholder="Enter job site address if different from client..." showLabel={false} />
              </div>
            </div>
          </div>
        </div>

        {/* AI Magic Builder */}
        <details className="group bg-teal-500/5 border border-teal-500/10 p-2 md:p-4 rounded-[20px] shadow-sm">
          <summary className="flex items-center justify-between cursor-pointer list-none">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-teal-100 rounded-lg text-teal-600"><Sparkles size={14} /></div>
              <h3 className="text-[10px] font-black uppercase tracking-[0.1em] text-teal-700 italic">AI Magic Builder</h3>
            </div>
            <ChevronDown size={16} className="text-teal-400 transition-transform group-open:rotate-180" />
          </summary>
          <div className="mt-3 pt-3 border-t border-teal-100/50">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Target:</span>
              <select className="bg-white border border-teal-100 rounded-lg text-[9px] font-black uppercase px-2 py-1 outline-none text-teal-600 cursor-pointer flex-1" value={targetSectionId || ''} onChange={e => setTargetSectionId(e.target.value)}>
                {(formData.sections || []).map((s, idx) => <option key={s.id} value={s.id}>{s.title || `Job ${idx + 1}`}</option>)}
              </select>
            </div>
            <input
              type="text"
              className="w-full bg-white border border-teal-100 rounded-xl px-3 py-2 mb-2 text-xs font-bold text-slate-900 outline-none focus:border-teal-400 transition-all placeholder:text-teal-300/60 shadow-inner"
              placeholder="Section title (optional — AI will suggest one)"
              value={aiSectionTitle}
              onChange={e => setAiSectionTitle(e.target.value)}
            />
            <div className="relative mb-2">
              <textarea className="w-full bg-white border border-teal-100 rounded-xl p-3 min-h-[60px] text-xs font-bold text-slate-900 outline-none focus:border-teal-400 transition-all placeholder:text-teal-300/60 shadow-inner" placeholder="Describe the work, e.g. Fit a new bathroom with bath, toilet, basin..." value={aiInput} onChange={e => setAiInput(e.target.value)} />
              <button onClick={() => {
                if (isListening || isHookListening) {
                  if (isIOS) stopHookListening();
                  else recognitionRef.current?.stop();
                  return;
                }
                voiceTargetRef.current = 'command';
                if (isIOS) { setIsListening(true); startHookListening(); }
                else { recognitionRef.current?.start(); }
              }} className={`absolute right-2 bottom-2 p-1.5 rounded-lg shadow-sm transition-all ${(isListening || isHookListening) ? 'bg-red-500 text-white animate-pulse' : 'bg-teal-500 text-white hover:bg-teal-600'}`}>
                {(isListening || isHookListening) ? <MicOff size={14} /> : <Mic size={14} />}
              </button>
            </div>
            <div className="flex gap-2">
              <button onClick={() => { const i = document.createElement('input'); i.type = 'file'; i.accept = 'image/*'; i.onchange = (e: any) => { const f = e.target.files[0]; if (f) { const r = new FileReader(); r.onload = (ev) => setAttachedImage(ev.target?.result as string); r.readAsDataURL(f); } }; i.click(); }} className="flex-1 bg-white border border-teal-100 text-teal-600 px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-teal-50 transition-all shadow-sm flex items-center justify-center gap-1.5">
                <Camera size={12} /> {attachedImage ? 'Photo Attached' : 'Photo'}
              </button>
              <button onClick={runAIAnalysis} disabled={loading || (!aiInput && !attachedImage)} className="flex-1 bg-slate-900 text-white px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-xl hover:bg-black disabled:opacity-30 flex items-center justify-center gap-1.5 transition-all">
                {loading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />} Generate
              </button>
            </div>
          </div>
        </details>

        {/* Sections */}
        <div className="space-y-3 md:space-y-4">
          {(formData.sections || []).map((section, sectionIdx) => (
            <QuoteSectionEditor
              key={section.id}
              section={section}
              sectionIndex={sectionIdx}
              totalSections={formData.sections?.length || 1}
              defaultLabourRate={formData.labourRate || settings.defaultLabourRate}
              settings={settings}
              onUpdateItem={updateItem}
              onRemoveItem={removeItem}
              onIncrementQuantity={incrementQuantity}
              onDecrementQuantity={decrementQuantity}
              onAddMaterial={addMaterialToSection}
              onAddHeading={addHeadingToSection}
              onOpenPriceList={(sectionId) => { setTargetSectionForMaterial(sectionId); setShowMaterialsLibrary(true); }}
              onApplyKit={(sectionId) => { setTargetSectionForKit(sectionId); setShowKitPicker(true); }}
              onSaveItemToLibrary={saveItemToLibrary}
              onAddLabourItem={addLabourItem}
              onUpdateLabourItem={updateLabourItem}
              onRemoveLabourItem={removeLabourItem}
              onIncrementLabourHours={incrementLabourHours}
              onDecrementLabourHours={decrementLabourHours}
              onUpdateTitle={updateSectionTitle}
              onUpdateDescription={updateSectionDescription}
              onUpdateLabourCost={updateLabourCost}
              onUpdateSubsectionPrice={updateSubsectionPrice}
              onRemoveSection={removeSection}
              calculateSectionLabour={calculateSectionLabour}
              getTotalLabourHours={getTotalLabourHours}
              onClearAIItems={clearAIItems}
            />
          ))}

          <button onClick={addSection} className="w-full py-6 md:py-8 border-4 border-dashed border-slate-100 text-slate-300 hover:border-amber-200 hover:text-amber-500 rounded-[32px] transition-all flex flex-col items-center justify-center gap-2">
            <div className="h-12 w-12 bg-slate-50 text-slate-300 rounded-2xl flex items-center justify-center"><Layers size={24} /></div>
            <span className="text-xs font-black uppercase tracking-[0.2em]">Add Another Job Section</span>
            <span className="text-[9px] font-bold italic">Separate distinct parts of the project</span>
          </button>
        </div>

        {/* Global Terms */}
        <div className="bg-white p-3 md:p-5 rounded-[24px] border border-slate-200 space-y-3 md:space-y-4 shadow-sm">
          <div className="flex items-center gap-3 border-b border-slate-50 pb-3">
            <div className="h-10 w-10 bg-slate-900 text-teal-500 rounded-2xl flex items-center justify-center shrink-0 shadow-lg"><FileText size={20} /></div>
            <div><h3 className="text-xs md:text-sm font-black text-slate-900 uppercase tracking-widest">Document Terms & Document-wide Rates</h3><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Apply to all sections</p></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 flex items-center gap-2 italic"><PoundSterling size={12} className="text-teal-500" /> Default Hourly Rate</label><input type="number" className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-3 text-slate-950 font-black text-sm outline-none focus:border-teal-400 transition-all" value={formData.labourRate || ''} onChange={e => setFormData({ ...formData, labourRate: parseFloat(e.target.value) || 0 })} placeholder="65.00" /></div>
            <div className="space-y-1"><label className="text-[10px] font-black text-teal-600 uppercase tracking-widest px-1 flex items-center gap-2 italic"><Percent size={12} className="text-teal-500" /> Global Markup %</label><input type="number" min="0" className="w-full bg-teal-50 border-2 border-teal-100 rounded-xl p-3 text-teal-900 font-black text-sm outline-none focus:border-teal-400 transition-all" value={formData.markupPercent ?? ''} onChange={e => setFormData({ ...formData, markupPercent: e.target.value === '' ? 0 : parseFloat(e.target.value) })} placeholder="0" /></div>
          </div>
          <div className="pt-2 space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 flex items-center gap-2 italic"><FileText size={14} className="text-teal-500" /> Document Footer / Terms</label><textarea className="w-full bg-slate-50 border-2 border-slate-100 rounded-[20px] p-3 md:p-4 text-slate-900 font-medium text-sm outline-none focus:border-teal-400 transition-all min-h-[100px]" value={formData.notes || ''} onChange={e => setFormData({ ...formData, notes: e.target.value })} placeholder="Final notes, bank details etc..." /></div>
        </div>

        {/* Discount Section */}
        <div className="bg-white p-4 rounded-[24px] border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2"><Tag size={16} className="text-emerald-500" /><span className="text-xs font-black text-slate-600 uppercase tracking-widest">Discount</span></div>
            {formData.discountValue ? (
              <div className="flex items-center gap-3">
                <span className="text-sm text-emerald-600 font-bold">-{formData.discountType === 'percentage' ? `${formData.discountValue}%` : `£${formData.discountValue.toFixed(2)}`}{formData.discountDescription && <span className="text-slate-400 ml-1">({formData.discountDescription})</span>}</span>
                <button onClick={() => setFormData(prev => ({ ...prev, discountType: undefined, discountValue: undefined, discountDescription: undefined }))} className="p-1 text-slate-300 hover:text-red-500 transition-colors"><X size={14} /></button>
              </div>
            ) : (
              <button onClick={() => setShowDiscountModal(true)} className="flex items-center gap-1 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg text-xs font-bold hover:bg-emerald-100 transition-colors"><Plus size={14} /> Add Discount</button>
            )}
          </div>
        </div>

        {/* Part Payment Section */}
        {formData.type === 'invoice' && (
          <div className="bg-white p-4 rounded-[24px] border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2"><Banknote size={16} className="text-blue-500" /><span className="text-xs font-black text-slate-600 uppercase tracking-widest">Part Payment</span></div>
              <div className="flex items-center gap-3">
                {formData.partPaymentEnabled && formData.partPaymentValue && (
                  <span className="text-sm text-blue-600 font-bold">{formData.partPaymentType === 'percentage' ? `${formData.partPaymentValue}%` : `£${formData.partPaymentValue.toFixed(2)}`}{formData.partPaymentLabel && <span className="text-slate-400 ml-1">({formData.partPaymentLabel})</span>}</span>
                )}
                <button onClick={() => { if (formData.partPaymentEnabled) { setFormData(prev => ({ ...prev, partPaymentEnabled: false, partPaymentType: undefined, partPaymentValue: undefined, partPaymentLabel: undefined })); } else { setShowPartPaymentModal(true); } }} className={`w-14 h-8 rounded-full relative transition-all duration-300 ${formData.partPaymentEnabled ? 'bg-blue-500 shadow-lg shadow-blue-200' : 'bg-slate-300'}`}>
                  <div className={`absolute top-1 left-1 bg-white w-6 h-6 rounded-full shadow transition-transform duration-300 ${formData.partPaymentEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Recurring Invoice Setup */}
        {formData.type === 'invoice' && (
          <div className="bg-white p-4 rounded-[24px] border border-slate-200 shadow-sm">
            <RecurringInvoiceSetup
              isRecurring={formData.isRecurring || false}
              frequency={formData.recurringFrequency}
              startDate={formData.recurringStartDate}
              endDate={formData.recurringEndDate}
              onToggle={(enabled) => {
                setFormData(prev => ({
                  ...prev,
                  isRecurring: enabled,
                  recurringStartDate: enabled ? (prev.recurringStartDate || new Date().toISOString().split('T')[0]) : undefined,
                  recurringNextDate: enabled ? (prev.recurringStartDate || new Date().toISOString().split('T')[0]) : undefined,
                }));
              }}
              onFrequencyChange={(freq) => setFormData(prev => ({ ...prev, recurringFrequency: freq }))}
              onStartDateChange={(date) => setFormData(prev => ({ ...prev, recurringStartDate: date, recurringNextDate: date }))}
              onEndDateChange={(date) => setFormData(prev => ({ ...prev, recurringEndDate: date }))}
            />
          </div>
        )}

        {/* Payment Schedule */}
        <div className="bg-white p-4 rounded-[24px] border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Banknote size={16} className="text-amber-500" />
            <span className="text-xs font-black text-slate-600 uppercase tracking-widest">Payment Schedule</span>
            <span className="text-[10px] text-slate-400 ml-auto">{paymentMilestones.length} milestone{paymentMilestones.length !== 1 ? 's' : ''}</span>
          </div>
          <PaymentMilestoneEditor
            milestones={paymentMilestones}
            onChange={setPaymentMilestones}
            totalAmount={totals.total}
          />
        </div>

        {/* Totals */}
        <QuoteTotals totals={totals} settings={settings} documentType={formData.type || 'estimate'} onSave={handleSave} />
      </div>

      {/* Modals */}
      <CustomerModal
        isOpen={isAddingCustomer}
        newCustomer={newCustomer}
        isListening={isListeningCustomer}
        isProcessing={isProcessingCustomer}
        error={customerError}
        onCustomerChange={(updates) => setNewCustomer(prev => ({ ...prev, ...updates }))}
        onSave={handleQuickAddCustomer}
        onClose={() => setIsAddingCustomer(false)}
        onToggleVoice={handleToggleCustomerVoice}
      />

      <DiscountModal
        isOpen={showDiscountModal}
        discountType={formData.discountType}
        discountValue={formData.discountValue}
        discountDescription={formData.discountDescription}
        subtotalWithMarkup={totals.subtotal + totals.markup}
        onTypeChange={(type) => setFormData(prev => ({ ...prev, discountType: type }))}
        onValueChange={(value) => setFormData(prev => ({ ...prev, discountValue: value }))}
        onDescriptionChange={(desc) => setFormData(prev => ({ ...prev, discountDescription: desc }))}
        onApply={() => setShowDiscountModal(false)}
        onClose={() => setShowDiscountModal(false)}
      />

      <PartPaymentModal
        isOpen={showPartPaymentModal}
        paymentType={formData.partPaymentType}
        paymentValue={formData.partPaymentValue}
        paymentLabel={formData.partPaymentLabel}
        total={totals.total}
        onTypeChange={(type) => setFormData(prev => ({ ...prev, partPaymentType: type }))}
        onValueChange={(value) => setFormData(prev => ({ ...prev, partPaymentValue: value }))}
        onLabelChange={(label) => setFormData(prev => ({ ...prev, partPaymentLabel: label }))}
        onApply={() => { setFormData(prev => ({ ...prev, partPaymentEnabled: true })); setShowPartPaymentModal(false); }}
        onClose={() => setShowPartPaymentModal(false)}
      />

      {/* Materials Library Modal */}
      {showMaterialsLibrary && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center">
          <div className="bg-white rounded-t-3xl w-full max-h-[85vh] overflow-hidden animate-in slide-in-from-bottom-4">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-black text-lg text-slate-900">Select from Price List</h3>
              <button onClick={() => setShowMaterialsLibrary(false)} className="p-2 hover:bg-slate-200 rounded-lg transition-colors"><X size={20} className="text-slate-500" /></button>
            </div>
            <div className="overflow-auto max-h-[calc(85vh-60px)]">
              <MaterialsLibrary selectionMode={true} onSelectMaterial={(material) => { if (targetSectionForMaterial) { addMaterialFromLibrary(targetSectionForMaterial, material); } }} onBack={() => setShowMaterialsLibrary(false)} />
            </div>
          </div>
        </div>
      )}

      {/* Material Kit Picker Modal */}
      {showKitPicker && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-0 md:p-4">
          <div className="bg-white rounded-t-3xl md:rounded-2xl w-full max-w-lg max-h-[85vh] overflow-hidden animate-in slide-in-from-bottom-4">
            <MaterialKitPicker
              onApplyKit={(items) => {
                if (targetSectionForKit) {
                  setFormData(prev => ({
                    ...prev,
                    sections: prev.sections?.map(s =>
                      s.id === targetSectionForKit
                        ? { ...s, items: [...s.items, ...items] }
                        : s
                    ),
                  }));
                  hapticSuccess();
                }
                setShowKitPicker(false);
              }}
              onClose={() => setShowKitPicker(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};
