-- Phase 5: Appointment Notifications
-- Add tracking columns to schedule_entries for confirmation/reminder tracking

ALTER TABLE schedule_entries ADD COLUMN IF NOT EXISTS confirmation_sent_at TIMESTAMPTZ;
ALTER TABLE schedule_entries ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMPTZ;
ALTER TABLE schedule_entries ADD COLUMN IF NOT EXISTS customer_email TEXT;
