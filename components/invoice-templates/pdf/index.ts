/**
 * PDF Template Components for @react-pdf/renderer
 * 
 * This module exports all components needed for vector PDF generation.
 * Import from here when you need to work with the react-pdf system.
 */

// Main document component
export { InvoicePDFDocument } from './InvoicePDFDocument';
export type { InvoicePDFDocumentProps } from './InvoicePDFDocument';

// Styles and color schemes
export {
  COLORS,
  PDF_COLOR_SCHEMES,
  getPDFColorScheme,
  baseStyles,
  professionalStyles,
  classicStyles,
  spaciousStyles,
} from './InvoicePDFStyles';
export type { PDFColorScheme } from './InvoicePDFStyles';

// Test component (for development/testing only)
export { TestPDFExport } from './TestPDFExport';
