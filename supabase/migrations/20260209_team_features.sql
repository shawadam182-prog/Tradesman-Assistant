-- ============================================================
-- Team Features Schema
-- All additive — no changes to existing tables/policies
-- ============================================================

-- ============================================================
-- STEP 1: Create all tables first (no cross-table references in policies)
-- ============================================================

-- 1. teams
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_teams_owner_id ON teams(owner_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_teams_owner_unique ON teams(owner_id);

ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

-- 2. team_members
CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'field_worker' CHECK (role IN ('owner', 'field_worker')),
  display_name TEXT NOT NULL,
  phone TEXT,
  hourly_rate NUMERIC DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'deactivated')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON team_members(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_team_members_team_user ON team_members(team_id, user_id);

ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

-- 3. team_invitations
CREATE TABLE IF NOT EXISTS team_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'field_worker' CHECK (role IN ('field_worker')),
  display_name TEXT,
  invited_by UUID NOT NULL REFERENCES auth.users(id),
  token UUID NOT NULL DEFAULT gen_random_uuid(),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired', 'revoked')),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_team_invitations_team_id ON team_invitations(team_id);
CREATE INDEX IF NOT EXISTS idx_team_invitations_email ON team_invitations(email);
CREATE UNIQUE INDEX IF NOT EXISTS idx_team_invitations_token ON team_invitations(token);

ALTER TABLE team_invitations ENABLE ROW LEVEL SECURITY;

-- 4. job_assignments
CREATE TABLE IF NOT EXISTS job_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_pack_id UUID NOT NULL REFERENCES job_packs(id) ON DELETE CASCADE,
  team_member_id UUID NOT NULL REFERENCES team_members(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  assigned_by UUID NOT NULL REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_job_assignments_job_pack_id ON job_assignments(job_pack_id);
CREATE INDEX IF NOT EXISTS idx_job_assignments_team_member_id ON job_assignments(team_member_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_job_assignments_unique ON job_assignments(job_pack_id, team_member_id);

ALTER TABLE job_assignments ENABLE ROW LEVEL SECURITY;

-- 5. timesheets
CREATE TABLE IF NOT EXISTS timesheets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_member_id UUID NOT NULL REFERENCES team_members(id) ON DELETE CASCADE,
  job_pack_id UUID REFERENCES job_packs(id) ON DELETE SET NULL,
  clock_in TIMESTAMPTZ NOT NULL,
  clock_out TIMESTAMPTZ,
  clock_in_lat NUMERIC,
  clock_in_lng NUMERIC,
  clock_out_lat NUMERIC,
  clock_out_lng NUMERIC,
  clock_in_accuracy NUMERIC,
  clock_out_accuracy NUMERIC,
  is_gps_verified BOOLEAN DEFAULT FALSE,
  break_minutes INTEGER DEFAULT 0,
  notes TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'submitted', 'approved', 'rejected')),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_timesheets_team_member_id ON timesheets(team_member_id);
CREATE INDEX IF NOT EXISTS idx_timesheets_job_pack_id ON timesheets(job_pack_id);
CREATE INDEX IF NOT EXISTS idx_timesheets_clock_in ON timesheets(clock_in);
CREATE INDEX IF NOT EXISTS idx_timesheets_status ON timesheets(status);

ALTER TABLE timesheets ENABLE ROW LEVEL SECURITY;

-- 6. gps_logs
CREATE TABLE IF NOT EXISTS gps_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timesheet_id UUID NOT NULL REFERENCES timesheets(id) ON DELETE CASCADE,
  lat NUMERIC NOT NULL,
  lng NUMERIC NOT NULL,
  accuracy NUMERIC,
  logged_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gps_logs_timesheet_id ON gps_logs(timesheet_id);

ALTER TABLE gps_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- STEP 2: Triggers (no cross-table dependencies)
-- ============================================================

CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON teams
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_team_members_updated_at BEFORE UPDATE ON team_members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_timesheets_updated_at BEFORE UPDATE ON timesheets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- STEP 3: RLS Policies (all tables exist now, cross-references safe)
-- ============================================================

-- teams policies
CREATE POLICY "Team owners can manage their team"
  ON teams FOR ALL
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Team members can view their team"
  ON teams FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.team_id = teams.id
        AND tm.user_id = auth.uid()
        AND tm.status = 'active'
    )
  );

-- team_members policies
CREATE POLICY "Team owners can manage members"
  ON team_members FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM teams t WHERE t.id = team_members.team_id AND t.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM teams t WHERE t.id = team_members.team_id AND t.owner_id = auth.uid()
    )
  );

CREATE POLICY "Active members can view team members"
  ON team_members FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM team_members my_membership
      WHERE my_membership.team_id = team_members.team_id
        AND my_membership.user_id = auth.uid()
        AND my_membership.status = 'active'
    )
  );

CREATE POLICY "Members can update own profile"
  ON team_members FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- team_invitations policies
CREATE POLICY "Team owners can manage invitations"
  ON team_invitations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM teams t WHERE t.id = team_invitations.team_id AND t.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM teams t WHERE t.id = team_invitations.team_id AND t.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can view invitations sent to them"
  ON team_invitations FOR SELECT
  USING (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

CREATE POLICY "Users can respond to their invitations"
  ON team_invitations FOR UPDATE
  USING (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
  WITH CHECK (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- job_assignments policies
CREATE POLICY "Team owners can manage job assignments"
  ON job_assignments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM team_members tm
      JOIN teams t ON t.id = tm.team_id
      WHERE tm.id = job_assignments.team_member_id
        AND t.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM team_members tm
      JOIN teams t ON t.id = tm.team_id
      WHERE tm.id = job_assignments.team_member_id
        AND t.owner_id = auth.uid()
    )
  );

CREATE POLICY "Workers can view their assignments"
  ON job_assignments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.id = job_assignments.team_member_id
        AND tm.user_id = auth.uid()
    )
  );

-- timesheets policies
CREATE POLICY "Workers can manage own timesheets"
  ON timesheets FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.id = timesheets.team_member_id
        AND tm.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.id = timesheets.team_member_id
        AND tm.user_id = auth.uid()
    )
  );

CREATE POLICY "Team owners can manage team timesheets"
  ON timesheets FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM team_members tm
      JOIN teams t ON t.id = tm.team_id
      WHERE tm.id = timesheets.team_member_id
        AND t.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM team_members tm
      JOIN teams t ON t.id = tm.team_id
      WHERE tm.id = timesheets.team_member_id
        AND t.owner_id = auth.uid()
    )
  );

-- gps_logs policies
CREATE POLICY "Workers can manage own gps logs"
  ON gps_logs FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM timesheets ts
      JOIN team_members tm ON tm.id = ts.team_member_id
      WHERE ts.id = gps_logs.timesheet_id
        AND tm.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM timesheets ts
      JOIN team_members tm ON tm.id = ts.team_member_id
      WHERE ts.id = gps_logs.timesheet_id
        AND tm.user_id = auth.uid()
    )
  );

CREATE POLICY "Team owners can view team gps logs"
  ON gps_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM timesheets ts
      JOIN team_members tm ON tm.id = ts.team_member_id
      JOIN teams t ON t.id = tm.team_id
      WHERE ts.id = gps_logs.timesheet_id
        AND t.owner_id = auth.uid()
    )
  );
