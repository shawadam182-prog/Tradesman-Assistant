-- ============================================================
-- Fix team_invitations policies that query auth.users directly
-- The authenticated role doesn't have SELECT on auth.users,
-- causing "permission denied for table users" errors.
-- Fix: use auth.jwt() ->> 'email' instead of subquerying auth.users
-- ============================================================

-- Drop the problematic policies
DROP POLICY IF EXISTS "Users can view invitations sent to them" ON team_invitations;
DROP POLICY IF EXISTS "Users can respond to their invitations" ON team_invitations;

-- Recreate using JWT claim instead of auth.users table
CREATE POLICY "Users can view invitations sent to them"
  ON team_invitations FOR SELECT
  USING (email = (auth.jwt() ->> 'email'));

CREATE POLICY "Users can respond to their invitations"
  ON team_invitations FOR UPDATE
  USING (email = (auth.jwt() ->> 'email'))
  WITH CHECK (email = (auth.jwt() ->> 'email'));

-- Also fix the accept/decline functions which reference auth.users directly
-- These are SECURITY DEFINER so they work, but let's be consistent
-- (No change needed — SECURITY DEFINER bypasses role permissions)
