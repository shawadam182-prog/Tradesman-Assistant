-- ============================================================
-- Fix infinite recursion in teams / team_members RLS policies
-- The circular reference: teams policies query team_members,
-- and team_members policies query teams → infinite recursion.
-- Solution: SECURITY DEFINER helper functions bypass RLS,
-- breaking the cycle.
-- ============================================================

-- Helper: check if user owns a team (bypasses RLS on teams)
CREATE OR REPLACE FUNCTION is_team_owner(p_team_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM teams t
    WHERE t.id = p_team_id
      AND t.owner_id = auth.uid()
  );
$$;

-- Helper: check if user is an active member of a team (bypasses RLS on team_members)
CREATE OR REPLACE FUNCTION is_active_team_member(p_team_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM team_members tm
    WHERE tm.team_id = p_team_id
      AND tm.user_id = auth.uid()
      AND tm.status = 'active'
  );
$$;

-- ============================================================
-- Drop old policies that cause recursion
-- ============================================================

-- teams policies
DROP POLICY IF EXISTS "Team owners can manage their team" ON teams;
DROP POLICY IF EXISTS "Team members can view their team" ON teams;

-- team_members policies
DROP POLICY IF EXISTS "Team owners can manage members" ON team_members;
DROP POLICY IF EXISTS "Active members can view team members" ON team_members;
DROP POLICY IF EXISTS "Members can update own profile" ON team_members;

-- team_invitations policies (also reference teams)
DROP POLICY IF EXISTS "Team owners can manage invitations" ON team_invitations;

-- job_assignments policies (also reference teams via team_members)
DROP POLICY IF EXISTS "Team owners can manage job assignments" ON job_assignments;

-- timesheets policies
DROP POLICY IF EXISTS "Team owners can manage team timesheets" ON timesheets;

-- gps_logs policies
DROP POLICY IF EXISTS "Team owners can view team gps logs" ON gps_logs;

-- ============================================================
-- Recreate policies using SECURITY DEFINER helpers
-- ============================================================

-- teams: owners can do everything
CREATE POLICY "Team owners can manage their team"
  ON teams FOR ALL
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- teams: active members can view
CREATE POLICY "Team members can view their team"
  ON teams FOR SELECT
  USING (is_active_team_member(id));

-- team_members: owners can manage (uses is_team_owner to avoid querying teams with RLS)
CREATE POLICY "Team owners can manage members"
  ON team_members FOR ALL
  USING (is_team_owner(team_id))
  WITH CHECK (is_team_owner(team_id));

-- team_members: members can view other members in their team
CREATE POLICY "Active members can view team members"
  ON team_members FOR SELECT
  USING (
    auth.uid() = user_id
    OR is_active_team_member(team_id)
  );

-- team_members: members can update own profile
CREATE POLICY "Members can update own profile"
  ON team_members FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- team_invitations: owners can manage
CREATE POLICY "Team owners can manage invitations"
  ON team_invitations FOR ALL
  USING (is_team_owner(team_id))
  WITH CHECK (is_team_owner(team_id));

-- job_assignments: owners can manage
CREATE POLICY "Team owners can manage job assignments"
  ON job_assignments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.id = job_assignments.team_member_id
        AND is_team_owner(tm.team_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.id = job_assignments.team_member_id
        AND is_team_owner(tm.team_id)
    )
  );

-- timesheets: owners can manage team timesheets
CREATE POLICY "Team owners can manage team timesheets"
  ON timesheets FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.id = timesheets.team_member_id
        AND is_team_owner(tm.team_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.id = timesheets.team_member_id
        AND is_team_owner(tm.team_id)
    )
  );

-- gps_logs: owners can view
CREATE POLICY "Team owners can view team gps logs"
  ON gps_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM timesheets ts
      JOIN team_members tm ON tm.id = ts.team_member_id
      WHERE ts.id = gps_logs.timesheet_id
        AND is_team_owner(tm.team_id)
    )
  );
