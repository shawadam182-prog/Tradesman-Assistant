import React, { useState, useEffect } from 'react';
import { ArrowLeft, Clock, MapPin, CheckCircle, XCircle, AlertCircle, Loader2, Briefcase } from 'lucide-react';
import { teamService } from '../src/services/teamService';

interface TimesheetHistoryProps {
  memberId: string;
  onBack: () => void;
}

export const TimesheetHistory: React.FC<TimesheetHistoryProps> = ({ memberId, onBack }) => {
  const [timesheets, setTimesheets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const data = await teamService.getMyTimesheets(memberId);
        setTimesheets(data);
      } catch (err) {
        console.error('Failed to fetch timesheets:', err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [memberId]);

  const formatDuration = (clockIn: string, clockOut: string | null) => {
    if (!clockOut) return 'In progress';
    const ms = new Date(clockOut).getTime() - new Date(clockIn).getTime();
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    return `${h}h ${m}m`;
  };

  const statusConfig: Record<string, { icon: any; color: string; bg: string }> = {
    active: { icon: Clock, color: 'text-blue-400', bg: 'bg-blue-500/20' },
    submitted: { icon: Clock, color: 'text-amber-400', bg: 'bg-amber-500/20' },
    approved: { icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-500/20' },
    rejected: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/20' },
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 text-teal-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="px-4 pt-4 space-y-4">
      <div>
        <button onClick={onBack} className="flex items-center gap-2 text-slate-400 mb-3">
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">Back</span>
        </button>
        <h1 className="text-lg font-bold text-slate-200">Timesheet History</h1>
      </div>

      {timesheets.length === 0 ? (
        <div className="bg-slate-800/50 rounded-xl p-8 text-center">
          <Clock className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-sm text-slate-500">No timesheets yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {timesheets.map(ts => {
            const config = statusConfig[ts.status] || statusConfig.submitted;
            const StatusIcon = config.icon;

            return (
              <div key={ts.id} className="bg-slate-800/50 rounded-xl p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-medium text-slate-200">
                        {new Date(ts.clock_in).toLocaleDateString('en-GB', {
                          weekday: 'short',
                          day: 'numeric',
                          month: 'short',
                        })}
                      </p>
                      <span className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${config.color} ${config.bg}`}>
                        <StatusIcon className="w-3 h-3" />
                        {ts.status}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-400">
                      <span>
                        {new Date(ts.clock_in).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                        {ts.clock_out && (
                          <> - {new Date(ts.clock_out).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</>
                        )}
                      </span>
                      <span className="font-medium text-slate-300">
                        {formatDuration(ts.clock_in, ts.clock_out)}
                      </span>
                    </div>

                    {ts.job_pack && (
                      <div className="flex items-center gap-1.5 mt-1.5 text-xs text-slate-500">
                        <Briefcase className="w-3 h-3" />
                        {ts.job_pack.title}
                      </div>
                    )}

                    {ts.is_gps_verified && (
                      <div className="flex items-center gap-1 mt-1 text-[10px] text-green-400">
                        <MapPin className="w-3 h-3" />
                        GPS verified
                      </div>
                    )}

                    {ts.rejection_reason && (
                      <p className="text-xs text-red-400 mt-1.5 bg-red-500/10 rounded px-2 py-1">
                        {ts.rejection_reason}
                      </p>
                    )}

                    {ts.notes && (
                      <p className="text-xs text-slate-500 mt-1">{ts.notes}</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
