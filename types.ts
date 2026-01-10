
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
}

export interface QuoteSection {
  id: string;
  title: string;
  items: MaterialItem[];
  labourHours: number;
  labourRate?: number; // Optional override per section
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
}

export interface Quote {
  id: string;
  customerId: string;
  projectId?: string; 
  date: string;
  updatedAt: string;
  title: string; // The overall document title
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
  status: 'active' | 'completed' | 'archived';
  createdAt: string;
  updatedAt: string;
  notes: SiteNote[];
  notepad?: string;
  photos: SitePhoto[];
  drawings?: SitePhoto[];
  documents: SiteDocument[];
  materials?: ProjectMaterial[];
}

export interface AppSettings {
  defaultLabourRate: number;
  defaultTaxRate: number;
  defaultCisRate: number;
  companyName: string;
  companyLogo?: string;
  footerLogos?: string[]; 
  companyAddress: string;
  enableVat: boolean;
  enableCis: boolean;
  quotePrefix: string;
  invoicePrefix: string;
  defaultQuoteNotes: string;
  defaultInvoiceNotes: string;
  costBoxColor: 'slate' | 'amber' | 'blue';
  showBreakdown: boolean;
  defaultDisplayOptions: QuoteDisplayOptions;
}
