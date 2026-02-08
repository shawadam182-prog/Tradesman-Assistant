import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, Clock, MapPin, CheckCircle, XCircle, AlertCircle, Loader2, Briefcase, Edit3, Coffee } from 'lucide-react';
import { teamService } from '../src/services/teamService';
import { useToast } from '../src/contexts/ToastContext';

interface TimesheetHistoryProps {
  memberId: string;
  onBack: () => void;
}

export const TimesheetHistory: React.FC<TimesheetHistoryProps> = ({ memberId, onBack }) => {
  const toast = useToast();
  const [timesheets, setTimesheets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit & Resubmit state
  const [editingTs, setEditingTs] = useState<any>(null);
  const [editBreak, setEditBreak] = useState(0);
  const [editNotes, setEditNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

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

  const openEditSheet = (ts: any) => {
    setEditingTs(ts);
    setEditBreak(ts.break_minutes || 0);
    setEditNotes(ts.notes || '');
  };

  const handleResubmit = async () => {
    if (!editingTs) return;
    setSubmitting(true);
    try {
      await teamService.updateTimesheet(editingTs.id, {
        break_minutes: editBreak > 0 ? editBreak : undefined,
        notes: editNotes.trim() || undefined,
      });
      await teamService.resubmitTimesheet(editingTs.id);
      toast.success('Timesheet resubmitted');
      setEditingTs(null);
      // Refresh list
      const data = await teamService.getMyTimesheets(memberId);
      setTimesheets(data);
    } catch (err) {
      toast.error('Failed to resubmit');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
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

                    {ts.break_minutes > 0 && (
                      <div className="flex items-center gap-1 mt-1 text-[10px] text-slate-400">
                        <Coffee className="w-3 h-3" />
                        {ts.break_minutes}m break
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

                {ts.status === 'rejected' && (
                  <button
                    onClick={() => openEditSheet(ts)}
                    className="mt-2 w-full flex items-center justify-center gap-2 py-2.5 bg-teal-500/20 text-teal-400 font-semibold text-sm rounded-xl border border-teal-500/30 active:bg-teal-500/30 transition-colors"
                  >
                    <Edit3 className="w-4 h-4" />
                    Edit & Resubmit
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Edit & Resubmit bottom sheet */}
      {editingTs && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
          onClick={(e) => { if (e.target === e.currentTarget && !submitting) { setEditingTs(null); } }}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative w-full sm:max-w-md bg-slate-800 rounded-t-2xl sm:rounded-2xl animate-in slide-in-from-bottom-4 duration-300 p-5 space-y-4">
            <h2 className="text-base font-bold text-slate-200">Edit & Resubmit</h2>
            <p className="text-xs text-slate-400">
              {new Date(editingTs.clock_in).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
              {' '}{new Date(editingTs.clock_in).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
              {editingTs.clock_out && <> – {new Date(editingTs.clock_out).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</>}
              {' '}({formatDuration(editingTs.clock_in, editingTs.clock_out)})
            </p>

            {editingTs.rejection_reason && (
              <p className="text-xs text-red-400 bg-red-500/10 rounded-lg px-3 py-2">
                Rejected: {editingTs.rejection_reason}
              </p>
            )}

            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                Break Time (minutes)
              </label>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                max={480}
                value={editBreak}
                onChange={(e) => setEditBreak(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full py-2.5 px-3 bg-slate-700 border border-slate-600 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-teal-500"
                placeholder="0"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                Notes (optional)
              </label>
              <textarea
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                rows={3}
                className="w-full py-2.5 px-3 bg-slate-700 border border-slate-600 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-teal-500 resize-none"
                placeholder="Any notes about this shift..."
              />
            </div>

            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setEditingTs(null)}
                disabled={submitting}
                className="flex-1 py-3 bg-slate-700 text-slate-300 font-semibold rounded-xl active:bg-slate-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleResubmit}
                disabled={submitting}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-teal-500 text-white font-semibold rounded-xl active:bg-teal-600 transition-colors disabled:opacity-50"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4" />
                )}
                Resubmit
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
