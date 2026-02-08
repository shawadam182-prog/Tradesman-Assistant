-- Add trade_type column to user_settings
ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS trade_type TEXT;
