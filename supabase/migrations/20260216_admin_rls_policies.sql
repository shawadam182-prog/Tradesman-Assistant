-- ============================================================
-- Add RLS policies for the 'admin' team role
-- Admins can manage job assignments, timesheets, and
-- field worker invitations — using SECURITY DEFINER helpers
-- to avoid infinite recursion.
-- ============================================================

-- Helper: check if user is owner or admin of a team (bypasses RLS)
CREATE OR REPLACE FUNCTION is_team_owner_or_admin(p_team_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM team_members tm
    WHERE tm.team_id = p_team_id
      AND tm.user_id = auth.uid()
      AND tm.role IN ('owner', 'admin')
      AND tm.status = 'active'
  );
$$;

-- ============================================================
-- Drop existing owner-only policies that need upgrading
-- ============================================================

DROP POLICY IF EXISTS "Team owners can manage job assignments" ON job_assignments;
DROP POLICY IF EXISTS "Team owners can manage team timesheets" ON timesheets;
DROP POLICY IF EXISTS "Team owners can manage invitations" ON team_invitations;
DROP POLICY IF EXISTS "Team owners can view team gps logs" ON gps_logs;

-- ============================================================
-- Recreate policies to include admins
-- ============================================================

-- job_assignments: owners and admins can manage
CREATE POLICY "Team owners and admins can manage job assignments"
  ON job_assignments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.id = job_assignments.team_member_id
        AND is_team_owner_or_admin(tm.team_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.id = job_assignments.team_member_id
        AND is_team_owner_or_admin(tm.team_id)
    )
  );

-- timesheets: owners and admins can manage
CREATE POLICY "Team owners and admins can manage team timesheets"
  ON timesheets FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.id = timesheets.team_member_id
        AND is_team_owner_or_admin(tm.team_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.id = timesheets.team_member_id
        AND is_team_owner_or_admin(tm.team_id)
    )
  );

-- team_invitations: owners can manage all, admins can manage field_worker invitations only
CREATE POLICY "Team owners and admins can manage invitations"
  ON team_invitations FOR ALL
  USING (
    is_team_owner(team_id)
    OR (
      is_team_owner_or_admin(team_id)
      AND role = 'field_worker'
    )
  )
  WITH CHECK (
    is_team_owner(team_id)
    OR (
      is_team_owner_or_admin(team_id)
      AND role = 'field_worker'
    )
  );

-- gps_logs: owners and admins can view
CREATE POLICY "Team owners and admins can view team gps logs"
  ON gps_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM timesheets ts
      JOIN team_members tm ON tm.id = ts.team_member_id
      WHERE ts.id = gps_logs.timesheet_id
        AND is_team_owner_or_admin(tm.team_id)
    )
  );
