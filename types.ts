
export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  company?: string;
}

export interface MaterialItem {
  id: string;
  name: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
  isAIProposed?: boolean;
  isHeading?: boolean; // For section headings/dividers within items
}

// Labour item for itemized labour tracking
export interface LabourItem {
  id: string;
  description: string;
  hours: number;
  rate?: number; // Optional per-item rate override
  isAIProposed?: boolean; // Flag for AI-generated items
}

export interface QuoteSection {
  id: string;
  title: string;
  description?: string; // Optional description for the work section
  items: MaterialItem[];
  labourHours: number;
  labourRate?: number; // Optional override per section
  labourCost?: number; // Direct labour cost input (optional)
  labourItems?: LabourItem[]; // Itemized labour tracking
  subsectionPrice?: number; // Override total price for subsection (optional, auto-calculated if not set)
}

export interface QuoteDisplayOptions {
  // Materials Presentation
  showMaterials: boolean;
  showMaterialItems: boolean; // Detail vs Summary
  showMaterialQty: boolean;
  showMaterialUnitPrice: boolean;
  showMaterialLineTotals: boolean;
  showMaterialSectionTotal: boolean;

  // Labour Presentation
  showLabour: boolean;
  showLabourItems: boolean; // Detail vs Summary
  showLabourQty: boolean;
  showLabourUnitPrice: boolean;
  showLabourLineTotals: boolean;
  showLabourSectionTotal: boolean;

  // General & Tax
  showVat: boolean;
  showCis: boolean;
  showNotes: boolean;
  showLogo: boolean;
  showTotalsBreakdown: boolean;
  showWorkSectionTotal: boolean; // Show/hide the work section total line
}

export interface Quote {
  id: string;
  customerId: string;
  projectId?: string;
  date: string;
  createdAt: string;
  updatedAt: string;
  title: string; // The overall document title
  jobAddress?: string; // Optional job site address (if different from customer address)
  sections: QuoteSection[];
  labourRate: number; // Default document rate
  markupPercent: number;
  taxPercent: number;
  cisPercent: number;
  status: 'draft' | 'sent' | 'accepted' | 'declined' | 'invoiced' | 'paid';
  notes: string;
  type: 'estimate' | 'quotation' | 'invoice';
  displayOptions?: QuoteDisplayOptions;
  referenceNumber?: number;
  // Discount fields
  discountType?: 'percentage' | 'fixed';
  discountValue?: number;
  discountDescription?: string;
  // Invoice-specific fields
  dueDate?: string;
  paymentDate?: string;
  paymentMethod?: 'cash' | 'card' | 'bank_transfer' | 'cheque';
  amountPaid?: number;
  parentQuoteId?: string;
  // Part Payment fields (for deposits/staged payments)
  partPaymentEnabled?: boolean;
  partPaymentType?: 'percentage' | 'fixed';
  partPaymentValue?: number;

  // Recurring invoice fields
  isRecurring?: boolean;
  recurringFrequency?: 'weekly' | 'fortnightly' | 'monthly' | 'quarterly' | 'annually';
  recurringStartDate?: string;
  recurringEndDate?: string;
  recurringNextDate?: string;
  recurringParentId?: string; // Links generated invoices to the recurring template
  partPaymentLabel?: string;
  // Credit note fields
  isCreditNote?: boolean;
  originalInvoiceId?: string;
  creditNoteReason?: string;
  // Share/acceptance fields
  shareToken?: string;
  acceptedAt?: string;
  declinedAt?: string;
}

export interface ScheduleEntry {
  id: string;
  title: string;
  start: string;
  end: string;
  description?: string;
  projectId?: string;
  customerId?: string;
  location?: string;
}

export interface SiteNote {
  id: string;
  text: string;
  timestamp: string;
  isVoice?: boolean;
}

export interface SitePhoto {
  id: string;
  url: string;
  caption: string;
  timestamp: string;
  tags: string[];
}

export interface SiteDocument {
  id: string;
  name: string;
  url: string;
  type: string;
  summary?: string;
  timestamp: string;
}

export interface ProjectMaterial {
  id: string;
  name: string;
  unit: string;
  quotedQty: number;
  orderedQty: number;
  deliveredQty: number;
  usedQty: number;
  status: 'pending' | 'ordered' | 'delivered' | 'partially_delivered';
}

