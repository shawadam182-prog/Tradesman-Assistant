import React, { useState, useEffect } from 'react';
import { quotesService } from '../services/dataService';
import { supabase } from '../lib/supabase';
import {
  Check, X, Loader2, FileText, Building2, User, Calendar,
  Phone, Mail, MapPin, AlertCircle, CheckCircle2, XCircle,
  Clock, Shield, ChevronDown, ChevronUp, Banknote
} from 'lucide-react';
import { SignaturePad, SignatureDisplay } from '../../components/signature';
import type { QuoteSignature } from '../../types';

interface PublicQuoteViewProps {
  shareToken: string;
}

interface QuoteData {
  id: string;
  title: string;
  type: 'estimate' | 'quotation' | 'invoice';
  status: string;
  date: string;
  due_date?: string;
  sections: any[];
  labour_rate: number;
  markup_percent: number;
  tax_percent: number;
  cis_percent: number;
  notes?: string;
  display_options?: any;
  reference_number?: number;
  job_address?: string;
  discount_type?: string;
  discount_value?: number;
  discount_description?: string;
  part_payment_enabled?: boolean;
  part_payment_type?: string;
  part_payment_value?: number;
  part_payment_label?: string;
  accepted_at?: string;
  declined_at?: string;
}

interface CompanyData {
  name: string;
  address: string;
  logo_path: string;
  phone: string;
  email: string;
  footer_logos: string[];
}

interface CustomerData {
  id: string;
  name: string;
  company?: string;
}

