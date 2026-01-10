import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

type Tables = Database['public']['Tables'];

// ============================================
// CUSTOMERS
// ============================================

export const customersService = {
  async getAll() {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .order('name');
    if (error) throw error;
    return data;
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },

  async create(customer: Tables['customers']['Insert']) {
    const { data, error } = await supabase
      .from('customers')
      .insert(customer)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id: string, updates: Tables['customers']['Update']) {
    const { data, error } = await supabase
      .from('customers')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('customers')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },
};

// ============================================
// JOB PACKS
// ============================================

export const jobPacksService = {
  async getAll() {
    const { data, error } = await supabase
      .from('job_packs')
      .select(`
        *,
        customer:customers(id, name),
        site_notes(*),
        site_photos(*),
        site_documents(*),
        project_materials(*)
      `)
      .order('updated_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('job_packs')
      .select(`
        *,
        customer:customers(id, name),
        site_notes(*),
        site_photos(*),
        site_documents(*),
        project_materials(*)
      `)
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },

  async create(jobPack: Tables['job_packs']['Insert']) {
    const { data, error } = await supabase
      .from('job_packs')
      .insert(jobPack)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id: string, updates: Tables['job_packs']['Update']) {
    const { data, error } = await supabase
      .from('job_packs')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('job_packs')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },
};

// ============================================
// SITE NOTES
// ============================================

export const siteNotesService = {
  async create(note: Tables['site_notes']['Insert']) {
    const { data, error } = await supabase
      .from('site_notes')
      .insert(note)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id: string, updates: Tables['site_notes']['Update']) {
    const { data, error } = await supabase
      .from('site_notes')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('site_notes')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },
};

// ============================================
// SITE PHOTOS
// ============================================

export const sitePhotosService = {
  async upload(jobPackId: string, file: File, caption?: string, tags?: string[], isDrawing = false) {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) throw new Error('Not authenticated');

    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/${jobPackId}/${Date.now()}.${fileExt}`;

    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from('photos')
      .upload(fileName, file);
    if (uploadError) throw uploadError;

    // Create database record
    const { data, error } = await supabase
      .from('site_photos')
      .insert({
        job_pack_id: jobPackId,
        storage_path: fileName,
        caption,
        tags: tags || [],
        is_drawing: isDrawing,
      })
      .select()
      .single();
    if (error) throw error;

    return data;
  },

  async getUrl(storagePath: string) {
    const { data } = await supabase.storage
      .from('photos')
      .createSignedUrl(storagePath, 3600); // 1 hour expiry
    return data?.signedUrl;
  },

  async delete(id: string, storagePath: string) {
    // Delete from storage
    await supabase.storage.from('photos').remove([storagePath]);

    // Delete database record
    const { error } = await supabase
      .from('site_photos')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  async update(id: string, updates: Tables['site_photos']['Update']) {
    const { data, error } = await supabase
      .from('site_photos')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
};

// ============================================
// SITE DOCUMENTS
// ============================================

export const siteDocumentsService = {
  async upload(jobPackId: string, file: File, summary?: string) {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) throw new Error('Not authenticated');

    const fileName = `${user.id}/${jobPackId}/${Date.now()}-${file.name}`;

    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(fileName, file);
    if (uploadError) throw uploadError;

    // Create database record
    const { data, error } = await supabase
      .from('site_documents')
      .insert({
        job_pack_id: jobPackId,
        name: file.name,
        storage_path: fileName,
        file_type: file.type,
        summary,
      })
      .select()
      .single();
    if (error) throw error;

    return data;
  },

  async getUrl(storagePath: string) {
    const { data } = await supabase.storage
      .from('documents')
      .createSignedUrl(storagePath, 3600);
    return data?.signedUrl;
  },

  async delete(id: string, storagePath: string) {
    await supabase.storage.from('documents').remove([storagePath]);

    const { error } = await supabase
      .from('site_documents')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },
};

// ============================================
// PROJECT MATERIALS
// ============================================

export const projectMaterialsService = {
  async create(material: Tables['project_materials']['Insert']) {
    const { data, error } = await supabase
      .from('project_materials')
      .insert(material)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id: string, updates: Tables['project_materials']['Update']) {
    const { data, error } = await supabase
      .from('project_materials')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('project_materials')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },
};

// ============================================
// QUOTES
// ============================================

export const quotesService = {
  async getAll() {
    const { data, error } = await supabase
      .from('quotes')
      .select(`
        *,
        customer:customers(id, name)
      `)
      .order('updated_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('quotes')
      .select(`
        *,
        customer:customers(*)
      `)
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },

  async getByJobPack(jobPackId: string) {
    const { data, error } = await supabase
      .from('quotes')
      .select(`
        *,
        customer:customers(id, name)
      `)
      .eq('job_pack_id', jobPackId)
      .order('updated_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async create(quote: Tables['quotes']['Insert']) {
    const { data, error } = await supabase
      .from('quotes')
      .insert(quote)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id: string, updates: Tables['quotes']['Update']) {
    const { data, error } = await supabase
      .from('quotes')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('quotes')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  async getNextReferenceNumber(type: 'estimate' | 'quotation' | 'invoice') {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .rpc('get_next_reference_number', {
        p_user_id: user.id,
        p_type: type,
      });
    if (error) throw error;
    return data as number;
  },
};

// ============================================
// SCHEDULE ENTRIES
// ============================================

export const scheduleService = {
  async getAll() {
    const { data, error } = await supabase
      .from('schedule_entries')
      .select(`
        *,
        job_pack:job_packs(id, title),
        customer:customers(id, name)
      `)
      .order('start_time');
    if (error) throw error;
    return data;
  },

  async getByDateRange(startDate: string, endDate: string) {
    const { data, error } = await supabase
      .from('schedule_entries')
      .select(`
        *,
        job_pack:job_packs(id, title),
        customer:customers(id, name)
      `)
      .gte('start_time', startDate)
      .lte('end_time', endDate)
      .order('start_time');
    if (error) throw error;
    return data;
  },

  async create(entry: Tables['schedule_entries']['Insert']) {
    const { data, error } = await supabase
      .from('schedule_entries')
      .insert(entry)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id: string, updates: Tables['schedule_entries']['Update']) {
    const { data, error } = await supabase
      .from('schedule_entries')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('schedule_entries')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },
};

// ============================================
// USER SETTINGS
// ============================================

export const userSettingsService = {
  async get() {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', user.id)
      .single();

    // If no settings exist, create defaults
    if (error?.code === 'PGRST116') {
      return this.create({
        user_id: user.id,
      });
    }
    if (error) throw error;
    return data;
  },

  async create(settings: Tables['user_settings']['Insert']) {
    const { data, error } = await supabase
      .from('user_settings')
      .insert(settings)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(updates: Tables['user_settings']['Update']) {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('user_settings')
      .update(updates)
      .eq('user_id', user.id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async uploadLogo(file: File) {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) throw new Error('Not authenticated');

    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/logo.${fileExt}`;

    // Delete old logo if exists
    await supabase.storage.from('logos').remove([fileName]);

    // Upload new logo
    const { error: uploadError } = await supabase.storage
      .from('logos')
      .upload(fileName, file, { upsert: true });
    if (uploadError) throw uploadError;

    // Update settings with logo path
    await this.update({ company_logo_path: fileName });

    return fileName;
  },

  async getLogoUrl(storagePath: string) {
    const { data } = await supabase.storage
      .from('logos')
      .createSignedUrl(storagePath, 86400); // 24 hour expiry
    return data?.signedUrl;
  },
};


