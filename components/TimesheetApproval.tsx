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
        <button onClick={onBack} className="flex items-center gap-2 text-teal-600 hover:text-teal-700 mb-3 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium">Back</span>
        </button>
        <h1 className="text-xl font-bold text-teal-600">Timesheet Approval</h1>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {(['submitted', 'approved', 'rejected', 'all'] as FilterTab[]).map(tab => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${filter === tab
                ? 'bg-teal-500 text-white shadow-lg shadow-teal-500/20'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
            {filterCounts[tab] > 0 && (
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${filter === tab ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                }`}>
                {filterCounts[tab]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Timesheet list */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-sm">
          <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <Clock className="w-6 h-6 text-slate-400" />
          </div>
          <p className="text-sm text-slate-500">No {filter === 'all' ? '' : filter} timesheets</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(ts => (
            <div key={ts.id} className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3 shadow-sm hover:shadow-md transition-shadow">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    {ts.team_member?.display_name || 'Unknown Worker'}
                  </p>
                  <p className="text-xs text-slate-500">
                    {new Date(ts.clock_in).toLocaleDateString('en-GB', {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short',
                    })}
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

              {/* Details */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-1.5 text-slate-500">
                  <Clock className="w-3.5 h-3.5" />
                  {new Date(ts.clock_in).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                  {ts.clock_out && (
                    <> – {new Date(ts.clock_out).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</>
                  )}
                </div>
                <div className="text-right font-semibold text-slate-700">
                  {formatDuration(ts.clock_in, ts.clock_out)}
                </div>
              </div>

              {ts.job_pack && (
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Briefcase className="w-3.5 h-3.5" />
                  {ts.job_pack.title}
                </div>
              )}

              {ts.is_gps_verified && (
                <div className="flex items-center gap-1.5 text-[11px] text-green-600 font-medium">
                  <MapPin className="w-3.5 h-3.5" />
                  GPS verified
                </div>
              )}

              {ts.notes && (
                <p className="text-xs text-slate-600 bg-slate-50 rounded-xl p-3 border border-slate-100">{ts.notes}</p>
              )}

              {ts.rejection_reason && (
                <p className="text-xs text-red-700 bg-red-50 rounded-xl p-3 border border-red-100">{ts.rejection_reason}</p>
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
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleReject(ts.id)}
                          disabled={processingId === ts.id}
                          className="flex-1 py-2.5 bg-red-500 text-white text-sm font-semibold rounded-xl disabled:opacity-50 shadow-lg shadow-red-500/20"
                        >
                          Confirm Reject
                        </button>
                        <button
                          onClick={() => { setRejectingId(null); setRejectReason(''); }}
                          className="px-4 py-2.5 bg-slate-100 text-slate-600 text-sm font-medium rounded-xl hover:bg-slate-200"
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
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-green-500 text-white text-sm font-semibold rounded-xl disabled:opacity-50 shadow-lg shadow-green-500/20 hover:bg-green-600 transition-colors"
                      >
                        {processingId === ts.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <CheckCircle className="w-4 h-4" />
                        )}
                        Approve
                      </button>
                      <button
                        onClick={() => setRejectingId(ts.id)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-red-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-red-500/20 hover:bg-red-600 transition-colors"
                      >
                        <XCircle className="w-4 h-4" />
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
