-- Simplify invoice templates to 2 professional options
-- Replaces the 8 overly-complicated templates with 2 working ones

-- Step 1: Drop the existing constraint
ALTER TABLE user_settings DROP CONSTRAINT IF EXISTS user_settings_document_template_check;

-- Step 2: Add constraint for new simplified templates
ALTER TABLE user_settings ADD CONSTRAINT user_settings_document_template_check CHECK (
  document_template IS NULL OR
  document_template IN ('professional', 'compact')
);

-- Step 3: Update existing values to map to new templates
-- Map all old templates to 'professional' as default
UPDATE user_settings
SET document_template = 'professional'
WHERE document_template IS NOT NULL
  AND document_template NOT IN ('professional', 'compact');

-- Step 4: Update the default value
ALTER TABLE user_settings ALTER COLUMN document_template SET DEFAULT 'professional';

-- Step 5: Update the column comment
COMMENT ON COLUMN user_settings.document_template IS 'Document template style: professional (default, Zoho-style), compact (ultra-minimal)';
