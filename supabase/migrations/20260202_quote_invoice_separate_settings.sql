-- Add separate settings for quotes vs invoices
-- All fields are optional (nullable) - falls back to shared defaults if not set

-- Quote-specific settings
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS quote_labour_rate NUMERIC DEFAULT NULL;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS quote_markup_percent NUMERIC DEFAULT NULL;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS quote_display_options JSONB DEFAULT NULL;

-- Invoice-specific settings
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS invoice_labour_rate NUMERIC DEFAULT NULL;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS invoice_markup_percent NUMERIC DEFAULT NULL;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS invoice_display_options JSONB DEFAULT NULL;

-- Default payment terms for invoices (e.g., 14 days, 30 days)
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS default_payment_terms_days INTEGER DEFAULT 14;
