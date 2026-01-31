// Invoice Template System
// Simplified to 2 professional templates optimized for one-page PDF output

export type InvoiceTemplate =
  | 'professional'  // Zoho-style professional invoice (default)
  | 'classic'       // Traditional compact layout
  | 'spacious';     // Professional with larger text and more spacing

export type ColorScheme = 'executive' | 'navy' | 'slate' | 'stone' | 'forest' | 'minimal' | 'teal' | 'modern';

export interface ColorSchemeConfig {
  id: ColorScheme;
  name: string;
  headerBg: string;        // Background for headers (Tailwind class)
  headerText: string;      // Text color for headers (Tailwind class)
  accentBg: string;        // Accent background (Tailwind class)
  accentText: string;      // Accent text color (Tailwind class)
  isDark?: boolean;        // Whether this is a dark color scheme
  isGradient?: boolean;    // Whether header uses gradient
  // Hex values for html2canvas/inline styles
  headerBgHex: string;     // Can be hex color OR CSS gradient string
  headerTextHex: string;
  accentLineHex: string;
  sectionBgHex: string;
}

export const COLOR_SCHEMES: Record<ColorScheme, ColorSchemeConfig> = {
  executive: {
    id: 'executive',
    name: 'Executive',
    headerBg: 'bg-[#1a1a2e]',
    headerText: 'text-white',
    accentBg: 'bg-[#f8f7f4]',
    accentText: 'text-[#1a1a2e]',
    isDark: true,
    headerBgHex: '#1a1a2e',
    headerTextHex: '#ffffff',
    accentLineHex: '#c9a962',
    sectionBgHex: '#f8f7f4',
  },
  navy: {
    id: 'navy',
    name: 'Navy & Brass',
    headerBg: 'bg-[#1e3a5f]',
    headerText: 'text-white',
    accentBg: 'bg-[#f5f5f0]',
    accentText: 'text-[#1e3a5f]',
    isDark: true,
    headerBgHex: '#1e3a5f',
    headerTextHex: '#ffffff',
    accentLineHex: '#b08d4f',
    sectionBgHex: '#f5f5f0',
  },
  slate: {
    id: 'slate',
    name: 'Slate Luxe',
    headerBg: 'bg-[#3d4f5f]',
    headerText: 'text-white',
    accentBg: 'bg-[#f9fafb]',
    accentText: 'text-[#3d4f5f]',
    isDark: true,
    headerBgHex: '#3d4f5f',
    headerTextHex: '#ffffff',
    accentLineHex: '#b87333',
    sectionBgHex: '#f9fafb',
  },
  stone: {
    id: 'stone',
    name: 'Warm Stone',
    headerBg: 'bg-[#57534e]',
    headerText: 'text-white',
    accentBg: 'bg-[#faf9f7]',
    accentText: 'text-[#44403c]',
    isDark: true,
    headerBgHex: '#57534e',
    headerTextHex: '#ffffff',
    accentLineHex: '#a16a4a',
    sectionBgHex: '#faf9f7',
  },
  forest: {
    id: 'forest',
    name: 'Forest',
    headerBg: 'bg-[#2d3b36]',
    headerText: 'text-white',
    accentBg: 'bg-[#f8faf8]',
    accentText: 'text-[#2d3b36]',
    isDark: true,
    headerBgHex: '#2d3b36',
    headerTextHex: '#ffffff',
    accentLineHex: '#6b7c5e',
    sectionBgHex: '#f8faf8',
  },
  minimal: {
    id: 'minimal',
    name: 'Minimal',
    headerBg: 'bg-white',
    headerText: 'text-[#111827]',
    accentBg: 'bg-white',
    accentText: 'text-[#374151]',
    isDark: false,
    headerBgHex: '#ffffff',
    headerTextHex: '#111827',
    accentLineHex: '#0d9488',
    sectionBgHex: '#ffffff',
  },
  teal: {
    id: 'teal',
    name: 'Deep Teal',
    headerBg: 'bg-[#134e4a]',
    headerText: 'text-white',
    accentBg: 'bg-[#f0fdfa]',
    accentText: 'text-[#134e4a]',
    isDark: true,
    headerBgHex: '#134e4a',
    headerTextHex: '#ffffff',
    accentLineHex: '#5eead4',
    sectionBgHex: '#f0fdfa',
  },
  modern: {
    id: 'modern',
    name: 'Modern',
    headerBg: 'bg-gradient-to-r from-[#0f172a] to-[#1e293b]',
    headerText: 'text-white',
    accentBg: 'bg-[#f8fafc]',
    accentText: 'text-[#0f172a]',
    isDark: true,
    headerBgHex: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
    headerTextHex: '#ffffff',
    accentLineHex: '#06b6d4',
    sectionBgHex: '#f8fafc',
    isGradient: true,
  },
};

