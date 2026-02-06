-- Add phone and email contact fields to user_settings
-- These are used as reply-to on outgoing emails and shown on documents
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS email TEXT;
