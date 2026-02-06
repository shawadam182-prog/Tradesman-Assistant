
import React, { useState, useRef, useEffect } from 'react';
import { Quote, Customer, AppSettings, QuoteDisplayOptions, QuoteSection, QuoteSignature } from '../types';
import {
  ArrowLeft, Edit3, FileText, Trash2,
  Landmark, Package, HardHat, FileDown, Loader2,
  Settings2, Eye, EyeOff, ChevronDown, List,
  ReceiptText, Share2, Copy, MessageCircle, MapPin, Mail, Banknote, Check, X, Clock, Link2, Phone,
  RefreshCw, Play, Pen
} from 'lucide-react';
import { hapticSuccess } from '../src/hooks/useHaptic';
import {
  calculateQuoteTotals,
  calculatePartPayment,
  getQuoteGrandTotal,
} from '../src/utils/quoteCalculations';
import { buildPDFReference, buildPDFFilename, generatePDFFromElement } from '../src/services/pdfService';
import { useQuoteSharing } from '../src/hooks/useQuoteSharing';
import { QuoteDocument } from './quote-view/QuoteDocument';
import { QuoteModals } from './quote-view/QuoteModals';
import { SignatureDisplay } from './signature';
import { OnSiteSignature } from './OnSiteSignature';
import { EmailComposer } from './email/EmailComposer';
import { EmailLog } from './email/EmailLog';
import { PaymentMilestoneTracker } from './payments/PaymentMilestoneTracker';
import { RecurringInvoiceList } from './invoices/RecurringInvoiceList';
import { generateNextInvoice } from '../src/services/recurringInvoiceService';
import { useData } from '../src/contexts/DataContext';
import type { PaymentMilestone } from '../types';

interface QuoteViewProps {
  quote: Quote;
  customer: Customer;
  settings: AppSettings;
  onEdit: () => void;
  onBack: () => void;
  onUpdateStatus: (status: Quote['status']) => void;
  onUpdateQuote: (quote: Quote) => void;
  onConvertToInvoice?: () => void;
  onIssueCreditNote?: () => void;
  onDuplicate?: () => void;
  onDelete?: () => Promise<void>;
}

