/**
 * InvoicePDFStyles.ts - @react-pdf/renderer stylesheet for invoices
 * 
 * This file defines all styles used by the react-pdf invoice components.
 * Colors are converted to hex values since react-pdf doesn't support Tailwind classes.
 */

import { StyleSheet, Font } from '@react-pdf/renderer';

// Register standard fonts (react-pdf includes Helvetica by default)
// For custom fonts, you'd register them here like:
// Font.register({ family: 'Inter', src: '/fonts/Inter-Regular.ttf' });

// Color palette matching the Tailwind colors used in the app
export const COLORS = {
  // Slate (primary grays)
  slate50: '#f8fafc',
  slate100: '#f1f5f9',
  slate200: '#e2e8f0',
  slate300: '#cbd5e1',
  slate400: '#94a3b8',
  slate500: '#64748b',
  slate600: '#475569',
  slate700: '#334155',
  slate800: '#1e293b',
  slate900: '#0f172a',
  
  // White
  white: '#ffffff',
  
  // Blue scheme
  blue50: '#eff6ff',
  blue100: '#dbeafe',
  blue600: '#2563eb',
  blue700: '#1d4ed8',
  
  // Teal scheme
  teal50: '#f0fdfa',
  teal100: '#ccfbf1',
  teal600: '#0d9488',
  teal700: '#0f766e',
  
  // Emerald scheme
  emerald50: '#ecfdf5',
  emerald100: '#d1fae5',
  emerald600: '#059669',
  emerald700: '#047857',
  
  // Purple scheme
  purple50: '#faf5ff',
  purple100: '#e9d5ff',
  purple600: '#9333ea',
  purple700: '#7c3aed',
  
  // Rose scheme
  rose50: '#fff1f2',
  rose100: '#fce7f3',
  rose600: '#e11d48',
  rose700: '#be123c',
  
  // Amber (for warnings/due dates)
  amber600: '#d97706',
  
  // Green (for paid status)
  green600: '#16a34a',
};

// Color scheme configurations
export interface PDFColorScheme {
  headerBg: string;
  headerText: string;
  accentBg: string;
  accentText: string;
}

export const PDF_COLOR_SCHEMES: Record<string, PDFColorScheme> = {
  executive: {
    headerBg: '#1a1a2e',
    headerText: '#ffffff',
    accentBg: '#f8f7f4',
    accentText: '#1a1a2e',
  },
  navy: {
    headerBg: '#1e3a5f',
    headerText: '#ffffff',
    accentBg: '#f5f5f0',
    accentText: '#1e3a5f',
  },
  slate: {
    headerBg: '#3d4f5f',
    headerText: '#ffffff',
    accentBg: '#f9fafb',
    accentText: '#3d4f5f',
  },
  stone: {
    headerBg: '#57534e',
    headerText: '#ffffff',
    accentBg: '#faf9f7',
    accentText: '#44403c',
  },
  forest: {
    headerBg: '#2d3b36',
    headerText: '#ffffff',
    accentBg: '#f8faf8',
    accentText: '#2d3b36',
  },
  minimal: {
    headerBg: '#ffffff',
    headerText: '#111827',
    accentBg: '#ffffff',
    accentText: '#374151',
  },
  teal: {
    headerBg: '#134e4a',
    headerText: '#ffffff',
    accentBg: '#f0fdfa',
    accentText: '#134e4a',
  },
};

// Get color scheme by ID
export const getPDFColorScheme = (schemeId?: string): PDFColorScheme => {
  if (!schemeId || !(schemeId in PDF_COLOR_SCHEMES)) {
    return PDF_COLOR_SCHEMES.executive;
  }
  return PDF_COLOR_SCHEMES[schemeId];
};

