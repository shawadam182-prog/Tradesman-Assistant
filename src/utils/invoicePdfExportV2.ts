/**
 * invoicePdfExportV2.ts - New PDF export using @react-pdf/renderer
 * 
 * This module provides vector-based PDF generation for invoices/quotes.
 * It produces crisp, selectable text unlike the html2canvas rasterization approach.
 * 
 * IMPORTANT: This is a NEW implementation that runs parallel to the existing system.
 * The old html2canvas approach is kept in useQuotePDF.ts as fallback.
 * 
 * Usage:
 *   import { generateInvoicePDF } from '../utils/invoicePdfExportV2';
 *   const { blob, filename } = await generateInvoicePDF(quote, customer, settings, totals, reference);
 */

import { pdf } from '@react-pdf/renderer';
import React from 'react';
import { InvoicePDFDocument } from '../../components/invoice-templates/pdf/InvoicePDFDocument';
import type { Quote, Customer, AppSettings } from '../../types';

// Totals interface matching what QuoteView calculates
export interface InvoiceTotals {
  clientSubtotal: number;
  taxAmount: number;
  cisAmount: number;
  discountAmount: number;
  grandTotal: number;
}

// Result of PDF generation
export interface PDFGenerationResult {
  blob: Blob;
  filename: string;
}

/**
 * Generate filename for the PDF
 */
export function getInvoiceFilename(quote: Quote, settings: AppSettings): string {
  const prefix = quote.type === 'invoice' 
    ? (settings.invoicePrefix || 'INV-') 
    : (settings.quotePrefix || 'EST-');
  const numStr = (quote.referenceNumber || 1).toString().padStart(4, '0');
  const cleanTitle = (quote.title || 'document').replace(/[^a-z0-9]/gi, '_').toLowerCase();
  return `${prefix}${numStr}_${cleanTitle}.pdf`;
}

/**
 * Generate reference string for the document
 */
export function getInvoiceReference(quote: Quote, settings: AppSettings): string {
  const prefix = quote.type === 'invoice' 
    ? (settings.invoicePrefix || 'INV-') 
    : (settings.quotePrefix || 'EST-');
  const numStr = (quote.referenceNumber || 1).toString().padStart(4, '0');
  return `${prefix}${numStr}`;
}

/**
 * Generate a PDF blob using @react-pdf/renderer
 * 
 * This is the main export function. It creates a vector PDF with crisp, selectable text.
 * 
 * @param quote - The quote/invoice data
 * @param customer - Customer details
 * @param settings - App settings (branding, templates, etc.)
 * @param totals - Pre-calculated totals
 * @param reference - Document reference string (e.g., "INV-0001")
 * @returns Promise<PDFGenerationResult> - The PDF blob and filename
 */
export async function generateInvoicePDF(
  quote: Quote,
  customer: Customer,
  settings: AppSettings,
  totals: InvoiceTotals,
  reference?: string
): Promise<PDFGenerationResult> {
  // Generate reference if not provided
  const docReference = reference || getInvoiceReference(quote, settings);
  const filename = getInvoiceFilename(quote, settings);

  try {
    // Create the PDF document
    const doc = React.createElement(InvoicePDFDocument, {
      quote,
      customer,
      settings,
      totals,
      reference: docReference,
    });

    // Generate the PDF blob
    const blob = await pdf(doc).toBlob();

    return { blob, filename };
  } catch (error) {
    console.error('react-pdf generation failed:', error);
    throw new Error(`PDF generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Download a PDF directly to the browser
 * 
 * Convenience function that generates and triggers download.
 */
export async function downloadInvoicePDF(
  quote: Quote,
  customer: Customer,
  settings: AppSettings,
  totals: InvoiceTotals,
  reference?: string
): Promise<void> {
  const { blob, filename } = await generateInvoicePDF(quote, customer, settings, totals, reference);

  // Create download link
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generate a PDF and return as base64 data URL
 * 
 * Useful for previewing or embedding.
 */
export async function generateInvoicePDFDataUrl(
  quote: Quote,
  customer: Customer,
  settings: AppSettings,
  totals: InvoiceTotals,
  reference?: string
): Promise<string> {
  const { blob } = await generateInvoicePDF(quote, customer, settings, totals, reference);

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to convert blob to data URL'));
      }
    };
    reader.onerror = () => reject(new Error('FileReader error'));
    reader.readAsDataURL(blob);
  });
}

/**
 * Check if react-pdf is available
 * 
 * Can be used to determine whether to use the new system or fall back to html2canvas.
 */
export function isReactPdfAvailable(): boolean {
  try {
    // If we got here, the import worked
    return typeof pdf === 'function';
  } catch {
    return false;
  }
}

/**
 * Create a PDF File object (for sharing via Web Share API)
 */
export async function createInvoicePDFFile(
  quote: Quote,
  customer: Customer,
  settings: AppSettings,
  totals: InvoiceTotals,
  reference?: string
): Promise<File> {
  const { blob, filename } = await generateInvoicePDF(quote, customer, settings, totals, reference);

  return new File([blob], filename, {
    type: 'application/pdf',
    lastModified: Date.now(),
  });
}
