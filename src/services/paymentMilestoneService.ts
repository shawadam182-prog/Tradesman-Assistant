import { supabase } from '../lib/supabase';
import type { PaymentMilestone } from '../../types';

// payment_milestones table not yet in generated types
const milestonesTable = () => (supabase as any).from('payment_milestones');

function toPaymentMilestone(row: any): PaymentMilestone {
  return {
    id: row.id,
    quoteId: row.quote_id,
    userId: row.user_id,
    label: row.label,
    percentage: row.percentage != null ? Number(row.percentage) : undefined,
    fixedAmount: row.fixed_amount != null ? Number(row.fixed_amount) : undefined,
    dueDate: row.due_date || undefined,
    status: row.status || 'pending',
    invoiceId: row.invoice_id || undefined,
    paidAt: row.paid_at || undefined,
    sortOrder: row.sort_order ?? 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const paymentMilestoneService = {
  async getForQuote(quoteId: string): Promise<PaymentMilestone[]> {
    const { data, error } = await milestonesTable()
      .select('*')
      .eq('quote_id', quoteId)
      .order('sort_order');
    if (error) throw error;
    return (data || []).map(toPaymentMilestone);
  },

  async create(milestone: {
    quoteId: string;
    label: string;
    percentage?: number;
    fixedAmount?: number;
    dueDate?: string;
    sortOrder?: number;
  }): Promise<PaymentMilestone> {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await milestonesTable()
      .insert({
        quote_id: milestone.quoteId,
        user_id: user.id,
        label: milestone.label,
        percentage: milestone.percentage ?? null,
        fixed_amount: milestone.fixedAmount ?? null,
        due_date: milestone.dueDate ?? null,
        sort_order: milestone.sortOrder ?? 0,
      })
      .select()
      .single();
    if (error) throw error;
    return toPaymentMilestone(data);
  },

  async update(id: string, updates: {
    label?: string;
    percentage?: number;
    fixedAmount?: number;
    dueDate?: string;
    status?: string;
    sortOrder?: number;
  }): Promise<PaymentMilestone> {
    const updateData: Record<string, any> = { updated_at: new Date().toISOString() };
    if (updates.label !== undefined) updateData.label = updates.label;
    if (updates.percentage !== undefined) updateData.percentage = updates.percentage;
    if (updates.fixedAmount !== undefined) updateData.fixed_amount = updates.fixedAmount;
    if (updates.dueDate !== undefined) updateData.due_date = updates.dueDate || null;
    if (updates.status !== undefined) updateData.status = updates.status;
    if (updates.sortOrder !== undefined) updateData.sort_order = updates.sortOrder;

    const { data, error } = await milestonesTable()
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return toPaymentMilestone(data);
  },

  async delete(id: string): Promise<void> {
    const { error } = await milestonesTable()
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  async markPaid(id: string): Promise<PaymentMilestone> {
    const { data, error } = await milestonesTable()
      .update({
        status: 'paid',
        paid_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return toPaymentMilestone(data);
  },

  async saveBatch(quoteId: string, milestones: Array<{
    id?: string;
    label: string;
    percentage?: number;
    fixedAmount?: number;
    dueDate?: string;
    sortOrder: number;
  }>): Promise<PaymentMilestone[]> {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) throw new Error('Not authenticated');

    // Delete existing milestones for this quote
    await milestonesTable()
      .delete()
      .eq('quote_id', quoteId)
      .eq('user_id', user.id);

    if (milestones.length === 0) return [];

    // Insert new milestones
    const rows = milestones.map(m => ({
      quote_id: quoteId,
      user_id: user.id,
      label: m.label,
      percentage: m.percentage ?? null,
      fixed_amount: m.fixedAmount ?? null,
      due_date: m.dueDate ?? null,
      sort_order: m.sortOrder,
    }));

    const { data, error } = await milestonesTable()
      .insert(rows)
      .select();
    if (error) throw error;
    return (data || []).map(toPaymentMilestone);
  },
};