// Base styles used across all templates
export const baseStyles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    padding: 30,
    backgroundColor: COLORS.white,
    color: COLORS.slate900,
  },
  
  // Typography
  h1: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.slate900,
    marginBottom: 4,
  },
  h2: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.slate900,
    marginBottom: 2,
  },
  h3: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.slate900,
    marginBottom: 2,
  },
  text: {
    fontSize: 10,
    color: COLORS.slate700,
    lineHeight: 1.4,
  },
  textSmall: {
    fontSize: 8,
    color: COLORS.slate500,
    lineHeight: 1.3,
  },
  textMuted: {
    fontSize: 9,
    color: COLORS.slate400,
  },
  textBold: {
    fontWeight: 'bold',
  },
  
  // Layout
  row: {
    flexDirection: 'row',
  },
  col: {
    flexDirection: 'column',
  },
  spaceBetween: {
    justifyContent: 'space-between',
  },
  alignEnd: {
    alignItems: 'flex-end',
  },
  alignCenter: {
    alignItems: 'center',
  },
  
  // Spacing
  mt1: { marginTop: 4 },
  mt2: { marginTop: 8 },
  mt3: { marginTop: 12 },
  mt4: { marginTop: 16 },
  mb1: { marginBottom: 4 },
  mb2: { marginBottom: 8 },
  mb3: { marginBottom: 12 },
  mb4: { marginBottom: 16 },
  
  // Borders
  borderTop: {
    borderTopWidth: 1,
    borderTopColor: COLORS.slate200,
    borderTopStyle: 'solid',
  },
  borderBottom: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.slate200,
    borderBottomStyle: 'solid',
  },
  
  // Logo
  logo: {
    maxWidth: 100,
    maxHeight: 50,
    objectFit: 'contain',
  },
  logoLarge: {
    maxWidth: 140,
    maxHeight: 70,
    objectFit: 'contain',
  },
});

// Professional template styles (Zoho-style)
export const professionalStyles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  companyInfo: {
    flex: 1,
  },
  companyName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.slate900,
    marginBottom: 2,
  },
  companyDetails: {
    fontSize: 9,
    color: COLORS.slate600,
    lineHeight: 1.4,
  },
  invoiceHeader: {
    textAlign: 'right',
  },
  invoiceTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.slate900,
    marginBottom: 4,
  },
  invoiceRef: {
    fontSize: 10,
    color: COLORS.slate600,
    marginBottom: 8,
  },
  balanceDue: {
    marginTop: 8,
  },
  balanceLabel: {
    fontSize: 9,
    color: COLORS.slate600,
    marginBottom: 2,
  },
  balanceAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.slate900,
  },
  
  // Bill To section
  billToRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  billToSection: {
    flex: 1,
  },
  datesSection: {
    flex: 1,
  },
  sectionLabel: {
    fontSize: 9,
    fontWeight: 'bold',
    color: COLORS.slate900,
    marginBottom: 4,
  },
  customerName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.slate900,
    marginBottom: 2,
  },
  customerDetails: {
    fontSize: 9,
    color: COLORS.slate600,
    lineHeight: 1.4,
  },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  dateLabel: {
    fontSize: 9,
    color: COLORS.slate600,
  },
  dateValue: {
    fontSize: 9,
    color: COLORS.slate900,
  },
  
  // Table
  table: {
    marginBottom: 16,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.slate100,
    borderBottomStyle: 'solid',
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  tableRowAlt: {
    backgroundColor: COLORS.slate50,
  },
  colNum: {
    width: 30,
    fontSize: 9,
  },
  colDesc: {
    flex: 1,
    fontSize: 9,
    paddingRight: 8,
  },
  colQty: {
    width: 50,
    textAlign: 'center',
    fontSize: 9,
  },
  colRate: {
    width: 70,
    textAlign: 'right',
    fontSize: 9,
  },
  colAmount: {
    width: 70,
    textAlign: 'right',
    fontSize: 9,
    fontWeight: 'bold',
  },
  sectionHeader: {
    paddingVertical: 6,
    paddingHorizontal: 8,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionDesc: {
    fontSize: 9,
    fontStyle: 'italic',
    paddingHorizontal: 8,
    paddingBottom: 4,
  },
  itemName: {
    fontSize: 9,
    color: COLORS.slate900,
    fontWeight: 'bold',
  },
  itemDesc: {
    fontSize: 8,
    color: COLORS.slate500,
    marginTop: 1,
  },
  
  // Totals
  totalsContainer: {
    alignItems: 'flex-end',
  },
  totalsBox: {
    width: 180,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.slate100,
    borderBottomStyle: 'solid',
  },
  totalLabel: {
    fontSize: 9,
    color: COLORS.slate500,
  },
  totalValue: {
    fontSize: 9,
    color: COLORS.slate900,
  },
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    paddingHorizontal: 8,
    marginTop: 4,
    borderRadius: 4,
  },
  grandTotalLabel: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  grandTotalValue: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  
  // Bank details
  bankDetails: {
    marginTop: 24,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.slate200,
    borderTopStyle: 'solid',
  },
  bankTitle: {
    fontSize: 9,
    fontWeight: 'bold',
    marginBottom: 4,
    color: COLORS.slate700,
  },
  bankText: {
    fontSize: 8,
    color: COLORS.slate600,
    lineHeight: 1.4,
  },
  
  // Notes
  notes: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.slate200,
    borderTopStyle: 'solid',
  },
  notesTitle: {
    fontSize: 9,
    fontWeight: 'bold',
    marginBottom: 4,
    color: COLORS.slate700,
  },
  notesText: {
    fontSize: 8,
    color: COLORS.slate600,
    lineHeight: 1.5,
  },
  
  // Part payment
  partPaymentBox: {
    marginTop: 8,
    padding: 8,
    borderRadius: 4,
    backgroundColor: COLORS.teal50,
    borderWidth: 1,
    borderColor: COLORS.teal100,
    borderStyle: 'solid',
  },
  partPaymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  partPaymentLabel: {
    fontSize: 9,
    color: COLORS.teal700,
  },
  partPaymentValue: {
    fontSize: 9,
    fontWeight: 'bold',
    color: COLORS.teal700,
  },
  
  // Footer logos
  footerLogos: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.slate200,
    borderTopStyle: 'solid',
    gap: 16,
  },
  footerLogo: {
    height: 30,
    objectFit: 'contain',
  },
});

