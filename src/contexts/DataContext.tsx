import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import {
  customersService,
  jobPacksService,
  quotesService,
  scheduleService,
  userSettingsService,
  expensesService,
  bankTransactionsService,
  reconciliationService,
  payablesService,
  filingService,
  expenseCategoriesService,
  vendorsService,
  vendorKeywordsService,
  materialsLibraryService,
  materialsImportHistoryService,
  sitePhotosService,
  siteNotesService,
  projectMaterialsService,
} from '../services/dataService';
import { materialKitsService } from '../services/materialKitsService';
import { paymentMilestoneService } from '../services/paymentMilestoneService';
import { recurringInvoiceService } from '../services/recurringInvoiceService';
import { offlineService } from '../services/offlineStorage';
import { syncManager } from '../services/syncManager';
import type { Customer, Quote, JobPack, ScheduleEntry, AppSettings, DocumentTemplate, ProjectMaterial, SiteNote, SitePhoto, LabourRatePreset } from '../../types';

// Default labour rate presets
const DEFAULT_LABOUR_RATE_PRESETS: LabourRatePreset[] = [
  { name: 'Standard', rate: 65 },
  { name: 'Callout (1st Hr)', rate: 85 },
  { name: 'Overtime', rate: 97.50 },
  { name: 'Weekend', rate: 97.50 },
];

// Default settings
const DEFAULT_SETTINGS: AppSettings = {
  defaultLabourRate: 65,
  defaultMarkupPercent: 0,
  defaultTaxRate: 20,
  defaultCisRate: 20,
  labourRatePresets: DEFAULT_LABOUR_RATE_PRESETS,
  companyName: 'My Trade Business',
  companyAddress: '',
  companyLogo: undefined,
  companyLogoPath: undefined,
  footerLogos: [],
  isVatRegistered: false,
  vatNumber: undefined,
  enableVat: true,
  enableCis: true,
  quotePrefix: 'EST-',
  invoicePrefix: 'INV-',
  defaultQuoteNotes: 'This estimate is based on the initial survey. Prices for materials are subject to market volatility. Final invoicing will be based on actual quantities used on site.',
  defaultInvoiceNotes: 'Please settle this invoice within 14 days. Thank you for your business!',
  costBoxColor: 'slate',
  showBreakdown: true,
  defaultDisplayOptions: {
    showMaterials: true,
    showMaterialItems: true,
    showMaterialQty: true,
    showMaterialUnitPrice: true,
    showMaterialLineTotals: true,
    showMaterialSectionTotal: true,
    showLabour: true,
    showLabourItems: true,
    showLabourQty: true,
    showLabourUnitPrice: true,
    showLabourLineTotals: true,
    showLabourSectionTotal: true,
    showVat: true,
    showCis: true,
    showNotes: true,
    showLogo: true,
    showTotalsBreakdown: true,
    showWorkSectionTotal: true,
  },
  // Subscription defaults - trialing users get free tier limits
  subscriptionTier: 'free',
  subscriptionStatus: 'trialing',
  trialStart: undefined,
  trialEnd: undefined,
  subscriptionStart: undefined,
  subscriptionEnd: undefined,
  subscriptionPeriodEnd: undefined,
  stripeCustomerId: undefined,
  stripeSubscriptionId: undefined,
  referralCode: undefined,
  usageLimits: undefined, // Will fall back to TIER_LIMITS[tier]
  quickPickMaterials: ['C24 Timber', 'Cement', 'Ballast', 'Plasterboard', 'Multi-finish', 'Screws', 'PVA', 'Expanding Foam', 'Sealant', 'Sand'],
};

interface DataContextType {
  // Data
  customers: Customer[];
  quotes: Quote[];
  projects: JobPack[];
  schedule: ScheduleEntry[];
  settings: AppSettings;

  // Loading states
  loading: boolean;
  error: string | null;

  // Customer actions
  addCustomer: (customer: Omit<Customer, 'id'>) => Promise<Customer>;
  updateCustomer: (id: string, updates: Partial<Customer>) => Promise<void>;
  deleteCustomer: (id: string) => Promise<void>;

  // Quote actions
  saveQuote: (quote: Quote) => Promise<Quote>;
  updateQuote: (quote: Quote) => Promise<void>;
  updateQuoteStatus: (id: string, status: Quote['status']) => Promise<void>;
  deleteQuote: (id: string) => Promise<void>;

  // Project actions
  addProject: (project: Omit<JobPack, 'id' | 'createdAt' | 'updatedAt'>) => Promise<JobPack>;
  saveProject: (project: JobPack) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;

