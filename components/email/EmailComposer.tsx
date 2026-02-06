import React, { useState, useEffect } from 'react';
import { X, Send, Paperclip, FileText, Loader2 } from 'lucide-react';
import { emailService } from '../../src/services/emailService';
import { emailTemplateService } from '../../src/services/emailTemplateService';
import type { Quote, Customer, AppSettings } from '../../types';

interface EmailComposerProps {
  quote: Quote;
  customer: Customer | null;
  settings: AppSettings;
  pdfBase64?: string;
  pdfFilename?: string;
  onClose: () => void;
  onSent?: () => void;
}

export const EmailComposer: React.FC<EmailComposerProps> = ({
  quote,
  customer,
  settings,
  pdfBase64,
  pdfFilename,
  onClose,
  onSent,
}) => {
  const [to, setTo] = useState(customer?.email || '');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [attachPdf, setAttachPdf] = useState(!!pdfBase64);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  // Load and render template
  useEffect(() => {
    const loadTemplate = async () => {
      try {
        const templateType = quote.type === 'invoice' ? 'invoice_send' : 'quote_send';
        const template = await emailTemplateService.getByType(templateType);
        if (!template) return;

        const docType = quote.type === 'invoice' ? 'Invoice' : quote.type === 'quotation' ? 'Quote' : 'Estimate';
        const bankInfo = [settings.bankName, settings.bankAccountName, settings.bankSortCode, settings.bankAccountNumber].filter(Boolean).join(' | ');
        const variables: Record<string, string> = {
          customer_name: customer?.name || 'Customer',
          company_name: settings.companyName || 'Our Company',
          company_phone: settings.phone || '',
          company_email: settings.email || '',
          project_title: quote.title || 'Project',
          doc_type: docType,
          reference: quote.referenceNumber?.toString() || '',
          total_amount: `£${(quote.sections || []).reduce((s, sec) => s + sec.items.filter(i => !i.isHeading).reduce((t, i) => t + i.totalPrice, 0), 0).toFixed(2)}`,
          part_payment: quote.partPaymentEnabled ? 'true' : '',
          part_payment_amount: quote.partPaymentValue ? `£${quote.partPaymentValue}` : '',
          due_date: quote.dueDate || '',
          payment_instructions: bankInfo || '',
        };

        setSubject(emailTemplateService.renderTemplate(template.subject, variables));
        setBody(emailTemplateService.renderTemplate(template.body, variables));
      } catch (err) {
        // Fallback to basic content
        const docType = quote.type === 'invoice' ? 'Invoice' : 'Quote';
        setSubject(`${docType} from ${settings.companyName || 'Us'} - ${quote.title || ''}`);
        setBody(`Hi ${customer?.name || 'there'},\n\nPlease find attached your ${docType.toLowerCase()}.\n\nKind regards,\n${settings.companyName || ''}`);
      }
    };
    loadTemplate();
  }, [quote, customer, settings]);

  const handleSend = async () => {
    if (!to.trim()) {
      setError('Recipient email is required');
      return;
    }
    if (!subject.trim()) {
      setError('Subject is required');
      return;
    }

    setSending(true);
    setError('');
    try {
      // Convert body to basic HTML
      const html = body.split('\n').map(line => line.trim() ? `<p>${line}</p>` : '<br>').join('\n');

      await emailService.send({
        to: to.trim(),
        subject: subject.trim(),
        html,
        fromName: settings.companyName || undefined,
        replyTo: settings.email || undefined,
        attachmentBase64: attachPdf ? pdfBase64 : undefined,
        attachmentFilename: attachPdf ? pdfFilename : undefined,
        quoteId: quote.id,
        templateType: quote.type === 'invoice' ? 'invoice_send' : 'quote_send',
      });

      setSent(true);
      onSent?.();
    } catch (err: any) {
      setError(err.message || 'Failed to send email');
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="p-8 text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Send size={24} className="text-emerald-600" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">Email Sent!</h3>
          <p className="text-sm text-slate-500 mt-1">Your {quote.type || 'document'} has been sent to {to}</p>
          <button
            onClick={onClose}
            className="mt-4 px-6 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]">
      {/* Header */}
      <div className="bg-blue-600 text-white p-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Send size={20} />
          <h3 className="text-lg font-bold">Send Email</h3>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-blue-500 rounded-lg transition-colors">
          <X size={20} />
        </button>
      </div>

      <div className="p-4 space-y-3 overflow-y-auto flex-1 min-h-0">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>
        )}

        {/* To */}
        <div>
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">To</label>
          <input
            type="email"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="customer@example.com"
            className="w-full mt-1 px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Subject */}
        <div>
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Subject</label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full mt-1 px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Body */}
        <div>
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Message</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={6}
            className="w-full mt-1 px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          />
        </div>

        {/* Attachment toggle */}
        {pdfBase64 && (
          <button
            onClick={() => setAttachPdf(!attachPdf)}
            className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border transition-colors w-full text-left ${
              attachPdf
                ? 'bg-blue-50 border-blue-200 text-blue-700'
                : 'bg-slate-50 border-slate-200 text-slate-500'
            }`}
          >
            <Paperclip size={16} />
            <div className="flex-1">
              <span className="text-sm font-bold">{attachPdf ? 'PDF Attached' : 'Attach PDF'}</span>
              {pdfFilename && <p className="text-[10px] opacity-70">{pdfFilename}</p>}
            </div>
            <FileText size={16} />
          </button>
        )}
      </div>

      {/* Actions — pinned at bottom */}
      <div className="p-4 pb-6 border-t border-slate-100 flex gap-3 shrink-0">
        <button
          onClick={onClose}
          className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-200 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSend}
          disabled={sending || !to.trim()}
          className="flex-1 flex items-center justify-center gap-2 py-3 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/30 disabled:opacity-50"
        >
          {sending ? (
            <><Loader2 size={16} className="animate-spin" />Sending...</>
          ) : (
            <><Send size={16} />Send Email</>
          )}
        </button>
      </div>
    </div>
  );
};
