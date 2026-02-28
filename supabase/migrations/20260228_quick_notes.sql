-- Migration: Add quick_notes table
-- Date: 2026-02-28
-- Purpose: Persist quick notes to Supabase (previously localStorage only)
-- IMPORTANT: Run this manually in Supabase Dashboard SQL Editor

-- ============================================
-- QUICK NOTES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS quick_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE quick_notes ENABLE ROW LEVEL SECURITY;

-- Users can only access their own quick notes
CREATE POLICY "Users can view own quick_notes"
  ON quick_notes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own quick_notes"
  ON quick_notes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own quick_notes"
  ON quick_notes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own quick_notes"
  ON quick_notes FOR DELETE
  USING (auth.uid() = user_id);

-- Index for faster queries
CREATE INDEX idx_quick_notes_user_id ON quick_notes(user_id);

-- Unique constraint: one quick notes record per user
CREATE UNIQUE INDEX idx_quick_notes_user_unique ON quick_notes(user_id);
