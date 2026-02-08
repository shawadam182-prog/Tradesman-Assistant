import { supabase } from '../lib/supabase';

export const teamService = {
  // ============================================
  // TEAM CRUD
  // ============================================

  async getMyTeam() {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return null;

    // Check if user owns a team
    const { data, error } = await supabase
      .from('teams')
      .select('*')
      .eq('owner_id', user.id)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async getMyTeamWithMembers() {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return null;

    const { data, error } = await supabase
      .from('teams')
      .select('*, team_members(*), team_invitations(*)')
      .eq('owner_id', user.id)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async createTeam(name: string) {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('teams')
      .insert({ owner_id: user.id, name })
      .select()
      .single();
    if (error) throw error;

    // Add owner as team member with role='owner'
    await supabase.from('team_members').insert({
      team_id: data.id,
      user_id: user.id,
      role: 'owner',
      display_name: name,
      status: 'active',
    });

    return data;
  },

  async updateTeam(teamId: string, updates: { name?: string }) {
    const { data, error } = await supabase
      .from('teams')
      .update(updates)
      .eq('id', teamId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // ============================================
  // TEAM MEMBERS
  // ============================================

  async getTeamMembers(teamId: string) {
    const { data, error } = await supabase
      .from('team_members')
      .select('*')
      .eq('team_id', teamId)
      .order('created_at');
    if (error) throw error;
    return data;
  },

  async updateMember(memberId: string, updates: { display_name?: string; phone?: string; hourly_rate?: number; status?: string }) {
    const { data, error } = await supabase
      .from('team_members')
      .update(updates)
      .eq('id', memberId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deactivateMember(memberId: string) {
    const { error } = await supabase
      .from('team_members')
      .update({ status: 'deactivated' })
      .eq('id', memberId);
    if (error) throw error;
  },

  // ============================================
  // INVITATIONS
  // ============================================

  async sendInvitation(teamId: string, email: string, role: string, displayName?: string) {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('team_invitations')
      .insert({
        team_id: teamId,
        email: email.toLowerCase().trim(),
        role,
        display_name: displayName,
        invited_by: user.id,
      })
      .select()
      .single();
    if (error) throw error;

    return data;
  },

  async sendInvitationEmail(email: string, role: string, displayName: string | undefined, teamName: string, inviterName: string) {
    const { error } = await supabase.functions.invoke('team-invite', {
      body: { email, role, display_name: displayName, team_name: teamName, inviter_name: inviterName },
    });
    if (error) throw error;
  },

  async getMyInvitations() {
    const { data, error } = await supabase
      .from('team_invitations')
      .select('*, team:teams(id, name, owner_id)')
      .eq('status', 'pending');
    if (error) throw error;
    return data || [];
  },

  async getTeamInvitations(teamId: string) {
    const { data, error } = await supabase
      .from('team_invitations')
      .select('*')
      .eq('team_id', teamId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async acceptInvitation(token: string) {
    const { data, error } = await supabase.rpc('accept_team_invitation', { p_token: token });
    if (error) throw error;
    return data;
  },

  async declineInvitation(token: string) {
    const { data, error } = await supabase.rpc('decline_team_invitation', { p_token: token });
    if (error) throw error;
    return data;
  },

  async revokeInvitation(invitationId: string) {
    const { error } = await supabase
      .from('team_invitations')
      .update({ status: 'revoked' })
      .eq('id', invitationId);
    if (error) throw error;
  },

  // ============================================
  // JOB ASSIGNMENTS
  // ============================================

  async assignJob(jobPackId: string, teamMemberId: string) {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('job_assignments')
      .insert({
        job_pack_id: jobPackId,
        team_member_id: teamMemberId,
        assigned_by: user.id,
      })
      .select('*, team_member:team_members(*)')
      .single();
    if (error) throw error;
    return data;
  },

  async unassignJob(jobPackId: string, teamMemberId: string) {
    const { error } = await supabase
      .from('job_assignments')
      .delete()
      .eq('job_pack_id', jobPackId)
      .eq('team_member_id', teamMemberId);
    if (error) throw error;
  },

  async getAssignmentsForJob(jobPackId: string) {
    const { data, error } = await supabase
      .from('job_assignments')
      .select('*, team_member:team_members(*)')
      .eq('job_pack_id', jobPackId);
    if (error) throw error;
    return data || [];
  },

  async getMyAssignments() {
    const { data, error } = await supabase
      .from('job_assignments')
      .select('*, job_pack:job_packs(id, title, status, customer:customers(id, name))')
      .order('assigned_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async getTeamAssignments() {
    const { data, error } = await supabase
      .from('job_assignments')
      .select('*, team_member:team_members(id, display_name)')
      .order('assigned_at');
    if (error) throw error;
    return data || [];
  },

  // ============================================
  // TIMESHEETS
  // ============================================

  async clockIn(teamMemberId: string, jobPackId: string | null, lat?: number, lng?: number, accuracy?: number) {
    const { data, error } = await supabase
      .from('timesheets')
      .insert({
        team_member_id: teamMemberId,
        job_pack_id: jobPackId,
        clock_in: new Date().toISOString(),
        clock_in_lat: lat,
        clock_in_lng: lng,
        clock_in_accuracy: accuracy,
        is_gps_verified: lat !== undefined,
        status: 'active',
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async clockOut(timesheetId: string, lat?: number, lng?: number, accuracy?: number) {
    const { data, error } = await supabase
      .from('timesheets')
      .update({
        clock_out: new Date().toISOString(),
        clock_out_lat: lat,
        clock_out_lng: lng,
        clock_out_accuracy: accuracy,
        status: 'submitted',
      })
      .eq('id', timesheetId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async getActiveTimesheet(teamMemberId: string) {
    const { data, error } = await supabase
      .from('timesheets')
      .select('*, job_pack:job_packs(id, title)')
      .eq('team_member_id', teamMemberId)
      .eq('status', 'active')
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async getMyTimesheets(teamMemberId: string) {
    const { data, error } = await supabase
      .from('timesheets')
      .select('*, job_pack:job_packs(id, title)')
      .eq('team_member_id', teamMemberId)
      .order('clock_in', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async getTeamTimesheets(dateFrom?: string, dateTo?: string) {
    let query = supabase
      .from('timesheets')
      .select('*, team_member:team_members(id, display_name, user_id, hourly_rate), job_pack:job_packs(id, title)')
      .order('clock_in', { ascending: false });
    if (dateFrom) query = query.gte('clock_in', dateFrom);
    if (dateTo) query = query.lte('clock_in', dateTo);
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  async updateTimesheet(timesheetId: string, updates: { notes?: string; break_minutes?: number }) {
    const { data, error } = await supabase
      .from('timesheets')
      .update(updates)
      .eq('id', timesheetId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async approveTimesheet(timesheetId: string) {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('timesheets')
      .update({
        status: 'approved',
        approved_by: user.id,
        approved_at: new Date().toISOString(),
      })
      .eq('id', timesheetId);
    if (error) throw error;
  },

  async rejectTimesheet(timesheetId: string, reason: string) {
    const { error } = await supabase
      .from('timesheets')
      .update({
        status: 'rejected',
        rejection_reason: reason,
      })
      .eq('id', timesheetId);
    if (error) throw error;
  },

  async resubmitTimesheet(timesheetId: string) {
    const { error } = await supabase
      .from('timesheets')
      .update({
        status: 'submitted',
        rejection_reason: null,
      })
      .eq('id', timesheetId);
    if (error) throw error;
  },

  // ============================================
  // GPS LOGS
  // ============================================

  async logGPS(timesheetId: string, lat: number, lng: number, accuracy?: number) {
    const { error } = await supabase
      .from('gps_logs')
      .insert({ timesheet_id: timesheetId, lat, lng, accuracy });
    if (error) throw error;
  },

  async getGPSLogs(timesheetId: string) {
    const { data, error } = await supabase
      .from('gps_logs')
      .select('*')
      .eq('timesheet_id', timesheetId)
      .order('logged_at');
    if (error) throw error;
    return data || [];
  },

  // ============================================
  // MEMBERSHIP CHECK (for role-based UI routing)
  // ============================================

  // ============================================
  // NOTIFICATIONS
  // ============================================

  async notifyTimesheetStatus(timesheetId: string, action: 'approved' | 'rejected', reason?: string) {
    try {
      await supabase.functions.invoke('timesheet-notify', {
        body: { timesheet_id: timesheetId, action, reason },
      });
    } catch (err) {
      // Non-blocking — log but don't throw
      console.warn('Failed to send timesheet notification:', err);
    }
  },

  // ============================================
  // MEMBERSHIP CHECK (for role-based UI routing)
  // ============================================

  async getMyMembership() {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return null;

    const { data, error } = await supabase
      .from('team_members')
      .select('*, team:teams(id, name, owner_id)')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle();
    if (error) throw error;
    return data;
  },
};
