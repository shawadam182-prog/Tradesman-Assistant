-- Add separate display options for quotes and invoices
-- Previously they shared a single default_display_options field
ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS quote_display_options jsonb,
ADD COLUMN IF NOT EXISTS invoice_display_options jsonb;

-- Migrate existing settings: copy current defaults to both
UPDATE user_settings
SET quote_display_options = default_display_options,
    invoice_display_options = default_display_options
WHERE default_display_options IS NOT NULL
  AND quote_display_options IS NULL;
