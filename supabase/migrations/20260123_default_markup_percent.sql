-- Add default markup percent field to user_settings table
-- This allows users to set a default markup percentage for quotes and invoices

ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS default_markup_percent NUMERIC DEFAULT 15;

-- Add comment for documentation
COMMENT ON COLUMN user_settings.default_markup_percent IS 'Default markup percentage applied to quotes and invoices (default: 15%)';