export interface TemplateConfig {
  id: InvoiceTemplate;
  name: string;
  description: string;

  // Layout structure
  combineLineItems: boolean;      // Materials + Labour in one table
  showSectionHeaders: boolean;    // Show "MATERIALS" / "LABOUR" headers
  showIcons: boolean;             // Show Package/HardHat icons
  showBackgrounds: boolean;       // Colored backgrounds in body
  showTableBorders: boolean;      // Table structure visible
  showColumnHeaders: boolean;     // Full table headers
  showLineNumbers: boolean;       // #1, #2, etc
  showPerLineVat: boolean;        // VAT column in table
  centeredLayout: boolean;        // Center-aligned layout
  inlineLayout: boolean;          // Everything on single lines

  // Logo
  logoPosition: 'left' | 'center' | 'right' | 'hidden';
  logoSize: 'small' | 'medium' | 'large';

  // Spacing (Tailwind classes)
  containerPadding: string;
  containerBg: string;
  headerPadding: string;
  rowPadding: string;
  sectionGap: string;

  // Typography
  fontSize: string;
  headerFontSize: string;

  // Borders/Rounding
  borderRadius: string;

  // Special styles
  sectionHeaderStyle?: string;
  tableHeaderStyle?: string;
  totalBoxStyle?: string;
  cardStyle?: string;
  dividerStyle?: string;

  // Color scheme support
  supportsColorScheme?: boolean;  // Whether this template uses color schemes
  defaultColorScheme?: ColorScheme;
}

// Template definitions - Optimized for one-page PDF output
export const INVOICE_TEMPLATES: Record<InvoiceTemplate, TemplateConfig> = {
  // Template 1: Professional - Zoho-style invoice (matches real-world example)
  professional: {
    id: 'professional',
    name: 'Professional',
    description: 'Clean professional invoice',
    combineLineItems: true,
    showSectionHeaders: false,
    showIcons: false,
    showBackgrounds: false,
    showTableBorders: true,
    showColumnHeaders: true,
    showLineNumbers: true,
    showPerLineVat: false,
    centeredLayout: false,
    inlineLayout: false,
    logoPosition: 'left',
    logoSize: 'small',
    containerPadding: 'p-3',
    containerBg: 'bg-white',
    headerPadding: 'p-0',
    rowPadding: 'py-1 px-2',
    sectionGap: 'space-y-2',
    fontSize: 'text-[10px]',
    headerFontSize: 'text-sm',
    borderRadius: 'rounded-none',
    supportsColorScheme: true,
    defaultColorScheme: 'executive',
  },

  // Template 2: Classic - Traditional compact layout
  classic: {
    id: 'classic',
    name: 'Classic',
    description: 'Traditional compact layout',
    combineLineItems: true,
    showSectionHeaders: false,
    showIcons: false,
    showBackgrounds: false,
    showTableBorders: true,
    showColumnHeaders: true,
    showLineNumbers: false,
    showPerLineVat: false,
    centeredLayout: false,
    inlineLayout: false,
    logoPosition: 'left',
    logoSize: 'small',
    containerPadding: 'p-2.5',
    containerBg: 'bg-white',
    headerPadding: 'p-0',
    rowPadding: 'py-1 px-1.5',
    sectionGap: 'space-y-1.5',
    fontSize: 'text-[9px]',
    headerFontSize: 'text-[11px]',
    borderRadius: 'rounded-none',
    supportsColorScheme: true,
    defaultColorScheme: 'executive',
  },

  // Template 3: Spacious - Professional with larger text and more breathing room
  spacious: {
    id: 'spacious',
    name: 'Spacious',
    description: 'Professional with larger text and generous spacing',
    combineLineItems: true,
    showSectionHeaders: false,
    showIcons: false,
    showBackgrounds: false,
    showTableBorders: true,
    showColumnHeaders: true,
    showLineNumbers: true,
    showPerLineVat: false,
    centeredLayout: false,
    inlineLayout: false,
    logoPosition: 'left',
    logoSize: 'large',             // Larger logo than professional
    containerPadding: 'p-8',       // Much more padding than professional (p-3)
    containerBg: 'bg-white',
    headerPadding: 'p-0',
    rowPadding: 'py-4 px-4',       // More vertical & horizontal padding for breathing room
    sectionGap: 'space-y-6',       // More space between sections
    fontSize: 'text-sm',           // Larger than professional (10px → 14px)
    headerFontSize: 'text-xl',     // Much larger header text (14px → 20px)
    borderRadius: 'rounded-none',
    supportsColorScheme: true,
    defaultColorScheme: 'executive',
  },
};

