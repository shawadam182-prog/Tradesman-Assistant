import React from 'react';
import { X, Mail, Copy, Check, Share2, FileDown, Loader2 } from 'lucide-react';
import type { Quote } from '../../types';
import type { QuoteTotals } from '../../src/utils/quoteCalculations';
import { PaymentRecorder } from '../PaymentRecorder';
import { hapticSuccess } from '../../src/hooks/useHaptic';
import type { EmailHelperState } from '../../src/hooks/useQuoteSharing';

interface QuoteModalsProps {
  quote: Quote;
  totals: QuoteTotals;
  // Payment Recorder
  showPaymentRecorder: boolean;
  onRecordPayment: (payment: {
    amount: number;
    method: 'cash' | 'card' | 'bank_transfer' | 'cheque';
    date: string;
    markAsPaid: boolean;
  }) => void;
  onClosePaymentRecorder: () => void;
  // Email Helper
  emailHelper: EmailHelperState | null;
  onSetEmailHelper: React.Dispatch<React.SetStateAction<EmailHelperState | null>>;
  // Mark as Sent
  showMarkAsSentPrompt: boolean;
  onCloseMarkAsSent: () => void;
  onUpdateStatus: (status: Quote['status']) => void;
  // PDF Preview
  showPdfPreview: boolean;
  pdfPreviewUrl: string | null;
  isDownloading: boolean;
  onDownloadPDF: () => void;
  onClosePdfPreview: () => void;
}

export const QuoteModals: React.FC<QuoteModalsProps> = ({
  quote,
  totals,
  showPaymentRecorder,
  onRecordPayment,
  onClosePaymentRecorder,
  emailHelper,
  onSetEmailHelper,
  showMarkAsSentPrompt,
  onCloseMarkAsSent,
  onUpdateStatus,
  showPdfPreview,
  pdfPreviewUrl,
  isDownloading,
  onDownloadPDF,
  onClosePdfPreview,
}) => {
  return (
    <>
      {/* Payment Recorder Modal */}
      {showPaymentRecorder && quote.type === 'invoice' && (
        <PaymentRecorder
          invoice={quote}
          invoiceTotal={totals.grandTotal}
          onRecordPayment={onRecordPayment}
          onClose={onClosePaymentRecorder}
        />
      )}

      {/* Email Helper Modal */}
      {emailHelper?.show && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-2">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md max-h-[85vh] overflow-hidden animate-in slide-in-from-bottom-4">
            {/* Header */}
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center">
                  <Mail size={20} />
                </div>
                <div>
                  <h3 className="font-bold">PDF Downloaded</h3>
                  <p className="text-xs text-slate-400">{emailHelper.filename}</p>
                </div>
              </div>
              <button
                onClick={() => onSetEmailHelper(null)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="p-5 space-y-4">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2 flex items-start gap-2">
                <Check size={18} className="text-emerald-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-emerald-800">
                  PDF saved to your downloads. Now send it via email:
                </p>
              </div>

              {/* Email preview */}
              <div className="space-y-1.5">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">To</label>
                  <p className="text-sm font-medium text-slate-700">{emailHelper.email || '(add recipient)'}</p>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Subject</label>
                  <p className="text-sm font-medium text-slate-700">{emailHelper.subject}</p>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Message</label>
                  <div className="bg-slate-50 rounded-xl p-2 mt-1 border border-slate-100">
                    <p className="text-sm text-slate-600 whitespace-pre-line">{emailHelper.body}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="p-5 pt-0 space-y-1.5">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(emailHelper.body);
                  onSetEmailHelper({ ...emailHelper, copied: true });
                  setTimeout(() => onSetEmailHelper(prev => prev ? { ...prev, copied: false } : null), 2000);
                }}
                className={`w-full py-1 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                  emailHelper.copied
                    ? 'bg-emerald-500 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {emailHelper.copied ? <Check size={18} /> : <Copy size={18} />}
                {emailHelper.copied ? 'Copied!' : 'Copy Message'}
              </button>

              <button
                onClick={() => {
                  const mailtoLink = `mailto:${emailHelper.email}?subject=${encodeURIComponent(emailHelper.subject)}&body=${encodeURIComponent(emailHelper.body)}`;
                  window.location.href = mailtoLink;
                }}
                className="w-full py-1.5 bg-blue-600 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/30"
              >
                <Mail size={18} />
                Open Email App
              </button>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-2 mt-2">
                <p className="text-xs text-amber-800 text-center">
                  In your email app, tap the <strong>paperclip icon</strong> to attach the PDF from your Downloads folder
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mark as Sent Prompt Modal */}
      {showMarkAsSentPrompt && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-2">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-sm overflow-hidden animate-in slide-in-from-bottom-4">
            <div className="p-5 text-center">
              <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Share2 size={28} className="text-blue-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">
                Mark as Sent?
              </h3>
              <p className="text-sm text-slate-600 mb-6">
                Would you like to update the status to show this {quote.type === 'invoice' ? 'invoice' : 'document'} has been sent to the customer?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={onCloseMarkAsSent}
                  className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-200 transition-colors"
                >
                  Not Yet
                </button>
                <button
                  onClick={() => {
                    onUpdateStatus('sent');
                    onCloseMarkAsSent();
                    hapticSuccess();
                  }}
                  className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/30"
                >
                  Yes, Confirm Sent ✓
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PDF Preview Modal */}
      {showPdfPreview && pdfPreviewUrl && (
        <div className="fixed inset-0 bg-black/80 flex flex-col z-[100]">
          <div className="flex items-center justify-between p-4 bg-slate-900">
            <h3 className="text-white font-bold">PDF Preview</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={onDownloadPDF}
                disabled={isDownloading}
                className="px-4 py-2 bg-amber-500 text-white rounded-lg font-bold text-sm hover:bg-amber-600 transition-colors flex items-center gap-2"
              >
                {isDownloading ? <Loader2 size={16} className="animate-spin" /> : <FileDown size={16} />}
                Download
              </button>
              <button
                onClick={onClosePdfPreview}
                className="p-2 text-white hover:bg-white/10 rounded-lg transition-colors"
              >
                <X size={24} />
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-hidden">
            <iframe
              src={pdfPreviewUrl}
              className="w-full h-full border-0"
              title="PDF Preview"
            />
          </div>
        </div>
      )}
    </>
  );
};
