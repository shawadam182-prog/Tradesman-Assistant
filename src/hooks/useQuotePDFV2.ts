/**
 * useQuotePDFV2.ts - React hook for vector PDF generation
 * 
 * This hook provides the same interface as useQuotePDF but uses @react-pdf/renderer
 * for vector-based PDF generation (crisp, selectable text).
 * 
 * USAGE:
 * Replace: import { useQuotePDF } from '../hooks/useQuotePDF';
 * With:    import { useQuotePDFV2 as useQuotePDF } from '../hooks/useQuotePDFV2';
 * 
 * Or use both side-by-side for A/B testing.
 */

import { useState, useCallback } from 'react';
import { Quote, Customer, AppSettings } from '../../types';
import {
  generateInvoicePDF,
  getInvoiceFilename,
  getInvoiceReference,
  createInvoicePDFFile,
} from '../utils/invoicePdfExportV2';
import { filingService, quotesService } from '../services/dataService';

interface QuoteTotals {
  clientSubtotal: number;
  taxAmount: number;
  cisAmount: number;
  discountAmount: number;
  grandTotal: number;
}

interface EmailHelperState {
  show: boolean;
  subject: string;
  body: string;
  email: string;
  filename: string;
  copied: boolean;
}

interface UseQuotePDFV2Options {
  quote: Quote;
  customer: Customer;
  settings: AppSettings;
  totals: QuoteTotals;
  displayOptions: { showVat: boolean; showCis: boolean };
}

