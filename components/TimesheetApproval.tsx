import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Clock, CheckCircle, XCircle, MapPin, Briefcase, Loader2, AlertCircle } from 'lucide-react';
import { teamService } from '../src/services/teamService';
import { useToast } from '../src/contexts/ToastContext';

interface TimesheetApprovalProps {
  onBack: () => void;
}

type FilterTab = 'submitted' | 'approved' | 'rejected' | 'all';

export const TimesheetApproval: React.FC<TimesheetApprovalProps> = ({ onBack }) => {
  const toast = useToast();
  const [timesheets, setTimesheets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterTab>('submitted');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const fetchTimesheets = useCallback(async () => {
    try {
      const data = await teamService.getTeamTimesheets();
      setTimesheets(data);
    } catch (err) {
      console.error('Failed to fetch timesheets:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTimesheets();
  }, [fetchTimesheets]);

  const handleApprove = async (id: string) => {
    setProcessingId(id);
    try {
      await teamService.approveTimesheet(id);
      toast.success('Timesheet approved');
      await fetchTimesheets();
    } catch (err) {
      toast.error('Failed to approve timesheet');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id: string) => {
    if (!rejectReason.trim()) {
      toast.error('Please provide a reason');
      return;
    }
    setProcessingId(id);
    try {
      await teamService.rejectTimesheet(id, rejectReason.trim());
      toast.success('Timesheet rejected');
      setRejectingId(null);
      setRejectReason('');
      await fetchTimesheets();
    } catch (err) {
      toast.error('Failed to reject timesheet');
    } finally {
      setProcessingId(null);
    }
  };

  const formatDuration = (clockIn: string, clockOut: string | null) => {
    if (!clockOut) return 'In progress';
    const ms = new Date(clockOut).getTime() - new Date(clockIn).getTime();
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    return `${h}h ${m}m`;
  };

  const filtered = timesheets.filter(ts => {
    if (filter === 'all') return true;
    return ts.status === filter;
  });

  const filterCounts = {
    submitted: timesheets.filter(ts => ts.status === 'submitted').length,
    approved: timesheets.filter(ts => ts.status === 'approved').length,
    rejected: timesheets.filter(ts => ts.status === 'rejected').length,
    all: timesheets.length,
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
        <button onClick={onBack} className="flex items-center gap-2 text-slate-400 mb-3">
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">Back</span>
        </button>
        <h1 className="text-lg font-bold text-slate-200">Timesheet Approval</h1>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 overflow-x-auto">
        {(['submitted', 'approved', 'rejected', 'all'] as FilterTab[]).map(tab => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              filter === tab
                ? 'bg-teal-500/20 text-teal-400'
                : 'bg-slate-800 text-slate-500'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
            {filterCounts[tab] > 0 && (
              <span className="bg-slate-700 px-1.5 py-0.5 rounded-full text-[10px]">
                {filterCounts[tab]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Timesheet list */}
      {filtered.length === 0 ? (
        <div className="bg-slate-800/50 rounded-xl p-8 text-center">
          <Clock className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-sm text-slate-500">No {filter === 'all' ? '' : filter} timesheets</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(ts => (
            <div key={ts.id} className="bg-slate-800/50 rounded-xl p-4 space-y-3">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-200">
                    {ts.team_member?.display_name || 'Unknown Worker'}
                  </p>
                  <p className="text-xs text-slate-400">
                    {new Date(ts.clock_in).toLocaleDateString('en-GB', {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short',
                    })}
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

              {/* Details */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-1.5 text-slate-400">
                  <Clock className="w-3 h-3" />
                  {new Date(ts.clock_in).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                  {ts.clock_out && (
                    <> - {new Date(ts.clock_out).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</>
                  )}
                </div>
                <div className="text-right font-medium text-slate-300">
                  {formatDuration(ts.clock_in, ts.clock_out)}
                </div>
              </div>

              {ts.job_pack && (
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Briefcase className="w-3 h-3" />
                  {ts.job_pack.title}
                </div>
              )}

              {ts.is_gps_verified && (
                <div className="flex items-center gap-1 text-[10px] text-green-400">
                  <MapPin className="w-3 h-3" />
                  GPS verified
                </div>
              )}

              {ts.notes && (
                <p className="text-xs text-slate-400 bg-slate-700/50 rounded p-2">{ts.notes}</p>
              )}

              {ts.rejection_reason && (
                <p className="text-xs text-red-400 bg-red-500/10 rounded p-2">{ts.rejection_reason}</p>
              )}

              {/* Approve/Reject buttons */}
              {ts.status === 'submitted' && (
                <>
                  {rejectingId === ts.id ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={rejectReason}
                        onChange={e => setRejectReason(e.target.value)}
                        placeholder="Reason for rejection..."
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-red-500"
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleReject(ts.id)}
                          disabled={processingId === ts.id}
                          className="flex-1 py-2 bg-red-500/20 text-red-400 text-sm font-medium rounded-lg disabled:opacity-50"
                        >
                          Confirm Reject
                        </button>
                        <button
                          onClick={() => { setRejectingId(null); setRejectReason(''); }}
                          className="px-3 py-2 bg-slate-700 text-slate-400 text-sm rounded-lg"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleApprove(ts.id)}
                        disabled={processingId === ts.id}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-green-500/20 text-green-400 text-sm font-medium rounded-lg disabled:opacity-50"
                      >
                        {processingId === ts.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <CheckCircle className="w-3.5 h-3.5" />
                        )}
                        Approve
                      </button>
                      <button
                        onClick={() => setRejectingId(ts.id)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-red-500/20 text-red-400 text-sm font-medium rounded-lg"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        Reject
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
