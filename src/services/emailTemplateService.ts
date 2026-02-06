import { supabase } from '../lib/supabase';
import type { EmailTemplate } from '../../types';

// email_templates table not yet in generated types
const templatesTable = () => (supabase as any).from('email_templates');

function toEmailTemplate(row: any): EmailTemplate {
  return {
    id: row.id,
    userId: row.user_id,
    templateType: row.template_type,
    subject: row.subject,
    body: row.body,
    isDefault: row.is_default ?? false,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Default templates lazy-initialized on first access
const DEFAULT_TEMPLATES: Array<{ templateType: string; subject: string; body: string }> = [
  {
    templateType: 'quote_send',
    subject: '{{doc_type}} from {{company_name}} - {{project_title}}',
    body: `Hi {{customer_name}},

Please find attached your {{doc_type}} for {{project_title}}.

{{#if part_payment}}Payment of {{part_payment_amount}} is due upon acceptance.{{/if}}

If you have any questions, please don't hesitate to get in touch.

Kind regards,
{{company_name}}
{{company_phone}}
{{company_email}}`,
  },
  {
    templateType: 'invoice_send',
    subject: 'Invoice {{reference}} from {{company_name}}',
    body: `Hi {{customer_name}},

Please find attached invoice {{reference}} for {{project_title}}.

Total due: {{total_amount}}
{{#if due_date}}Payment is due by {{due_date}}.{{/if}}

{{payment_instructions}}

Kind regards,
{{company_name}}`,
  },
  {
    templateType: 'payment_reminder',
    subject: 'Payment Reminder - Invoice {{reference}}',
    body: `Hi {{customer_name}},

This is a friendly reminder that invoice {{reference}} for {{total_amount}} is now due.

{{payment_instructions}}

If you've already made payment, please disregard this message.

Kind regards,
{{company_name}}`,
  },
  {
    templateType: 'payment_received',
    subject: 'Payment Received - Thank You',
    body: `Hi {{customer_name}},

Thank you for your payment of {{amount}} for {{project_title}}.

We appreciate your prompt payment.

Kind regards,
{{company_name}}`,
  },
];

export const emailTemplateService = {
  async getAll(): Promise<EmailTemplate[]> {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await templatesTable()
      .select('*')
      .eq('user_id', user.id)
      .order('template_type');
    if (error) throw error;

    // Lazy-init: if no templates exist, create defaults
    if (!data || data.length === 0) {
      return await this.initDefaults(user.id);
    }

    return data.map(toEmailTemplate);
  },

  async getByType(templateType: string): Promise<EmailTemplate | null> {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await templatesTable()
      .select('*')
      .eq('user_id', user.id)
      .eq('template_type', templateType)
      .eq('is_default', true)
      .maybeSingle();
    if (error) throw error;

    if (!data) {
      // Lazy-init and retry
      await this.initDefaults(user.id);
      const { data: retry } = await templatesTable()
        .select('*')
        .eq('user_id', user.id)
        .eq('template_type', templateType)
        .eq('is_default', true)
        .maybeSingle();
      return retry ? toEmailTemplate(retry) : null;
    }

    return toEmailTemplate(data);
  },

  async update(id: string, updates: { subject?: string; body?: string }): Promise<EmailTemplate> {
    const { data, error } = await templatesTable()
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return toEmailTemplate(data);
  },

  async initDefaults(userId: string): Promise<EmailTemplate[]> {
    const templates = DEFAULT_TEMPLATES.map(t => ({
      user_id: userId,
      template_type: t.templateType,
      subject: t.subject,
      body: t.body,
      is_default: true,
    }));

    const { data, error } = await templatesTable()
      .upsert(templates, { onConflict: 'user_id,template_type,is_default' })
      .select();
    if (error) throw error;
    return (data || []).map(toEmailTemplate);
  },

  renderTemplate(template: string, variables: Record<string, string>): string {
    let result = template;
    // Simple variable replacement: {{variable_name}}
    for (const [key, value] of Object.entries(variables)) {
      result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
    }
    // Simple conditional blocks: {{#if var}}content{{/if}}
    result = result.replace(/\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (_match, varName, content) => {
      return variables[varName] ? content : '';
    });
    return result.trim();
  },
};