  // Schedule actions
  addScheduleEntry: (entry: Omit<ScheduleEntry, 'id'>) => Promise<ScheduleEntry>;
  updateScheduleEntry: (id: string, updates: Partial<ScheduleEntry>) => Promise<void>;
  deleteScheduleEntry: (id: string) => Promise<void>;
  setScheduleEntries: React.Dispatch<React.SetStateAction<ScheduleEntry[]>>;

  // Settings actions
  updateSettings: (updates: Partial<AppSettings>) => Promise<void>;
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;

  // Setters for components that need direct control
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;

  // Direct access to services for components that need them
  services: {
    expenses: typeof expensesService;
    bankTransactions: typeof bankTransactionsService;
    reconciliation: typeof reconciliationService;
    payables: typeof payablesService;
    filing: typeof filingService;
    expenseCategories: typeof expenseCategoriesService;
    vendors: typeof vendorsService;
    vendorKeywords: typeof vendorKeywordsService;
    materialsLibrary: typeof materialsLibraryService;
    materialsImportHistory: typeof materialsImportHistoryService;
    materialKits: typeof materialKitsService;
    paymentMilestones: typeof paymentMilestoneService;
    recurringInvoices: typeof recurringInvoiceService;
  };

  // Refresh data
  refresh: () => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};

// Helper to convert DB format to app format for JobPack
async function dbJobPackToApp(dbPack: any): Promise<JobPack> {
  // Generate signed URLs for all photos and drawings
  const photosWithUrls = await Promise.all(
    (dbPack.site_photos || [])
      .filter((p: any) => !p.is_drawing)
      .map(async (p: any) => {
        const signedUrl = await sitePhotosService.getUrl(p.storage_path);
        return {
          id: p.id,
          url: signedUrl || p.storage_path, // Fallback to storage_path if signing fails
          caption: p.caption || '',
          timestamp: p.created_at,
          tags: p.tags || [],
        };
      })
  );

  const drawingsWithUrls = await Promise.all(
    (dbPack.site_photos || [])
      .filter((p: any) => p.is_drawing)
      .map(async (p: any) => {
        const signedUrl = await sitePhotosService.getUrl(p.storage_path);
        return {
          id: p.id,
          url: signedUrl || p.storage_path,
          caption: p.caption || '',
          timestamp: p.created_at,
          tags: p.tags || [],
        };
      })
  );

  return {
    id: dbPack.id,
    title: dbPack.title,
    customerId: dbPack.customer_id || '',
    status: dbPack.status,
    createdAt: dbPack.created_at,
    updatedAt: dbPack.updated_at,
    notepad: dbPack.notepad || '',
    notes: (dbPack.site_notes || []).map((n: any) => ({
      id: n.id,
      text: n.text,
      timestamp: n.created_at,
      isVoice: n.is_voice,
    })),
    photos: photosWithUrls,
    drawings: drawingsWithUrls,
    documents: (dbPack.site_documents || []).map((d: any) => ({
      id: d.id,
      name: d.name,
      url: d.storage_path,
      type: d.file_type || '',
      summary: d.summary,
      timestamp: d.created_at,
    })),
    materials: (dbPack.project_materials || []).map((m: any) => ({
      id: m.id,
      name: m.name,
      unit: m.unit || '',
      quotedQty: Number(m.quoted_qty) || 0,
      orderedQty: Number(m.ordered_qty) || 0,
      deliveredQty: Number(m.delivered_qty) || 0,
      usedQty: Number(m.used_qty) || 0,
      status: m.status,
    })),
  };
}

