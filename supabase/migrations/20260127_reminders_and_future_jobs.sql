-- Migration: Add reminders and future_jobs tables
-- Date: 2026-01-27
-- Purpose: Persist reminders and future jobs to Supabase (previously localStorage only)
-- IMPORTANT: Run this manually in Supabase Dashboard SQL Editor

-- ============================================
-- REMINDERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS reminders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  time TEXT NOT NULL, -- HH:MM format
  is_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;

-- Users can only access their own reminders
CREATE POLICY "Users can view own reminders"
  ON reminders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own reminders"
  ON reminders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reminders"
  ON reminders FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own reminders"
  ON reminders FOR DELETE
  USING (auth.uid() = user_id);

-- Index for faster queries
CREATE INDEX idx_reminders_user_id ON reminders(user_id);

-- ============================================
-- FUTURE JOBS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS future_jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  notes TEXT DEFAULT '',
  is_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE future_jobs ENABLE ROW LEVEL SECURITY;

-- Users can only access their own future jobs
CREATE POLICY "Users can view own future_jobs"
  ON future_jobs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own future_jobs"
  ON future_jobs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own future_jobs"
  ON future_jobs FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own future_jobs"
  ON future_jobs FOR DELETE
  USING (auth.uid() = user_id);

-- Index for faster queries
CREATE INDEX idx_future_jobs_user_id ON future_jobs(user_id);
