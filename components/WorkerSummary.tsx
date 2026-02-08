import React, { useState, useEffect } from 'react';
import { ArrowLeft, Clock, Briefcase, MapPin, CheckCircle, XCircle, AlertCircle, Loader2, User, Coffee } from 'lucide-react';
import { teamService } from '../src/services/teamService';

interface WorkerSummaryProps {
  memberId: string;
  memberName: string;
  hourlyRate?: number;
  onBack: () => void;
}

export const WorkerSummary: React.FC<WorkerSummaryProps> = ({ memberId, memberName, hourlyRate, onBack }) => {
  const [timesheets, setTimesheets] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [gpsLogs, setGpsLogs] = useState<Map<string, any[]>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const [tsData, assignData] = await Promise.all([
          teamService.getTeamTimesheets(),
          teamService.getTeamAssignments(),
        ]);
        // Filter to this worker
        const memberTs = tsData.filter((ts: any) => ts.team_member_id === memberId);
        const memberAssign = assignData.filter((a: any) => a.team_member_id === memberId);
        setTimesheets(memberTs);
        setAssignments(memberAssign);

        // Fetch GPS logs for active timesheets
        const activeTs = memberTs.filter((ts: any) => ts.status === 'active');
        const logsMap = new Map<string, any[]>();
        for (const ts of activeTs) {
          try {
            const logs = await teamService.getGPSLogs(ts.id);
            if (logs.length > 0) logsMap.set(ts.id, logs);
          } catch { /* ignore */ }
        }
        setGpsLogs(logsMap);
      } catch (err) {
        console.error('Failed to fetch worker data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [memberId]);

  // Calculate stats
  const now = new Date();
  const startOfWeek = new Date(now);
  const dayOfWeek = startOfWeek.getDay();
  startOfWeek.setDate(startOfWeek.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  startOfWeek.setHours(0, 0, 0, 0);

  const weekTimesheets = timesheets.filter(ts =>
    new Date(ts.clock_in) >= startOfWeek && ts.clock_out
  );

  const totalWeekMinutes = weekTimesheets.reduce((acc, ts) => {
    const ms = new Date(ts.clock_out).getTime() - new Date(ts.clock_in).getTime();
    const breakMins = ts.break_minutes || 0;
    return acc + (ms / 60000) - breakMins;
  }, 0);

  const totalWeekHours = Math.max(0, totalWeekMinutes / 60);
  const weekPay = hourlyRate ? totalWeekHours * hourlyRate : 0;

  const approvedCount = timesheets.filter(ts => ts.status === 'approved').length;
  const submittedCount = timesheets.filter(ts => ts.status === 'submitted').length;
  const rejectedCount = timesheets.filter(ts => ts.status === 'rejected').length;
  const activeTs = timesheets.find(ts => ts.status === 'active');

  const formatDuration = (clockIn: string, clockOut: string | null) => {
    if (!clockOut) return 'In progress';
    const ms = new Date(clockOut).getTime() - new Date(clockIn).getTime();
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    return `${h}h ${m}m`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 text-teal-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="px-4 pt-4 lg:px-6 space-y-4 pb-40">
      <div>
        <button onClick={onBack} className="flex items-center gap-2 text-teal-600 hover:text-teal-700 mb-3 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium">Back</span>
        </button>
      </div>

      {/* Worker header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-teal-500 rounded-full flex items-center justify-center text-white text-xl font-bold shadow-lg shadow-teal-500/20">
            {memberName.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-slate-800">{memberName}</h1>
            <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
              {hourlyRate ? (
                <span className="font-medium">£{hourlyRate.toFixed(2)}/hr</span>
              ) : (
                <span className="italic">No rate set</span>
              )}
              <span>{assignments.length} job{assignments.length !== 1 ? 's' : ''} assigned</span>
            </div>
          </div>
          {activeTs && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-100 rounded-full">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-[11px] font-semibold text-green-700">On Site</span>
            </div>
          )}
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-gradient-to-br from-teal-500 to-teal-600 rounded-2xl p-4 shadow-lg shadow-teal-500/20">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-teal-100" />
            <span className="text-[10px] text-teal-100 font-semibold uppercase">This Week</span>
          </div>
          <p className="text-2xl font-bold text-white">{totalWeekHours.toFixed(1)}h</p>
          {weekPay > 0 && <p className="text-xs text-teal-100 mt-0.5">£{weekPay.toFixed(2)}</p>}
        </div>
        <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl p-4 shadow-lg shadow-amber-500/20">
          <div className="flex items-center gap-2 mb-1">
            <AlertCircle className="w-4 h-4 text-amber-100" />
            <span className="text-[10px] text-amber-100 font-semibold uppercase">Pending</span>
          </div>
          <p className="text-2xl font-bold text-white">{submittedCount}</p>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-4 shadow-lg shadow-green-500/20">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle className="w-4 h-4 text-green-100" />
            <span className="text-[10px] text-green-100 font-semibold uppercase">Approved</span>
          </div>
          <p className="text-2xl font-bold text-white">{approvedCount}</p>
        </div>
        <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-2xl p-4 shadow-lg shadow-red-500/20">
          <div className="flex items-center gap-2 mb-1">
            <XCircle className="w-4 h-4 text-red-100" />
            <span className="text-[10px] text-red-100 font-semibold uppercase">Rejected</span>
          </div>
          <p className="text-2xl font-bold text-white">{rejectedCount}</p>
        </div>
      </div>

      {/* Active session */}
      {activeTs && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
          <h2 className="text-xs font-semibold text-green-700 uppercase tracking-wider mb-2">Currently Clocked In</h2>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
              <Clock className="w-5 h-5 text-white animate-pulse" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">
                Since {new Date(activeTs.clock_in).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
              </p>
              {activeTs.job_pack && (
                <p className="text-xs text-slate-500">{activeTs.job_pack.title}</p>
              )}
            </div>
            {activeTs.is_gps_verified && (
              <div className="ml-auto flex items-center gap-1 text-[11px] text-green-600 font-medium">
                <MapPin className="w-3.5 h-3.5" />
                GPS
              </div>
            )}
          </div>

          {/* GPS trail for active session */}
          {gpsLogs.has(activeTs.id) && (
            <div className="mt-3 border-t border-green-200 pt-3">
              <p className="text-[10px] font-semibold text-green-600 uppercase tracking-wider mb-2">
                GPS Trail ({gpsLogs.get(activeTs.id)!.length} points)
              </p>
              <div className="flex flex-wrap gap-1.5">
                {gpsLogs.get(activeTs.id)!.slice(-8).map((log: any, idx: number) => (
                  <a
                    key={log.id || idx}
                    href={`https://www.google.com/maps?q=${log.lat},${log.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 px-2 py-1 bg-white rounded-md text-[10px] text-green-700 font-medium border border-green-200 hover:bg-green-100 transition-colors"
                  >
                    <MapPin className="w-3 h-3" />
                    {new Date(log.logged_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Job assignments */}
      {assignments.length > 0 && (
        <div>
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Assigned Jobs</h2>
          <div className="space-y-2">
            {assignments.map((a: any) => (
              <div key={a.id} className="bg-white rounded-xl border border-slate-200 p-3 flex items-center gap-3 shadow-sm">
                <Briefcase className="w-4 h-4 text-teal-500 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">
                    {a.job_pack?.title || 'Unknown Job'}
                  </p>
                  {a.job_pack?.customer && (
                    <p className="text-xs text-slate-500 truncate">{a.job_pack.customer.name}</p>
                  )}
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
            <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-500">No timesheets yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {timesheets.slice(0, 15).map(ts => (
              <div key={ts.id} className="bg-white rounded-xl border border-slate-200 p-3 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800">
                      {new Date(ts.clock_in).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                      <span>
                        {new Date(ts.clock_in).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                        {ts.clock_out && <> – {new Date(ts.clock_out).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</>}
                      </span>
                      <span className="font-semibold text-slate-700">{formatDuration(ts.clock_in, ts.clock_out)}</span>
                    </div>
                    {ts.break_minutes > 0 && (
                      <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-0.5">
                        <Coffee className="w-3 h-3" />
                        {ts.break_minutes}m break
                      </div>
                    )}
                    {ts.job_pack && (
                      <p className="text-[10px] text-slate-400 mt-0.5">{ts.job_pack.title}</p>
                    )}
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                    ts.status === 'approved' ? 'bg-green-100 text-green-700' :
                    ts.status === 'submitted' ? 'bg-amber-100 text-amber-700' :
                    ts.status === 'rejected' ? 'bg-red-100 text-red-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>
                    {ts.status.charAt(0).toUpperCase() + ts.status.slice(1)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