export const PublicQuoteView: React.FC<PublicQuoteViewProps> = ({ shareToken }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quote, setQuote] = useState<QuoteData | null>(null);
  const [company, setCompany] = useState<CompanyData | null>(null);
  const [customer, setCustomer] = useState<CustomerData | null>(null);
  const [responding, setResponding] = useState(false);
  const [responseComplete, setResponseComplete] = useState<'accepted' | 'declined' | null>(null);
  const [showDetails, setShowDetails] = useState(true);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const [existingSignature, setExistingSignature] = useState<QuoteSignature | null>(null);
  const [milestones, setMilestones] = useState<Array<{ label: string; percentage?: number; fixedAmount?: number; dueDate?: string; status: string }>>([]);

  useEffect(() => {
    loadQuote();
  }, [shareToken]);

  const loadQuote = async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await quotesService.getByShareToken(shareToken);

      if (!result.success) {
        setError(result.error || 'Quote not found');
        return;
      }

      setQuote(result.quote);
      setCompany(result.company || null);
      setCustomer(result.customer || null);

      // Load company logo if available
      if (result.company?.logo_path) {
        try {
          const { data } = await supabase.storage
            .from('logos')
            .createSignedUrl(result.company.logo_path, 3600);
          if (data?.signedUrl) {
            setLogoUrl(data.signedUrl);
          }
        } catch (e) {
          console.warn('Failed to load logo:', e);
        }
      }

      // Load existing signature if present
      if (result.signature) {
        setExistingSignature({
          id: result.signature.id,
          quoteId: result.quote?.id || '',
          signerName: result.signature.signer_name,
          signatureData: result.signature.signature_data,
          signatureType: (result.signature.signature_type as 'draw' | 'type') || 'draw',
          signedAt: result.signature.signed_at,
          createdAt: result.signature.signed_at,
        });
      }

      // Load payment milestones for this quote (may return empty if RLS blocks anon)
      if (result.quote?.id) {
        try {
          const { data: msData } = await (supabase as any)
            .from('payment_milestones')
            .select('label, percentage, fixed_amount, due_date, status, sort_order')
            .eq('quote_id', result.quote.id)
            .order('sort_order');
          if (msData && msData.length > 0) {
            setMilestones(msData.map((m: any) => ({
              label: m.label,
              percentage: m.percentage != null ? Number(m.percentage) : undefined,
              fixedAmount: m.fixed_amount != null ? Number(m.fixed_amount) : undefined,
              dueDate: m.due_date || undefined,
              status: m.status || 'pending',
            })));
          }
        } catch {
          // Silently ignore — RLS may block anon access
        }
      }

      // Check if already responded
      if (result.quote?.accepted_at) {
        setResponseComplete('accepted');
      } else if (result.quote?.declined_at) {
        setResponseComplete('declined');
      }
    } catch (err) {
      console.error('Error loading quote:', err);
      setError('Failed to load quote. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResponse = async (
    response: 'accepted' | 'declined',
    signatureData?: { signatureData: string; signerName: string; signatureType: 'draw' | 'type' }
  ) => {
    if (!quote || responding) return;

    setResponding(true);
    try {
      const result = await quotesService.respondToQuote(shareToken, response, signatureData);

      if (result.success) {
        setResponseComplete(response);
        setShowSignaturePad(false);
        await loadQuote();
      } else {
        setError(result.error || 'Failed to submit response');
      }
    } catch (err) {
      console.error('Error responding to quote:', err);
      setError('Failed to submit your response. Please try again.');
    } finally {
      setResponding(false);
    }
  };

  const handleAcceptClick = () => {
    setShowSignaturePad(true);
  };

  const handleSignatureComplete = (data: { signatureData: string; signerName: string; signatureType: 'draw' | 'type' }) => {
    handleResponse('accepted', data);
  };

  // Calculate totals
  const calculateTotals = () => {
    if (!quote) return { subtotal: 0, tax: 0, discount: 0, total: 0 };

    const markupMultiplier = 1 + ((quote.markup_percent || 0) / 100);
    let subtotal = 0;

    (quote.sections || []).forEach(section => {
      // Materials
      const materialsTotal = (section.items || []).reduce((sum: number, item: any) => {
        if (item.isHeading) return sum;
        return sum + (item.totalPrice || 0);
      }, 0);

      // Labour
      const labourTotal = (section.labourHours || 0) * (section.labourRate || quote.labour_rate || 0);

      subtotal += (materialsTotal + labourTotal) * markupMultiplier;
    });

    // Apply discount
    let discount = 0;
    if (quote.discount_value) {
      if (quote.discount_type === 'percentage') {
        discount = subtotal * (quote.discount_value / 100);
      } else {
        discount = quote.discount_value;
      }
    }

    const afterDiscount = subtotal - discount;
    const tax = quote.display_options?.showVat ? afterDiscount * ((quote.tax_percent || 0) / 100) : 0;
    const total = afterDiscount + tax;

    return { subtotal, tax, discount, total };
  };

  const totals = calculateTotals();

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-teal-500 animate-spin mx-auto mb-4" />
          <p className="text-slate-600 font-medium">Loading your quote...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !quote) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">Quote Not Found</h1>
          <p className="text-slate-600 mb-6">
            {error || 'This quote link may have expired or is no longer available.'}
          </p>
          <p className="text-sm text-slate-400">
            Please contact the sender for a new link.
          </p>
        </div>
      </div>
    );
  }

  // Success response screen
  if (responseComplete) {
    const isAccepted = responseComplete === 'accepted';
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className={`w-20 h-20 ${isAccepted ? 'bg-green-100' : 'bg-red-100'} rounded-full flex items-center justify-center mx-auto mb-6`}>
            {isAccepted ? (
              <CheckCircle2 className="w-10 h-10 text-green-500" />
            ) : (
              <XCircle className="w-10 h-10 text-red-500" />
            )}
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">
            {isAccepted ? 'Quote Accepted!' : 'Quote Declined'}
          </h1>
          <p className="text-slate-600 mb-6">
            {isAccepted
              ? `Thank you for accepting this quote. ${company?.name || 'The contractor'} has been notified and will be in touch shortly.`
              : `You have declined this quote. ${company?.name || 'The contractor'} has been notified.`
            }
          </p>

          {/* Quote summary */}
          <div className="bg-slate-50 rounded-xl p-4 text-left mb-6">
            <p className="text-sm text-slate-500 mb-1">Quote Reference</p>
            <p className="font-bold text-slate-900">{quote.title}</p>
            <p className="text-sm text-slate-600 mt-2">
              Total: <span className="font-bold">£{totals.total.toFixed(2)}</span>
            </p>
          </div>

          {/* Show signature on accepted quotes */}
          {isAccepted && existingSignature && (
            <div className="mb-6">
              <SignatureDisplay signature={existingSignature} />
            </div>
          )}

          {company && (
            <div className="text-sm text-slate-500">
              <p className="font-medium text-slate-700">{company.name}</p>
              {company.phone && <p>{company.phone}</p>}
              {company.email && <p>{company.email}</p>}
            </div>
          )}
        </div>
      </div>
    );
  }

  const docType = quote.type === 'invoice' ? 'Invoice' : 'Quote';
  const canRespond = quote.status === 'sent' && quote.type !== 'invoice';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header Card */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden mb-6">
          {/* Company Header */}
          <div className="bg-gradient-to-r from-slate-800 to-slate-900 text-white p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt={company?.name || 'Company'}
                    className="h-14 w-14 object-contain bg-white rounded-lg p-1"
                  />
                ) : (
                  <div className="w-14 h-14 bg-white/10 rounded-lg flex items-center justify-center">
                    <Building2 className="w-7 h-7 text-white/70" />
                  </div>
                )}
                <div>
                  <h1 className="text-xl font-bold">{company?.name || 'Business'}</h1>
                  {company?.phone && (
                    <p className="text-white/70 text-sm flex items-center gap-1 mt-1">
                      <Phone size={12} /> {company.phone}
                    </p>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-white/50 uppercase tracking-wider">{docType}</div>
                <div className="text-2xl font-bold">£{totals.total.toFixed(2)}</div>
              </div>
            </div>
          </div>

          {/* Quote Details */}
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">{quote.title}</h2>
                {quote.reference_number && (
                  <p className="text-sm text-slate-500">Ref: #{quote.reference_number.toString().padStart(4, '0')}</p>
                )}
              </div>
              <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                quote.status === 'sent' ? 'bg-blue-100 text-blue-700' :
                quote.status === 'accepted' ? 'bg-green-100 text-green-700' :
                quote.status === 'declined' ? 'bg-red-100 text-red-700' :
                'bg-slate-100 text-slate-700'
              }`}>
                {quote.status === 'sent' ? 'Awaiting Response' :
                 quote.status === 'accepted' ? 'Accepted' :
                 quote.status === 'declined' ? 'Declined' :
                 quote.status.charAt(0).toUpperCase() + quote.status.slice(1)}
              </div>
            </div>

            {/* Customer Info */}
            {customer && (
              <div className="flex items-center gap-2 text-sm text-slate-600 mb-4">
                <User size={14} className="text-slate-400" />
                <span>Prepared for: <strong>{customer.name}</strong></span>
                {customer.company && <span className="text-slate-400">({customer.company})</span>}
              </div>
            )}

            {/* Date */}
            <div className="flex items-center gap-2 text-sm text-slate-600 mb-4">
              <Calendar size={14} className="text-slate-400" />
              <span>Date: {quote.date ? new Date(quote.date).toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
              }) : 'N/A'}</span>
            </div>

            {/* Job Address if different */}
            {quote.job_address && (
              <div className="flex items-start gap-2 text-sm text-slate-600 mb-4">
                <MapPin size={14} className="text-slate-400 mt-0.5" />
                <span>Job Location: {quote.job_address}</span>
              </div>
            )}
          </div>
        </div>

        {/* Work Details - Collapsible */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden mb-6">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="w-full px-6 py-4 flex items-center justify-between bg-slate-50 hover:bg-slate-100 transition-colors"
          >
            <span className="font-bold text-slate-900">Work Breakdown</span>
            {showDetails ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>

          {showDetails && (
            <div className="p-6">
              {(quote.sections || []).map((section, idx) => {
                const markupMultiplier = 1 + ((quote.markup_percent || 0) / 100);
                const materialsTotal = (section.items || []).reduce((sum: number, item: any) => {
                  if (item.isHeading) return sum;
                  return sum + (item.totalPrice || 0);
                }, 0) * markupMultiplier;
                const labourTotal = (section.labourHours || 0) * (section.labourRate || quote.labour_rate || 0) * markupMultiplier;
                const sectionTotal = materialsTotal + labourTotal;

                return (
                  <div key={idx} className={`${idx > 0 ? 'mt-6 pt-6 border-t border-slate-100' : ''}`}>
                    <h3 className="font-bold text-slate-900 mb-2">{section.title || 'Work Section'}</h3>
                    {section.description && (
                      <p className="text-sm text-slate-600 mb-3">{section.description}</p>
                    )}

                    {/* Materials */}
                    {materialsTotal > 0 && (
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-slate-600">Materials</span>
                        <span className="font-medium">£{materialsTotal.toFixed(2)}</span>
                      </div>
                    )}

                    {/* Labour */}
                    {labourTotal > 0 && (
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-slate-600">
                          Labour {section.labourHours && `(${section.labourHours} hrs)`}
                        </span>
                        <span className="font-medium">£{labourTotal.toFixed(2)}</span>
                      </div>
                    )}

                    {/* Section Total */}
                    <div className="flex justify-between text-sm font-bold mt-2 pt-2 border-t border-slate-100">
                      <span className="text-slate-700">Section Total</span>
                      <span className="text-slate-900">£{sectionTotal.toFixed(2)}</span>
                    </div>
                  </div>
                );
              })}

              {/* Grand Total */}
              <div className="mt-6 pt-4 border-t-2 border-slate-200">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-600">Subtotal</span>
                  <span>£{totals.subtotal.toFixed(2)}</span>
                </div>

                {totals.discount > 0 && (
                  <div className="flex justify-between text-sm mb-1 text-green-600">
                    <span>Discount {quote.discount_description && `(${quote.discount_description})`}</span>
                    <span>-£{totals.discount.toFixed(2)}</span>
                  </div>
                )}

                {totals.tax > 0 && (
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-600">VAT ({quote.tax_percent}%)</span>
                    <span>£{totals.tax.toFixed(2)}</span>
                  </div>
                )}

                <div className="flex justify-between text-lg font-bold mt-2 pt-2 border-t border-slate-200">
                  <span className="text-slate-900">Total</span>
                  <span className="text-slate-900">£{totals.total.toFixed(2)}</span>
                </div>

                {/* Part Payment */}
                {quote.part_payment_enabled && quote.part_payment_value && (
                  <div className="mt-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
                    <div className="flex justify-between text-sm">
                      <span className="text-amber-800 font-medium">
                        {quote.part_payment_label || 'Deposit Required'}
                      </span>
                      <span className="text-amber-900 font-bold">
                        £{(quote.part_payment_type === 'percentage'
                          ? totals.total * (quote.part_payment_value / 100)
                          : quote.part_payment_value
                        ).toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Notes */}
        {quote.notes && (
          <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
            <h3 className="font-bold text-slate-900 mb-2">Notes & Terms</h3>
            <p className="text-sm text-slate-600 whitespace-pre-wrap">{quote.notes}</p>
          </div>
        )}

        {/* Payment Schedule */}
        {milestones.length > 0 && (
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden mb-6">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
              <Banknote size={16} className="text-blue-600" />
              <h3 className="font-bold text-slate-900">Payment Schedule</h3>
            </div>
            <div className="p-6 space-y-3">
              {milestones.map((ms, idx) => {
                const amount = ms.fixedAmount || (ms.percentage ? ms.percentage / 100 * totals.total : 0);
                return (
                  <div key={idx} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-b-0">
                    <div>
                      <p className="text-sm font-medium text-slate-900">{ms.label}</p>
                      {ms.dueDate && (
                        <p className="text-xs text-slate-500">Due: {new Date(ms.dueDate).toLocaleDateString('en-GB')}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-slate-900">£{amount.toFixed(2)}</p>
                      {ms.percentage && <p className="text-xs text-slate-400">({ms.percentage}%)</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Signature Pad (shown when accepting) */}
        {showSignaturePad && canRespond && (
          <div className="mb-6">
            <SignaturePad
              onComplete={handleSignatureComplete}
              onCancel={() => setShowSignaturePad(false)}
              defaultName={customer?.name || ''}
            />
            {responding && (
              <div className="flex items-center justify-center gap-2 mt-4 text-slate-600">
                <Loader2 size={16} className="animate-spin" />
                <span className="text-sm">Submitting your acceptance...</span>
              </div>
            )}
          </div>
        )}

        {/* Response Buttons */}
        {canRespond && !showSignaturePad && (
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <h3 className="font-bold text-slate-900 mb-2 text-center">Your Response</h3>
            <p className="text-sm text-slate-600 text-center mb-6">
              Please review the quote above and accept or decline.
            </p>

            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => handleResponse('declined')}
                disabled={responding}
                className="flex items-center justify-center gap-2 py-4 px-6 rounded-xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200 transition-colors disabled:opacity-50"
              >
                {responding ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : (
                  <>
                    <X size={20} />
                    Decline
                  </>
                )}
              </button>

              <button
                onClick={handleAcceptClick}
                disabled={responding}
                className="flex items-center justify-center gap-2 py-4 px-6 rounded-xl bg-green-500 text-white font-bold hover:bg-green-600 transition-colors shadow-lg shadow-green-500/30 disabled:opacity-50"
              >
                {responding ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : (
                  <>
                    <Check size={20} />
                    Accept Quote
                  </>
                )}
              </button>
            </div>

            <p className="text-xs text-slate-400 text-center mt-4 flex items-center justify-center gap-1">
              <Shield size={12} />
              Your response is secure and will be recorded
            </p>
          </div>
        )}

        {/* Already responded message */}
        {quote.status !== 'sent' && quote.type !== 'invoice' && (
          <div className="space-y-4">
            <div className={`rounded-2xl p-6 text-center ${
              quote.status === 'accepted' ? 'bg-green-50 border border-green-200' :
              quote.status === 'declined' ? 'bg-red-50 border border-red-200' :
              'bg-slate-50 border border-slate-200'
            }`}>
              <p className={`font-medium ${
                quote.status === 'accepted' ? 'text-green-700' :
                quote.status === 'declined' ? 'text-red-700' :
                'text-slate-700'
              }`}>
                {quote.status === 'accepted' ? 'This quote has been accepted.' :
                 quote.status === 'declined' ? 'This quote has been declined.' :
                 `This quote is currently ${quote.status}.`}
              </p>
            </div>

            {/* Show signature on accepted quotes */}
            {quote.status === 'accepted' && existingSignature && (
              <SignatureDisplay signature={existingSignature} />
            )}
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-xs text-slate-400">
            Powered by <span className="font-semibold">TradeSync</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default PublicQuoteView;
