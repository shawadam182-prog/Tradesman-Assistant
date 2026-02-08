-- ============================================================
-- Team RLS Policies for Existing Tables + Invitation Functions
-- Additive only — existing policies untouched
-- ============================================================

-- ============================================================
-- PART 1: Helper function
-- ============================================================

-- Check if the calling user is assigned to a specific job_pack
CREATE OR REPLACE FUNCTION is_assigned_to_job(p_job_pack_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM job_assignments ja
    JOIN team_members tm ON tm.id = ja.team_member_id
    WHERE ja.job_pack_id = p_job_pack_id
      AND tm.user_id = auth.uid()
      AND tm.status = 'active'
  );
$$;

-- ============================================================
-- PART 2: New SELECT policies on existing tables
-- (ORed with existing policies — no existing policies touched)
-- ============================================================

-- job_packs: Workers can view jobs they're assigned to
CREATE POLICY "Team members can view assigned job packs"
  ON job_packs FOR SELECT
  USING (is_assigned_to_job(id));

-- customers: Workers can view customers linked to their assigned jobs
CREATE POLICY "Team members can view customers for assigned jobs"
  ON customers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM job_packs jp
      JOIN job_assignments ja ON ja.job_pack_id = jp.id
      JOIN team_members tm ON tm.id = ja.team_member_id
      WHERE jp.customer_id = customers.id
        AND tm.user_id = auth.uid()
        AND tm.status = 'active'
    )
  );

-- schedule_entries: Workers can view schedule entries for their assigned jobs
CREATE POLICY "Team members can view schedule for assigned jobs"
  ON schedule_entries FOR SELECT
  USING (
    job_pack_id IS NOT NULL AND is_assigned_to_job(job_pack_id)
  );

-- site_notes: Workers can view and add notes on assigned jobs
CREATE POLICY "Team members can view notes for assigned jobs"
  ON site_notes FOR SELECT
  USING (is_assigned_to_job(job_pack_id));

CREATE POLICY "Team members can insert notes for assigned jobs"
  ON site_notes FOR INSERT
  WITH CHECK (is_assigned_to_job(job_pack_id));

-- site_photos: Workers can view and add photos on assigned jobs
CREATE POLICY "Team members can view photos for assigned jobs"
  ON site_photos FOR SELECT
  USING (is_assigned_to_job(job_pack_id));

CREATE POLICY "Team members can insert photos for assigned jobs"
  ON site_photos FOR INSERT
  WITH CHECK (is_assigned_to_job(job_pack_id));

-- site_documents: Workers can view documents on assigned jobs
CREATE POLICY "Team members can view documents for assigned jobs"
  ON site_documents FOR SELECT
  USING (is_assigned_to_job(job_pack_id));

-- project_materials: Workers can view materials on assigned jobs
CREATE POLICY "Team members can view materials for assigned jobs"
  ON project_materials FOR SELECT
  USING (is_assigned_to_job(job_pack_id));

-- ============================================================
-- PART 3: Invitation accept/decline RPC functions
-- ============================================================

-- Accept team invitation
CREATE OR REPLACE FUNCTION accept_team_invitation(p_token UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_invitation RECORD;
  v_existing_member RECORD;
  v_new_member_id UUID;
BEGIN
  -- Find invitation by token
  SELECT * INTO v_invitation
  FROM team_invitations
  WHERE token = p_token
    AND status = 'pending'
    AND expires_at > NOW();

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invitation not found, expired, or already used');
  END IF;

  -- Verify the calling user's email matches the invitation
  IF v_invitation.email != (SELECT email FROM auth.users WHERE id = auth.uid()) THEN
    RETURN jsonb_build_object('success', false, 'error', 'This invitation was sent to a different email address');
  END IF;

  -- Check if user is already a member of this team
  SELECT * INTO v_existing_member
  FROM team_members
  WHERE team_id = v_invitation.team_id
    AND user_id = auth.uid();

  IF FOUND THEN
    -- Reactivate if deactivated
    IF v_existing_member.status = 'deactivated' THEN
      UPDATE team_members SET status = 'active', updated_at = NOW()
      WHERE id = v_existing_member.id;
    END IF;

    -- Mark invitation as accepted
    UPDATE team_invitations SET status = 'accepted' WHERE id = v_invitation.id;

    RETURN jsonb_build_object('success', true, 'team_member_id', v_existing_member.id, 'reactivated', true);
  END IF;

  -- Create new team member
  INSERT INTO team_members (team_id, user_id, role, display_name, status)
  VALUES (
    v_invitation.team_id,
    auth.uid(),
    v_invitation.role,
    COALESCE(v_invitation.display_name, split_part(v_invitation.email, '@', 1)),
    'active'
  )
  RETURNING id INTO v_new_member_id;

  -- Mark invitation as accepted
  UPDATE team_invitations SET status = 'accepted' WHERE id = v_invitation.id;

  RETURN jsonb_build_object('success', true, 'team_member_id', v_new_member_id, 'reactivated', false);
END;
$$;

GRANT EXECUTE ON FUNCTION accept_team_invitation(UUID) TO authenticated;

-- Decline team invitation
CREATE OR REPLACE FUNCTION decline_team_invitation(p_token UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE team_invitations
  SET status = 'declined'
  WHERE token = p_token
    AND status = 'pending'
    AND email = (SELECT email FROM auth.users WHERE id = auth.uid());

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invitation not found');
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION decline_team_invitation(UUID) TO authenticated;
