import { supabase } from '../lib/supabase';
import type { Quote } from '../../types';

/**
 * Calculates the next invoice date based on frequency.
 */
export function getNextDate(currentDate: string, frequency: string): string {
  const date = new Date(currentDate);
  switch (frequency) {
    case 'weekly':
      date.setDate(date.getDate() + 7);
      break;
    case 'fortnightly':
      date.setDate(date.getDate() + 14);
      break;
    case 'monthly':
      date.setMonth(date.getMonth() + 1);
      break;
    case 'quarterly':
      date.setMonth(date.getMonth() + 3);
      break;
    case 'annually':
      date.setFullYear(date.getFullYear() + 1);
      break;
  }
  return date.toISOString().split('T')[0];
}

/**
 * Deep-clone a recurring template into a new standalone invoice.
 * Snapshots all values at generation time (reviewer recommendation).
 */
export async function generateNextInvoice(templateQuote: Quote): Promise<Quote | null> {
  if (!templateQuote.isRecurring || !templateQuote.recurringFrequency) return null;

  const user = (await supabase.auth.getUser()).data.user;
  if (!user) throw new Error('Not authenticated');

  // Get next reference number
  const { data: refNum } = await supabase.rpc('get_next_reference_number', {
    p_user_id: user.id,
    p_type: 'invoice',
  });

  const today = new Date().toISOString().split('T')[0];
  const dueDate = templateQuote.dueDate
    ? (() => {
        // Preserve the same offset from invoice date to due date
        const origDate = new Date(templateQuote.date);
        const origDue = new Date(templateQuote.dueDate);
        const diffDays = Math.ceil((origDue.getTime() - origDate.getTime()) / (1000 * 60 * 60 * 24));
        const newDue = new Date();
        newDue.setDate(newDue.getDate() + diffDays);
        return newDue.toISOString().split('T')[0];
      })()
    : undefined;

  // Deep clone — snapshot ALL values
  const { data, error } = await supabase
    .from('quotes')
    .insert({
      user_id: user.id,
      customer_id: templateQuote.customerId || null,
      job_pack_id: templateQuote.projectId || null,
      title: templateQuote.title,
      type: 'invoice',
      status: 'draft',
      date: today,
      sections: JSON.parse(JSON.stringify(templateQuote.sections)),
      labour_rate: templateQuote.labourRate,
      markup_percent: templateQuote.markupPercent,
      tax_percent: templateQuote.taxPercent,
      cis_percent: templateQuote.cisPercent,
      notes: templateQuote.notes || null,
      display_options: templateQuote.displayOptions as any,
      reference_number: refNum,
      due_date: dueDate || null,
      discount_type: templateQuote.discountType || null,
      discount_value: templateQuote.discountValue ?? null,
      discount_description: templateQuote.discountDescription || null,
      part_payment_enabled: templateQuote.partPaymentEnabled || false,
      part_payment_type: templateQuote.partPaymentType || null,
      part_payment_value: templateQuote.partPaymentValue ?? null,
      part_payment_label: templateQuote.partPaymentLabel || null,
      job_address: templateQuote.jobAddress || null,
      // Link back to the recurring parent
      recurring_parent_id: templateQuote.id,
    })
    .select()
    .single();

  if (error) throw error;

  // Update the template's next date
  const nextDate = getNextDate(
    templateQuote.recurringNextDate || today,
    templateQuote.recurringFrequency
  );

  // Check if we've passed the end date
  const shouldContinue = !templateQuote.recurringEndDate ||
    new Date(nextDate) <= new Date(templateQuote.recurringEndDate);

  await supabase
    .from('quotes')
    .update({
      recurring_next_date: shouldContinue ? nextDate : null,
      is_recurring: shouldContinue, // Auto-disable if past end date
    })
    .eq('id', templateQuote.id);

  return data;
}

export const recurringInvoiceService = {
  getNextDate,
  generateNextInvoice,

  /** Get all recurring invoice templates for the current user */
  async getRecurringTemplates(): Promise<Quote[]> {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('quotes')
      .select('*')
      .eq('user_id', user.id)
      .eq('type', 'invoice')
      .eq('is_recurring', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  /** Get generated invoices from a recurring parent */
  async getGeneratedInvoices(parentId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('quotes')
      .select('id, title, reference_number, date, status, created_at')
      .eq('recurring_parent_id', parentId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },
};
