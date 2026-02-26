-- Add missing columns to job_packs for site address and job sheet data persistence
-- These fields were added to the UI but never added to the database schema

ALTER TABLE job_packs ADD COLUMN IF NOT EXISTS site_address text;
ALTER TABLE job_packs ADD COLUMN IF NOT EXISTS job_sheet_description text;
ALTER TABLE job_packs ADD COLUMN IF NOT EXISTS job_sheet_hours jsonb DEFAULT '[]'::jsonb;
