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
 * Find safe page-break positions by scanning the DOM for row/section boundaries.
 * Returns an array of Y positions (in source element pixels) where it's safe to break.
 */
function findBreakPoints(element: HTMLElement): number[] {
  const elementTop = element.getBoundingClientRect().top;
  const breakPoints: number[] = [];

  // Collect bottom edges of table rows, divs that are direct children, and section headers
  const candidates = element.querySelectorAll('tr, table, div[style]');
  candidates.forEach((el) => {
    const rect = el.getBoundingClientRect();
    const bottomY = rect.bottom - elementTop;
    if (bottomY > 0) {
      breakPoints.push(bottomY);
    }
  });

  // Sort and deduplicate
  const unique = [...new Set(breakPoints)].sort((a, b) => a - b);
  return unique;
}

/**
 * Find the best break point that doesn't exceed the page height.
 * Falls back to the raw page height if no good break point is found.
 */
function findBestBreak(breakPoints: number[], pageBottomY: number, minY: number): number {
  // Find the largest break point that fits within the page
  let best = pageBottomY;
  for (let i = breakPoints.length - 1; i >= 0; i--) {
    if (breakPoints[i] <= pageBottomY && breakPoints[i] > minY) {
      best = breakPoints[i];
      break;
    }
  }
  return best;
}

/**
 * Shared helper: capture element to canvas, produce jsPDF with JPEG compression.
 * Uses smart page breaking to avoid cutting through text/rows.
 */
async function elementToPdf(
  element: HTMLElement,
  options: PDFGenerationOptions = {}
): Promise<jsPDF> {
  const { scale = 3 } = options;

  // Find break points BEFORE html2canvas clones the element (needs live DOM)
  const breakPoints = findBreakPoints(element);
  const elementHeight = element.scrollHeight;

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

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();

  // Ratio: how many source pixels per mm in the PDF
  const pixelsPerMm = canvas.width / (pdfWidth * scale);
  // Page height in source element pixels
  const pageHeightPx = pdfHeight * pixelsPerMm * scale;

  // Calculate smart page breaks
  const pageBreaks: number[] = [0]; // Start positions of each page in source pixels
  let currentY = 0;

  while (currentY + pageHeightPx < elementHeight) {
    const rawPageBottom = currentY + pageHeightPx;
    // Don't break too early — allow at least 60% of a page
    const minBreak = currentY + pageHeightPx * 0.6;
    const bestBreak = findBestBreak(breakPoints, rawPageBottom, minBreak);
    pageBreaks.push(bestBreak);
    currentY = bestBreak;
  }

  // Render each page by cropping the appropriate region from the full canvas
  for (let i = 0; i < pageBreaks.length; i++) {
    if (i > 0) pdf.addPage();

    const startY = pageBreaks[i];
    const endY = i + 1 < pageBreaks.length ? pageBreaks[i + 1] : elementHeight;
    const regionHeight = endY - startY;

    // Create a cropped canvas for this page region
    const pageCanvas = document.createElement('canvas');
    pageCanvas.width = canvas.width;
    pageCanvas.height = Math.ceil(regionHeight * scale);
    const ctx = pageCanvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
      ctx.drawImage(
        canvas,
        0, Math.floor(startY * scale),              // source x, y
        canvas.width, Math.ceil(regionHeight * scale), // source w, h
        0, 0,                                        // dest x, y
        canvas.width, Math.ceil(regionHeight * scale)  // dest w, h
      );
    }

    const imgData = pageCanvas.toDataURL('image/jpeg', 0.85);
    const scaledRegionHeight = (pageCanvas.height * pdfWidth) / pageCanvas.width;
    pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, scaledRegionHeight);
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
