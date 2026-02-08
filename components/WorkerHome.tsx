import React, { useEffect, useState } from 'react';
import { Briefcase, Clock, CalendarDays, ChevronRight, MapPin, Loader2 } from 'lucide-react';
import { useData } from '../src/contexts/DataContext';
import { teamService } from '../src/services/teamService';
import { TeamInvitationBanner } from './TeamInvitationBanner';

interface WorkerHomeProps {
  memberId: string;
  onViewJob: (jobId: string) => void;
  onNavigate: (tab: string) => void;
}

export const WorkerHome: React.FC<WorkerHomeProps> = ({ memberId, onViewJob, onNavigate }) => {
  const { projects, schedule, customers } = useData();
  const [activeTimesheet, setActiveTimesheet] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchActive = async () => {
      try {
        const ts = await teamService.getActiveTimesheet(memberId);
        setActiveTimesheet(ts);
      } catch (err) {
        console.error('Failed to fetch active timesheet:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchActive();
  }, [memberId]);

  // Today's schedule entries
  const today = new Date().toISOString().split('T')[0];
  const todaySchedule = schedule.filter(entry => {
    const entryDate = entry.start?.split('T')[0] || '';
    return entryDate === today;
  });

  // Active jobs (from DataContext — RLS filters to assigned only)
  const activeJobs = projects.filter(p => p.status === 'active');

  return (
    <div className="px-4 pt-4 space-y-4">
      <TeamInvitationBanner />

      {/* Active Timer */}
      {activeTimesheet && (
        <button
          onClick={() => onNavigate('timesheets')}
          className="w-full bg-teal-500/10 border border-teal-500/30 rounded-xl p-4 text-left"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-teal-500/20 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-teal-400 animate-pulse" />
              </div>
              <div>
                <p className="text-sm font-medium text-teal-400">Clocked In</p>
                <p className="text-xs text-slate-400">
                  {activeTimesheet.job_pack?.title || 'No job selected'}
                </p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-teal-400" />
          </div>
        </button>
      )}

      {/* Today's Schedule */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Today's Schedule</h2>
          <button
            onClick={() => onNavigate('my_schedule')}
            className="text-xs text-teal-400 font-medium"
          >
            View All
          </button>
        </div>
        {todaySchedule.length === 0 ? (
          <div className="bg-slate-800/50 rounded-xl p-4 text-center">
            <CalendarDays className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-sm text-slate-500">Nothing scheduled for today</p>
          </div>
        ) : (
          <div className="space-y-2">
            {todaySchedule.slice(0, 3).map(entry => (
              <div key={entry.id} className="bg-slate-800/50 rounded-xl p-3">
                <div className="flex items-center gap-3">
                  <div className="w-1 h-10 bg-teal-500 rounded-full" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-200 truncate">{entry.title}</p>
                    <p className="text-xs text-slate-500">
                      {new Date(entry.start).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                      {entry.location && ` · ${entry.location}`}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* My Jobs */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">My Jobs</h2>
          <button
            onClick={() => onNavigate('my_jobs')}
            className="text-xs text-teal-400 font-medium"
          >
            View All
          </button>
        </div>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 text-teal-500 animate-spin" />
          </div>
        ) : activeJobs.length === 0 ? (
          <div className="bg-slate-800/50 rounded-xl p-4 text-center">
            <Briefcase className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-sm text-slate-500">No jobs assigned yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {activeJobs.slice(0, 5).map(job => (
              <button
                key={job.id}
                onClick={() => onViewJob(job.id)}
                className="w-full bg-slate-800/50 rounded-xl p-3 text-left active:bg-slate-700/50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 bg-slate-700 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Briefcase className="w-4 h-4 text-slate-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-200 truncate">{job.title}</p>
                      {customers.find(c => c.id === job.customerId) && (
                        <p className="text-xs text-slate-500 truncate">{customers.find(c => c.id === job.customerId)?.name}</p>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-600 flex-shrink-0" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
