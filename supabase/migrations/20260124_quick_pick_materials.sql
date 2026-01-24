-- Add quick_pick_materials column to user_settings
ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS quick_pick_materials text[] DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN user_settings.quick_pick_materials IS 'Custom quick-pick materials for the job tracker';