// Classic template styles (compact)
export const classicStyles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 12,
    marginBottom: 12,
    borderBottomWidth: 2,
    borderBottomStyle: 'solid',
  },
  companySection: {
    flex: 1,
  },
  invoiceSection: {
    textAlign: 'right',
  },
  companyName: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  companyDetails: {
    fontSize: 8,
    color: COLORS.slate500,
    lineHeight: 1.3,
  },
  invoiceType: {
    fontSize: 11,
    fontWeight: 'light',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  invoiceRef: {
    fontSize: 9,
    fontWeight: 'bold',
  },
  invoiceDate: {
    fontSize: 8,
    color: COLORS.slate500,
  },
  
  clientProjectRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  clientSection: {
    flex: 1,
  },
  projectSection: {
    flex: 1,
    textAlign: 'right',
  },
  label: {
    fontSize: 7,
    color: COLORS.slate400,
    textTransform: 'uppercase',
    marginBottom: 1,
  },
  clientName: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  clientDetails: {
    fontSize: 8,
    color: COLORS.slate600,
    lineHeight: 1.4,
  },
  projectTitle: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  dueDate: {
    fontSize: 8,
    fontWeight: 'bold',
    color: COLORS.amber600,
    marginTop: 4,
  },
  
  // Table
  table: {
    marginBottom: 8,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.slate100,
    borderBottomStyle: 'solid',
  },
  sectionHeader: {
    paddingVertical: 6,
    paddingHorizontal: 8,
    marginTop: 10,
    borderLeftWidth: 4,
    borderLeftStyle: 'solid',
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  colDesc: {
    flex: 1,
    fontSize: 10,
    color: COLORS.slate700,
    paddingLeft: 12,
  },
  colQty: {
    width: 50,
    textAlign: 'center',
    fontSize: 10,
    color: COLORS.slate500,
  },
  colRate: {
    width: 60,
    textAlign: 'right',
    fontSize: 10,
    color: COLORS.slate500,
  },
  colAmount: {
    width: 70,
    textAlign: 'right',
    fontSize: 10,
    fontWeight: 'bold',
    color: COLORS.slate800,
  },
  
  // Totals
  totalsContainer: {
    alignItems: 'flex-end',
  },
  totalsBox: {
    width: 160,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
    fontSize: 8,
    color: COLORS.slate500,
  },
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    marginTop: 3,
    borderTopWidth: 2,
    borderTopStyle: 'solid',
    fontSize: 11,
    fontWeight: 'bold',
  },
  
  // Bank and notes
  bankDetails: {
    marginTop: 12,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: COLORS.slate200,
    borderTopStyle: 'solid',
    fontSize: 8,
    color: COLORS.slate500,
  },
  notes: {
    marginTop: 8,
    fontSize: 8,
    color: COLORS.slate500,
    lineHeight: 1.5,
  },
});

