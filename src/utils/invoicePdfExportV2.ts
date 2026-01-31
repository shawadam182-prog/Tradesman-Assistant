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
import html2canvas from 'html2canvas-pro';
import { InvoicePDFDocument } from '../../components/invoice-templates/pdf/InvoicePDFDocument';
import type { Quote, Customer, AppSettings } from '../../types';

/**
 * Fetch image as blob and convert to base64
 * This avoids CORS and encoding issues
 */
async function fetchImageAsBase64(url: string): Promise<string> {
  try {
    // For data URLs, extract the base64 directly
    if (url.startsWith('data:')) {
      return url;
    }
    
    const response = await fetch(url, { mode: 'cors' });
    if (!response.ok) throw new Error('Failed to fetch');
    
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    console.warn('fetchImageAsBase64 failed:', err);
    return '';
  }
}

/**
 * Convert ANY image to a clean PNG data URL
 * Uses canvas to re-render, ensuring react-pdf compatibility
 */
async function convertImageToPng(imageUrl: string, maxWidth = 200, maxHeight = 100): Promise<string> {
  // First try to fetch as base64 to avoid CORS issues
  let srcUrl = imageUrl;
  if (!imageUrl.startsWith('data:')) {
    const fetched = await fetchImageAsBase64(imageUrl);
    if (fetched) srcUrl = fetched;
  }
  
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    const timeoutId = setTimeout(() => {
      console.warn('Logo load timeout');
      // On timeout, try to use original URL as fallback
      resolve(imageUrl.startsWith('data:') ? imageUrl : '');
    }, 5000);
    
    img.onload = () => {
      clearTimeout(timeoutId);
      try {
        // Get actual dimensions
        let width = img.naturalWidth || img.width || maxWidth;
        let height = img.naturalHeight || img.height || maxHeight;
        
        // Scale to fit within bounds
        const ratio = Math.min(maxWidth / width, maxHeight / height, 1);
        const finalWidth = Math.round(width * ratio);
        const finalHeight = Math.round(height * ratio);
        
        // Create high-res canvas
        const scale = 2;
        const canvas = document.createElement('canvas');
        canvas.width = finalWidth * scale;
        canvas.height = finalHeight * scale;
        
        const ctx = canvas.getContext('2d', { alpha: false });
        if (!ctx) {
          // Fallback to original if canvas fails
          resolve(srcUrl);
          return;
        }
        
        // White background
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // High quality scaling
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        // Draw the image
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        // Export as PNG (full quality)
        const pngDataUrl = canvas.toDataURL('image/png');
        resolve(pngDataUrl);
      } catch (err) {
        console.warn('Canvas error:', err);
        // Return original data URL if conversion fails
        resolve(srcUrl.startsWith('data:') ? srcUrl : '');
      }
    };
    
    img.onerror = () => {
      clearTimeout(timeoutId);
      console.warn('Image load failed');
      // Return original data URL if it was a data URL
      resolve(srcUrl.startsWith('data:') ? srcUrl : '');
    };
    
    img.src = srcUrl;
  });
}

/**
 * Render logo using html2canvas (hybrid approach)
 * html2canvas renders the logo correctly, then we pass the data URL to react-pdf
 */
async function renderLogoWithHtml2Canvas(logoUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const container = document.createElement('div');
    container.style.cssText = 'position:fixed;left:-9999px;top:0;background:white;padding:8px;';
    
    const img = document.createElement('img');
    img.crossOrigin = 'anonymous';
    img.style.cssText = 'max-width:180px;max-height:90px;display:block;';
    
    const timeout = setTimeout(() => {
      if (document.body.contains(container)) {
        document.body.removeChild(container);
      }
      resolve('');
    }, 8000);
    
    img.onload = async () => {
      container.appendChild(img);
      document.body.appendChild(container);
      
      try {
        const canvas = await html2canvas(container, {
          scale: 3,
          backgroundColor: '#ffffff',
          logging: false,
          useCORS: true,
          allowTaint: true,
        });
        
        clearTimeout(timeout);
        document.body.removeChild(container);
        const dataUrl = canvas.toDataURL('image/png');
        console.log('Logo rendered, length:', dataUrl.length);
        resolve(dataUrl);
      } catch (err) {
        clearTimeout(timeout);
        if (document.body.contains(container)) {
          document.body.removeChild(container);
        }
        console.warn('html2canvas logo failed:', err);
        resolve('');
      }
    };
    
    img.onerror = () => {
      clearTimeout(timeout);
      resolve('');
    };
    
    img.src = logoUrl;
  });
}

/**
 * Pre-process settings - use html2canvas to render logos
 * This hybrid approach uses html2canvas (proven) for logo, react-pdf for text
 */
async function convertLogosForPdf(settings: AppSettings): Promise<AppSettings> {
  const processedSettings = { ...settings };
  
  if (settings.companyLogo) {
    try {
      const logoDataUrl = await renderLogoWithHtml2Canvas(settings.companyLogo);
      if (logoDataUrl && logoDataUrl.length > 500) {
        processedSettings.companyLogo = logoDataUrl;
      }
    } catch (err) {
      console.warn('Logo render failed:', err);
    }
  }
  
  if (settings.footerLogos && settings.footerLogos.length > 0) {
    const converted = await Promise.all(
      settings.footerLogos.map(logo => renderLogoWithHtml2Canvas(logo))
    );
    processedSettings.footerLogos = converted.filter(l => l && l.length > 500);
  }
  
  return processedSettings;
}

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
    // Convert SVG logos to PNG for react-pdf compatibility
    const processedSettings = await convertLogosForPdf(settings);
    
    // Create the PDF document
    const doc = React.createElement(InvoicePDFDocument, {
      quote,
      customer,
      settings: processedSettings,
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
