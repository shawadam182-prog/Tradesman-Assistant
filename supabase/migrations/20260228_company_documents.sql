-- Migration: Add company_documents table
-- Date: 2026-02-28
-- Purpose: Store company documents (insurances, certificates, T&Cs, etc.)
-- IMPORTANT: Run this manually in Supabase Dashboard SQL Editor

-- ============================================
-- COMPANY DOCUMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS company_documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'other',
  storage_path TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  expiry_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE company_documents ENABLE ROW LEVEL SECURITY;

-- Users can only access their own documents
CREATE POLICY "Users can view own company_documents"
  ON company_documents FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own company_documents"
  ON company_documents FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own company_documents"
  ON company_documents FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own company_documents"
  ON company_documents FOR DELETE
  USING (auth.uid() = user_id);

-- Index for faster queries
CREATE INDEX idx_company_documents_user_id ON company_documents(user_id);
CREATE INDEX idx_company_documents_category ON company_documents(user_id, category);