// Helper to convert DB format to app format for Quote
function dbQuoteToApp(dbQuote: any): Quote {
  return {
    id: dbQuote.id,
    customerId: dbQuote.customer_id || '',
    projectId: dbQuote.job_pack_id || undefined,
    date: dbQuote.date,
    updatedAt: dbQuote.updated_at,
    createdAt: dbQuote.created_at || dbQuote.date,
    title: dbQuote.title,
    sections: dbQuote.sections || [],
    labourRate: Number(dbQuote.labour_rate) || 65,
    markupPercent: Number(dbQuote.markup_percent) || 0,
    taxPercent: Number(dbQuote.tax_percent) || 20,
    cisPercent: Number(dbQuote.cis_percent) || 20,
    status: dbQuote.status,
    notes: dbQuote.notes || '',
    type: dbQuote.type,
    displayOptions: dbQuote.display_options || undefined,
    referenceNumber: dbQuote.reference_number || undefined,
    // Invoice-specific fields
    dueDate: dbQuote.due_date || undefined,
    paymentDate: dbQuote.payment_date || undefined,
    paymentMethod: dbQuote.payment_method || undefined,
    amountPaid: dbQuote.amount_paid != null ? Number(dbQuote.amount_paid) : undefined,
    parentQuoteId: dbQuote.parent_quote_id || undefined,
    // Discount fields
    discountType: dbQuote.discount_type || undefined,
    discountValue: dbQuote.discount_value != null ? Number(dbQuote.discount_value) : undefined,
    discountDescription: dbQuote.discount_description || undefined,
    // Part payment fields
    partPaymentEnabled: dbQuote.part_payment_enabled || false,
    partPaymentType: dbQuote.part_payment_type || undefined,
    partPaymentValue: dbQuote.part_payment_value != null ? Number(dbQuote.part_payment_value) : undefined,
    partPaymentLabel: dbQuote.part_payment_label || undefined,
    // Job address
    jobAddress: dbQuote.job_address || undefined,
    // Share/acceptance fields
    shareToken: dbQuote.share_token || undefined,
    acceptedAt: dbQuote.accepted_at || undefined,
    declinedAt: dbQuote.declined_at || undefined,
    // Recurring invoice fields
    isRecurring: dbQuote.is_recurring || false,
    recurringFrequency: dbQuote.recurring_frequency || undefined,
    recurringStartDate: dbQuote.recurring_start_date || undefined,
    recurringEndDate: dbQuote.recurring_end_date || undefined,
    recurringNextDate: dbQuote.recurring_next_date || undefined,
    recurringParentId: dbQuote.recurring_parent_id || undefined,
    // Credit note fields
    isCreditNote: dbQuote.is_credit_note || false,
    originalInvoiceId: dbQuote.original_invoice_id || undefined,
    creditNoteReason: dbQuote.credit_note_reason || undefined,
  };
}

// Helper to convert DB format to app format for ScheduleEntry
function dbScheduleToApp(dbEntry: any): ScheduleEntry {
  return {
    id: dbEntry.id,
    title: dbEntry.title,
    start: dbEntry.start_time,
    end: dbEntry.end_time,
    description: dbEntry.description || undefined,
    projectId: dbEntry.job_pack_id || undefined,
    customerId: dbEntry.customer_id || undefined,
    location: dbEntry.location || undefined,
  };
}

