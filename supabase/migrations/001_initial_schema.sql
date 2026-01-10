-- Tradesman Assistant Initial Schema
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/jpftetfqoqabftgzkorr/sql

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- CUSTOMERS TABLE
-- ============================================
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  company TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster lookups by user
CREATE INDEX idx_customers_user_id ON customers(user_id);

-- RLS Policies
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own customers" ON customers
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own customers" ON customers
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own customers" ON customers
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own customers" ON customers
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- JOB PACKS TABLE
-- ============================================
CREATE TABLE job_packs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
  notepad TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_job_packs_user_id ON job_packs(user_id);
CREATE INDEX idx_job_packs_customer_id ON job_packs(customer_id);

ALTER TABLE job_packs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own job packs" ON job_packs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own job packs" ON job_packs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own job packs" ON job_packs
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own job packs" ON job_packs
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- SITE NOTES TABLE
-- ============================================
CREATE TABLE site_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_pack_id UUID NOT NULL REFERENCES job_packs(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  is_voice BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_site_notes_job_pack_id ON site_notes(job_pack_id);

ALTER TABLE site_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view notes for own job packs" ON site_notes
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM job_packs WHERE job_packs.id = site_notes.job_pack_id AND job_packs.user_id = auth.uid())
  );

CREATE POLICY "Users can insert notes for own job packs" ON site_notes
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM job_packs WHERE job_packs.id = site_notes.job_pack_id AND job_packs.user_id = auth.uid())
  );

CREATE POLICY "Users can update notes for own job packs" ON site_notes
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM job_packs WHERE job_packs.id = site_notes.job_pack_id AND job_packs.user_id = auth.uid())
  );

CREATE POLICY "Users can delete notes for own job packs" ON site_notes
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM job_packs WHERE job_packs.id = site_notes.job_pack_id AND job_packs.user_id = auth.uid())
  );

-- ============================================
-- SITE PHOTOS TABLE (metadata only, files in Storage)
-- ============================================
CREATE TABLE site_photos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_pack_id UUID NOT NULL REFERENCES job_packs(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  caption TEXT,
  tags TEXT[] DEFAULT '{}',
  is_drawing BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_site_photos_job_pack_id ON site_photos(job_pack_id);

ALTER TABLE site_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view photos for own job packs" ON site_photos
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM job_packs WHERE job_packs.id = site_photos.job_pack_id AND job_packs.user_id = auth.uid())
  );

CREATE POLICY "Users can insert photos for own job packs" ON site_photos
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM job_packs WHERE job_packs.id = site_photos.job_pack_id AND job_packs.user_id = auth.uid())
  );

CREATE POLICY "Users can update photos for own job packs" ON site_photos
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM job_packs WHERE job_packs.id = site_photos.job_pack_id AND job_packs.user_id = auth.uid())
  );

CREATE POLICY "Users can delete photos for own job packs" ON site_photos
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM job_packs WHERE job_packs.id = site_photos.job_pack_id AND job_packs.user_id = auth.uid())
  );

-- ============================================
-- SITE DOCUMENTS TABLE
-- ============================================
CREATE TABLE site_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_pack_id UUID NOT NULL REFERENCES job_packs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  file_type TEXT,
  summary TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_site_documents_job_pack_id ON site_documents(job_pack_id);

ALTER TABLE site_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view documents for own job packs" ON site_documents
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM job_packs WHERE job_packs.id = site_documents.job_pack_id AND job_packs.user_id = auth.uid())
  );

CREATE POLICY "Users can insert documents for own job packs" ON site_documents
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM job_packs WHERE job_packs.id = site_documents.job_pack_id AND job_packs.user_id = auth.uid())
  );

CREATE POLICY "Users can update documents for own job packs" ON site_documents
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM job_packs WHERE job_packs.id = site_documents.job_pack_id AND job_packs.user_id = auth.uid())
  );

CREATE POLICY "Users can delete documents for own job packs" ON site_documents
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM job_packs WHERE job_packs.id = site_documents.job_pack_id AND job_packs.user_id = auth.uid())
  );

-- ============================================
-- PROJECT MATERIALS TABLE
-- ============================================
CREATE TABLE project_materials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_pack_id UUID NOT NULL REFERENCES job_packs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  unit TEXT,
  quoted_qty NUMERIC DEFAULT 0,
  ordered_qty NUMERIC DEFAULT 0,
  delivered_qty NUMERIC DEFAULT 0,
  used_qty NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'ordered', 'delivered', 'partially_delivered')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_project_materials_job_pack_id ON project_materials(job_pack_id);

ALTER TABLE project_materials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view materials for own job packs" ON project_materials
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM job_packs WHERE job_packs.id = project_materials.job_pack_id AND job_packs.user_id = auth.uid())
  );

