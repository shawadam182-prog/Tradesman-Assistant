import { useState, useEffect, type RefObject } from 'react';
import type { Quote, Customer, AppSettings, QuoteDisplayOptions } from '../../types';
import type { QuoteTotals } from '../utils/quoteCalculations';
import { buildPDFFilename, buildPDFReference, generatePDFFromElement, downloadPDF } from '../services/pdfService';
import {
  buildWhatsAppMessage,
  buildSmsMessage,
  buildEmailContent,
  openWhatsApp,
  openSms,
  openMaps,
} from '../services/shareService';
import { hapticSuccess } from './useHaptic';
import { filingService, quotesService } from '../services/dataService';

export interface EmailHelperState {
  show: boolean;
  subject: string;
  body: string;
  email: string;
  filename: string;
  copied: boolean;
}

export interface UseQuoteSharingOptions {
  documentRef: RefObject<HTMLDivElement | null>;
  quote: Quote;
  customer: Customer;
  settings: AppSettings;
  totals: QuoteTotals;
  displayOptions: QuoteDisplayOptions;
  onUpdateQuote: (quote: Quote) => void;
  onUpdateStatus: (status: Quote['status']) => void;
}

export function useQuoteSharing(options: UseQuoteSharingOptions) {
  const {
    documentRef, quote, customer, settings, totals, displayOptions,
    onUpdateQuote, onUpdateStatus,
  } = options;

  const [isDownloading, setIsDownloading] = useState(false);
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  const [emailHelper, setEmailHelper] = useState<EmailHelperState | null>(null);
  const [showMarkAsSentPrompt, setShowMarkAsSentPrompt] = useState(false);
  const [shareLinkCopied, setShareLinkCopied] = useState(false);
  const [showPaymentRecorder, setShowPaymentRecorder] = useState(false);

  // Cleanup preview URL on unmount
  useEffect(() => {
    return () => {
      if (pdfPreviewUrl) {
        URL.revokeObjectURL(pdfPreviewUrl);
      }
    };
  }, [pdfPreviewUrl]);

  const promptMarkAsSent = () => {
    if (quote.status === 'draft') {
      setShowMarkAsSentPrompt(true);
    }
  };

  // Generate PDF as a Blob for filing or preview
  const generatePDFBlob = async (): Promise<{ blob: Blob; filename: string } | null> => {
    if (!documentRef.current) return null;
    try {
      const filename = buildPDFFilename(quote, settings);
      const isMobile = window.innerWidth < 768;
      const scale = isMobile ? 2.5 : 4;
      const blob = await generatePDFFromElement(documentRef.current, { scale });
      return { blob, filename };
    } catch (err) {
      console.error('PDF generation for filing failed:', err);
      return null;
    }
  };

  // Generate PDF preview
  const handlePdfPreview = async () => {
    setIsGeneratingPreview(true);
    try {
      const result = await generatePDFBlob();
      if (result) {
        if (pdfPreviewUrl) {
          URL.revokeObjectURL(pdfPreviewUrl);
        }
        const url = URL.createObjectURL(result.blob);
        setPdfPreviewUrl(url);
        setShowPdfPreview(true);
      }
    } catch (err) {
      console.error('PDF preview failed:', err);
      alert('Failed to generate preview. Please try again.');
    } finally {
      setIsGeneratingPreview(false);
    }
  };

  // File paid invoice to Filing Cabinet
  const filePaidInvoice = async () => {
    const pdfResult = await generatePDFBlob();
    if (!pdfResult) return;

    const { blob, filename } = pdfResult;
    const file = new File([blob], filename, { type: 'application/pdf' });

    const paymentDate = quote.paymentDate || new Date().toISOString().split('T')[0];
    const paymentYear = new Date(paymentDate).getFullYear();
    const paymentMonth = new Date(paymentDate).getMonth();
    // UK tax year runs April to April
    const taxYear = paymentMonth < 3 ? `${paymentYear - 1}/${paymentYear}` : `${paymentYear}/${paymentYear + 1}`;

    const reference = buildPDFReference(quote, settings);

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
      // Don't throw - filing is a nice-to-have, don't block the payment recording
    }
  };

  const handleRecordPayment = async (payment: {
    amount: number;
    method: 'cash' | 'card' | 'bank_transfer' | 'cheque';
    date: string;
    markAsPaid: boolean;
  }) => {
    const newAmountPaid = (quote.amountPaid || 0) + payment.amount;
    const updatedQuote: Quote = {
      ...quote,
      amountPaid: newAmountPaid,
      paymentMethod: payment.method,
      paymentDate: payment.date,
      status: payment.markAsPaid ? 'paid' : quote.status,
    };
    await onUpdateQuote(updatedQuote);
    setShowPaymentRecorder(false);
    hapticSuccess();

    // Auto-file to Filing Cabinet when marked as paid
    if (payment.markAsPaid) {
      setTimeout(() => {
        filePaidInvoice();
      }, 500);
    }
  };

  const handleDownloadPDF = async () => {
    if (!documentRef.current) return;
    setIsDownloading(true);
    try {
      const filename = buildPDFFilename(quote, settings);
      await downloadPDF(documentRef.current, filename, { scale: 5 });
      promptMarkAsSent();
    } catch (err) {
      console.error('PDF generation failed:', err);
      alert('PDF generation failed. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleWhatsAppShare = () => {
    const message = buildWhatsAppMessage(quote, customer, settings, totals, displayOptions);
    openWhatsApp(message, customer?.phone);
    promptMarkAsSent();
  };

  const handleSmsShare = () => {
    const shareUrl = quote.shareToken ? quotesService.getShareUrl(quote.shareToken) : undefined;
    const message = buildSmsMessage(quote, customer, settings, totals, shareUrl);
    openSms(message, customer?.phone);
    promptMarkAsSent();
  };

  const handleEmailShare = async () => {
    if (!documentRef.current) return;

    setIsDownloading(true);
    try {
      const filename = buildPDFFilename(quote, settings);
      const { subject, body, recipientEmail } = buildEmailContent(quote, customer, settings, totals);
      const blob = await generatePDFFromElement(documentRef.current, { scale: 5 });

      // MOBILE: Use Web Share API
      const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
      if (isMobile && navigator.share && navigator.canShare) {
        try {
          const pdfFile = new File([blob], filename, { type: 'application/pdf' });
          const shareData = {
            files: [pdfFile],
            title: subject,
            text: `To: ${recipientEmail}\n\n${body}`,
          };

          if (navigator.canShare(shareData)) {
            await navigator.share(shareData);
            promptMarkAsSent();
            return;
          }
        } catch (shareErr) {
          if ((shareErr as Error).name === 'AbortError') return;
          console.warn('Web Share failed, falling back to download:', shareErr);
        }
      }

      // DESKTOP/FALLBACK: Download PDF and open mailto
      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);

      const mailtoLink = `mailto:${recipientEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      await new Promise(resolve => setTimeout(resolve, 300));
      window.location.href = mailtoLink;
      promptMarkAsSent();
    } catch (err) {
      console.error('Email share failed:', err);
      alert('Could not prepare email. Please try downloading the PDF instead.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleGenerateShareLink = async () => {
    try {
      const result = await quotesService.generateShareToken(quote.id);
      if (result.success && result.share_token) {
        onUpdateQuote({ ...quote, shareToken: result.share_token });
        hapticSuccess();
        const url = quotesService.getShareUrl(result.share_token);
        await navigator.clipboard.writeText(url);
        setShareLinkCopied(true);
        setTimeout(() => setShareLinkCopied(false), 3000);
      } else {
        alert(result.error || 'Failed to generate share link');
      }
    } catch (err) {
      console.error('Failed to generate share link:', err);
      alert('Failed to generate share link. Please try again.');
    }
  };

  const handleCopyShareLink = async () => {
    if (!quote.shareToken) {
      await handleGenerateShareLink();
      return;
    }
    try {
      const url = quotesService.getShareUrl(quote.shareToken);
      await navigator.clipboard.writeText(url);
      setShareLinkCopied(true);
      hapticSuccess();
      setTimeout(() => setShareLinkCopied(false), 3000);
    } catch (err) {
      console.error('Failed to copy share link:', err);
      alert('Failed to copy link. Please try again.');
    }
  };

  const handleOpenMaps = () => {
    if (customer?.address) {
      openMaps(customer.address);
    }
  };

  return {
    // State
    isDownloading,
    showPdfPreview,
    pdfPreviewUrl,
    isGeneratingPreview,
    emailHelper,
    showMarkAsSentPrompt,
    shareLinkCopied,
    showPaymentRecorder,
    // State setters (for modals)
    setShowPdfPreview,
    setPdfPreviewUrl,
    setShowMarkAsSentPrompt,
    setEmailHelper,
    setShowPaymentRecorder,
    // Handlers
    handleDownloadPDF,
    handlePdfPreview,
    handleWhatsAppShare,
    handleSmsShare,
    handleEmailShare,
    handleCopyShareLink,
    handleGenerateShareLink,
    handleOpenMaps,
    handleRecordPayment,
  };
}