export const QuoteView: React.FC<QuoteViewProps> = ({
  quote, customer, settings, onEdit, onBack, onUpdateStatus, onUpdateQuote,
  onConvertToInvoice, onIssueCreditNote, onDuplicate, onDelete
}) => {
  const [showCustomiser, setShowCustomiser] = useState(false);
  const [localDisplayOptions, setLocalDisplayOptions] = useState<QuoteDisplayOptions | null>(null);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showEmailComposer, setShowEmailComposer] = useState(false);
  const [emailPdfBase64, setEmailPdfBase64] = useState<string | undefined>();
  const [emailPdfFilename, setEmailPdfFilename] = useState<string | undefined>();
  const [isPreparingEmail, setIsPreparingEmail] = useState(false);
  const [quoteSignature, setQuoteSignature] = useState<QuoteSignature | null>(null);
  const [milestones, setMilestones] = useState<PaymentMilestone[]>([]);
  const [generatedInvoices, setGeneratedInvoices] = useState<any[]>([]);
  const [isGeneratingRecurring, setIsGeneratingRecurring] = useState(false);
  const [showOnSiteSignature, setShowOnSiteSignature] = useState(false);
  const { services, refresh, quotes: allQuotes } = useData();
  const documentRef = useRef<HTMLDivElement>(null);
  const shareMenuRef = useRef<HTMLDivElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  // Fetch signature for accepted quotes
  useEffect(() => {
    if (quote.status === 'accepted' && quote.shareToken) {
      // The signature data is returned by get_quote_by_share_token when viewing
      // For the owner view, we'll store it on the quote object if available
      if ((quote as any).signature) {
        const sig = (quote as any).signature;
        setQuoteSignature({
          id: sig.id,
          quoteId: quote.id,
          signerName: sig.signer_name || sig.signerName,
          signatureData: sig.signature_data || sig.signatureData,
          signatureType: sig.signature_type || sig.signatureType || 'draw',
          signedAt: sig.signed_at || sig.signedAt,
          createdAt: sig.created_at || sig.createdAt || sig.signed_at || sig.signedAt,
        });
      }
    }
  }, [quote]);

  // Fetch payment milestones
  useEffect(() => {
    services.paymentMilestones.getForQuote(quote.id)
      .then(setMilestones)
      .catch(err => console.warn('Failed to load milestones:', err));
  }, [quote.id, services.paymentMilestones]);

  // Fetch generated invoices for recurring templates
  useEffect(() => {
    if (quote.isRecurring) {
      services.recurringInvoices.getGeneratedInvoices(quote.id)
        .then(setGeneratedInvoices)
        .catch(err => console.warn('Failed to load generated invoices:', err));
    }
  }, [quote.id, quote.isRecurring, services.recurringInvoices]);

  // Close menus when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (shareMenuRef.current && !shareMenuRef.current.contains(event.target as Node)) {
        setShowShareMenu(false);
      }
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
        setShowMoreMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getProcessedQuote = (): Quote => {
    if (!quote) return quote;
    if ((quote as any).items) {
      return {
        ...quote,
        sections: [{
          id: 'legacy',
          title: 'Work Specification',
          items: (quote as any).items || [],
          labourHours: (quote as any).labourHours || 0
        }]
      } as Quote;
    }
    return quote;
  };

  const activeQuote = getProcessedQuote();

  if (!activeQuote) {
    return (
      <div className="flex flex-col items-center justify-center p-20 text-slate-400">
        <FileText size={48} className="mb-4 text-slate-200" />
        <p className="font-black text-sm uppercase tracking-widest italic">Document unavailable</p>
        <button onClick={onBack} className="mt-6 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest hover:text-slate-900"><ArrowLeft size={14} /> Go Back</button>
      </div>
    );
  }

  // Use local state for immediate UI feedback, fall back to quote/settings
  const FALLBACK_DISPLAY_OPTIONS: QuoteDisplayOptions = {
    showMaterials: true,
    showMaterialItems: true,
    showMaterialQty: true,
    showMaterialUnitPrice: true,
    showMaterialLineTotals: true,
    showMaterialSectionTotal: true,
    showLabour: true,
    showLabourItems: true,
    showLabourQty: true,
    showLabourUnitPrice: true,
    showLabourLineTotals: true,
    showLabourSectionTotal: true,
    showVat: true,
    showCis: false,
    showNotes: true,
    showLogo: true,
    showTotalsBreakdown: true,
    showWorkSectionTotal: true,
  };

  // Merge: fallback -> settings defaults -> quote saved -> local changes
  const baseOptions: QuoteDisplayOptions = {
    ...FALLBACK_DISPLAY_OPTIONS,
    ...settings.defaultDisplayOptions,
    ...activeQuote.displayOptions
  };
  const displayOptions: QuoteDisplayOptions = localDisplayOptions
    ? { ...baseOptions, ...localDisplayOptions }
    : baseOptions;

  const toggleOption = (optionKey: keyof QuoteDisplayOptions) => {
    const newValue = !displayOptions[optionKey];
    const updatedOptions: QuoteDisplayOptions = { ...displayOptions, [optionKey]: newValue };
    setLocalDisplayOptions(updatedOptions);
    onUpdateQuote({ ...activeQuote, displayOptions: updatedOptions });
  };

  // Use extracted calculation functions
  const totals = calculateQuoteTotals(
    activeQuote,
    {
      enableVat: settings.enableVat,
      enableCis: settings.enableCis,
      showVat: displayOptions.showVat,
      showCis: displayOptions.showCis,
      defaultLabourRate: settings.defaultLabourRate,
    },
    displayOptions
  );

  const partPaymentAmount = calculatePartPayment(
    totals.grandTotal,
    activeQuote.partPaymentEnabled,
    activeQuote.partPaymentType,
    activeQuote.partPaymentValue
  );

  const reference = buildPDFReference(activeQuote, settings);

  // Sharing hook - encapsulates all PDF/sharing/payment logic
  const sharing = useQuoteSharing({
    documentRef,
    quote: activeQuote,
    customer,
    settings,
    totals,
    displayOptions,
    onUpdateQuote,
    onUpdateStatus,
  });

  const statusColors: Record<string, string> = {
    draft: 'bg-slate-100 text-slate-600',
    sent: 'bg-blue-100 text-blue-600',
    accepted: 'bg-green-100 text-green-600',
    declined: 'bg-red-100 text-red-600',
    invoiced: 'bg-emerald-100 text-emerald-600',
    paid: 'bg-emerald-500 text-white'
  };

  const CustomiseToggle = ({ label, optionKey, activeColor }: { label: string, optionKey: keyof QuoteDisplayOptions, activeColor: string }) => (
    <button
      type="button"
      onClick={() => toggleOption(optionKey)}
      className={`flex items-center justify-between w-full px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider border transition-all active:scale-95 ${displayOptions[optionKey]
        ? `${activeColor} border-transparent shadow-sm`
        : 'bg-white text-slate-300 border-slate-100 italic opacity-60'
        }`}
    >
      <span className="truncate mr-1">{label}</span>
      {displayOptions[optionKey] ? <Eye size={8} /> : <EyeOff size={8} />}
    </button>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-4 pb-24">
      {/* Unified Header */}
      <div className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-100 p-2 flex items-center justify-between shadow-sm -mx-4 md:mx-0 print:hidden mb-4">
        <div className="flex items-center gap-2">
          <button onClick={onBack} className="p-2 -ml-2 text-slate-400 hover:text-slate-700">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">{activeQuote.type === 'invoice' ? 'Invoice' : 'Quote'} Details</h1>
        </div>
        <div className="flex gap-2">
          <button onClick={onEdit} className="p-2 bg-slate-50 text-slate-600 rounded-lg hover:bg-slate-100"><Edit3 size={18} /></button>

          {/* Share Dropdown */}
          <div className="relative" ref={shareMenuRef}>
            <button
              type="button"
              onClick={() => setShowShareMenu(!showShareMenu)}
              className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 flex items-center gap-1"
              title="Share"
            >
              <Share2 size={18} />
              <ChevronDown size={14} className={`transition-transform ${showShareMenu ? 'rotate-180' : ''}`} />
            </button>
            {showShareMenu && (
              <div className="absolute right-0 top-full mt-1 bg-white rounded-xl shadow-xl border border-slate-100 py-1 min-w-[160px] z-50">
                <button
                  onClick={async () => {
                    setShowShareMenu(false);
                    setIsPreparingEmail(true);
                    try {
                      if (documentRef.current) {
                        const filename = buildPDFFilename(activeQuote, settings);
                        const blob = await generatePDFFromElement(documentRef.current, { scale: 3 });
                        const reader = new FileReader();
                        const base64 = await new Promise<string>((resolve) => {
                          reader.onloadend = () => {
                            const result = reader.result as string;
                            resolve(result.split(',')[1]); // strip data:...;base64, prefix
                          };
                          reader.readAsDataURL(blob);
                        });
                        setEmailPdfBase64(base64);
                        setEmailPdfFilename(filename);
                      }
                    } catch (err) {
                      console.error('PDF generation for email failed:', err);
                    }
                    setIsPreparingEmail(false);
                    setShowEmailComposer(true);
                  }}
                  disabled={isPreparingEmail}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2 text-slate-700"
                >
                  {isPreparingEmail ? <Loader2 size={16} className="text-blue-500 animate-spin" /> : <Mail size={16} className="text-blue-500" />} Send Email
                </button>
                <button
                  onClick={() => { sharing.handleEmailShare(); setShowShareMenu(false); }}
                  disabled={sharing.isDownloading}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2 text-slate-700"
                >
                  <Mail size={16} className="text-slate-400" /> Email App (with PDF)
                </button>
                <button
                  onClick={() => { sharing.handleWhatsAppShare(); setShowShareMenu(false); }}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2 text-slate-700"
                >
                  <MessageCircle size={16} className="text-green-500" /> WhatsApp
                </button>
                <button
                  onClick={() => { sharing.handleSmsShare(); setShowShareMenu(false); }}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2 text-slate-700"
                >
                  <Phone size={16} className="text-sky-500" /> SMS
                </button>
                {activeQuote.type !== 'invoice' && (
                  <button
                    onClick={() => { sharing.handleCopyShareLink(); setShowShareMenu(false); }}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2 text-slate-700"
                  >
                    <Link2 size={16} className="text-violet-500" /> {activeQuote.shareToken ? 'Copy Link' : 'Get Share Link'}
                  </button>
                )}
                <div className="border-t border-slate-100 my-1" />
                <button
                  onClick={() => { sharing.handlePdfPreview(); setShowShareMenu(false); }}
                  disabled={sharing.isGeneratingPreview}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2 text-slate-700"
                >
                  <Eye size={16} className="text-purple-500" /> Preview PDF
                </button>
              </div>
            )}
          </div>

          <button onClick={sharing.handleDownloadPDF} disabled={sharing.isDownloading} className="p-2 bg-amber-50 text-amber-600 rounded-lg hover:bg-amber-100" title="Download PDF">
            {sharing.isDownloading ? <Loader2 size={18} className="animate-spin" /> : <FileDown size={18} />}
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-2 print:hidden">
        {/* Interactive Status Stepper - Tap to change status */}
        <div className="bg-white rounded-xl border border-slate-100 p-3 shadow-sm">
          <div className="flex items-center justify-between">
            {activeQuote.type !== 'invoice' ? (
              // Quote lifecycle: Draft → Sent → Accepted/Declined → Invoiced
              <>
                <div className="flex items-center gap-1 flex-1">
                  <button
                    type="button"
                    onClick={() => {
                      if (activeQuote.status !== 'draft' && confirm('Revert to Draft?')) {
                        onUpdateStatus('draft');
                        hapticSuccess();
                      }
                    }}
                    className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-bold transition-all ${
                      activeQuote.status === 'draft'
                        ? 'bg-slate-900 text-white ring-2 ring-slate-900 ring-offset-1'
                        : 'bg-slate-100 text-slate-400 hover:bg-slate-200 cursor-pointer'
                    }`}
                  >
                    <FileText size={12} />
                    <span>Draft</span>
                  </button>
                  <div className={`w-4 h-0.5 ${['sent', 'accepted', 'declined', 'invoiced'].includes(activeQuote.status) ? 'bg-blue-400' : 'bg-slate-200'}`} />
                  <button
                    type="button"
                    onClick={() => {
                      if (activeQuote.status === 'draft' && confirm('Mark as Sent?')) {
                        onUpdateStatus('sent');
                        hapticSuccess();
                      } else if (activeQuote.status !== 'sent' && activeQuote.status !== 'draft' && confirm('Revert to Sent?')) {
                        onUpdateStatus('sent');
                        hapticSuccess();
                      }
                    }}
                    className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-bold transition-all ${
                      activeQuote.status === 'sent'
                        ? 'bg-blue-500 text-white ring-2 ring-blue-500 ring-offset-1'
                        : ['accepted', 'declined', 'invoiced'].includes(activeQuote.status)
                          ? 'bg-blue-100 text-blue-600 hover:bg-blue-200 cursor-pointer'
                          : 'bg-slate-100 text-slate-400 hover:bg-slate-200 cursor-pointer'
                    }`}
                  >
                    <Share2 size={12} />
                    <span>Sent</span>
                  </button>
                  <div className={`w-4 h-0.5 ${['accepted', 'declined', 'invoiced'].includes(activeQuote.status) ? 'bg-green-400' : 'bg-slate-200'}`} />
                  <button
                    type="button"
                    onClick={() => {
                      if (['draft', 'sent'].includes(activeQuote.status) && confirm('Mark as Accepted?')) {
                        onUpdateStatus('accepted');
                        hapticSuccess();
                      } else if (activeQuote.status === 'invoiced' && confirm('Revert to Accepted?')) {
                        onUpdateStatus('accepted');
                        hapticSuccess();
                      }
                    }}
                    className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-bold transition-all ${
                      activeQuote.status === 'accepted'
                        ? 'bg-green-500 text-white ring-2 ring-green-500 ring-offset-1'
                        : activeQuote.status === 'declined'
                          ? 'bg-red-500 text-white'
                          : activeQuote.status === 'invoiced'
                            ? 'bg-green-100 text-green-600 hover:bg-green-200 cursor-pointer'
                            : 'bg-slate-100 text-slate-400 hover:bg-slate-200 cursor-pointer'
                    }`}
                  >
                    {activeQuote.status === 'declined' ? <X size={12} /> : <Check size={12} />}
                    <span>{activeQuote.status === 'declined' ? 'Declined' : 'Accepted'}</span>
                  </button>
                  <div className={`w-4 h-0.5 ${activeQuote.status === 'invoiced' ? 'bg-emerald-400' : 'bg-slate-200'}`} />
                  <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-bold ${
                    activeQuote.status === 'invoiced'
                      ? 'bg-emerald-500 text-white ring-2 ring-emerald-500 ring-offset-1'
                      : 'bg-slate-100 text-slate-400'
                  }`}>
                    <ReceiptText size={12} />
                    <span>Invoiced</span>
                  </div>
                </div>
              </>
            ) : (
              // Invoice lifecycle: Draft → Sent → Paid
              <>
                <div className="flex items-center gap-1 flex-1">
                  <button
                    type="button"
                    onClick={() => {
                      if (activeQuote.status !== 'draft' && confirm('Revert to Draft?')) {
                        onUpdateStatus('draft');
                        hapticSuccess();
                      }
                    }}
                    className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-bold transition-all ${
                      activeQuote.status === 'draft'
                        ? 'bg-slate-900 text-white ring-2 ring-slate-900 ring-offset-1'
                        : 'bg-slate-100 text-slate-400 hover:bg-slate-200 cursor-pointer'
                    }`}
                  >
                    <FileText size={12} />
                    <span>Draft</span>
                  </button>
                  <div className={`w-6 h-0.5 ${['sent', 'paid'].includes(activeQuote.status) ? 'bg-blue-400' : 'bg-slate-200'}`} />
                  <button
                    type="button"
                    onClick={() => {
                      if (activeQuote.status === 'draft' && confirm('Mark as Sent?')) {
                        onUpdateStatus('sent');
                        hapticSuccess();
                      } else if (activeQuote.status === 'paid' && confirm('Revert to Sent (Awaiting Payment)?')) {
                        onUpdateStatus('sent');
                        hapticSuccess();
                      }
                    }}
                    className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-bold transition-all ${
                      activeQuote.status === 'sent'
                        ? 'bg-blue-500 text-white ring-2 ring-blue-500 ring-offset-1'
                        : activeQuote.status === 'paid'
                          ? 'bg-blue-100 text-blue-600 hover:bg-blue-200 cursor-pointer'
                          : 'bg-slate-100 text-slate-400 hover:bg-slate-200 cursor-pointer'
                    }`}
                  >
                    <Share2 size={12} />
                    <span>Sent</span>
                  </button>
                  <div className={`w-6 h-0.5 ${activeQuote.status === 'paid' ? 'bg-emerald-400' : 'bg-slate-200'}`} />
                  <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-bold ${
                    activeQuote.status === 'paid'
                      ? 'bg-emerald-500 text-white ring-2 ring-emerald-500 ring-offset-1'
                      : 'bg-slate-100 text-slate-400'
                  }`}>
                    <Banknote size={12} />
                    <span>Paid</span>
                  </div>
                </div>
              </>
            )}
          </div>
          <p className="text-[9px] text-slate-400 mt-2 text-center">Tap any status to change</p>
        </div>

        {/* Status Action Buttons for Quotes */}
        {activeQuote.type !== 'invoice' && (
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
            {activeQuote.status === 'draft' && (
              <button
                onClick={() => {
                  onUpdateStatus('sent');
                  hapticSuccess();
                }}
                className="flex-shrink-0 flex items-center gap-2 px-2 py-1 rounded-xl bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-500/30 hover:bg-blue-600 transition-colors"
              >
                <Check size={14} /> Confirm Sent ✓
              </button>
            )}
            {activeQuote.status === 'sent' && (
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
            {activeQuote.status === 'accepted' && !activeQuote.status.includes('invoiced') && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 px-2 py-1 rounded-xl bg-green-100 text-green-700 text-xs font-bold">
                  <Check size={14} />
                  {activeQuote.acceptedAt ? (
                    <span>Accepted Online - {new Date(activeQuote.acceptedAt).toLocaleDateString('en-GB')}</span>
                  ) : (
                    <span>Accepted - Ready to Invoice</span>
                  )}
                </div>
                {quoteSignature && (
                  <SignatureDisplay signature={quoteSignature} compact />
                )}
              </div>
            )}
            {activeQuote.status === 'declined' && (
              <div className="flex items-center gap-2 px-2 py-1 rounded-xl bg-red-100 text-red-700 text-xs font-bold">
                <X size={14} />
                {activeQuote.declinedAt ? (
                  <span>Declined Online - {new Date(activeQuote.declinedAt).toLocaleDateString('en-GB')}</span>
                ) : (
                  <span>Quote Declined</span>
                )}
              </div>
            )}
          </div>
        )}

        {/* Status Action Buttons for Invoices */}
        {activeQuote.type === 'invoice' && (
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
            {activeQuote.status === 'draft' && (
              <button
                onClick={() => {
                  onUpdateStatus('sent');
                  hapticSuccess();
                }}
                className="flex-shrink-0 flex items-center gap-2 px-2 py-1 rounded-xl bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-500/30 hover:bg-blue-600 transition-colors"
              >
                <Check size={14} /> Confirm Sent ✓
              </button>
            )}
            {activeQuote.status === 'sent' && (
              <div className="flex items-center gap-2 px-2 py-1 rounded-xl bg-blue-100 text-blue-700 text-xs font-bold">
                <Clock size={14} /> Awaiting Payment
              </div>
            )}
            {activeQuote.status === 'paid' && (
              <div className="flex items-center gap-2 px-2 py-1 rounded-xl bg-emerald-100 text-emerald-700 text-xs font-bold">
                <Check size={14} /> Paid
              </div>
            )}
          </div>
        )}

        {/* Secondary Actions Row */}
        <div className="flex gap-2 overflow-visible pb-2 flex-wrap">
          {/* Share Link Button - only for quotes (not invoices) that have been sent */}
          {activeQuote.type !== 'invoice' && activeQuote.status === 'sent' && (
            <button
              onClick={sharing.handleCopyShareLink}
              className={`flex-shrink-0 flex items-center gap-2 px-2 py-1 rounded-lg text-xs font-bold shadow-sm transition-all ${
                sharing.shareLinkCopied
                  ? 'bg-green-500 text-white border-green-500'
                  : 'bg-violet-50 text-violet-600 border border-violet-100 hover:bg-violet-100'
              }`}
            >
              {sharing.shareLinkCopied ? (
                <>
                  <Check size={14} /> Link Copied!
                </>
              ) : (
                <>
                  <Link2 size={14} /> {activeQuote.shareToken ? 'Share Link' : 'Get Share Link'}
                </>
              )}
            </button>
          )}
          {activeQuote.type !== 'invoice' && onConvertToInvoice && ['draft', 'sent', 'accepted'].includes(activeQuote.status) && (
            <button onClick={onConvertToInvoice} className="flex-shrink-0 flex items-center gap-2 px-2 py-1 rounded-lg bg-emerald-50 text-emerald-600 text-xs font-bold shadow-sm border border-emerald-100">
              <ReceiptText size={14} /> To Invoice
            </button>
          )}
          {activeQuote.type === 'invoice' && activeQuote.status !== 'paid' && (
            <button
              onClick={() => sharing.setShowPaymentRecorder(true)}
              className="flex-shrink-0 flex items-center gap-2 px-2 py-1 rounded-lg bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-500/30 hover:bg-emerald-600 transition-colors"
            >
              <Banknote size={14} /> Record Payment
            </button>
          )}
          {activeQuote.type === 'invoice' && activeQuote.status === 'paid' && !activeQuote.isCreditNote && onIssueCreditNote && (
            <button
              onClick={onIssueCreditNote}
              className="flex-shrink-0 flex items-center gap-2 px-2 py-1 rounded-lg bg-red-50 text-red-600 text-xs font-bold shadow-sm border border-red-100 hover:bg-red-100 transition-colors"
            >
              <ReceiptText size={14} /> Credit Note
            </button>
          )}

          {/* On-Site Signature - show for accepted quotes/invoices */}
          {(activeQuote.status === 'accepted' || activeQuote.status === 'sent' || activeQuote.status === 'paid') && (
            <button
              onClick={() => setShowOnSiteSignature(true)}
              className="flex-shrink-0 flex items-center gap-2 px-2 py-1 rounded-lg bg-teal-50 text-teal-600 text-xs font-bold shadow-sm border border-teal-100 hover:bg-teal-100 transition-colors"
            >
              <Pen size={14} /> {quoteSignature ? 'Re-sign' : 'Get Signature'}
            </button>
          )}

          {/* More Menu - secondary actions */}
          <div className="relative" ref={moreMenuRef}>
            <button
              type="button"
              onClick={() => setShowMoreMenu(!showMoreMenu)}
              className={`flex-shrink-0 flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold shadow-sm transition-all ${
                showMoreMenu || showCustomiser
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white border border-slate-100 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <List size={14} />
              <span>More</span>
              <ChevronDown size={12} className={`transition-transform ${showMoreMenu ? 'rotate-180' : ''}`} />
            </button>
            {showMoreMenu && (
              <div className="absolute left-0 top-full mt-1 bg-white rounded-xl shadow-xl border border-slate-100 py-1 min-w-[140px] z-50">
                <button
                  onClick={() => { setShowCustomiser(!showCustomiser); setShowMoreMenu(false); }}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2 text-slate-700"
                >
                  <Settings2 size={16} className="text-slate-500" /> Layout Options
                </button>
                {onDuplicate && (
                  <button
                    onClick={() => { onDuplicate(); setShowMoreMenu(false); }}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2 text-slate-700"
                  >
                    <Copy size={16} className="text-slate-500" /> Duplicate
                  </button>
                )}
                {customer?.address && (
                  <button
                    onClick={() => { sharing.handleOpenMaps(); setShowMoreMenu(false); }}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2 text-slate-700"
                  >
                    <MapPin size={16} className="text-blue-500" /> Open Map
                  </button>
                )}
                {onDelete && (
                  <>
                    <div className="border-t border-slate-100 my-1" />
                    <button
                      onClick={async () => {
                        const docType = activeQuote.type === 'invoice' ? 'invoice' : 'quote';
                        if (confirm(`Are you sure you want to delete this ${docType}? This cannot be undone.`)) {
                          setShowMoreMenu(false);
                          await onDelete();
                        }
                      }}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-red-50 flex items-center gap-2 text-red-600"
                    >
                      <Trash2 size={16} /> Delete
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {showCustomiser && (
          <div className="bg-white p-5 rounded-[28px] border border-slate-200 shadow-2xl animate-in slide-in-from-top-4">
            {/* DEBUG: Show actual values */}
            <div className="mb-4 p-2 bg-red-50 border border-red-200 rounded-lg text-[8px] font-mono">
              <div className="font-bold text-red-600 mb-1">DEBUG VALUES:</div>
              <div>showMaterials: <span className={displayOptions.showMaterials ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>{String(displayOptions.showMaterials)}</span></div>
              <div>showMaterialItems: <span className={displayOptions.showMaterialItems ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>{String(displayOptions.showMaterialItems)}</span></div>
              <div>showLabour: <span className={displayOptions.showLabour ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>{String(displayOptions.showLabour)}</span></div>
              <div>showLabourItems: <span className={displayOptions.showLabourItems ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>{String(displayOptions.showLabourItems)}</span></div>
              <div>localDisplayOptions set: <span className={localDisplayOptions ? 'text-green-600' : 'text-red-600'}>{String(!!localDisplayOptions)}</span></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="space-y-1 bg-slate-50/50 p-2 rounded-xl border border-slate-100">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100"><Package size={12} className="text-amber-500" /><span className="text-[9px] font-black uppercase tracking-widest text-slate-700">Materials</span></div>
                <CustomiseToggle label="Show Section" optionKey="showMaterials" activeColor="bg-amber-500 text-white" />
                <div className={`space-y-1 pl-2 border-l border-slate-100 transition-all ${displayOptions.showMaterials ? 'opacity-100' : 'opacity-30 pointer-events-none'}`}>
                  <CustomiseToggle label="Detailed List" optionKey="showMaterialItems" activeColor="bg-amber-400 text-slate-900" />
                  <div className={`space-y-1 transition-all ${displayOptions.showMaterialItems ? 'opacity-100' : 'opacity-30 pointer-events-none'}`}>
                    <CustomiseToggle label="Quantities" optionKey="showMaterialQty" activeColor="bg-amber-300 text-slate-900" />
                    <CustomiseToggle label="Unit Prices" optionKey="showMaterialUnitPrice" activeColor="bg-amber-300 text-slate-900" />
                    <CustomiseToggle label="Line Totals" optionKey="showMaterialLineTotals" activeColor="bg-amber-300 text-slate-900" />
                  </div>
                  <CustomiseToggle label="Materials Total" optionKey="showMaterialSectionTotal" activeColor="bg-amber-600 text-white" />
                </div>
              </div>

              <div className="space-y-1 bg-slate-50/50 p-2 rounded-xl border border-slate-100">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100"><HardHat size={12} className="text-blue-500" /><span className="text-[9px] font-black uppercase tracking-widest text-slate-700">Labour</span></div>
                <CustomiseToggle label="Show Section" optionKey="showLabour" activeColor="bg-blue-600 text-white" />
                <div className={`space-y-1 pl-2 border-l border-slate-100 transition-all ${displayOptions.showLabour ? 'opacity-100' : 'opacity-30 pointer-events-none'}`}>
                  <CustomiseToggle label="Detailed Info" optionKey="showLabourItems" activeColor="bg-blue-400 text-slate-900" />
                  <div className={`space-y-1 transition-all ${displayOptions.showLabourItems ? 'opacity-100' : 'opacity-30 pointer-events-none'}`}>
                    <CustomiseToggle label="Hours" optionKey="showLabourQty" activeColor="bg-blue-300 text-slate-900" />
                    <CustomiseToggle label="Hourly Rate" optionKey="showLabourUnitPrice" activeColor="bg-blue-300 text-slate-900" />
                    <CustomiseToggle label="Line Totals" optionKey="showLabourLineTotals" activeColor="bg-blue-300 text-slate-900" />
                  </div>
                  <CustomiseToggle label="Labour Total" optionKey="showLabourSectionTotal" activeColor="bg-blue-600 text-white" />
                </div>
              </div>

              <div className="space-y-1 bg-slate-50/50 p-2 rounded-xl border border-slate-100">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100"><Landmark size={12} className="text-emerald-500" /><span className="text-[9px] font-black uppercase tracking-widest text-slate-700">Tax & Branding</span></div>
                <CustomiseToggle label="VAT Breakdown" optionKey="showVat" activeColor="bg-emerald-500 text-white" />
                <CustomiseToggle label="CIS Deductions" optionKey="showCis" activeColor="bg-emerald-500 text-white" />
                <CustomiseToggle label="Totals Summary" optionKey="showTotalsBreakdown" activeColor="bg-emerald-400 text-slate-900" />
                <CustomiseToggle label="Section Totals" optionKey="showWorkSectionTotal" activeColor="bg-emerald-400 text-slate-900" />
                <CustomiseToggle label="Business Logo" optionKey="showLogo" activeColor="bg-emerald-400 text-slate-900" />
                <CustomiseToggle label="Terms/Notes" optionKey="showNotes" activeColor="bg-emerald-400 text-slate-900" />
              </div>
            </div>
            {/* Done button */}
            <div className="flex justify-end mt-4 pt-3 border-t border-slate-100">
              <button
                onClick={() => setShowCustomiser(false)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold shadow-lg hover:bg-slate-800 transition-colors"
              >
                <Check size={14} /> Done
              </button>
            </div>
          </div>
        )}

        {/* react-pdf test disabled - logo rendering issues to fix */}
      </div>

      {/* Recurring Invoice Schedule */}
      {activeQuote.isRecurring && (
        <div className="print:hidden bg-white rounded-xl border border-purple-200 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <RefreshCw size={16} className="text-purple-500" />
              <span className="text-xs font-black text-purple-700 uppercase tracking-wider">Recurring Schedule</span>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-purple-100 text-purple-700">
                {activeQuote.recurringFrequency}
              </span>
            </div>
            <button
              onClick={async () => {
                setIsGeneratingRecurring(true);
                try {
                  await generateNextInvoice(activeQuote);
                  const updated = await services.recurringInvoices.getGeneratedInvoices(activeQuote.id);
                  setGeneratedInvoices(updated);
                  refresh();
                } catch (err) {
                  console.error('Failed to generate invoice:', err);
                }
                setIsGeneratingRecurring(false);
              }}
              disabled={isGeneratingRecurring}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-500 text-white rounded-lg text-xs font-bold hover:bg-purple-600 transition-colors disabled:opacity-50"
            >
              {isGeneratingRecurring ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
              Generate Now
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            {activeQuote.recurringNextDate && (
              <div className="bg-purple-50 rounded-lg p-2">
                <p className="text-[10px] text-purple-500 uppercase font-bold">Next Generation</p>
                <p className="font-bold text-purple-900">{new Date(activeQuote.recurringNextDate).toLocaleDateString('en-GB')}</p>
              </div>
            )}
            {activeQuote.recurringStartDate && (
              <div className="bg-slate-50 rounded-lg p-2">
                <p className="text-[10px] text-slate-500 uppercase font-bold">Start Date</p>
                <p className="font-bold text-slate-900">{new Date(activeQuote.recurringStartDate).toLocaleDateString('en-GB')}</p>
              </div>
            )}
            {activeQuote.recurringEndDate && (
              <div className="bg-slate-50 rounded-lg p-2">
                <p className="text-[10px] text-slate-500 uppercase font-bold">End Date</p>
                <p className="font-bold text-slate-900">{new Date(activeQuote.recurringEndDate).toLocaleDateString('en-GB')}</p>
              </div>
            )}
            <div className="bg-slate-50 rounded-lg p-2">
              <p className="text-[10px] text-slate-500 uppercase font-bold">Generated</p>
              <p className="font-bold text-slate-900">{generatedInvoices.length} invoice{generatedInvoices.length !== 1 ? 's' : ''}</p>
            </div>
          </div>

          {/* Generated invoices list */}
          {generatedInvoices.length > 0 && (
            <div className="mt-3 pt-3 border-t border-purple-100">
              <p className="text-[10px] font-bold text-purple-500 uppercase tracking-wider mb-2">Generated Invoices</p>
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {generatedInvoices.map((inv: any) => (
                  <div
                    key={inv.id}
                    className="flex items-center justify-between px-3 py-2 bg-white border border-slate-100 rounded-lg text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <FileText size={12} className="text-slate-400" />
                      <span className="font-bold text-slate-700">
                        #{(inv.reference_number || '').toString().padStart(4, '0')}
                      </span>
                      <span className="text-slate-400">
                        {new Date(inv.date || inv.created_at).toLocaleDateString('en-GB')}
                      </span>
                    </div>
                    <span className={`text-[10px] font-bold uppercase ${
                      inv.status === 'paid' ? 'text-emerald-600' :
                      inv.status === 'sent' ? 'text-blue-600' :
                      'text-slate-400'
                    }`}>
                      {inv.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Credit Note Info Banners */}
      {activeQuote.isCreditNote && activeQuote.originalInvoiceId && (() => {
        const origInv = allQuotes.find(q => q.id === activeQuote.originalInvoiceId);
        const origRef = origInv ? `${settings.invoicePrefix || 'INV-'}${(origInv.referenceNumber || 1).toString().padStart(4, '0')}` : 'Unknown';
        return (
          <div className="print:hidden p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3">
            <ReceiptText size={18} className="text-red-500 shrink-0" />
            <div>
              <p className="text-sm font-bold text-red-800">Credit Note</p>
              <p className="text-xs text-red-600">Against original invoice {origRef}{activeQuote.creditNoteReason ? ` — ${activeQuote.creditNoteReason}` : ''}</p>
            </div>
          </div>
        );
      })()}
      {activeQuote.type === 'invoice' && !activeQuote.isCreditNote && (() => {
        const linkedCreditNotes = allQuotes.filter(q => q.isCreditNote && q.originalInvoiceId === activeQuote.id);
        if (linkedCreditNotes.length === 0) return null;
        const creditTotal = linkedCreditNotes.reduce((sum, cn) => {
          return sum + getQuoteGrandTotal(cn, {
            enableVat: settings.enableVat ?? false,
            enableCis: settings.enableCis ?? false,
            defaultLabourRate: settings.defaultLabourRate ?? 0,
          });
        }, 0);
        return (
          <div className="print:hidden p-4 bg-red-50 border border-red-200 rounded-2xl">
            <div className="flex items-center gap-3">
              <ReceiptText size={18} className="text-red-500 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-bold text-red-800">{linkedCreditNotes.length} Credit Note{linkedCreditNotes.length !== 1 ? 's' : ''} Issued</p>
                <p className="text-xs text-red-600">Total credited: -£{creditTotal.toFixed(2)}</p>
              </div>
              <p className="text-lg font-black text-red-700">-£{creditTotal.toFixed(2)}</p>
            </div>
          </div>
        );
      })()}

      {/* Email History */}
      <div className="print:hidden">
        <EmailLog quoteId={quote.id} />
      </div>

      {/* Payment Milestones */}
      {milestones.length > 0 && (
        <div className="print:hidden">
          <PaymentMilestoneTracker
            milestones={milestones}
            totalAmount={totals.grandTotal}
            onMarkPaid={async (milestoneId) => {
              try {
                const updated = await services.paymentMilestones.markPaid(milestoneId);
                setMilestones(prev => prev.map(m => m.id === milestoneId ? updated : m));
              } catch (err) {
                console.error('Failed to mark milestone paid:', err);
              }
            }}
          />
        </div>
      )}

      {/* Document Preview */}
      <QuoteDocument
        quote={activeQuote}
        customer={customer}
        settings={settings}
        totals={totals}
        displayOptions={displayOptions}
        reference={reference}
        partPaymentAmount={partPaymentAmount}
        documentRef={documentRef}
      />

      <div className="flex justify-center pt-4 print:hidden">
        <div className={`px-6 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm flex items-center gap-2.5 ${statusColors[activeQuote.status || 'draft']}`}>Status: {activeQuote.status || 'draft'}</div>
      </div>

      {/* Modals */}
      {/* Email Composer Modal */}
      {showEmailComposer && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 pb-24 md:pb-4 print:hidden">
          <div className="w-full max-w-lg rounded-2xl">
            <EmailComposer
              quote={activeQuote}
              customer={customer}
              settings={settings}
              pdfBase64={emailPdfBase64}
              pdfFilename={emailPdfFilename}
              onClose={() => {
                setShowEmailComposer(false);
                setEmailPdfBase64(undefined);
                setEmailPdfFilename(undefined);
              }}
              onSent={() => {
                // Prompt mark as sent if draft
                if (activeQuote.status === 'draft') {
                  sharing.setShowMarkAsSentPrompt(true);
                }
              }}
            />
          </div>
        </div>
      )}

      {/* On-Site Signature Overlay */}
      {showOnSiteSignature && (
        <OnSiteSignature
          quoteId={activeQuote.id}
          customerName={customer?.name || 'Customer'}
          onComplete={(signature) => {
            setQuoteSignature(signature);
            setShowOnSiteSignature(false);
          }}
          onClose={() => setShowOnSiteSignature(false)}
        />
      )}

      <QuoteModals
        quote={activeQuote}
        totals={totals}
        showPaymentRecorder={sharing.showPaymentRecorder}
        onRecordPayment={sharing.handleRecordPayment}
        onClosePaymentRecorder={() => sharing.setShowPaymentRecorder(false)}
        emailHelper={sharing.emailHelper}
        onSetEmailHelper={sharing.setEmailHelper}
        showMarkAsSentPrompt={sharing.showMarkAsSentPrompt}
        onCloseMarkAsSent={() => sharing.setShowMarkAsSentPrompt(false)}
        onUpdateStatus={onUpdateStatus}
        showPdfPreview={sharing.showPdfPreview}
        pdfPreviewUrl={sharing.pdfPreviewUrl}
        isDownloading={sharing.isDownloading}
        onDownloadPDF={sharing.handleDownloadPDF}
        onClosePdfPreview={() => {
          sharing.setShowPdfPreview(false);
          if (sharing.pdfPreviewUrl) {
            URL.revokeObjectURL(sharing.pdfPreviewUrl);
            sharing.setPdfPreviewUrl(null);
          }
        }}
      />
    </div>
  );
};
