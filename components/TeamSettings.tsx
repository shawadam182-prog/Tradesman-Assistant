import React, { useState, useEffect } from 'react';
import { ArrowLeft, Users, Plus, Mail, Trash2, Loader2, UserCheck, UserX, Clock, Minus, Shield, HardHat } from 'lucide-react';
import { teamService } from '../src/services/teamService';
import { useToast } from '../src/contexts/ToastContext';
import { useAuth } from '../src/contexts/AuthContext';
import { useData } from '../src/contexts/DataContext';
import { updateAdminSeats } from '../src/lib/stripe';
import { MAX_FIELD_WORKERS } from '../types';
import type { TeamRole, SubscriptionTier } from '../types';

interface TeamSettingsProps {
  onBack: () => void;
}

export const TeamSettings: React.FC<TeamSettingsProps> = ({ onBack }) => {
  const { user } = useAuth();
  const { settings } = useData();
  const toast = useToast();

  const [team, setTeam] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [invitations, setInvitations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  // Create team form
  const [teamName, setTeamName] = useState('');

  // Invite form
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteDisplayName, setInviteDisplayName] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'field_worker'>('field_worker');
  const [inviting, setInviting] = useState(false);

  // Seat management
  const [updatingSeats, setUpdatingSeats] = useState(false);
  const adminSeatCount = settings.adminSeatCount ?? settings.teamSeatCount ?? 0;
  const activeAdmins = members.filter(m => m.role === 'admin' && m.status === 'active').length;
  const activeFieldWorkers = members.filter(m => m.role === 'field_worker' && m.status === 'active').length;
  const hasSubscription = settings.subscriptionStatus === 'active' || settings.subscriptionStatus === 'trialing';
  const tier = (settings.subscriptionTier || 'free') as SubscriptionTier;
  const maxFreeWorkers = MAX_FIELD_WORKERS[tier] || 0;

  useEffect(() => {
    fetchTeamData();
  }, []);

  const fetchTeamData = async () => {
    try {
      setLoading(true);
      const teamData = await teamService.getMyTeam();
      setTeam(teamData);

      if (teamData) {
        const [membersData, invitesData] = await Promise.all([
          teamService.getTeamMembers(teamData.id),
          teamService.getTeamInvitations(teamData.id),
        ]);
        setMembers(membersData);
        setInvitations(invitesData);
      }
    } catch (err) {
      console.error('Failed to fetch team:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTeam = async () => {
    if (!teamName.trim()) return;
    setCreating(true);
    try {
      await teamService.createTeam(teamName.trim());
      toast.success('Team created!');
      await fetchTeamData();
    } catch (err) {
      toast.error('Failed to create team');
    } finally {
      setCreating(false);
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim() || !team) return;

    // Check limits based on role
    if (inviteRole === 'admin') {
      if (adminSeatCount > 0 && activeAdmins >= adminSeatCount) {
        toast.error('All admin seats are in use. Add another seat before inviting.');
        return;
      }
    } else {
      if (maxFreeWorkers > 0 && activeFieldWorkers >= maxFreeWorkers) {
        toast.error(`Your ${tier} plan includes ${maxFreeWorkers} field workers. Upgrade for more.`);
        return;
      }
    }

    setInviting(true);
    try {
      await teamService.sendInvitation(team.id, inviteEmail.trim(), inviteRole, inviteDisplayName.trim() || undefined);

      // Try to send email (non-blocking)
      try {
        await teamService.sendInvitationEmail(
          inviteEmail.trim(),
          inviteRole,
          inviteDisplayName.trim() || undefined,
          team.name,
          settings.companyName || user?.email || 'Your employer'
        );
      } catch {
        // Email sending is best-effort
      }

      toast.success(`Invitation sent to ${inviteEmail}`);
      setInviteEmail('');
      setInviteDisplayName('');
      await fetchTeamData();
    } catch (err: any) {
      if (err?.message?.includes('duplicate')) {
        toast.error('This email has already been invited');
      } else {
        toast.error('Failed to send invitation');
      }
    } finally {
      setInviting(false);
    }
  };

  const handleDeactivate = async (memberId: string, name: string) => {
    try {
      await teamService.deactivateMember(memberId);
      toast.info(`${name} has been deactivated`);
      await fetchTeamData();
    } catch (err) {
      toast.error('Failed to deactivate member');
    }
  };

  const handleRevokeInvite = async (invitationId: string) => {
    try {
      await teamService.revokeInvitation(invitationId);
      toast.info('Invitation revoked');
      await fetchTeamData();
    } catch (err) {
      toast.error('Failed to revoke invitation');
    }
  };

  const handleUpdateRate = async (memberId: string, rate: string) => {
    try {
      await teamService.updateMember(memberId, { hourly_rate: parseFloat(rate) || 0 });
    } catch (err) {
      toast.error('Failed to update rate');
    }
  };

  const handleUpdateAdminSeats = async (newCount: number) => {
    if (newCount < 0 || !Number.isInteger(newCount)) return;
    if (newCount < activeAdmins) {
      toast.error(`Cannot reduce below ${activeAdmins} seats — deactivate admins first`);
      return;
    }
    setUpdatingSeats(true);
    try {
      await updateAdminSeats(newCount);
      toast.success(`Admin seats updated to ${newCount}`);
      // Update locally for instant feedback
      (settings as any).adminSeatCount = newCount;
      (settings as any).teamSeatCount = newCount;
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update seats');
    } finally {
      setUpdatingSeats(false);
    }
  };

  const roleBadge = (role: string) => {
    if (role === 'owner') return <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-500/20 text-amber-400">OWNER</span>;
    if (role === 'admin') return <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-500/20 text-blue-400">ADMIN</span>;
    return <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-500/20 text-slate-400">WORKER</span>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 text-teal-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="px-4 pt-4 lg:px-6 space-y-6 pb-40">
      <div>
        <button onClick={onBack} className="flex items-center gap-2 text-slate-400 mb-3">
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">Back</span>
        </button>
        <h1 className="text-lg font-bold text-slate-200">Team Setup</h1>
      </div>

      {/* Create team (if no team exists) */}
      {!team ? (
        <div className="bg-slate-800/50 rounded-xl p-6 space-y-4">
          <div className="text-center">
            <Users className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h2 className="text-lg font-semibold text-slate-200 mb-1">Create Your Team</h2>
            <p className="text-sm text-slate-400">Set up a team to invite admins and field workers.</p>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-1">Team Name</label>
            <input
              type="text"
              value={teamName}
              onChange={e => setTeamName(e.target.value)}
              placeholder="e.g. Smith Plumbing"
              className="w-full px-3 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-teal-500"
            />
          </div>
          <button
            onClick={handleCreateTeam}
            disabled={!teamName.trim() || creating}
            className="w-full py-2.5 bg-teal-500 text-white font-medium rounded-lg hover:bg-teal-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Create Team
          </button>
        </div>
      ) : (
        <>
          {/* Team info */}
          <div className="bg-slate-800/50 rounded-xl p-4">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Team</h2>
            <p className="text-lg font-semibold text-slate-200">{team.name}</p>
          </div>

          {/* Admin Seats (paid) */}
          {hasSubscription && (
            <div className="bg-slate-800/50 rounded-xl p-4 space-y-3">
              <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Admin Users</h2>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-300">
                    {adminSeatCount} seat{adminSeatCount !== 1 ? 's' : ''} purchased
                  </p>
                  <p className="text-xs text-slate-500">
                    {activeAdmins} of {adminSeatCount} in use &middot; £10/mo per admin
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleUpdateAdminSeats(adminSeatCount - 1)}
                    disabled={updatingSeats || adminSeatCount <= 0}
                    className="w-8 h-8 flex items-center justify-center bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 disabled:opacity-30 transition-colors"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="text-lg font-bold text-slate-200 w-8 text-center">
                    {updatingSeats ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : adminSeatCount}
                  </span>
                  <button
                    onClick={() => handleUpdateAdminSeats(adminSeatCount + 1)}
                    disabled={updatingSeats}
                    className="w-8 h-8 flex items-center justify-center bg-teal-500 text-white rounded-lg hover:bg-teal-600 disabled:opacity-50 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Field Workers (free with tier limits) */}
          <div className="bg-slate-800/50 rounded-xl p-4">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Field Workers</h2>
            <p className="text-sm text-slate-300">
              {activeFieldWorkers} of {maxFreeWorkers} included free
            </p>
            <p className="text-xs text-slate-500">
              {tier === 'professional' ? 'Pro' : tier === 'business' ? 'Business' : tier.charAt(0).toUpperCase() + tier.slice(1)} plan includes {maxFreeWorkers} field workers
            </p>
          </div>

          {!hasSubscription && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
              <p className="text-sm text-amber-400">
                You need an active subscription to manage your team. Go to Settings to subscribe.
              </p>
            </div>
          )}

          {/* Invite member */}
          <div className="bg-slate-800/50 rounded-xl p-4 space-y-3">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Invite Team Member</h2>

            {/* Role selector */}
            <div className="flex gap-2">
              <button
                onClick={() => setInviteRole('field_worker')}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                  inviteRole === 'field_worker'
                    ? 'bg-teal-500/20 text-teal-400 border border-teal-500/50'
                    : 'bg-slate-700 text-slate-400 border border-slate-600'
                }`}
              >
                <HardHat className="w-4 h-4" />
                Field Worker
              </button>
              <button
                onClick={() => setInviteRole('admin')}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                  inviteRole === 'admin'
                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50'
                    : 'bg-slate-700 text-slate-400 border border-slate-600'
                }`}
              >
                <Shield className="w-4 h-4" />
                Admin
              </button>
            </div>
            <p className="text-xs text-slate-500">
              {inviteRole === 'field_worker'
                ? 'Can view assigned jobs, submit timesheets, add photos & notes. Free within plan limits.'
                : 'Can manage jobs, quotes, invoices, customers & team. £10/mo per admin.'}
            </p>

            <div className="space-y-2">
              <input
                type="email"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                placeholder="Email address"
                className="w-full px-3 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-teal-500"
              />
              <input
                type="text"
                value={inviteDisplayName}
                onChange={e => setInviteDisplayName(e.target.value)}
                placeholder="Display name (optional)"
                className="w-full px-3 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-teal-500"
              />
              <button
                onClick={handleInvite}
                disabled={!inviteEmail.trim() || inviting}
                className="w-full py-2.5 bg-teal-500 text-white font-medium rounded-lg hover:bg-teal-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {inviting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                Invite {inviteRole === 'admin' ? 'Admin' : 'Field Worker'}
              </button>
            </div>
          </div>

          {/* Pending invitations */}
          {invitations.filter(i => i.status === 'pending').length > 0 && (
            <div className="bg-slate-800/50 rounded-xl p-4">
              <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Pending Invitations</h2>
              <div className="space-y-2">
                {invitations.filter(i => i.status === 'pending').map(inv => (
                  <div key={inv.id} className="flex items-center justify-between py-2 border-b border-slate-700 last:border-0">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm text-slate-200">{inv.email}</p>
                        {roleBadge(inv.role)}
                      </div>
                      <p className="text-xs text-slate-500">
                        Expires {new Date(inv.expires_at).toLocaleDateString('en-GB')}
                      </p>
                    </div>
                    <button
                      onClick={() => handleRevokeInvite(inv.id)}
                      className="p-1.5 text-slate-500 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Team members */}
          <div className="bg-slate-800/50 rounded-xl p-4">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Team Members ({members.filter(m => m.status === 'active').length})
            </h2>
            <div className="space-y-3">
              {members.filter(m => m.role !== 'owner').map(member => (
                <div key={member.id} className="bg-slate-700/50 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {member.status === 'active' ? (
                        <UserCheck className="w-4 h-4 text-green-400" />
                      ) : (
                        <UserX className="w-4 h-4 text-slate-500" />
                      )}
                      <span className="text-sm font-medium text-slate-200">{member.display_name}</span>
                      {roleBadge(member.role)}
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                        member.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-slate-600/20 text-slate-500'
                      }`}>
                        {member.status}
                      </span>
                    </div>
                    {member.status === 'active' && (
                      <button
                        onClick={() => handleDeactivate(member.id, member.display_name)}
                        className="text-xs text-red-400 hover:text-red-300"
                      >
                        Deactivate
                      </button>
                    )}
                  </div>
                  {member.role === 'field_worker' && (
                    <div className="flex items-center gap-2">
                      <Clock className="w-3 h-3 text-slate-500" />
                      <span className="text-xs text-slate-400">Rate:</span>
                      <input
                        type="number"
                        defaultValue={member.hourly_rate || 0}
                        onBlur={e => handleUpdateRate(member.id, e.target.value)}
                        className="w-20 px-2 py-1 bg-slate-600 border border-slate-500 rounded text-xs text-slate-200 focus:outline-none focus:border-teal-500"
                      />
                      <span className="text-xs text-slate-500">/hr</span>
                    </div>
                  )}
                </div>
              ))}
              {members.filter(m => m.role !== 'owner').length === 0 && (
                <p className="text-sm text-slate-500 text-center py-4">No team members yet. Send an invitation above.</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
