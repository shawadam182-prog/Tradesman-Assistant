import { supabase } from '../lib/supabase';
import type { EmailLogEntry } from '../../types';

// email_log table not yet in generated types
const emailLogTable = () => (supabase as any).from('email_log');

function toEmailLogEntry(row: any): EmailLogEntry {
  return {
    id: row.id,
    userId: row.user_id,
    quoteId: row.quote_id || undefined,
    recipientEmail: row.recipient_email,
    templateType: row.template_type || undefined,
    subject: row.subject,
    status: row.status,
    resendMessageId: row.resend_message_id || undefined,
    errorMessage: row.error_message || undefined,
    retryCount: row.retry_count ?? 0,
    maxRetries: row.max_retries ?? 3,
    nextRetryAt: row.next_retry_at || undefined,
    sentAt: row.sent_at || undefined,
    openedAt: row.opened_at || undefined,
    createdAt: row.created_at,
  };
}

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  fromName?: string;
  replyTo?: string;
  attachmentBase64?: string;
  attachmentFilename?: string;
  quoteId?: string;
  templateType?: string;
  companyDocumentIds?: string[];
}

export const emailService = {
  async send(params: SendEmailParams): Promise<{ success: boolean; messageId?: string; logId?: string; error?: string }> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    // Check attachment size before sending — Supabase edge functions have ~6MB body limit
    if (params.attachmentBase64) {
      const sizeMB = (params.attachmentBase64.length * 3 / 4) / (1024 * 1024);
      if (sizeMB > 5) {
        throw new Error(`PDF attachment too large (${sizeMB.toFixed(1)}MB). Please try "Share with app" instead, or regenerate the PDF.`);
      }
    }

    const response = await supabase.functions.invoke('send-email', {
      body: {
        to: params.to,
        subject: params.subject,
        html: params.html,
        from_name: params.fromName,
        reply_to: params.replyTo,
        attachment_base64: params.attachmentBase64,
        attachment_filename: params.attachmentFilename,
        quote_id: params.quoteId,
        template_type: params.templateType,
        company_document_ids: params.companyDocumentIds,
      },
    });

    if (response.error) {
      // Try to extract detailed error from the response data
      const detail = response.data?.error || response.data?.details || '';
      const message = response.error.message || 'Failed to send email';
      throw new Error(detail ? `${message}: ${typeof detail === 'string' ? detail : JSON.stringify(detail)}` : message);
    }

    return response.data;
  },

  async retry(logId: string): Promise<void> {
    // Fetch the original log entry and re-send
    const { data: log, error } = await emailLogTable()
      .select('*')
      .eq('id', logId)
      .single();
    if (error) throw error;
    if (!log) throw new Error('Email log not found');

    // Reset retry status
    await emailLogTable()
      .update({ status: 'pending', retry_count: (log.retry_count || 0) + 1 })
      .eq('id', logId);

    // Re-invoke the send function
    await supabase.functions.invoke('send-email', {
      body: {
        to: log.recipient_email,
        subject: log.subject,
        html: log.html || '<p>Retry of previous email</p>',
        quote_id: log.quote_id,
        template_type: log.template_type,
      },
    });
  },

  async getLogForQuote(quoteId: string): Promise<EmailLogEntry[]> {
    const { data, error } = await emailLogTable()
      .select('*')
      .eq('quote_id', quoteId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(toEmailLogEntry);
  },

  async getLogForQuotes(quoteIds: string[]): Promise<EmailLogEntry[]> {
    if (quoteIds.length === 0) return [];
    const { data, error } = await emailLogTable()
      .select('*')
      .in('quote_id', quoteIds)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(toEmailLogEntry);
  },

  async getLatestStatus(quoteId: string): Promise<EmailLogEntry | null> {
    const { data, error } = await emailLogTable()
      .select('*')
      .eq('quote_id', quoteId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data ? toEmailLogEntry(data) : null;
  },
};