CREATE POLICY "Users can insert materials for own job packs" ON project_materials
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM job_packs WHERE job_packs.id = project_materials.job_pack_id AND job_packs.user_id = auth.uid())
  );

CREATE POLICY "Users can update materials for own job packs" ON project_materials
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM job_packs WHERE job_packs.id = project_materials.job_pack_id AND job_packs.user_id = auth.uid())
  );

CREATE POLICY "Users can delete materials for own job packs" ON project_materials
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM job_packs WHERE job_packs.id = project_materials.job_pack_id AND job_packs.user_id = auth.uid())
  );

-- ============================================
-- QUOTES TABLE (sections stored as JSONB)
-- ============================================
CREATE TABLE quotes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  job_pack_id UUID REFERENCES job_packs(id) ON DELETE SET NULL,
  reference_number INTEGER,
  title TEXT NOT NULL,
  type TEXT DEFAULT 'estimate' CHECK (type IN ('estimate', 'quotation', 'invoice')),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'declined', 'invoiced', 'paid')),
  sections JSONB DEFAULT '[]',
  labour_rate NUMERIC DEFAULT 65,
  markup_percent NUMERIC DEFAULT 0,
  tax_percent NUMERIC DEFAULT 20,
  cis_percent NUMERIC DEFAULT 20,
  notes TEXT,
  display_options JSONB,
  date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_quotes_user_id ON quotes(user_id);
CREATE INDEX idx_quotes_customer_id ON quotes(customer_id);
CREATE INDEX idx_quotes_job_pack_id ON quotes(job_pack_id);
CREATE INDEX idx_quotes_type ON quotes(type);

ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own quotes" ON quotes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own quotes" ON quotes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own quotes" ON quotes
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own quotes" ON quotes
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- SCHEDULE ENTRIES TABLE
-- ============================================
CREATE TABLE schedule_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_pack_id UUID REFERENCES job_packs(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_schedule_entries_user_id ON schedule_entries(user_id);
CREATE INDEX idx_schedule_entries_start_time ON schedule_entries(start_time);

ALTER TABLE schedule_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own schedule" ON schedule_entries
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own schedule" ON schedule_entries
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own schedule" ON schedule_entries
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own schedule" ON schedule_entries
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- USER SETTINGS TABLE
-- ============================================
CREATE TABLE user_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  default_labour_rate NUMERIC DEFAULT 65,
  default_tax_rate NUMERIC DEFAULT 20,
  default_cis_rate NUMERIC DEFAULT 20,
  company_name TEXT,
  company_address TEXT,
  company_logo_path TEXT,
  footer_logos TEXT[] DEFAULT '{}',
  enable_vat BOOLEAN DEFAULT TRUE,
  enable_cis BOOLEAN DEFAULT TRUE,
  quote_prefix TEXT DEFAULT 'EST-',
  invoice_prefix TEXT DEFAULT 'INV-',
  default_quote_notes TEXT,
  default_invoice_notes TEXT,
  cost_box_color TEXT DEFAULT 'slate',
  show_breakdown BOOLEAN DEFAULT TRUE,
  default_display_options JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own settings" ON user_settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings" ON user_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own settings" ON user_settings
  FOR UPDATE USING (auth.uid() = user_id);

-- ============================================
-- STORAGE BUCKETS
-- ============================================
-- Run these separately in the SQL editor or via Storage settings

INSERT INTO storage.buckets (id, name, public)
VALUES ('photos', 'photos', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('logos', 'logos', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for photos bucket
CREATE POLICY "Users can upload own photos" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'photos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view own photos" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'photos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own photos" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'photos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Storage policies for documents bucket
CREATE POLICY "Users can upload own documents" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'documents' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view own documents" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'documents' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own documents" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'documents' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Storage policies for logos bucket
CREATE POLICY "Users can upload own logos" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'logos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view own logos" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'logos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own logos" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'logos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to tables with updated_at
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_job_packs_updated_at BEFORE UPDATE ON job_packs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_project_materials_updated_at BEFORE UPDATE ON project_materials
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_quotes_updated_at BEFORE UPDATE ON quotes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_schedule_entries_updated_at BEFORE UPDATE ON schedule_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_settings_updated_at BEFORE UPDATE ON user_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to get next reference number for quotes/invoices
CREATE OR REPLACE FUNCTION get_next_reference_number(p_user_id UUID, p_type TEXT)
RETURNS INTEGER AS $$
DECLARE
  next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(reference_number), 0) + 1 INTO next_num
  FROM quotes
  WHERE user_id = p_user_id
    AND (
      (p_type = 'invoice' AND type = 'invoice') OR
      (p_type != 'invoice' AND type IN ('estimate', 'quotation'))
    );
  RETURN next_num;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