export interface JobPack {
  id: string;
  title: string;
  customerId: string;
  siteAddress?: string;
  status: 'active' | 'completed' | 'archived';
  createdAt: string;
  updatedAt: string;
  notes: SiteNote[];
  notepad?: string;
  photos: SitePhoto[];
  drawings?: SitePhoto[];
  documents: SiteDocument[];
  materials?: ProjectMaterial[];
  orderList?: string;
}

// Document template options - 3 professional templates
export type DocumentTemplate =
  | 'professional'  // Zoho-style professional invoice (default)
  | 'spacious'      // Professional with larger text and spacing
  | 'classic'       // Traditional compact layout
  // Legacy templates for backwards compatibility:
  | 'trade-pro'     // Maps to professional
  | 'statement'     // Maps to professional
  | 'compact'       // Maps to classic
  | 'minimal'       // Maps to classic
  | 'detailed'      // Maps to professional
  | 'branded'       // Maps to professional
  | 'modern-card';  // Maps to classic

// Alias for backwards compatibility
export type InvoiceTemplate = DocumentTemplate;

export interface LabourRatePreset {
  name: string;
  rate: number;
}

export interface AppSettings {
  defaultLabourRate: number;
  defaultMarkupPercent: number;
  defaultTaxRate: number;
  defaultCisRate: number;
  labourRatePresets?: LabourRatePreset[];
  companyName: string;
  companyLogo?: string;
  companyLogoPath?: string;  // Storage path for logo persistence
  footerLogos?: string[];
  companyAddress: string;
  phone?: string;
  email?: string;
  vatNumber?: string;
  isVatRegistered: boolean;
  enableVat: boolean;
  enableCis: boolean;
  quotePrefix: string;
  invoicePrefix: string;
  defaultQuoteNotes: string;
  defaultInvoiceNotes: string;
  costBoxColor: 'slate' | 'amber' | 'blue';
  showBreakdown: boolean;
  defaultDisplayOptions: QuoteDisplayOptions;
  documentTemplate?: DocumentTemplate;
  invoiceColorScheme?: 'executive' | 'navy' | 'slate' | 'stone' | 'forest' | 'minimal' | 'teal' | 'modern';
  quoteColorScheme?: 'executive' | 'navy' | 'slate' | 'stone' | 'forest' | 'minimal' | 'teal' | 'modern';
  // Bank details for payment instructions
  bankAccountName?: string;
  bankAccountNumber?: string;
  bankSortCode?: string;
  bankName?: string;
  // Tax year setting (month 1-12, day 1-31) - UK default is April 6
  taxYearStartMonth?: number;
  taxYearStartDay?: number;
  // Subscription fields
  subscriptionTier?: SubscriptionTier;
  subscriptionStatus?: SubscriptionStatus;
  trialStart?: string;
  trialEnd?: string;
  subscriptionStart?: string;
  subscriptionEnd?: string;
  subscriptionPeriodEnd?: string;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  referralCode?: string;
  usageLimits?: UsageLimits;
  // Team (admin seats are paid £10/mo, field workers free within tier limits)
  teamSeatCount?: number;       // legacy — kept for backward compat
  adminSeatCount?: number;      // paid admin seats
  // Materials quick picks for job tracker
  quickPickMaterials?: string[];
  // Trade type for AI context
  tradeType?: string;
}

export interface Expense {
  id: string;
  jobPackId?: string | null;
  vendor: string;
  description?: string | null;
  amount: number;
  vatAmount: number;
  category: 'materials' | 'tools' | 'fuel' | 'subcontractor' | 'office' | 'insurance' | 'other' | string;
  receiptStoragePath?: string | null;
  receiptExtractedText?: string | null;
  expenseDate: string;
  isReconciled: boolean;
  reconciledTransactionId?: string | null;
  paymentMethod: 'card' | 'cash' | 'bank_transfer' | 'cheque' | string;
  createdAt: string;
  updatedAt: string;
}

export interface BankTransaction {
  id: string;
  transactionDate: string;
  description: string;
  amount: number;
  balance?: number | null;
  reference?: string | null;
  transactionType?: string | null;
  isReconciled: boolean;
  reconciledExpenseId?: string | null;
  reconciledInvoiceId?: string | null;
  importBatchId?: string | null;
  bankName?: string | null;
  accountLastFour?: string | null;
  createdAt: string;
}

// ============================================
// DATABASE SCHEMA TYPES (snake_case)
// Used by components that work with raw DB data
// ============================================

