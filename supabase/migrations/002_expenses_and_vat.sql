-- Migration 002: Expenses System and VAT Registration
-- Run this in Supabase SQL Editor after 001_initial_schema.sql

-- ============================================
-- ADD VAT FIELDS TO USER_SETTINGS
-- ============================================
ALTER TABLE user_settings 
ADD COLUMN IF NOT EXISTS is_vat_registered BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS vat_number TEXT;

-- ============================================
-- EXPENSES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_pack_id UUID REFERENCES job_packs(id) ON DELETE SET NULL,
  
  -- Core expense data
  vendor TEXT NOT NULL,
  description TEXT,
  amount NUMERIC(10,2) NOT NULL,
  vat_amount NUMERIC(10,2) DEFAULT 0,
  category TEXT DEFAULT 'materials' CHECK (category IN ('materials', 'tools', 'fuel', 'subcontractor', 'office', 'insurance', 'other')),
  
  -- Receipt storage
  receipt_storage_path TEXT,
  receipt_extracted_text TEXT,
  
  -- Date and status
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  is_reconciled BOOLEAN DEFAULT FALSE,
  reconciled_transaction_id UUID,
  
  -- Payment method
  payment_method TEXT DEFAULT 'card' CHECK (payment_method IN ('card', 'cash', 'bank_transfer', 'cheque')),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_expenses_user_id ON expenses(user_id);
CREATE INDEX idx_expenses_job_pack_id ON expenses(job_pack_id);
CREATE INDEX idx_expenses_date ON expenses(expense_date);
CREATE INDEX idx_expenses_category ON expenses(category);

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own expenses" ON expenses
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own expenses" ON expenses
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own expenses" ON expenses
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own expenses" ON expenses
  FOR DELETE USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON expenses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- BANK TRANSACTIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS bank_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Transaction data (from CSV import)
  transaction_date DATE NOT NULL,
  description TEXT NOT NULL,
  amount NUMERIC(10,2) NOT NULL, -- Negative for outgoing, positive for incoming
  balance NUMERIC(10,2),
  reference TEXT,
  transaction_type TEXT, -- e.g., 'CARD', 'BACS', 'FPS', 'DD', etc.
  
  -- Reconciliation
  is_reconciled BOOLEAN DEFAULT FALSE,
  reconciled_expense_id UUID REFERENCES expenses(id) ON DELETE SET NULL,
  reconciled_invoice_id UUID REFERENCES quotes(id) ON DELETE SET NULL,
  
  -- Import metadata
  import_batch_id TEXT,
  bank_name TEXT,
  account_last_four TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_bank_transactions_user_id ON bank_transactions(user_id);
CREATE INDEX idx_bank_transactions_date ON bank_transactions(transaction_date);
CREATE INDEX idx_bank_transactions_reconciled ON bank_transactions(is_reconciled);

ALTER TABLE bank_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own bank transactions" ON bank_transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own bank transactions" ON bank_transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own bank transactions" ON bank_transactions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own bank transactions" ON bank_transactions
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- RECEIPTS STORAGE BUCKET
-- ============================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('receipts', 'receipts', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for receipts bucket
CREATE POLICY "Users can upload own receipts" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'receipts' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view own receipts" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'receipts' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own receipts" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'receipts' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- ============================================
-- VAT SUMMARY VIEW (for dashboard)
-- ============================================
CREATE OR REPLACE VIEW vat_summary AS
SELECT 
  user_id,
  DATE_TRUNC('quarter', expense_date) AS quarter,
  SUM(vat_amount) AS input_vat,
  0::numeric AS output_vat -- Will be calculated from invoices
FROM expenses
WHERE vat_amount > 0
GROUP BY user_id, DATE_TRUNC('quarter', expense_date);

-- Note: Output VAT needs to be calculated from quotes where type='invoice' and status='paid'
-- This would require a more complex view joining with quotes table