// ============================================
// EXPENSES
// ============================================

export const expensesService = {
  async getAll() {
    const { data, error } = await supabase
      .from('expenses')
      .select()
      .order('expense_date', { ascending: false });
    if (error) throw error;
    return data;
  },

  async create(expense) {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('expenses')
      .insert({ ...expense, user_id: user.id })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id, updates) {
    const { data, error } = await supabase
      .from('expenses')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async delete(id) {
    const { error } = await supabase
      .from('expenses')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  async uploadReceipt(expenseId, file) {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) throw new Error('Not authenticated');

    const fileExt = file.name.split('.').pop();
    const fileName = user.id + '/' + expenseId + '/' + Date.now() + '.' + fileExt;

    const { error: uploadError } = await supabase.storage
      .from('receipts')
      .upload(fileName, file);
    if (uploadError) throw uploadError;

    await this.update(expenseId, { receipt_storage_path: fileName });

    return fileName;
  },

  async getReceiptUrl(storagePath) {
    const { data } = await supabase.storage
      .from('receipts')
      .createSignedUrl(storagePath, 3600);
    return data?.signedUrl;
  },
};

// ============================================
// BANK TRANSACTIONS
// ============================================

export const bankTransactionsService = {
  async getAll() {
    const { data, error } = await supabase
      .from('bank_transactions')
      .select()
      .order('transaction_date', { ascending: false });
    if (error) throw error;
    return data;
  },

  async getUnreconciled() {
    const { data, error } = await supabase
      .from('bank_transactions')
      .select('*')
      .eq('is_reconciled', false)
      .order('transaction_date', { ascending: false });
    if (error) throw error;
    return data;
  },

  async importBatch(transactions: any[]) {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) throw new Error('Not authenticated');

    const withUserId = transactions.map(t => ({ ...t, user_id: user.id }));

    const { data, error } = await supabase
      .from('bank_transactions')
      .insert(withUserId)
      .select();
    if (error) throw error;
    return data;
  },

  async reconcileWithExpense(transactionId: string, expenseId: string) {
    const { error: txError } = await supabase
      .from('bank_transactions')
      .update({ is_reconciled: true, reconciled_expense_id: expenseId })
      .eq('id', transactionId);
    if (txError) throw txError;

    const { error: expError } = await supabase
      .from('expenses')
      .update({ is_reconciled: true, reconciled_transaction_id: transactionId })
      .eq('id', expenseId);
    if (expError) throw expError;
  },

  async reconcileWithInvoice(transactionId: string, invoiceId: string) {
    const { error } = await supabase
      .from('bank_transactions')
      .update({ is_reconciled: true, reconciled_invoice_id: invoiceId })
      .eq('id', transactionId);
    if (error) throw error;
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('bank_transactions')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },
};
