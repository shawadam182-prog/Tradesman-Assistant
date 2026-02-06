import { useRef, useState, useCallback } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { Quote, Customer, AppSettings } from '../../types';
import { filingService } from '../services/dataService';

interface QuoteTotals {
  clientSubtotal: number;
  taxAmount: number;
  cisAmount: number;
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

interface UseQuotePDFOptions {
  quote: Quote;
  customer: Customer;
  settings: AppSettings;
  totals: QuoteTotals;
  displayOptions: { showVat: boolean; showCis: boolean };
}

export function useQuotePDF({ quote, customer, settings, totals, displayOptions }: UseQuotePDFOptions) {
  const documentRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [emailHelper, setEmailHelper] = useState<EmailHelperState | null>(null);

  const getFilename = useCallback(() => {
    const prefix = quote.type === 'invoice' ? (settings.invoicePrefix || 'INV-') : (settings.quotePrefix || 'EST-');
    const numStr = (quote.referenceNumber || 1).toString().padStart(4, '0');
    const cleanTitle = (quote.title || 'estimate').replace(/[^a-z0-9]/gi, '_').toLowerCase();
    return `${prefix}${numStr}_${cleanTitle}.pdf`;
  }, [quote, settings]);

  const getReference = useCallback(() => {
    const prefix = quote.type === 'invoice' ? (settings.invoicePrefix || 'INV-') : (settings.quotePrefix || 'EST-');
    const numStr = (quote.referenceNumber || 1).toString().padStart(4, '0');
    return `${prefix}${numStr}`;
  }, [quote, settings]);

  const generatePDFBlob = useCallback(async (): Promise<{ blob: Blob; filename: string } | null> => {
    if (!documentRef.current) return null;

    try {
      const filename = getFilename();
      const isMobile = window.innerWidth < 768;
      const scale = isMobile ? 1.5 : 2;

      const canvas = await html2canvas(documentRef.current, {
        scale,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: documentRef.current.scrollWidth,
        windowHeight: documentRef.current.scrollHeight,
      });

      let imgData: string;
      try {
        imgData = canvas.toDataURL('image/png');
      } catch {
        imgData = canvas.toDataURL('image/jpeg', 0.8);
      }

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
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, scaledHeight);
        heightLeft -= pdfHeight;
        position -= pdfHeight;
        pageNum++;
      }

      const blob = pdf.output('blob');
      return { blob, filename };
    } catch (err) {
      console.error('PDF generation for filing failed:', err);
      return null;
    }
  }, [getFilename]);

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
    if (!documentRef.current) return;

    setIsDownloading(true);
    try {
      const filename = getFilename();
      const isMobile = window.innerWidth < 768;
      const scale = isMobile ? 1.5 : 2;

      const canvas = await html2canvas(documentRef.current, {
        scale,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: documentRef.current.scrollWidth,
        windowHeight: documentRef.current.scrollHeight,
      });

      let imgData: string;
      try {
        imgData = canvas.toDataURL('image/png');
      } catch {
        imgData = canvas.toDataURL('image/jpeg', 0.8);
      }

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
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, scaledHeight);
        heightLeft -= pdfHeight;
        position -= pdfHeight;
        pageNum++;
      }

      pdf.save(filename);
    } catch (err) {
      console.error('PDF generation failed:', err);
      alert('PDF generation failed. Please try again or use screenshot instead.');
    } finally {
      setIsDownloading(false);
    }
  }, [getFilename]);

  const handleWhatsAppShare = useCallback(() => {
    const reference = getReference();
    const docType = quote.type === 'invoice' ? 'Invoice' : 'Quote';

    let breakdown = '';
    if (quote.sections && quote.sections.length > 0) {
      breakdown += '\n\u{1F4CB} *Work Breakdown:*\n';
      quote.sections.forEach((section, idx) => {
        const markupMultiplier = 1 + ((quote.markupPercent || 0) / 100);
        const rawMaterialsTotal = (section.items || []).reduce((s, i) => s + (i.totalPrice || 0), 0);
        const rawLabourTotal = (section.labourHours || 0) * (quote.labourRate || settings.defaultLabourRate || 0);
        const sectionTotal = (rawMaterialsTotal + rawLabourTotal) * markupMultiplier;

        breakdown += `\n${idx + 1}. ${section.title}`;
        if (section.items && section.items.length > 0) {
          breakdown += `\n   \u2022 Materials: \u00A3${(rawMaterialsTotal * markupMultiplier).toFixed(2)}`;
        }
        if (section.labourHours && section.labourHours > 0) {
          breakdown += `\n   \u2022 Labour (${section.labourHours}hrs): \u00A3${(rawLabourTotal * markupMultiplier).toFixed(2)}`;
        }
        breakdown += `\n   *Section Total: \u00A3${sectionTotal.toFixed(2)}*`;
      });
    }

    let totalsBreakdown = '\n\n\u{1F4B0} *Financial Summary:*';
    totalsBreakdown += `\nSubtotal: \u00A3${totals.clientSubtotal.toFixed(2)}`;
    if (settings.enableVat && displayOptions.showVat && totals.taxAmount > 0) {
      totalsBreakdown += `\nVAT (${quote.taxPercent}%): \u00A3${totals.taxAmount.toFixed(2)}`;
    }
    if (settings.enableCis && displayOptions.showCis && totals.cisAmount > 0) {
      totalsBreakdown += `\nCIS Deduction: -\u00A3${totals.cisAmount.toFixed(2)}`;
    }
    totalsBreakdown += `\n\n*TOTAL DUE: \u00A3${totals.grandTotal.toFixed(2)}*`;

    let partPaymentInfo = '';
    if (quote.type === 'invoice' && quote.partPaymentEnabled && quote.partPaymentValue) {
      const partAmount = quote.partPaymentType === 'percentage'
        ? totals.grandTotal * (quote.partPaymentValue / 100)
        : quote.partPaymentValue;

      partPaymentInfo = `\n\n\u{1F4B3} *${quote.partPaymentLabel || 'Amount Due Now'}:* \u00A3${partAmount.toFixed(2)}`;
      if (quote.partPaymentType === 'percentage') {
        partPaymentInfo += ` (${quote.partPaymentValue}%)`;
      }
      partPaymentInfo += `\n*Balance Remaining:* \u00A3${(totals.grandTotal - partAmount).toFixed(2)}`;
    }

    const message = `Hi ${customer?.name || 'there'},

${quote.type === 'invoice' ? '\u{1F4C4}' : '\u{1F4DD}'} Your ${docType} is ready!

*Reference:* ${reference}
*Project:* ${quote.title}
*Date:* ${quote?.date ? new Date(quote.date).toLocaleDateString('en-GB') : 'N/A'}
${breakdown}
${totalsBreakdown}${partPaymentInfo}

${quote.type === 'invoice'
  ? '\u23F0 *Payment Terms:* Due within 14 days\n\nPlease arrange payment at your earliest convenience.'
  : '\u2705 Please review and let me know if you have any questions or need any adjustments.\n\nI\'m happy to discuss the details.'}

${quote.notes ? `\n\u{1F4CC} *Additional Notes:*\n${quote.notes}\n` : ''}
---
${settings?.companyName || 'TradeSync'}
${settings?.phone ? `\u{1F4DE} ${settings.phone}` : ''}
${settings?.email ? `\u{1F4E7} ${settings.email}` : ''}`;

    const phoneNumber = customer?.phone?.replace(/\D/g, '') || '';
    const url = phoneNumber
      ? `https://wa.me/${phoneNumber.startsWith('44') ? phoneNumber : '44' + phoneNumber.replace(/^0/, '')}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;

    window.open(url, '_blank');
  }, [getReference, quote, customer, settings, totals, displayOptions]);

  const handleEmailShare = useCallback(async () => {
    if (!documentRef.current) return;

    setIsDownloading(true);
    try {
      const filename = getFilename();
      const docType = quote.type === 'invoice' ? 'invoice' : 'quote';
      const customerName = customer?.name || 'there';
      const customerEmail = customer?.email || '';

      const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
      const scale = isMobile ? 1 : 2;

      const canvas = await html2canvas(documentRef.current, {
        scale,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: documentRef.current.scrollWidth,
        windowHeight: documentRef.current.scrollHeight,
      });

      const imgData = isMobile
        ? canvas.toDataURL('image/jpeg', 0.85)
        : canvas.toDataURL('image/png');

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
        pdf.addImage(imgData, isMobile ? 'JPEG' : 'PNG', 0, position, pdfWidth, scaledHeight);
        heightLeft -= pdfHeight;
        position -= pdfHeight;
        pageNum++;
      }

      let partPaymentLine = '';
      if (quote.type === 'invoice' && quote.partPaymentEnabled && quote.partPaymentValue) {
        const partAmount = quote.partPaymentType === 'percentage'
          ? totals.grandTotal * (quote.partPaymentValue / 100)
          : quote.partPaymentValue;
        partPaymentLine = `\n\n${quote.partPaymentLabel || 'Amount Due Now'}: \u00A3${partAmount.toFixed(2)}`;
      }

      const reference = getReference();
      const subject = `${docType.charAt(0).toUpperCase() + docType.slice(1)} - ${quote.title} (${reference})`;
      const body = `Dear ${customerName},

Please find attached ${docType} as discussed.${partPaymentLine}

Thanks,
${settings?.companyName || ''}${settings?.phone ? `\n${settings.phone}` : ''}${settings?.email ? `\n${settings.email}` : ''}`;

      if (isMobile && navigator.share && navigator.canShare) {
        try {
          const pdfBlob = pdf.output('blob');

          if (!pdfBlob || pdfBlob.size < 1000) {
            throw new Error('PDF generation produced invalid output');
          }

          const pdfFile = new File([pdfBlob], filename, {
            type: 'application/pdf',
            lastModified: Date.now()
          });

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

      pdf.save(filename);
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
  }, [getFilename, getReference, quote, customer, settings, totals]);

  return {
    documentRef,
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