// Spacious template styles (larger text, more breathing room)
export const spaciousStyles = StyleSheet.create({
  page: {
    padding: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  companyInfo: {
    flex: 1,
  },
  companyName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.slate900,
    marginBottom: 4,
  },
  companyDetails: {
    fontSize: 11,
    color: COLORS.slate600,
    lineHeight: 1.5,
  },
  invoiceHeader: {
    textAlign: 'right',
  },
  invoiceTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.slate900,
    marginBottom: 4,
  },
  invoiceRef: {
    fontSize: 12,
    color: COLORS.slate600,
    marginBottom: 12,
  },
  balanceLabel: {
    fontSize: 11,
    color: COLORS.slate600,
    marginBottom: 2,
  },
  balanceAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.slate900,
  },
  
  billToRow: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  billToSection: {
    flex: 1,
  },
  datesSection: {
    flex: 1,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: COLORS.slate900,
    marginBottom: 6,
  },
  customerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.slate900,
    marginBottom: 4,
  },
  customerDetails: {
    fontSize: 11,
    color: COLORS.slate600,
    lineHeight: 1.5,
  },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  dateLabel: {
    fontSize: 11,
    color: COLORS.slate600,
  },
  dateValue: {
    fontSize: 11,
    color: COLORS.slate900,
  },
  
  // Table
  table: {
    marginBottom: 24,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.slate100,
    borderBottomStyle: 'solid',
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  colNum: {
    width: 40,
    fontSize: 11,
  },
  colDesc: {
    flex: 1,
    fontSize: 11,
    paddingRight: 12,
  },
  colQty: {
    width: 60,
    textAlign: 'center',
    fontSize: 11,
  },
  colRate: {
    width: 80,
    textAlign: 'right',
    fontSize: 11,
  },
  colAmount: {
    width: 80,
    textAlign: 'right',
    fontSize: 11,
    fontWeight: 'bold',
  },
  sectionHeader: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginTop: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionDesc: {
    fontSize: 11,
    fontStyle: 'italic',
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  itemName: {
    fontSize: 11,
    color: COLORS.slate900,
    fontWeight: 'bold',
  },
  itemDesc: {
    fontSize: 10,
    color: COLORS.slate500,
    marginTop: 2,
  },
  
  // Totals
  totalsContainer: {
    alignItems: 'flex-end',
  },
  totalsBox: {
    width: 200,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.slate100,
    borderBottomStyle: 'solid',
  },
  totalLabel: {
    fontSize: 11,
    color: COLORS.slate500,
  },
  totalValue: {
    fontSize: 11,
    color: COLORS.slate900,
  },
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginTop: 8,
    borderRadius: 4,
  },
  grandTotalLabel: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  grandTotalValue: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  
  // Bank details
  bankDetails: {
    marginTop: 32,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.slate200,
    borderTopStyle: 'solid',
  },
  bankTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 6,
    color: COLORS.slate700,
  },
  bankText: {
    fontSize: 10,
    color: COLORS.slate600,
    lineHeight: 1.5,
  },
  
  // Notes
  notes: {
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.slate200,
    borderTopStyle: 'solid',
  },
  notesTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 6,
    color: COLORS.slate700,
  },
  notesText: {
    fontSize: 10,
    color: COLORS.slate600,
    lineHeight: 1.6,
  },
});
