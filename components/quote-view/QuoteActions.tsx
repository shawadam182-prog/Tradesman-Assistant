import React, { useState } from 'react';
import {
  Share2, Check, X, Settings2, Copy, ReceiptText,
  Banknote, MapPin, ArrowLeft, Edit3, Mail, MessageCircle,
  FileDown, Loader2, CreditCard, Link
} from 'lucide-react';
import { Quote, Customer, AppSettings } from '../../types';
import { hapticSuccess } from '../../src/hooks/useHaptic';
import { useToast } from '../../src/contexts/ToastContext';

interface QuoteActionsProps {
  quote: Quote;
  customer: Customer;
  settings: AppSettings;
  isDownloading: boolean;
  showCustomiser: boolean;
  onBack: () => void;
  onEdit: () => void;
  onUpdateStatus: (status: Quote['status']) => void;
  onToggleCustomiser: () => void;
  onDuplicate?: () => void;
  onConvertToInvoice?: () => void;
  onRecordPayment: () => void;
  onEmailShare: () => void;
  onWhatsAppShare: () => void;
  onDownloadPDF: () => void;
  onOpenMaps: () => void;
  onRefreshQuote?: () => void;
  getReference: () => string;
  totals: { grandTotal: number };
}

export const QuoteActions: React.FC<QuoteActionsProps> = ({
  quote,
  customer,
  settings,
  isDownloading,
  showCustomiser,
  onBack,
  onEdit,
  onUpdateStatus,
  onToggleCustomiser,
  onDuplicate,
  onConvertToInvoice,
  onRecordPayment,
  onEmailShare,
  onWhatsAppShare,
  onDownloadPDF,
  onOpenMaps,
  onRefreshQuote,
  getReference,
  totals,
}) => {
  const toast = useToast();
  const [isCreatingPaymentLink, setIsCreatingPaymentLink] = useState(false);

  const handleGetPaymentLink = async () => {
    const { isConnectSetupComplete, createInvoicePaymentLink } = await import('../../src/lib/stripe');

    if (!isConnectSetupComplete(settings)) {
      toast.info('Setup Required', 'Please set up card payments in Settings first');
      return;
    }

    setIsCreatingPaymentLink(true);
    try {
      const result = await createInvoicePaymentLink({
        invoiceId: quote.id,
        amount: totals.grandTotal,
        customerEmail: customer?.email,
        customerName: customer?.name,
        description: quote.title,
        invoiceReference: getReference(),
      });

      // Copy to clipboard
      await navigator.clipboard.writeText(result.url);
      toast.success('Payment Link Copied!', 'Send this link to your customer');

      // Refresh to show the new payment link
      onRefreshQuote?.();
    } catch (error) {
      console.error('Payment link error:', error);
      toast.error('Failed', error instanceof Error ? error.message : 'Could not create payment link');
    } finally {
      setIsCreatingPaymentLink(false);
    }
  };

  const handleCopyPaymentLink = async () => {
    if (quote.paymentLinkUrl) {
      await navigator.clipboard.writeText(quote.paymentLinkUrl);
      toast.success('Copied!', 'Payment link copied to clipboard');
    }
  };

  return (
    <>
      {/* Unified Header */}
      <div className="sticky top-0 z-40 bg-white border-b border-slate-100 p-2 flex items-center justify-between shadow-sm -mx-4 md:mx-0 print:hidden mb-4">
        <div className="flex items-center gap-2">
          <button onClick={onBack} className="p-2 -ml-2 text-slate-400 hover:text-slate-700">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-lg font-bold text-slate-900">
            {quote.type === 'invoice' ? 'Invoice' : 'Quote'} Details
          </h1>
        </div>
        <div className="flex gap-2">
          <button onClick={onEdit} className="p-2 bg-slate-50 text-slate-600 rounded-lg hover:bg-slate-100">
            <Edit3 size={18} />
          </button>
          <button
            onClick={onEmailShare}
            disabled={isDownloading}
            className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100"
            title="Email with PDF"
          >
            {isDownloading ? <Loader2 size={18} className="animate-spin" /> : <Mail size={18} />}
          </button>
          <button
            onClick={onWhatsAppShare}
            className="p-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100"
            title="Share via WhatsApp"
          >
            <MessageCircle size={18} />
          </button>
          <button
            onClick={onDownloadPDF}
            disabled={isDownloading}
            className="p-2 bg-amber-50 text-amber-600 rounded-lg hover:bg-amber-100"
            title="Download PDF"
          >
            {isDownloading ? <Loader2 size={18} className="animate-spin" /> : <FileDown size={18} />}
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-2 print:hidden">
        {/* Status Action Buttons for Quotes */}
        {quote.type !== 'invoice' && (
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
            {quote.status === 'draft' && (
              <button
                onClick={() => {
                  onUpdateStatus('sent');
                  hapticSuccess();
                }}
                className="flex-shrink-0 flex items-center gap-2 px-2 py-1 rounded-xl bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-500/30 hover:bg-blue-600 transition-colors"
              >
                <Share2 size={14} /> Mark as Sent
              </button>
            )}
            {quote.status === 'sent' && (
              <>
                <button
                  onClick={() => {
                    onUpdateStatus('accepted');
                    hapticSuccess();
                  }}
                  className="flex-shrink-0 flex items-center gap-2 px-2 py-1 rounded-xl bg-green-500 text-white text-xs font-bold shadow-lg shadow-green-500/30 hover:bg-green-600 transition-colors"
                >
                  <Check size={14} /> Customer Accepted
                </button>
                <button
                  onClick={() => {
                    onUpdateStatus('declined');
                    hapticSuccess();
                  }}
                  className="flex-shrink-0 flex items-center gap-2 px-2 py-1 rounded-xl bg-red-500 text-white text-xs font-bold shadow-lg shadow-red-500/30 hover:bg-red-600 transition-colors"
                >
                  <X size={14} /> Customer Declined
                </button>
              </>
            )}
            {quote.status === 'accepted' && !quote.status.includes('invoiced') && (
              <div className="flex items-center gap-2 px-2 py-1 rounded-xl bg-green-100 text-green-700 text-xs font-bold">
                <Check size={14} /> Accepted - Ready to Invoice
              </div>
            )}
            {quote.status === 'declined' && (
              <div className="flex items-center gap-2 px-2 py-1 rounded-xl bg-red-100 text-red-700 text-xs font-bold">
                <X size={14} /> Quote Declined
              </div>
            )}
          </div>
        )}

        {/* Secondary Actions Row */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
          <button
            onClick={onToggleCustomiser}
            className="flex-shrink-0 flex items-center gap-2 px-2 py-1 rounded-lg bg-white border border-slate-100 text-slate-600 text-xs font-bold shadow-sm"
          >
            <Settings2 size={14} /> Layout
          </button>
          {onDuplicate && (
            <button
              onClick={onDuplicate}
              className="flex-shrink-0 flex items-center gap-2 px-2 py-1 rounded-lg bg-white border border-slate-100 text-slate-600 text-xs font-bold shadow-sm"
            >
              <Copy size={14} /> Duplicate
            </button>
          )}
          {quote.type !== 'invoice' && onConvertToInvoice && ['draft', 'sent', 'accepted'].includes(quote.status) && (
            <button
              onClick={onConvertToInvoice}
              className="flex-shrink-0 flex items-center gap-2 px-2 py-1 rounded-lg bg-emerald-50 text-emerald-600 text-xs font-bold shadow-sm border border-emerald-100"
            >
              <ReceiptText size={14} /> To Invoice
            </button>
          )}
          {quote.type === 'invoice' && quote.status !== 'paid' && (
            <>
              <button
                onClick={quote.paymentLinkUrl ? handleCopyPaymentLink : handleGetPaymentLink}
                disabled={isCreatingPaymentLink}
                className="flex-shrink-0 flex items-center gap-2 px-2 py-1 rounded-lg bg-emerald-600 text-white text-xs font-bold shadow-lg shadow-emerald-600/30 hover:bg-emerald-700 transition-colors disabled:opacity-50"
              >
                {isCreatingPaymentLink ? (
                  <>
                    <Loader2 size={14} className="animate-spin" /> Creating...
                  </>
                ) : quote.paymentLinkUrl ? (
                  <>
                    <Link size={14} /> Copy Pay Link
                  </>
                ) : (
                  <>
                    <CreditCard size={14} /> Get Pay Link
                  </>
                )}
              </button>
              <button
                onClick={onRecordPayment}
                className="flex-shrink-0 flex items-center gap-2 px-2 py-1 rounded-lg bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-500/30 hover:bg-emerald-600 transition-colors"
              >
                <Banknote size={14} /> Record Payment
              </button>
            </>
          )}
          {customer?.address && (
            <button
              onClick={onOpenMaps}
              className="flex-shrink-0 flex items-center gap-2 px-2 py-1 rounded-lg bg-blue-50 text-blue-600 text-xs font-bold shadow-sm border border-blue-100"
            >
              <MapPin size={14} /> Map
            </button>
          )}
        </div>
      </div>
    </>
  );
};