export function useQuotePDFV2({ quote, customer, settings, totals }: UseQuotePDFV2Options) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [emailHelper, setEmailHelper] = useState<EmailHelperState | null>(null);

  const getFilename = useCallback(() => {
    return getInvoiceFilename(quote, settings);
  }, [quote, settings]);

  const getReference = useCallback(() => {
    return getInvoiceReference(quote, settings);
  }, [quote, settings]);

  // Prepare totals in the format expected by the PDF generator
  const pdfTotals = {
    clientSubtotal: totals.clientSubtotal,
    taxAmount: totals.taxAmount,
    cisAmount: totals.cisAmount,
    discountAmount: (totals as any).discountAmount || 0,
    grandTotal: totals.grandTotal,
  };

  const generatePDFBlob = useCallback(async (): Promise<{ blob: Blob; filename: string } | null> => {
    try {
      const result = await generateInvoicePDF(
        quote,
        customer,
        settings,
        pdfTotals,
        getReference()
      );
      return result;
    } catch (err) {
      console.error('PDF generation for filing failed:', err);
      return null;
    }
  }, [quote, customer, settings, pdfTotals, getReference]);

  const filePaidInvoice = useCallback(async () => {
    const pdfResult = await generatePDFBlob();
    if (!pdfResult) return;

    const { blob, filename } = pdfResult;
    const file = new File([blob], filename, { type: 'application/pdf' });

    const paymentDate = quote.paymentDate || new Date().toISOString().split('T')[0];
    const paymentYear = new Date(paymentDate).getFullYear();
    const paymentMonth = new Date(paymentDate).getMonth();
    const taxYear = paymentMonth < 3 ? `${paymentYear - 1}/${paymentYear}` : `${paymentYear}/${paymentYear + 1}`;

    const reference = getReference();

    try {
      await filingService.upload(file, {
        name: `${reference} - ${quote.title} (PAID)`,
        description: `Paid invoice for ${customer?.name || 'Customer'}. Amount: £${totals.grandTotal.toFixed(2)}`,
        category: 'invoice',
        document_date: paymentDate,
        vendor_name: customer?.name,
        tax_year: taxYear,
        tags: ['paid', 'invoice', reference],
      });
    } catch (err) {
      console.error('Failed to file invoice:', err);
    }
  }, [generatePDFBlob, getReference, quote, customer, totals]);

  const handleDownloadPDF = useCallback(async () => {
    setIsDownloading(true);
    try {
      const { blob, filename } = await generateInvoicePDF(
        quote,
        customer,
        settings,
        pdfTotals,
        getReference()
      );

      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('PDF generation failed:', err);
      alert('PDF generation failed. Please try again or use the legacy export.');
    } finally {
      setIsDownloading(false);
    }
  }, [quote, customer, settings, pdfTotals, getReference]);

  const handleWhatsAppShare = useCallback(() => {
    const reference = getReference();
    const docType = quote.type === 'invoice' ? 'Invoice' : 'Quote';

    let breakdown = '';
    if (quote.sections && quote.sections.length > 0) {
      breakdown += '\n📋 *Work Breakdown:*\n';
      quote.sections.forEach((section, idx) => {
        const markupMultiplier = 1 + ((quote.markupPercent || 0) / 100);
        const rawMaterialsTotal = (section.items || []).reduce((s, i) => s + (i.totalPrice || 0), 0);
        const rawLabourTotal = (section.labourHours || 0) * (quote.labourRate || settings.defaultLabourRate || 0);
        const sectionTotal = (rawMaterialsTotal + rawLabourTotal) * markupMultiplier;

        breakdown += `\n${idx + 1}. ${section.title}`;
        if (section.items && section.items.length > 0) {
          breakdown += `\n   • Materials: £${(rawMaterialsTotal * markupMultiplier).toFixed(2)}`;
        }
        if (section.labourHours && section.labourHours > 0) {
          breakdown += `\n   • Labour (${section.labourHours}hrs): £${(rawLabourTotal * markupMultiplier).toFixed(2)}`;
        }
        breakdown += `\n   *Section Total: £${sectionTotal.toFixed(2)}*`;
      });
    }

    let totalsBreakdown = '\n\n💰 *Financial Summary:*';
    totalsBreakdown += `\nSubtotal: £${totals.clientSubtotal.toFixed(2)}`;
    if (settings.enableVat && totals.taxAmount > 0) {
      totalsBreakdown += `\nVAT (${quote.taxPercent}%): £${totals.taxAmount.toFixed(2)}`;
    }
    if (settings.enableCis && totals.cisAmount > 0) {
      totalsBreakdown += `\nCIS Deduction: -£${totals.cisAmount.toFixed(2)}`;
    }
    totalsBreakdown += `\n\n*TOTAL DUE: £${totals.grandTotal.toFixed(2)}*`;

    let partPaymentInfo = '';
    if (quote.type === 'invoice' && quote.partPaymentEnabled && quote.partPaymentValue) {
      const partAmount = quote.partPaymentType === 'percentage'
        ? totals.grandTotal * (quote.partPaymentValue / 100)
        : quote.partPaymentValue;

      partPaymentInfo = `\n\n💳 *${quote.partPaymentLabel || 'Amount Due Now'}:* £${partAmount.toFixed(2)}`;
      if (quote.partPaymentType === 'percentage') {
        partPaymentInfo += ` (${quote.partPaymentValue}%)`;
      }
      partPaymentInfo += `\n*Balance Remaining:* £${(totals.grandTotal - partAmount).toFixed(2)}`;
    }

    const message = `Hi ${customer?.name || 'there'},

${quote.type === 'invoice' ? '📄' : '📝'} Your ${docType} is ready!

*Reference:* ${reference}
*Project:* ${quote.title}
*Date:* ${quote?.date ? new Date(quote.date).toLocaleDateString('en-GB') : 'N/A'}
${breakdown}
${totalsBreakdown}${partPaymentInfo}

${quote.type === 'invoice'
        ? '⏰ *Payment Terms:* Due within 14 days\n\nPlease arrange payment at your earliest convenience.'
        : '✅ Please review and let me know if you have any questions or need any adjustments.\n\nI\'m happy to discuss the details.'}

${quote.notes ? `\n📌 *Additional Notes:*\n${quote.notes}\n` : ''}
---
${settings?.companyName || 'TradeSync'}
${settings?.phone ? `📞 ${settings.phone}` : ''}
${settings?.email ? `📧 ${settings.email}` : ''}`;

    const phoneNumber = customer?.phone?.replace(/\D/g, '') || '';
    const url = phoneNumber
      ? `https://wa.me/${phoneNumber.startsWith('44') ? phoneNumber : '44' + phoneNumber.replace(/^0/, '')}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;

    window.open(url, '_blank');
  }, [getReference, quote, customer, settings, totals]);

  const handleEmailShare = useCallback(async () => {
    setIsDownloading(true);
    try {
      const filename = getFilename();
      const docType = quote.type === 'invoice' ? 'invoice' : 'quote';
      const customerName = customer?.name || 'there';
      const customerEmail = customer?.email || '';
      const reference = getReference();

      // Generate PDF using react-pdf
      const pdfFile = await createInvoicePDFFile(
        quote,
        customer,
        settings,
        pdfTotals,
        reference
      );

      // Build email content
      let partPaymentLine = '';
      if (quote.type === 'invoice' && quote.partPaymentEnabled && quote.partPaymentValue) {
        const partAmount = quote.partPaymentType === 'percentage'
          ? totals.grandTotal * (quote.partPaymentValue / 100)
          : quote.partPaymentValue;
        partPaymentLine = `\n\n${quote.partPaymentLabel || 'Amount Due Now'}: £${partAmount.toFixed(2)}`;
      }

      const subject = `${docType.charAt(0).toUpperCase() + docType.slice(1)} - ${quote.title} (${reference})`;
      const body = `Dear ${customerName},

Please find attached ${docType} as discussed.${partPaymentLine}

Thanks,
${settings?.companyName || ''}${settings?.phone ? `\n${settings.phone}` : ''}${settings?.email ? `\n${settings.email}` : ''}`;

      // Try Web Share API on mobile
      const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
      if (isMobile && navigator.share && navigator.canShare) {
        try {
          const shareData = {
            files: [pdfFile],
            title: subject,
            text: `To: ${customerEmail}\n\n${body}`,
          };

          if (navigator.canShare(shareData)) {
            await navigator.share(shareData);
            return;
          }
        } catch (shareErr) {
          if ((shareErr as Error).name === 'AbortError') {
            return;
          }
          console.warn('Web Share failed, falling back to download:', shareErr);
        }
      }

      // Fallback: Download PDF and show email helper
      const url = URL.createObjectURL(pdfFile);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setEmailHelper({
        show: true,
        subject,
        body,
        email: customerEmail,
        filename,
        copied: false,
      });
    } catch (err) {
      console.error('Email share failed:', err);
      alert('Could not prepare email. Please try downloading the PDF instead.');
    } finally {
      setIsDownloading(false);
    }
  }, [getFilename, getReference, quote, customer, settings, pdfTotals, totals]);

  // Note: documentRef is not needed for react-pdf - we don't render to DOM
  // Returning null for compatibility, but it won't be used
  return {
    documentRef: { current: null },
    isDownloading,
    emailHelper,
    setEmailHelper,
    handleDownloadPDF,
    handleEmailShare,
    handleWhatsAppShare,
    filePaidInvoice,
    getReference,
  };
}
