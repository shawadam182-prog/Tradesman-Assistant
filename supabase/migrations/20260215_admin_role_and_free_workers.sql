-- ============================================================
-- Add 'admin' role to team_members and update invitation constraints
-- Field workers are now FREE (included with tier limits)
-- Admin users are the paid add-on at £10/mo each
-- ============================================================

-- Update team_members role CHECK to include 'admin'
ALTER TABLE team_members DROP CONSTRAINT IF EXISTS team_members_role_check;
ALTER TABLE team_members ADD CONSTRAINT team_members_role_check
  CHECK (role IN ('owner', 'admin', 'field_worker'));

-- Update team_invitations role CHECK to include 'admin'
ALTER TABLE team_invitations DROP CONSTRAINT IF EXISTS team_invitations_role_check;
ALTER TABLE team_invitations ADD CONSTRAINT team_invitations_role_check
  CHECK (role IN ('admin', 'field_worker'));

-- Rename team_seat_count to admin_seat_count for clarity
-- (keeping team_seat_count as alias for backward compat, just add new column)
ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS admin_seat_count integer DEFAULT 0;

-- Copy existing seat counts to admin_seat_count
UPDATE user_settings SET admin_seat_count = COALESCE(team_seat_count, 0);
