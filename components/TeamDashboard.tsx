import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Users, Clock, CheckCircle, AlertCircle, Loader2, Briefcase } from 'lucide-react';
import { teamService } from '../src/services/teamService';
import { useToast } from '../src/contexts/ToastContext';
import { useData } from '../src/contexts/DataContext';
import { JobAssignmentModal } from './JobAssignmentModal';

interface TeamDashboardProps {
  onBack: () => void;
  onViewWorker?: (memberId: string, name: string, hourlyRate?: number) => void;
}

export const TeamDashboard: React.FC<TeamDashboardProps> = ({ onBack, onViewWorker }) => {
  const toast = useToast();
  const { projects } = useData();
  const [team, setTeam] = useState<any>(null);
  const [timesheets, setTimesheets] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [assignModalJobId, setAssignModalJobId] = useState<string | null>(null);

  const refreshAssignments = useCallback(async () => {
    try {
      const a = await teamService.getTeamAssignments();
      setAssignments(a);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    const fetch = async () => {
      try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const [teamData, tsData, assignData] = await Promise.all([
          teamService.getMyTeamWithMembers(),
          teamService.getTeamTimesheets(thirtyDaysAgo.toISOString()),
          teamService.getTeamAssignments(),
        ]);
        setTeam(teamData);
        setTimesheets(tsData);
        setAssignments(assignData);
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
        <button onClick={onBack} className="flex items-center gap-2 text-teal-600 hover:text-teal-700 mb-4 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium">Back</span>
        </button>
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-sm">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-slate-400" />
          </div>
          <h2 className="text-lg font-semibold text-slate-800 mb-2">No Team Yet</h2>
          <p className="text-sm text-slate-500 mb-4">Create a team to start managing field workers.</p>
          <p className="text-xs text-slate-400">Go to Team Setup to get started.</p>
        </div>
      </div>
    );
  }

  const activeMembers = (team.team_members || []).filter((m: any) => m.status === 'active' && m.role !== 'owner');
  const activeTimesheets = timesheets.filter(ts => ts.status === 'active');
  const pendingApprovals = timesheets.filter(ts => ts.status === 'submitted');

  // Assignment data
  const activeJobs = projects.filter(p => p.status === 'active');
  const assignedJobIds = new Set(assignments.map(a => a.job_pack_id));
  const unassignedJobs = activeJobs.filter(j => !assignedJobIds.has(j.id));
  const memberAssignments = new Map<string, { name: string; jobs: { id: string; title: string }[] }>();
  for (const a of assignments) {
    const memberId = a.team_member_id;
    const memberName = a.team_member?.display_name || 'Unknown';
    if (!memberAssignments.has(memberId)) {
      memberAssignments.set(memberId, { name: memberName, jobs: [] });
    }
    const job = activeJobs.find(j => j.id === a.job_pack_id);
    if (job) {
      memberAssignments.get(memberId)!.jobs.push({ id: job.id, title: job.title });
    }
  }

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
    <div className="px-4 pt-4 lg:px-6 space-y-4 pb-8">
      <div>
        <button onClick={onBack} className="flex items-center gap-2 text-teal-600 hover:text-teal-700 mb-3 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium">Back</span>
        </button>
        <h1 className="text-xl font-bold text-teal-600">{team.name} — Dashboard</h1>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-gradient-to-br from-teal-500 to-teal-600 rounded-2xl p-4 shadow-lg shadow-teal-500/20">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-teal-100" />
            <span className="text-xs text-teal-100 font-medium">Team Size</span>
          </div>
          <p className="text-3xl font-bold text-white">{activeMembers.length}</p>
        </div>
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-4 shadow-lg shadow-blue-500/20">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-blue-100" />
            <span className="text-xs text-blue-100 font-medium">On Site Now</span>
          </div>
          <p className="text-3xl font-bold text-white">{activeTimesheets.length}</p>
        </div>
        <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl p-4 shadow-lg shadow-amber-500/20">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-4 h-4 text-amber-100" />
            <span className="text-xs text-amber-100 font-medium">Pending</span>
          </div>
          <p className="text-3xl font-bold text-white">{pendingApprovals.length}</p>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-4 shadow-lg shadow-green-500/20">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-4 h-4 text-green-100" />
            <span className="text-xs text-green-100 font-medium">Hours (Week)</span>
          </div>
          <p className="text-3xl font-bold text-white">{totalWeekHours.toFixed(1)}</p>
        </div>
      </div>

      {/* Job Assignments */}
      <div>
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Job Assignments</h2>

        {/* Unassigned alert */}
        {unassignedJobs.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-3 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-amber-800">{unassignedJobs.length} active job{unassignedJobs.length !== 1 ? 's' : ''} unassigned</p>
              <p className="text-xs text-amber-600 mt-0.5 truncate">{unassignedJobs.slice(0, 3).map(j => j.title).join(', ')}{unassignedJobs.length > 3 ? '...' : ''}</p>
            </div>
          </div>
        )}

        {/* Per-worker assignments */}
        {memberAssignments.size > 0 ? (
          <div className="space-y-2">
            {Array.from(memberAssignments.entries()).map(([memberId, { name, jobs }]) => (
              <div key={memberId} className="bg-white rounded-xl border border-slate-200 p-3 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <button
                    onClick={() => onViewWorker?.(memberId, name)}
                    className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                  >
                    <div className="w-7 h-7 bg-teal-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                      {name.charAt(0).toUpperCase()}
                    </div>
                    <p className="text-sm font-semibold text-slate-800">{name}</p>
                  </button>
                  <span className="text-[10px] bg-teal-50 text-teal-600 px-1.5 py-0.5 rounded-full font-medium">{jobs.length} job{jobs.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {jobs.map(job => (
                    <button
                      key={job.id}
                      onClick={() => setAssignModalJobId(job.id)}
                      className="flex items-center gap-1 px-2 py-1 bg-slate-50 hover:bg-teal-50 rounded-md text-[11px] font-medium text-slate-600 hover:text-teal-600 transition-colors"
                    >
                      <Briefcase size={10} />
                      <span className="truncate max-w-[120px]">{job.title}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : activeJobs.length > 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-6 text-center shadow-sm">
            <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-500">No workers assigned to jobs yet</p>
            <p className="text-xs text-slate-400 mt-1">Open a job and tap "Assign" to get started</p>
          </div>
        ) : null}

        {/* Unassigned jobs list */}
        {unassignedJobs.length > 0 && (
          <div className="mt-3">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Needs Assignment</p>
            <div className="space-y-1">
              {unassignedJobs.map(job => (
                <button
                  key={job.id}
                  onClick={() => setAssignModalJobId(job.id)}
                  className="w-full flex items-center gap-2 px-3 py-2 bg-amber-50 hover:bg-amber-100 rounded-lg text-left transition-colors"
                >
                  <Briefcase size={12} className="text-amber-500 flex-shrink-0" />
                  <span className="text-xs font-medium text-amber-800 truncate">{job.title}</span>
                  <span className="text-[10px] text-amber-500 ml-auto flex-shrink-0">Assign</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Active workers */}
      {activeTimesheets.length > 0 && (
        <div>
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Currently On Site</h2>
          <div className="space-y-2">
            {activeTimesheets.map(ts => (
              <div
                key={ts.id}
                onClick={() => ts.team_member && onViewWorker?.(ts.team_member.id, ts.team_member.display_name, ts.team_member.hourly_rate)}
                className="bg-teal-50 border border-teal-200 rounded-xl p-4 flex items-center gap-3 cursor-pointer hover:bg-teal-100 transition-colors"
              >
                <div className="w-10 h-10 bg-teal-500 rounded-full flex items-center justify-center">
                  <Clock className="w-5 h-5 text-white animate-pulse" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800">
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
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Recent Timesheets</h2>
        {timesheets.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-sm">
            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Clock className="w-6 h-6 text-slate-400" />
            </div>
            <p className="text-sm text-slate-500">No timesheets yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {timesheets.slice(0, 10).map(ts => (
              <div key={ts.id} className="bg-white rounded-xl border border-slate-200 p-4 flex items-center justify-between shadow-sm hover:shadow-md transition-shadow">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800">
                    {ts.team_member?.display_name || 'Unknown'}
                  </p>
                  <p className="text-xs text-slate-500">
                    {new Date(ts.clock_in).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                    {ts.job_pack && ` · ${ts.job_pack.title}`}
                  </p>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${ts.status === 'approved' ? 'bg-green-100 text-green-700' :
                    ts.status === 'submitted' ? 'bg-amber-100 text-amber-700' :
                      ts.status === 'rejected' ? 'bg-red-100 text-red-700' :
                        'bg-blue-100 text-blue-700'
                  }`}>
                  {ts.status.charAt(0).toUpperCase() + ts.status.slice(1)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Job Assignment Modal */}
      {assignModalJobId && (
        <JobAssignmentModal
          jobPackId={assignModalJobId}
          jobTitle={projects.find(p => p.id === assignModalJobId)?.title || ''}
          onClose={() => setAssignModalJobId(null)}
          onAssignmentChange={refreshAssignments}
        />
      )}
    </div>
  );
};
