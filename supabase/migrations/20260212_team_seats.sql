-- Add team seat tracking columns to user_settings
ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS team_seat_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stripe_seat_price_id text;