export interface DBExpense {
  id: string;
  user_id: string;
  job_pack_id?: string;
  vendor: string;
  description?: string;
  amount: number;
  vat_amount: number;
  category: string;
  receipt_storage_path?: string;
  receipt_extracted_text?: string;
  expense_date: string;
  is_reconciled: boolean;
  reconciled_transaction_id?: string;
  payment_method: string;
  created_at: string;
  updated_at: string;
  job_pack?: { id: string; title: string } | null;
}

export interface DBBankTransaction {
  id: string;
  user_id: string;
  transaction_date: string;
  description: string;
  amount: number;
  balance?: number;
  reference?: string;
  transaction_type?: string;
  is_reconciled: boolean;
  reconciled_expense_id?: string;
  reconciled_invoice_id?: string;
  import_batch_id?: string;
  bank_name?: string;
  account_last_four?: string;
  created_at: string;
}

export interface ExpenseCategory {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
  display_order: number | null;
  is_default: boolean | null;
}

export interface Vendor {
  id: string;
  name: string;
  default_category?: string | null;
  default_payment_method?: string | null;
  total_spent?: number | null;
  expense_count?: number | null;
  last_expense_date?: string | null;
}

export interface Payable {
  id: string;
  user_id: string;
  vendor_id?: string | null;
  vendor_name: string;
  invoice_number?: string | null;
  description?: string | null;
  amount: number;
  vat_amount: number;
  amount_paid: number | null;
  status: 'unpaid' | 'partial' | 'paid' | 'overdue' | 'disputed' | string;
  invoice_date?: string | null;
  due_date?: string | null;
  paid_date?: string | null;
  category?: string | null;
  notes?: string | null;
  attachment_path?: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export type DocumentCategory = 'receipt' | 'invoice' | 'contract' | 'certificate' | 'insurance' | 'warranty' | 'tax' | 'bank' | 'general';

export interface FiledDocument {
  id: string;
  user_id: string;
  name: string;
  storage_path: string;
  file_type?: string | null;
  file_size?: number | null;
  category: DocumentCategory | string | null;
  description?: string | null;
  document_date?: string | null;
  expiry_date?: string | null;
  vendor_name?: string | null;
  tax_year?: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface QuarterSummary {
  quarter: string;
  label: string;
  inputVat: number;
  outputVat: number;
  netVat: number;
  expenseCount: number;
  invoiceCount: number;
}

// ============================================
// MATERIALS LIBRARY TYPES
// For wholesaler CSV imports and product catalog
// ============================================

export interface MaterialLibraryItem {
  id: string;
  productCode?: string;
  name: string;
  description?: string;
  unit: string;
  costPrice?: number;
  sellPrice?: number;
  supplier?: string;
  category?: string;
  isFavourite: boolean;
  lastUpdated: string;
  createdAt: string;
}

export interface DBMaterialLibraryItem {
  id: string;
  user_id: string;
  product_code?: string | null;
  name: string;
  description?: string | null;
  unit: string;
  cost_price?: number | null;
  sell_price?: number | null;
  supplier?: string | null;
  category?: string | null;
  is_favourite: boolean | null;
  last_updated: string | null;
  created_at: string | null;
}

export interface MaterialsImportHistory {
  id: string;
  supplier?: string;
  filename?: string;
  itemsImported: number;
  itemsUpdated: number;
  itemsFailed: number;
  importedAt: string;
}

export interface DBMaterialsImportHistory {
  id: string;
  user_id: string;
  supplier?: string;
  filename?: string;
  items_imported: number;
  items_updated: number;
  items_failed: number;
  imported_at: string;
}

export interface WholesalerPreset {
  id: string;
  name: string;
  columns: {
    productCode?: number;
    name: number;
    description?: number;
    unit?: number;
    costPrice: number;
    sellPrice?: number;
    category?: number;
  };
  skipRows: number;
  hasHeader: boolean;
}

export type MaterialCategory =
  | 'timber'
  | 'plasterboard'
  | 'plaster'
  | 'fixings'
  | 'insulation'
  | 'electrical'
  | 'plumbing'
  | 'drainage'
  | 'roofing'
  | 'flooring'
  | 'paint'
  | 'adhesives'
  | 'tools'
  | 'ppe'
  | 'aggregates'
  | 'cement'
  | 'blocks'
  | 'bricks'
  | 'metalwork'
  | 'doors'
  | 'windows'
  | 'landscaping'
  | 'other';

// ============================================
// WHOLESALER TYPES
// For tracking referrals and commissions
// ============================================

export interface WholesalerStats {
  id: string | null;
  name: string | null;
  referral_code: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  commission_per_conversion: number | null;
  commission_paid: number | null;
  last_payment_date: string | null;
  notes: string | null;
  created_at: string | null;
  active: boolean | null;
  total_signups: number | null;
  total_conversions: number | null;
  commission_owed: number | null;
}

// ============================================
// INVOICE TYPES
// For VAT/Reconciliation pages
// ============================================

export interface Invoice {
  id: string;
  title: string | null;
  customer_id: string | null;
  date: string | null;
  due_date: string | null;
  payment_date: string | null;
  amount_paid: number | null;
  tax_percent: number | null;
  sections: unknown;
  status: string | null;
  subtotal: number;
  vat: number;
  total: number;
  customer?: {
    id: string;
    name: string;
  } | null;
}

// ============================================
// SUBSCRIPTION TYPES
// For tier-based feature gating
// ============================================

export type SubscriptionTier = 'free' | 'professional' | 'business' | 'team';

export type SubscriptionStatus = 'trialing' | 'active' | 'cancelled' | 'past_due' | 'expired';

export type TeamRole = 'owner' | 'admin' | 'field_worker';

// Max free field workers per tier (admin users are paid add-ons)
export const MAX_FIELD_WORKERS: Record<SubscriptionTier, number> = {
  free: 0,
  professional: 3,
  business: 5,
  team: 5,
};

export interface UsageLimits {
  customers: number | null;
  jobPacks: number | null;
  quotes: number | null;      // Total quotes (estimates + quotations)
  invoices: number | null;    // Total invoices
  photosPerMonth: number | null;
  documentsPerMonth: number | null;
}

export interface SubscriptionInfo {
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  trialStart: string | null;
  trialEnd: string | null;
  subscriptionStart: string | null;
  subscriptionEnd: string | null;
  subscriptionPeriodEnd: string | null;
  isActive: boolean;
  trialDaysRemaining: number | null;
  usageLimits: UsageLimits;
}

// Feature names that can be gated by subscription tier
export type GatedFeature =
  | 'invoices'
  | 'expenses'
  | 'schedule'
  | 'siteDocuments'
  | 'materialsLibrary'
  | 'bankImport'
  | 'vatReports'
  | 'payables'
  | 'filingCabinet'
  | 'unlimitedCustomers'
  | 'unlimitedJobPacks'
  | 'unlimitedPhotos'
  | 'digitalSignatures'
  | 'emailSending'
  | 'materialKits'
  | 'paymentMilestones'
  | 'appointmentComms'
  | 'recurringInvoices'
  | 'teamDashboard'
  | 'teamSettings'
  | 'timesheetApproval';

// Maps features to their required tier
export const FEATURE_TIER_MAP: Record<GatedFeature, SubscriptionTier> = {
  // Free tier features (available to all)
  invoices: 'free',
  schedule: 'free',
  digitalSignatures: 'free',

  // Professional tier features
  expenses: 'professional',
  siteDocuments: 'professional',
  materialsLibrary: 'professional',
  unlimitedCustomers: 'professional',
  unlimitedJobPacks: 'professional',
  unlimitedPhotos: 'professional',
  emailSending: 'professional',
  materialKits: 'professional',
  paymentMilestones: 'professional',
  appointmentComms: 'professional',

  // Business tier features
  bankImport: 'business',
  vatReports: 'business',
  payables: 'business',
  filingCabinet: 'business',
  recurringInvoices: 'business',

  // Team features (require professional + seats)
  teamDashboard: 'professional',
  teamSettings: 'professional',
  timesheetApproval: 'professional',
};

// Default usage limits by tier
export const TIER_LIMITS: Record<SubscriptionTier, UsageLimits> = {
  free: {
    customers: 5,
    jobPacks: 3,        // Total job packs allowed
    quotes: 3,          // Total quotes (estimates + quotations)
    invoices: 3,        // Total invoices
    photosPerMonth: 20,
    documentsPerMonth: 5,
  },
  professional: {
    customers: null, // unlimited
    jobPacks: null,
    quotes: null,
    invoices: null,
    photosPerMonth: 100,
    documentsPerMonth: 50,
  },
  business: {
    customers: null,
    jobPacks: null,
    quotes: null,
    invoices: null,
    photosPerMonth: null,
    documentsPerMonth: null,
  },
  team: {
    customers: null,
    jobPacks: null,
    quotes: null,
    invoices: null,
    photosPerMonth: null,
    documentsPerMonth: null,
  },
};

// ============================================
// SIGNATURES
// ============================================

export interface QuoteSignature {
  id: string;
  quoteId: string;
  signerName: string;
  signatureData: string;       // base64 PNG
  signatureType: 'draw' | 'type';
  ipAddress?: string;
  userAgent?: string;
  signedAt: string;
  createdAt: string;
}

// ============================================
// PAYMENT MILESTONES
// ============================================

export interface PaymentMilestone {
  id: string;
  quoteId: string;
  userId: string;
  label: string;
  percentage?: number;
  fixedAmount?: number;
  dueDate?: string;
  status: 'pending' | 'invoiced' | 'paid';
  invoiceId?: string;
  paidAt?: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// EMAIL
// ============================================

export interface EmailTemplate {
  id: string;
  userId: string;
  templateType: string;
  subject: string;
  body: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface EmailLogEntry {
  id: string;
  userId: string;
  quoteId?: string;
  recipientEmail: string;
  templateType?: string;
  subject: string;
  status: 'pending' | 'queued' | 'sent' | 'failed' | 'bounced';
  resendMessageId?: string;
  errorMessage?: string;
  retryCount: number;
  maxRetries: number;
  nextRetryAt?: string;
  sentAt?: string;
  openedAt?: string;
  createdAt: string;
}

// ============================================
// COMMUNICATION PREFERENCES
// ============================================

export interface CommunicationPreferences {
  id: string;
  userId: string;
  paymentReminderEnabled: boolean;
  paymentReminderDays: number[];
  appointmentReminderEnabled: boolean;
  appointmentReminderHours: number;
  quoteFollowUpEnabled: boolean;
  quoteFollowUpDays: number;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// MATERIAL KITS
// ============================================

export interface MaterialKit {
  id: string;
  userId: string;
  name: string;
  description?: string;
  items: MaterialItem[];
  category?: string;
  isFavourite: boolean;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// TEAM TYPES
// For team management and field worker features
// ============================================

export type TeamMemberRole = 'owner' | 'admin' | 'field_worker';
export type TeamMemberStatus = 'pending' | 'active' | 'deactivated';
export type TeamInvitationStatus = 'pending' | 'accepted' | 'declined' | 'expired' | 'revoked';
export type TimesheetStatus = 'active' | 'submitted' | 'approved' | 'rejected';

export interface Team {
  id: string;
  ownerId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface TeamMember {
  id: string;
  teamId: string;
  userId: string;
  role: TeamMemberRole;
  displayName: string;
  phone?: string;
  hourlyRate: number;
  status: TeamMemberStatus;
  createdAt: string;
  updatedAt: string;
}

export interface TeamInvitation {
  id: string;
  teamId: string;
  email: string;
  role: TeamMemberRole;
  displayName?: string;
  invitedBy: string;
  token: string;
  status: TeamInvitationStatus;
  expiresAt: string;
  createdAt: string;
  // Joined data
  team?: { id: string; name: string; owner_id: string };
}

export interface JobAssignment {
  id: string;
  jobPackId: string;
  teamMemberId: string;
  assignedAt: string;
  assignedBy: string;
  // Joined data
  teamMember?: TeamMember;
}

export interface Timesheet {
  id: string;
  teamMemberId: string;
  jobPackId?: string | null;
  clockIn: string;
  clockOut?: string | null;
  clockInLat?: number | null;
  clockInLng?: number | null;
  clockOutLat?: number | null;
  clockOutLng?: number | null;
  clockInAccuracy?: number | null;
  clockOutAccuracy?: number | null;
  isGpsVerified: boolean;
  breakMinutes: number;
  notes?: string | null;
  status: TimesheetStatus;
  approvedBy?: string | null;
  approvedAt?: string | null;
  rejectionReason?: string | null;
  createdAt: string;
  updatedAt: string;
  // Joined data
  teamMember?: { id: string; display_name: string; user_id: string };
  jobPack?: { id: string; title: string } | null;
}

export interface GpsLog {
  id: string;
  timesheetId: string;
  lat: number;
  lng: number;
  accuracy?: number | null;
  loggedAt: string;
}