// Helper to get template config with fallback
export const getTemplateConfig = (templateId?: InvoiceTemplate | string): TemplateConfig => {
  if (!templateId || !(templateId in INVOICE_TEMPLATES)) {
    return INVOICE_TEMPLATES['professional']; // Default to professional
  }
  return INVOICE_TEMPLATES[templateId as InvoiceTemplate];
};

// Helper to get color scheme config
export const getColorScheme = (colorSchemeId?: ColorScheme | string): ColorSchemeConfig => {
  if (!colorSchemeId || !(colorSchemeId in COLOR_SCHEMES)) {
    return COLOR_SCHEMES['executive']; // Default to Executive
  }
  return COLOR_SCHEMES[colorSchemeId as ColorScheme];
};

// Helper to build table header style with color scheme
export const getTableHeaderStyle = (
  template: TemplateConfig,
  colorScheme?: ColorScheme | string
): string => {
  // All templates now support color schemes
  const scheme = getColorScheme(colorScheme || template.defaultColorScheme);
  return `${scheme.headerBg} ${scheme.headerText} py-1.5 px-2 text-[10px] font-semibold`;
};

// Template metadata for settings UI
export interface TemplateMetadata {
  id: InvoiceTemplate;
  name: string;
  desc: string;
  preview: string;
  recommended?: boolean;
}

export const TEMPLATE_METADATA: TemplateMetadata[] = [
  {
    id: 'professional',
    name: 'Professional',
    desc: 'Zoho-style invoice',
    preview: '┌──────┐\n│░░ INV│\n│  £280│\n│══════│\n│#│Desc│\n│1│Item│\n│2│Item│\n│══════│\n└──────┘',
    recommended: true
  },
  {
    id: 'spacious',
    name: 'Spacious',
    desc: 'Larger text & spacing',
    preview: '┌──────┐\n│░░ INV│\n│  £280│\n│══════│\n│# Desc│\n│      │\n│1 Item│\n│      │\n│══════│\n└──────┘'
  },
  {
    id: 'classic',
    name: 'Classic',
    desc: 'Traditional layout',
    preview: '┌─────────┐\n│ INVOICE │\n│─────────│\n│Desc│Amt│\n│Item│£10│\n│─────────│\n│Total £X │\n└─────────┘'
  },
];

// Template descriptions for preview panel
export const TEMPLATE_DESCRIPTIONS: Record<InvoiceTemplate, string> = {
  'professional': 'Clean, professional invoice format based on industry standards like Zoho and QuickBooks. Features a clear table layout with line numbers, proper spacing, and all essential details. Optimized to fit on one page for most jobs.',
  'spacious': 'Professional invoice with larger text (14px) and generous spacing between lines. Easier to read and looks great for high-value jobs or clients who prefer larger print. Features line numbers, clear headers, and customizable color schemes. May span multiple pages for jobs with many items.',
  'classic': 'Traditional compact invoice format with straightforward layout. Clean and simple design that works well for standard jobs. Features all essential information in a traditional business format with customizable color schemes.',
};
