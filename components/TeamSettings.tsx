import React, { useState, useEffect } from 'react';
import { ArrowLeft, Users, Plus, Mail, Trash2, Loader2, UserCheck, UserX, Clock } from 'lucide-react';
import { teamService } from '../src/services/teamService';
import { useToast } from '../src/contexts/ToastContext';
import { useAuth } from '../src/contexts/AuthContext';
import { useData } from '../src/contexts/DataContext';

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
  const [inviting, setInviting] = useState(false);

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
    setInviting(true);
    try {
      await teamService.sendInvitation(team.id, inviteEmail.trim(), 'field_worker', inviteDisplayName.trim() || undefined);

      // Try to send email (non-blocking)
      try {
        await teamService.sendInvitationEmail(
          inviteEmail.trim(),
          'field_worker',
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
            <p className="text-sm text-slate-400">Set up a team to invite field workers and manage timesheets.</p>
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

          {/* Invite member */}
          <div className="bg-slate-800/50 rounded-xl p-4 space-y-3">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Invite Field Worker</h2>
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
                Send Invitation
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
                      <p className="text-sm text-slate-200">{inv.email}</p>
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
