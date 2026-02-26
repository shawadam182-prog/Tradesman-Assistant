-- Migration: Add customer overrides, design notes to quotes, and labour unit presets to user_settings
-- These columns support the quote/invoice UI improvements from commit aa6bcf5

-- Add customer detail override columns to quotes table
-- These allow overriding the customer name/address on a specific quote
-- without modifying the saved customer record
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS customer_name_override TEXT;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS customer_address_override TEXT;

-- Add design notes column to quotes table
-- Stores design/layout notes visible on the quote document
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS design_notes TEXT;

-- Add labour unit presets to user_settings
-- Stores custom labour units (e.g. 'hrs', 'days', 'week') as JSONB array
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS labour_unit_presets JSONB DEFAULT '["hrs", "days", "week"]';
