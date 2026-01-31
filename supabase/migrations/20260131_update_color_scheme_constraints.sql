-- Update color scheme constraints to match new scheme names
-- Old schemes: default, slate, blue, teal, emerald, purple, rose
-- New schemes: executive, navy, slate, stone, forest, minimal, teal, modern

-- Step 1: Drop existing constraints
ALTER TABLE user_settings DROP CONSTRAINT IF EXISTS user_settings_invoice_color_scheme_check;
ALTER TABLE user_settings DROP CONSTRAINT IF EXISTS user_settings_quote_color_scheme_check;

-- Step 2: Map old values to new values
UPDATE user_settings
SET invoice_color_scheme = CASE invoice_color_scheme
  WHEN 'default' THEN 'executive'
  WHEN 'blue' THEN 'navy'
  WHEN 'emerald' THEN 'forest'
  WHEN 'purple' THEN 'minimal'
  WHEN 'rose' THEN 'stone'
  ELSE COALESCE(invoice_color_scheme, 'executive')
END
WHERE invoice_color_scheme IS NOT NULL;

UPDATE user_settings
SET quote_color_scheme = CASE quote_color_scheme
  WHEN 'default' THEN 'executive'
  WHEN 'blue' THEN 'navy'
  WHEN 'emerald' THEN 'forest'
  WHEN 'purple' THEN 'minimal'
  WHEN 'rose' THEN 'stone'
  ELSE COALESCE(quote_color_scheme, 'executive')
END
WHERE quote_color_scheme IS NOT NULL;

-- Step 3: Set defaults for null values
UPDATE user_settings SET invoice_color_scheme = 'executive' WHERE invoice_color_scheme IS NULL;
UPDATE user_settings SET quote_color_scheme = 'executive' WHERE quote_color_scheme IS NULL;

-- Step 4: Add new constraints with all current scheme names
ALTER TABLE user_settings ADD CONSTRAINT user_settings_invoice_color_scheme_check CHECK (
  invoice_color_scheme IN ('executive', 'navy', 'slate', 'stone', 'forest', 'minimal', 'teal', 'modern')
);

ALTER TABLE user_settings ADD CONSTRAINT user_settings_quote_color_scheme_check CHECK (
  quote_color_scheme IN ('executive', 'navy', 'slate', 'stone', 'forest', 'minimal', 'teal', 'modern')
);

-- Step 5: Update column comments
COMMENT ON COLUMN user_settings.invoice_color_scheme IS 'Invoice header color scheme: executive (default), navy, slate, stone, forest, minimal, teal, modern';
COMMENT ON COLUMN user_settings.quote_color_scheme IS 'Quote header color scheme: executive (default), navy, slate, stone, forest, minimal, teal, modern';
