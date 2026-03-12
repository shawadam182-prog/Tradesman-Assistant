import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';
import type { Quote, AppSettings } from '../../types';

export interface PDFGenerationOptions {
  /** Scale factor for html2canvas. Higher = crisper. Default 5 for download, 2.5 for mobile blob. */
  scale?: number;
  /** Image format fallback. Defaults to PNG, falls back to JPEG. */
  format?: 'png' | 'jpeg';
}

export interface PDFResult {
  blob: Blob;
  filename: string;
}

/**
 * Build a standardised filename for a quote/invoice PDF.
 * e.g. "EST-0001_kitchen_renovation.pdf" or "INV-0023_bathroom_refit.pdf"
 */
export function buildPDFFilename(quote: Quote, settings: AppSettings): string {
  const prefix = quote.type === 'invoice'
    ? (settings.invoicePrefix || 'INV-')
    : (settings.quotePrefix || 'EST-');
  const numStr = (quote.referenceNumber || 1).toString().padStart(4, '0');
  const cleanTitle = (quote.title || 'document').replace(/[^a-z0-9]/gi, '_').toLowerCase();
  return `${prefix}${numStr}_${cleanTitle}.pdf`;
}

/**
 * Build a display reference string for a quote/invoice.
 * e.g. "EST-0001" or "INV-0023"
 */
export function buildPDFReference(quote: Quote, settings: AppSettings): string {
  if (quote.isCreditNote) {
    const numStr = (quote.referenceNumber || 1).toString().padStart(4, '0');
    return `CN-${numStr}`;
  }
  const prefix = quote.type === 'invoice'
    ? (settings.invoicePrefix || 'INV-')
    : (settings.quotePrefix || 'EST-');
  const numStr = (quote.referenceNumber || 1).toString().padStart(4, '0');
  return `${prefix}${numStr}`;
}

/**
 * Shared helper: capture element to canvas, produce jsPDF with JPEG compression.
 */
async function elementToPdf(
  element: HTMLElement,
  options: PDFGenerationOptions = {}
): Promise<jsPDF> {
  const { scale = 3 } = options;

  const canvas = await html2canvas(element, {
    scale,
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff',
    windowWidth: element.scrollWidth,
    windowHeight: element.scrollHeight,
    onclone: (clonedDoc) => {
      // Convert any oklch colors to rgb for html2canvas compatibility
      const allElements = clonedDoc.querySelectorAll('*');
      allElements.forEach((el) => {
        const computed = window.getComputedStyle(el);
        const htmlEl = el as HTMLElement;
        if (computed.color) {
          htmlEl.style.color = computed.color;
        }
        if (computed.backgroundColor && computed.backgroundColor !== 'rgba(0, 0, 0, 0)') {
          htmlEl.style.backgroundColor = computed.backgroundColor;
        }
        if (computed.borderColor) {
          htmlEl.style.borderColor = computed.borderColor;
        }
      });
    },
  });

  // Use JPEG at 85% quality to keep file size small (~100-300KB vs 60MB+ PNG)
  const imgData = canvas.toDataURL('image/jpeg', 0.85);

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();
  const scaledHeight = (canvas.height * pdfWidth) / canvas.width;

  let heightLeft = scaledHeight;
  let position = 0;
  let pageNum = 0;

  while (heightLeft > 0) {
    if (pageNum > 0) {
      pdf.addPage();
    }
    pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, scaledHeight);
    heightLeft -= pdfHeight;
    position -= pdfHeight;
    pageNum++;
  }

  return pdf;
}

/**
 * Generate a PDF blob from a rendered HTML element (the document ref).
 * Uses html2canvas to capture the DOM and jsPDF to paginate into A4.
 */
export async function generatePDFFromElement(
  element: HTMLElement,
  options: PDFGenerationOptions = {}
): Promise<Blob> {
  const pdf = await elementToPdf(element, options);
  return pdf.output('blob');
}

/**
 * Generate a PDF and trigger a browser download.
 */
export async function downloadPDF(
  element: HTMLElement,
  filename: string,
  options: PDFGenerationOptions = {}
): Promise<void> {
  const pdf = await elementToPdf(element, options);
  pdf.save(filename);
}
