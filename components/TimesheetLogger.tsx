import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Clock, MapPin, Play, Square, History, Briefcase, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { useData } from '../src/contexts/DataContext';
import { useToast } from '../src/contexts/ToastContext';
import { teamService } from '../src/services/teamService';
import { useGeolocation } from '../src/hooks/useGeolocation';

interface TimesheetLoggerProps {
  memberId: string;
  onViewHistory: () => void;
}

const GPS_LOG_INTERVAL = 5 * 60 * 1000; // 5 minutes
const ACTIVE_TIMESHEET_KEY = 'tradesync_active_timesheet';

export const TimesheetLogger: React.FC<TimesheetLoggerProps> = ({ memberId, onViewHistory }) => {
  const { projects } = useData();
  const toast = useToast();
  const { getCurrentPosition, loading: gpsLoading, error: gpsError } = useGeolocation();

  const [activeTimesheet, setActiveTimesheet] = useState<any>(null);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [clockingIn, setClockingIn] = useState(false);
  const [clockingOut, setClockingOut] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const gpsIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Clock-out sheet state
  const [showClockOutSheet, setShowClockOutSheet] = useState(false);
  const [breakMinutes, setBreakMinutes] = useState(0);
  const [clockOutNotes, setClockOutNotes] = useState('');

  // Fetch active timesheet on mount
  useEffect(() => {
    const fetch = async () => {
      try {
        // Check localStorage first for active timesheet ID
        const savedId = localStorage.getItem(ACTIVE_TIMESHEET_KEY);
        const ts = await teamService.getActiveTimesheet(memberId);
        if (ts) {
          setActiveTimesheet(ts);
          if (ts.id) localStorage.setItem(ACTIVE_TIMESHEET_KEY, ts.id);
        } else {
          localStorage.removeItem(ACTIVE_TIMESHEET_KEY);
        }
      } catch (err) {
        console.error('Failed to fetch active timesheet:', err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [memberId]);

  // Elapsed time timer
  useEffect(() => {
    if (!activeTimesheet) {
      setElapsedSeconds(0);
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    const updateElapsed = () => {
      const start = new Date(activeTimesheet.clock_in).getTime();
      const now = Date.now();
      setElapsedSeconds(Math.floor((now - start) / 1000));
    };

    updateElapsed();
    timerRef.current = setInterval(updateElapsed, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [activeTimesheet]);

  // GPS breadcrumb logging while clocked in
  useEffect(() => {
    if (!activeTimesheet) {
      if (gpsIntervalRef.current) clearInterval(gpsIntervalRef.current);
      return;
    }

    gpsIntervalRef.current = setInterval(async () => {
      try {
        const pos = await getCurrentPosition();
        await teamService.logGPS(activeTimesheet.id, pos.lat, pos.lng, pos.accuracy);
      } catch {
        // GPS unavailable — silent fail
      }
    }, GPS_LOG_INTERVAL);

    return () => { if (gpsIntervalRef.current) clearInterval(gpsIntervalRef.current); };
  }, [activeTimesheet, getCurrentPosition]);

  const handleClockIn = useCallback(async () => {
    setClockingIn(true);
    try {
      let lat: number | undefined;
      let lng: number | undefined;
      let accuracy: number | undefined;

      // Try to get GPS (non-blocking failure)
      try {
        const pos = await getCurrentPosition();
        lat = pos.lat;
        lng = pos.lng;
        accuracy = pos.accuracy;
      } catch {
        // GPS denied — clock in without coordinates
      }

      const ts = await teamService.clockIn(memberId, selectedJobId, lat, lng, accuracy);
      setActiveTimesheet(ts);
      localStorage.setItem(ACTIVE_TIMESHEET_KEY, ts.id);
      toast.success('Clocked in!');
    } catch (err) {
      toast.error('Failed to clock in');
      console.error(err);
    } finally {
      setClockingIn(false);
    }
  }, [memberId, selectedJobId, getCurrentPosition, toast]);

  const handleClockOut = useCallback(async () => {
    if (!activeTimesheet) return;
    setClockingOut(true);
    try {
      let lat: number | undefined;
      let lng: number | undefined;
      let accuracy: number | undefined;

      try {
        const pos = await getCurrentPosition();
        lat = pos.lat;
        lng = pos.lng;
        accuracy = pos.accuracy;
      } catch {
        // GPS denied
      }

      // Save break_minutes and notes before clocking out
      if (breakMinutes > 0 || clockOutNotes.trim()) {
        await teamService.updateTimesheet(activeTimesheet.id, {
          break_minutes: breakMinutes > 0 ? breakMinutes : undefined,
          notes: clockOutNotes.trim() || undefined,
        });
      }

      await teamService.clockOut(activeTimesheet.id, lat, lng, accuracy);
      setActiveTimesheet(null);
      localStorage.removeItem(ACTIVE_TIMESHEET_KEY);
      setShowClockOutSheet(false);
      setBreakMinutes(0);
      setClockOutNotes('');
      toast.success('Clocked out!');
    } catch (err) {
      toast.error('Failed to clock out');
      console.error(err);
    } finally {
      setClockingOut(false);
    }
  }, [activeTimesheet, getCurrentPosition, toast, breakMinutes, clockOutNotes]);

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const activeJobs = projects.filter(p => p.status === 'active');

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 text-teal-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="px-4 pt-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-slate-200">Time Clock</h1>
        <button
          onClick={onViewHistory}
          className="flex items-center gap-1.5 text-sm text-teal-400 font-medium"
        >
          <History className="w-4 h-4" />
          History
        </button>
      </div>

      {/* Active timer display */}
      {activeTimesheet ? (
        <div className="bg-slate-800/50 rounded-2xl p-6 text-center space-y-4">
          {/* Timer */}
          <div>
            <p className="text-xs text-teal-400 font-medium uppercase tracking-wider mb-2">Clocked In</p>
            <p className="text-4xl font-mono font-bold text-slate-100 tracking-wider">
              {formatDuration(elapsedSeconds)}
            </p>
          </div>

          {/* Job info */}
          {activeTimesheet.job_pack && (
            <div className="flex items-center justify-center gap-2 text-sm text-slate-400">
              <Briefcase className="w-4 h-4" />
              {activeTimesheet.job_pack.title}
            </div>
          )}

          {/* GPS indicator */}
          <div className="flex items-center justify-center gap-1.5 text-xs">
            {activeTimesheet.is_gps_verified ? (
              <>
                <CheckCircle className="w-3.5 h-3.5 text-green-400" />
                <span className="text-green-400">GPS verified</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-amber-400">No GPS</span>
              </>
            )}
          </div>

          {/* Started time */}
          <p className="text-xs text-slate-500">
            Started at {new Date(activeTimesheet.clock_in).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
          </p>

          {/* Clock Out button — opens confirmation sheet */}
          <button
            onClick={() => setShowClockOutSheet(true)}
            disabled={clockingOut}
            className="w-full flex items-center justify-center gap-2 py-4 bg-red-500/20 text-red-400 font-semibold rounded-xl border border-red-500/30 active:bg-red-500/30 transition-colors disabled:opacity-50"
          >
            {clockingOut ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Square className="w-5 h-5" />
            )}
            Clock Out
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Job selector */}
          <div className="bg-slate-800/50 rounded-xl p-4">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
              Select Job (optional)
            </label>
            <select
              value={selectedJobId || ''}
              onChange={e => setSelectedJobId(e.target.value || null)}
              className="w-full py-2.5 px-3 bg-slate-700 border border-slate-600 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-teal-500"
            >
              <option value="">No specific job</option>
              {activeJobs.map(job => (
                <option key={job.id} value={job.id}>{job.title}</option>
              ))}
            </select>
          </div>

          {/* GPS status */}
          {gpsError && (
            <div className="flex items-center gap-2 px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <p className="text-xs text-amber-400">{gpsError} — you can still clock in without GPS</p>
            </div>
          )}

          {/* Clock In button */}
          <button
            onClick={handleClockIn}
            disabled={clockingIn}
            className="w-full flex items-center justify-center gap-3 py-5 bg-teal-500 text-white font-semibold text-lg rounded-2xl active:bg-teal-600 transition-colors disabled:opacity-50"
          >
            {clockingIn ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <Play className="w-6 h-6" />
            )}
            Clock In
          </button>
        </div>
      )}

      {/* Clock-out confirmation sheet */}
      {showClockOutSheet && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
          onClick={(e) => { if (e.target === e.currentTarget && !clockingOut) { setShowClockOutSheet(false); setBreakMinutes(0); setClockOutNotes(''); } }}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative w-full sm:max-w-md bg-slate-800 rounded-t-2xl sm:rounded-2xl animate-in slide-in-from-bottom-4 duration-300 p-5 space-y-4">
            <h2 className="text-base font-bold text-slate-200">Confirm Clock Out</h2>
            <p className="text-xs text-slate-400">
              Clocked in since {activeTimesheet && new Date(activeTimesheet.clock_in).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
              {' '}({formatDuration(elapsedSeconds)})
            </p>

            {/* Break minutes */}
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                Break Time (minutes)
              </label>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                max={480}
                value={breakMinutes}
                onChange={(e) => setBreakMinutes(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full py-2.5 px-3 bg-slate-700 border border-slate-600 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-teal-500"
                placeholder="0"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                Notes (optional)
              </label>
              <textarea
                value={clockOutNotes}
                onChange={(e) => setClockOutNotes(e.target.value)}
                rows={3}
                className="w-full py-2.5 px-3 bg-slate-700 border border-slate-600 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-teal-500 resize-none"
                placeholder="Any notes about this shift..."
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-1">
              <button
                onClick={() => { setShowClockOutSheet(false); setBreakMinutes(0); setClockOutNotes(''); }}
                disabled={clockingOut}
                className="flex-1 py-3 bg-slate-700 text-slate-300 font-semibold rounded-xl active:bg-slate-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleClockOut}
                disabled={clockingOut}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-red-500 text-white font-semibold rounded-xl active:bg-red-600 transition-colors disabled:opacity-50"
              >
                {clockingOut ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Square className="w-4 h-4" />
                )}
                Submit
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