// Helper to convert DB settings to app settings
function dbSettingsToApp(dbSettings: any): AppSettings {
  return {
    defaultLabourRate: Number(dbSettings.default_labour_rate) || 65,
    defaultMarkupPercent: dbSettings.default_markup_percent != null ? Number(dbSettings.default_markup_percent) : 0,
    defaultTaxRate: Number(dbSettings.default_tax_rate) || 20,
    defaultCisRate: Number(dbSettings.default_cis_rate) || 20,
    labourRatePresets: dbSettings.labour_rate_presets || DEFAULT_LABOUR_RATE_PRESETS,
    companyName: dbSettings.company_name || '',
    companyAddress: dbSettings.company_address || '',
    phone: dbSettings.phone || undefined,
    email: dbSettings.email || undefined,
    // Store the path for now, we'll fetch the signed URL separately
    companyLogo: undefined,
    companyLogoPath: dbSettings.company_logo_path || undefined,
    footerLogos: dbSettings.footer_logos || [],
    isVatRegistered: dbSettings.is_vat_registered ?? false,
    vatNumber: dbSettings.vat_number || undefined,
    enableVat: dbSettings.enable_vat ?? true,
    enableCis: dbSettings.enable_cis ?? true,
    quotePrefix: dbSettings.quote_prefix || 'EST-',
    invoicePrefix: dbSettings.invoice_prefix || 'INV-',
    defaultQuoteNotes: dbSettings.default_quote_notes ?? '',
    defaultInvoiceNotes: dbSettings.default_invoice_notes ?? '',
    costBoxColor: (dbSettings.cost_box_color as 'slate' | 'amber' | 'blue') || 'slate',
    showBreakdown: dbSettings.show_breakdown ?? true,
    defaultDisplayOptions: dbSettings.default_display_options || DEFAULT_SETTINGS.defaultDisplayOptions,
    documentTemplate: (dbSettings.document_template as DocumentTemplate) || 'classic',
    invoiceColorScheme: (dbSettings.invoice_color_scheme as 'executive' | 'navy' | 'slate' | 'stone' | 'forest' | 'minimal' | 'teal' | 'modern') || 'executive',
    quoteColorScheme: (dbSettings.quote_color_scheme as 'executive' | 'navy' | 'slate' | 'stone' | 'forest' | 'minimal' | 'teal' | 'modern') || 'executive',
    // Bank details for payment instructions
    bankAccountName: dbSettings.bank_account_name || undefined,
    bankAccountNumber: dbSettings.bank_account_number || undefined,
    bankSortCode: dbSettings.bank_sort_code || undefined,
    bankName: dbSettings.bank_name || undefined,
    // Tax year settings (UK default: April 6)
    taxYearStartMonth: dbSettings.tax_year_start_month || 4,
    taxYearStartDay: dbSettings.tax_year_start_day || 6,
    // Subscription fields
    subscriptionTier: dbSettings.subscription_tier || 'free',
    subscriptionStatus: dbSettings.subscription_status || 'trialing',
    trialStart: dbSettings.trial_start || undefined,
    trialEnd: dbSettings.trial_end || undefined,
    subscriptionStart: dbSettings.subscription_start || undefined,
    subscriptionEnd: dbSettings.subscription_end || undefined,
    subscriptionPeriodEnd: dbSettings.subscription_period_end || undefined,
    stripeCustomerId: dbSettings.stripe_customer_id || undefined,
    stripeSubscriptionId: dbSettings.stripe_subscription_id || undefined,
    referralCode: dbSettings.referral_code || undefined,
    usageLimits: dbSettings.usage_limits || undefined,
    quickPickMaterials: dbSettings.quick_pick_materials || DEFAULT_SETTINGS.quickPickMaterials,
  };
}

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const isOnlineRef = useRef(typeof navigator !== 'undefined' ? navigator.onLine : true);

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [projects, setProjects] = useState<JobPack[]>([]);
  const [schedule, setSchedule] = useState<ScheduleEntry[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Track online status
  useEffect(() => {
    const handleOnline = () => { isOnlineRef.current = true; };
    const handleOffline = () => { isOnlineRef.current = false; };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Load from IndexedDB cache
  const loadFromCache = useCallback(async () => {
    try {
      const [cachedCustomers, cachedQuotes, cachedSchedule, cachedJobPacks] = await Promise.all([
        offlineService.customers.getAll(),
        offlineService.quotes.getAll(),
        offlineService.schedule.getAll(),
        offlineService.jobPacks.getAll(),
      ]);

      if (cachedCustomers.length > 0) setCustomers(cachedCustomers as Customer[]);
      if (cachedQuotes.length > 0) setQuotes(cachedQuotes as Quote[]);
      if (cachedSchedule.length > 0) setSchedule(cachedSchedule as ScheduleEntry[]);
      if (cachedJobPacks.length > 0) setProjects(cachedJobPacks as JobPack[]);

      return cachedCustomers.length > 0 || cachedQuotes.length > 0;
    } catch (err) {
      console.warn('Failed to load from cache:', err);
      return false;
    }
  }, []);

  // Save to IndexedDB cache
  const saveToCache = useCallback(async (data: {
    customers?: Customer[];
    quotes?: Quote[];
    schedule?: ScheduleEntry[];
    projects?: JobPack[];
  }) => {
    try {
      await Promise.all([
        data.customers && offlineService.customers.sync(data.customers),
        data.quotes && offlineService.quotes.sync(data.quotes),
        data.schedule && offlineService.schedule.sync(data.schedule),
        data.projects && offlineService.jobPacks.sync(data.projects),
      ].filter(Boolean));
    } catch (err) {
      console.warn('Failed to save to cache:', err);
    }
  }, []);

  // Fetch all data
  const fetchData = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    // If offline, load from cache only
    if (!navigator.onLine) {
      const hasCache = await loadFromCache();
      if (hasCache) {
        setLoading(false);
        return;
      }
      setError('No internet connection and no cached data available');
      setLoading(false);
      return;
    }

    try {
      const results = await Promise.allSettled([
        customersService.getAll(),
        jobPacksService.getAll(),
        quotesService.getAll(),
        scheduleService.getAll(),
        userSettingsService.get(),
      ]);

      const [customersResult, jobPacksResult, quotesResult, scheduleResult, settingsResult] = results;

      const loadedCustomers: Customer[] = [];
      const loadedQuotes: Quote[] = [];
      const loadedProjects: JobPack[] = [];
      const loadedSchedule: ScheduleEntry[] = [];

      // Process successful results, use empty arrays for failures
      if (customersResult.status === 'fulfilled') {
        const mapped = customersResult.value.map((c: any) => ({
          id: c.id,
          name: c.name,
          email: c.email || '',
          phone: c.phone || '',
          address: c.address || '',
          company: c.company || undefined,
        }));
        loadedCustomers.push(...mapped);
        setCustomers(mapped);
      }

      if (jobPacksResult.status === 'fulfilled') {
        const mapped = await Promise.all(jobPacksResult.value.map(dbJobPackToApp));
        loadedProjects.push(...mapped);
        setProjects(mapped);
      }

      if (quotesResult.status === 'fulfilled') {
        const mapped = quotesResult.value.map(dbQuoteToApp);
        loadedQuotes.push(...mapped);
        setQuotes(mapped);
      }

      if (scheduleResult.status === 'fulfilled') {
        const mapped = scheduleResult.value.map(dbScheduleToApp);
        loadedSchedule.push(...mapped);
        setSchedule(mapped);
      }

      if (settingsResult.status === 'fulfilled' && settingsResult.value) {
        const appSettings = dbSettingsToApp(settingsResult.value);

        // Fetch signed URL for company logo if path exists
        if (appSettings.companyLogoPath) {
          try {
            const logoUrl = await userSettingsService.getLogoUrl(appSettings.companyLogoPath);
            if (logoUrl) {
              appSettings.companyLogo = logoUrl;
            }
          } catch (err) {
            console.warn('Failed to fetch logo URL:', err);
          }
        }

        // Check trial expiry and auto-downgrade to free tier
        if (appSettings.subscriptionStatus === 'trialing' && appSettings.trialEnd) {
          const trialEndDate = new Date(appSettings.trialEnd);
          if (trialEndDate < new Date()) {
            console.log('Trial expired, downgrading to free tier');
            // Update local state immediately
            appSettings.subscriptionTier = 'free';
            appSettings.subscriptionStatus = 'expired';
            // Persist to database (fire-and-forget)
            userSettingsService.update({
              subscription_tier: 'free',
              subscription_status: 'expired',
            }).catch(err => console.error('Failed to persist trial expiry:', err));
          }
        }

        setSettings(appSettings);
      }

      // Cache data to IndexedDB for offline use
      await saveToCache({
        customers: loadedCustomers,
        quotes: loadedQuotes,
        schedule: loadedSchedule,
        projects: loadedProjects,
      });

      // Check if any critical services failed
      const failures = results.filter(r => r.status === 'rejected');
      if (failures.length > 0) {
        console.warn('Some services failed to load:', failures);
      }
    } catch (err: any) {
      console.error('Error fetching data:', err);
      // Try loading from cache as fallback
      const hasCache = await loadFromCache();
      if (!hasCache) {
        setError(err.message || 'Failed to load data');
      }
    } finally {
      setLoading(false);
    }
  }, [user, loadFromCache, saveToCache]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Cross-device sync: Refresh data when tab regains focus
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !loading && user) {
        console.log('[DataContext] Tab visible - refreshing data for cross-device sync');
        fetchData();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [fetchData, loading, user]);

  // Customer actions
  const addCustomer = async (customer: Omit<Customer, 'id'>): Promise<Customer> => {
    if (!user) throw new Error('Not authenticated');

    const created = await customersService.create({
      user_id: user.id,
      name: customer.name,
      email: customer.email || null,
      phone: customer.phone || null,
      address: customer.address || null,
      company: customer.company || null,
    });

    const newCustomer: Customer = {
      id: created.id,
      name: created.name,
      email: created.email || '',
      phone: created.phone || '',
      address: created.address || '',
      company: created.company || undefined,
    };

    setCustomers(prev => [...prev, newCustomer]);
    return newCustomer;
  };

  const updateCustomer = async (id: string, updates: Partial<Customer>) => {
    await customersService.update(id, {
      name: updates.name,
      email: updates.email || null,
      phone: updates.phone || null,
      address: updates.address || null,
      company: updates.company || null,
    });

    setCustomers(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  const deleteCustomer = async (id: string) => {
    await customersService.delete(id);
    setCustomers(prev => prev.filter(c => c.id !== id));
  };

  // Quote actions
  const saveQuote = async (quote: Quote): Promise<Quote> => {
    if (!user) throw new Error('Not authenticated');

    const isNew = !quotes.find(q => q.id === quote.id);

    if (isNew) {
      const refNum = await quotesService.getNextReferenceNumber(quote.type);

      const created = await quotesService.create({
        user_id: user.id,
        customer_id: quote.customerId || null,
        job_pack_id: quote.projectId || null,
        title: quote.title,
        type: quote.type,
        status: quote.status,
        sections: quote.sections as any,
        labour_rate: quote.labourRate,
        markup_percent: quote.markupPercent,
        tax_percent: quote.taxPercent,
        cis_percent: quote.cisPercent,
        notes: quote.notes || null,
        display_options: quote.displayOptions as any,
        reference_number: refNum,
        // Invoice-specific fields
        due_date: quote.dueDate || null,
        payment_date: quote.paymentDate || null,
        payment_method: quote.paymentMethod || null,
        amount_paid: quote.amountPaid ?? 0,
        parent_quote_id: quote.parentQuoteId || null,
        // Discount fields
        discount_type: quote.discountType || null,
        discount_value: quote.discountValue ?? null,
        discount_description: quote.discountDescription || null,
        // Part payment fields
        part_payment_enabled: quote.partPaymentEnabled || false,
        part_payment_type: quote.partPaymentType || null,
        part_payment_value: quote.partPaymentValue ?? null,
        part_payment_label: quote.partPaymentLabel || null,
        // Job address
        job_address: quote.jobAddress || null,
        // Recurring invoice fields (not in generated types yet)
        ...(quote.isRecurring ? {
          is_recurring: true,
          recurring_frequency: quote.recurringFrequency || null,
          recurring_start_date: quote.recurringStartDate || null,
          recurring_end_date: quote.recurringEndDate || null,
          recurring_next_date: quote.recurringNextDate || null,
        } : {}),
        ...(quote.recurringParentId ? { recurring_parent_id: quote.recurringParentId } : {}),
        // Credit note fields
        ...(quote.isCreditNote ? {
          is_credit_note: true,
          original_invoice_id: quote.originalInvoiceId || null,
          credit_note_reason: quote.creditNoteReason || null,
        } : {}),
      } as any);

      const newQuote = dbQuoteToApp(created);
      setQuotes(prev => [...prev, newQuote]);
      return newQuote;
    } else {
      const updated = await quotesService.update(quote.id, {
        customer_id: quote.customerId || null,
        job_pack_id: quote.projectId || null,
        title: quote.title,
        type: quote.type,
        status: quote.status,
        sections: quote.sections as any,
        labour_rate: quote.labourRate,
        markup_percent: quote.markupPercent,
        tax_percent: quote.taxPercent,
        cis_percent: quote.cisPercent,
        notes: quote.notes || null,
        display_options: quote.displayOptions as any,
        // Invoice-specific fields
        due_date: quote.dueDate || null,
        payment_date: quote.paymentDate || null,
        payment_method: quote.paymentMethod || null,
        amount_paid: quote.amountPaid ?? 0,
        parent_quote_id: quote.parentQuoteId || null,
        // Discount fields
        discount_type: quote.discountType || null,
        discount_value: quote.discountValue ?? null,
        discount_description: quote.discountDescription || null,
        // Part payment fields
        part_payment_enabled: quote.partPaymentEnabled || false,
        part_payment_type: quote.partPaymentType || null,
        part_payment_value: quote.partPaymentValue ?? null,
        part_payment_label: quote.partPaymentLabel || null,
        // Job address
        job_address: quote.jobAddress || null,
        // Recurring invoice fields (not in generated types yet)
        ...(quote.isRecurring !== undefined ? {
          is_recurring: quote.isRecurring || false,
          recurring_frequency: quote.recurringFrequency || null,
          recurring_start_date: quote.recurringStartDate || null,
          recurring_end_date: quote.recurringEndDate || null,
          recurring_next_date: quote.recurringNextDate || null,
        } : {}),
        ...(quote.recurringParentId ? { recurring_parent_id: quote.recurringParentId } : {}),
      } as any);

      const updatedQuote = dbQuoteToApp(updated);
      setQuotes(prev => prev.map(q => q.id === quote.id ? updatedQuote : q));
      return updatedQuote;
    }
  };

  const updateQuote = async (quote: Quote) => {
    await saveQuote(quote);
  };

  const updateQuoteStatus = async (id: string, status: Quote['status']) => {
    await quotesService.update(id, { status });
    setQuotes(prev => prev.map(q => q.id === id ? { ...q, status, updatedAt: new Date().toISOString() } : q));
  };

  const deleteQuote = async (id: string) => {
    await quotesService.delete(id);
    setQuotes(prev => prev.filter(q => q.id !== id));
  };

  // Project actions
  const addProject = async (project: Omit<JobPack, 'id' | 'createdAt' | 'updatedAt'>): Promise<JobPack> => {
    if (!user) throw new Error('Not authenticated');

    const created = await jobPacksService.create({
      user_id: user.id,
      customer_id: project.customerId || null,
      title: project.title,
      status: project.status,
      notepad: project.notepad || null,
    });

    const newProject: JobPack = {
      id: created.id,
      title: created.title,
      customerId: created.customer_id || '',
      status: created.status as JobPack['status'],
      createdAt: created.created_at,
      updatedAt: created.updated_at,
      notepad: created.notepad || '',
      notes: [],
      photos: [],
      drawings: [],
      documents: [],
      materials: [],
    };

    setProjects(prev => [...prev, newProject]);
    return newProject;
  };

  const saveProject = async (project: JobPack) => {
    // Update job pack basic fields
    await jobPacksService.update(project.id, {
      customer_id: project.customerId || null,
      title: project.title,
      status: project.status,
      notepad: project.notepad || null,
    });

    // Get current project from state to compare for changes
    const currentProject = projects.find(p => p.id === project.id);
    const currentMaterials = currentProject?.materials || [];
    const newMaterials = project.materials || [];

    // Helper to check if an ID is a temporary client-generated ID (not a UUID)
    const isTemporaryId = (id: string) => !id.includes('-') || id.length < 20;

    // Sync materials to database
    const materialIdMap: Record<string, string> = {}; // temp ID -> real ID

    // 1. Create new materials (those with temporary IDs)
    for (const material of newMaterials) {
      if (isTemporaryId(material.id)) {
        try {
          const created = await projectMaterialsService.create({
            job_pack_id: project.id,
            name: material.name,
            unit: material.unit || 'pc',
            quoted_qty: material.quotedQty,
            ordered_qty: material.orderedQty,
            delivered_qty: material.deliveredQty,
            used_qty: material.usedQty,
            status: material.status,
          });
          materialIdMap[material.id] = created.id;
        } catch (err) {
          console.error('Failed to create material:', material.name, err);
        }
      }
    }

    // 2. Update existing materials (those that exist in both current and new)
    for (const material of newMaterials) {
      if (!isTemporaryId(material.id)) {
        const existing = currentMaterials.find(m => m.id === material.id);
        if (existing && (
          existing.name !== material.name ||
          existing.unit !== material.unit ||
          existing.quotedQty !== material.quotedQty ||
          existing.orderedQty !== material.orderedQty ||
          existing.deliveredQty !== material.deliveredQty ||
          existing.usedQty !== material.usedQty ||
          existing.status !== material.status
        )) {
          try {
            await projectMaterialsService.update(material.id, {
              name: material.name,
              unit: material.unit || 'pc',
              quoted_qty: material.quotedQty,
              ordered_qty: material.orderedQty,
              delivered_qty: material.deliveredQty,
              used_qty: material.usedQty,
              status: material.status,
            });
          } catch (err) {
            console.error('Failed to update material:', material.name, err);
          }
        }
      }
    }

    // 3. Delete removed materials
    const newMaterialIds = new Set(newMaterials.map(m => m.id));
    for (const material of currentMaterials) {
      if (!newMaterialIds.has(material.id) && !isTemporaryId(material.id)) {
        try {
          await projectMaterialsService.delete(material.id);
        } catch (err) {
          console.error('Failed to delete material:', material.name, err);
        }
      }
    }

    // Sync notes to database
    const currentNotes = currentProject?.notes || [];
    const newNotes = project.notes || [];

    // Create new notes
    const noteIdMap: Record<string, string> = {};
    for (const note of newNotes) {
      if (isTemporaryId(note.id)) {
        try {
          const created = await siteNotesService.create({
            job_pack_id: project.id,
            text: note.text,
            is_voice: note.isVoice || false,
          });
          noteIdMap[note.id] = created.id;
        } catch (err) {
          console.error('Failed to create note:', err);
        }
      }
    }

    // Update existing notes
    for (const note of newNotes) {
      if (!isTemporaryId(note.id)) {
        const existing = currentNotes.find(n => n.id === note.id);
        if (existing && existing.text !== note.text) {
          try {
            await siteNotesService.update(note.id, { text: note.text });
          } catch (err) {
            console.error('Failed to update note:', err);
          }
        }
      }
    }

    // Delete removed notes
    const newNoteIds = new Set(newNotes.map(n => n.id));
    for (const note of currentNotes) {
      if (!newNoteIds.has(note.id) && !isTemporaryId(note.id)) {
        try {
          await siteNotesService.delete(note.id);
        } catch (err) {
          console.error('Failed to delete note:', err);
        }
      }
    }

    // Sync photo captions (photos are uploaded separately, we only update captions here)
    const currentPhotos = currentProject?.photos || [];
    const newPhotos = project.photos || [];
    for (const photo of newPhotos) {
      if (!isTemporaryId(photo.id)) {
        const existing = currentPhotos.find(p => p.id === photo.id);
        if (existing && existing.caption !== photo.caption) {
          try {
            await sitePhotosService.update(photo.id, { caption: photo.caption });
          } catch (err) {
            console.error('Failed to update photo caption:', err);
          }
        }
      }
    }

    // Sync drawing captions
    const currentDrawings = currentProject?.drawings || [];
    const newDrawings = project.drawings || [];
    for (const drawing of newDrawings) {
      if (!isTemporaryId(drawing.id)) {
        const existing = currentDrawings.find(d => d.id === drawing.id);
        if (existing && existing.caption !== drawing.caption) {
          try {
            await sitePhotosService.update(drawing.id, { caption: drawing.caption });
          } catch (err) {
            console.error('Failed to update drawing caption:', err);
          }
        }
      }
    }

    // Update local state with proper IDs for newly created items
    const updatedMaterials = newMaterials.map(m =>
      materialIdMap[m.id] ? { ...m, id: materialIdMap[m.id] } : m
    );
    const updatedNotes = newNotes.map(n =>
      noteIdMap[n.id] ? { ...n, id: noteIdMap[n.id] } : n
    );

    setProjects(prev => prev.map(p => p.id === project.id ? {
      ...project,
      materials: updatedMaterials,
      notes: updatedNotes,
      updatedAt: new Date().toISOString()
    } : p));
  };

  const deleteProject = async (id: string) => {
    await jobPacksService.delete(id);
    setProjects(prev => prev.filter(p => p.id !== id));
  };

  // Schedule actions
  const addScheduleEntry = async (entry: Omit<ScheduleEntry, 'id'>): Promise<ScheduleEntry> => {
    if (!user) throw new Error('Not authenticated');

    const created = await scheduleService.create({
      user_id: user.id,
      job_pack_id: entry.projectId || null,
      customer_id: entry.customerId || null,
      title: entry.title,
      description: entry.description || null,
      location: entry.location || null,
      start_time: entry.start,
      end_time: entry.end,
    });

    const newEntry = dbScheduleToApp(created);
    setSchedule(prev => [...prev, newEntry]);
    return newEntry;
  };

  const updateScheduleEntry = async (id: string, updates: Partial<ScheduleEntry>) => {
    await scheduleService.update(id, {
      job_pack_id: updates.projectId || null,
      customer_id: updates.customerId || null,
      title: updates.title,
      description: updates.description || null,
      location: updates.location || null,
      start_time: updates.start,
      end_time: updates.end,
    });

    setSchedule(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
  };

  const deleteScheduleEntry = async (id: string) => {
    await scheduleService.delete(id);
    setSchedule(prev => prev.filter(e => e.id !== id));
  };

  const setScheduleEntries: React.Dispatch<React.SetStateAction<ScheduleEntry[]>> = (action) => {
    // This is for direct manipulation - we'll handle sync separately
    setSchedule(action);
  };

  // Settings actions
  const updateSettings = async (updates: Partial<AppSettings>) => {
    await userSettingsService.update({
      default_labour_rate: updates.defaultLabourRate,
      default_markup_percent: updates.defaultMarkupPercent,
      default_tax_rate: updates.defaultTaxRate,
      default_cis_rate: updates.defaultCisRate,
      labour_rate_presets: updates.labourRatePresets || null,
      company_name: updates.companyName || null,
      company_address: updates.companyAddress || null,
      phone: updates.phone || null,
      email: updates.email || null,
      is_vat_registered: updates.isVatRegistered,
      vat_number: updates.vatNumber || null,
      enable_vat: updates.enableVat,
      enable_cis: updates.enableCis,
      quote_prefix: updates.quotePrefix,
      invoice_prefix: updates.invoicePrefix,
      default_quote_notes: updates.defaultQuoteNotes || null,
      default_invoice_notes: updates.defaultInvoiceNotes || null,
      cost_box_color: updates.costBoxColor,
      show_breakdown: updates.showBreakdown,
      default_display_options: updates.defaultDisplayOptions as any,
      document_template: updates.documentTemplate || null,
      invoice_color_scheme: updates.invoiceColorScheme || null,
      quote_color_scheme: updates.quoteColorScheme || null,
      bank_account_name: updates.bankAccountName || null,
      bank_account_number: updates.bankAccountNumber || null,
      bank_sort_code: updates.bankSortCode || null,
      bank_name: updates.bankName || null,
      tax_year_start_month: updates.taxYearStartMonth,
      tax_year_start_day: updates.taxYearStartDay,
      quick_pick_materials: updates.quickPickMaterials || null,
    });

    setSettings(prev => ({ ...prev, ...updates }));
  };

  const value: DataContextType = {
    customers,
    quotes,
    projects,
    schedule,
    settings,
    loading,
    error,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    saveQuote,
    updateQuote,
    updateQuoteStatus,
    deleteQuote,
    addProject,
    saveProject,
    deleteProject,
    addScheduleEntry,
    updateScheduleEntry,
    deleteScheduleEntry,
    setScheduleEntries,
    updateSettings,
    setSettings,
    setCustomers,
    services: {
      expenses: expensesService,
      bankTransactions: bankTransactionsService,
      reconciliation: reconciliationService,
      payables: payablesService,
      filing: filingService,
      expenseCategories: expenseCategoriesService,
      vendors: vendorsService,
      vendorKeywords: vendorKeywordsService,
      materialsLibrary: materialsLibraryService,
      materialsImportHistory: materialsImportHistoryService,
      materialKits: materialKitsService,
      paymentMilestones: paymentMilestoneService,
      recurringInvoices: recurringInvoiceService,
    },
    refresh: fetchData,
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
};
