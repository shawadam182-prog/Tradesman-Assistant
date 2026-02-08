import React, { useState, useEffect } from 'react';
import { ArrowLeft, Users, Clock, CheckCircle, AlertCircle, Loader2, Briefcase } from 'lucide-react';
import { teamService } from '../src/services/teamService';
import { useToast } from '../src/contexts/ToastContext';

interface TeamDashboardProps {
  onBack: () => void;
}

export const TeamDashboard: React.FC<TeamDashboardProps> = ({ onBack }) => {
  const toast = useToast();
  const [team, setTeam] = useState<any>(null);
  const [timesheets, setTimesheets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const [teamData, tsData] = await Promise.all([
          teamService.getMyTeamWithMembers(),
          teamService.getTeamTimesheets(),
        ]);
        setTeam(teamData);
        setTimesheets(tsData);
      } catch (err) {
        console.error('Failed to fetch team data:', err);
        toast.error('Failed to load team data');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 text-teal-500 animate-spin" />
      </div>
    );
  }

  if (!team) {
    return (
      <div className="px-4 pt-4 lg:px-6">
        <button onClick={onBack} className="flex items-center gap-2 text-slate-400 mb-4">
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">Back</span>
        </button>
        <div className="bg-slate-800/50 rounded-xl p-8 text-center">
          <Users className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-slate-200 mb-2">No Team Yet</h2>
          <p className="text-sm text-slate-400 mb-4">Create a team to start managing field workers.</p>
          <p className="text-xs text-slate-500">Go to Team Setup to get started.</p>
        </div>
      </div>
    );
  }

  const activeMembers = (team.team_members || []).filter((m: any) => m.status === 'active' && m.role !== 'owner');
  const activeTimesheets = timesheets.filter(ts => ts.status === 'active');
  const pendingApprovals = timesheets.filter(ts => ts.status === 'submitted');

  // This week's hours
  const startOfWeek = new Date();
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay() + 1);
  startOfWeek.setHours(0, 0, 0, 0);

  const weekTimesheets = timesheets.filter(ts =>
    new Date(ts.clock_in) >= startOfWeek && ts.clock_out
  );

  const totalWeekHours = weekTimesheets.reduce((acc, ts) => {
    const ms = new Date(ts.clock_out).getTime() - new Date(ts.clock_in).getTime();
    return acc + ms / 3600000;
  }, 0);

  return (
    <div className="px-4 pt-4 lg:px-6 space-y-4">
      <div>
        <button onClick={onBack} className="flex items-center gap-2 text-slate-400 mb-3">
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">Back</span>
        </button>
        <h1 className="text-lg font-bold text-slate-200">{team.name} — Dashboard</h1>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-slate-800/50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-teal-400" />
            <span className="text-xs text-slate-400">Team Size</span>
          </div>
          <p className="text-2xl font-bold text-slate-200">{activeMembers.length}</p>
        </div>
        <div className="bg-slate-800/50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-blue-400" />
            <span className="text-xs text-slate-400">On Site Now</span>
          </div>
          <p className="text-2xl font-bold text-slate-200">{activeTimesheets.length}</p>
        </div>
        <div className="bg-slate-800/50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-4 h-4 text-amber-400" />
            <span className="text-xs text-slate-400">Pending</span>
          </div>
          <p className="text-2xl font-bold text-slate-200">{pendingApprovals.length}</p>
        </div>
        <div className="bg-slate-800/50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-4 h-4 text-green-400" />
            <span className="text-xs text-slate-400">Hours (Week)</span>
          </div>
          <p className="text-2xl font-bold text-slate-200">{totalWeekHours.toFixed(1)}</p>
        </div>
      </div>

      {/* Active workers */}
      {activeTimesheets.length > 0 && (
        <div>
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Currently On Site</h2>
          <div className="space-y-2">
            {activeTimesheets.map(ts => (
              <div key={ts.id} className="bg-teal-500/10 border border-teal-500/20 rounded-xl p-3 flex items-center gap-3">
                <div className="w-8 h-8 bg-teal-500/20 rounded-full flex items-center justify-center">
                  <Clock className="w-4 h-4 text-teal-400 animate-pulse" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-200">
                    {ts.team_member?.display_name || 'Unknown'}
                  </p>
                  <p className="text-xs text-slate-500">
                    {ts.job_pack?.title || 'No job'} — since{' '}
                    {new Date(ts.clock_in).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent timesheets */}
      <div>
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Recent Timesheets</h2>
        {timesheets.length === 0 ? (
          <div className="bg-slate-800/50 rounded-xl p-6 text-center">
            <Clock className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-sm text-slate-500">No timesheets yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {timesheets.slice(0, 10).map(ts => (
              <div key={ts.id} className="bg-slate-800/50 rounded-xl p-3 flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-200">
                    {ts.team_member?.display_name || 'Unknown'}
                  </p>
                  <p className="text-xs text-slate-500">
                    {new Date(ts.clock_in).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                    {ts.job_pack && ` · ${ts.job_pack.title}`}
                  </p>
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                  ts.status === 'approved' ? 'bg-green-500/20 text-green-400' :
                  ts.status === 'submitted' ? 'bg-amber-500/20 text-amber-400' :
                  ts.status === 'rejected' ? 'bg-red-500/20 text-red-400' :
                  'bg-blue-500/20 text-blue-400'
                }`}>
                  {ts.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
