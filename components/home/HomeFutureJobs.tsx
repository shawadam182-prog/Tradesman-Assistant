import React from 'react';
import { ClipboardList, Plus, CheckCircle2, Trash2, ArrowRightCircle, ArrowRight } from 'lucide-react';
import { hapticTap, hapticSuccess } from '../../src/hooks/useHaptic';

export interface FutureJob {
  id: string;
  name: string;
  notes: string;
  createdAt: string;
  isCompleted: boolean;
}

interface HomeFutureJobsProps {
  futureJobs: FutureJob[];
  newFutureJobName: string;
  newFutureJobNotes: string;
  onSetFutureJobs: React.Dispatch<React.SetStateAction<FutureJob[]>>;
  onSetNewFutureJobName: (name: string) => void;
  onSetNewFutureJobNotes: (notes: string) => void;
  onCreateJob?: () => void;
  onNavigateToFutureJobs?: () => void;
}

export const HomeFutureJobs: React.FC<HomeFutureJobsProps> = ({
  futureJobs,
  newFutureJobName,
  newFutureJobNotes,
  onSetFutureJobs,
  onSetNewFutureJobName,
  onSetNewFutureJobNotes,
  onCreateJob,
  onNavigateToFutureJobs,
}) => {
  const addFutureJob = () => {
    if (!newFutureJobName.trim()) return;
    const job: FutureJob = {
      id: Math.random().toString(36).substr(2, 9),
      name: newFutureJobName.trim(),
      notes: newFutureJobNotes.trim(),
      createdAt: new Date().toISOString(),
      isCompleted: false
    };
    onSetFutureJobs(prev => [job, ...prev]);
    onSetNewFutureJobName('');
    onSetNewFutureJobNotes('');
    hapticSuccess();
  };

  const toggleFutureJobComplete = (id: string) => {
    onSetFutureJobs(prev => prev.map(job =>
      job.id === id ? { ...job, isCompleted: !job.isCompleted } : job
    ));
  };

  const deleteFutureJob = (id: string) => {
    onSetFutureJobs(prev => prev.filter(job => job.id !== id));
  };

  const convertToJobPack = (job: FutureJob) => {
    localStorage.setItem('bq_prefill_job', JSON.stringify({
      title: job.name,
      notepad: job.notes
    }));
    deleteFutureJob(job.id);
    onCreateJob?.();
  };

  const pendingJobs = futureJobs.filter(j => !j.isCompleted);
  const displayedJobs = pendingJobs.slice(0, 3);

  return (
    <div className="bg-white rounded-2xl md:rounded-[32px] border border-slate-200 p-4 md:p-6 shadow-sm">
      <div className="flex items-center justify-between mb-3 md:mb-4">
        <div className="flex items-center gap-2 md:gap-3">
          <div className="p-2 md:p-3 bg-indigo-500 rounded-xl md:rounded-2xl text-white">
            <ClipboardList size={18} className="md:w-6 md:h-6" />
          </div>
          <div>
            <h3 className="font-black text-slate-900 text-sm md:text-lg">Future Jobs Queue</h3>
            <p className="text-[10px] md:text-xs text-slate-500 italic">Ideas for upcoming work</p>
          </div>
        </div>
        {pendingJobs.length > 3 && onNavigateToFutureJobs && (
          <button
            onClick={() => { hapticTap(); onNavigateToFutureJobs(); }}
            className="flex items-center gap-1 text-indigo-600 hover:text-indigo-700 text-xs font-bold"
          >
            See All ({pendingJobs.length}) <ArrowRight size={14} />
          </button>
        )}
      </div>

      {/* Add Future Job Form */}
      <div className="space-y-2 mb-3 md:mb-4">
        <input
          type="text"
          placeholder="Job name..."
          value={newFutureJobName}
          onChange={(e) => onSetNewFutureJobName(e.target.value)}
          className="w-full px-3 py-2 text-sm md:text-base border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Notes (optional)"
            value={newFutureJobNotes}
            onChange={(e) => onSetNewFutureJobNotes(e.target.value)}
            className="flex-1 px-3 py-2 text-sm md:text-base border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            onClick={addFutureJob}
            disabled={!newFutureJobName.trim()}
            className="p-2 bg-indigo-500 text-white rounded-xl hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus size={18} />
          </button>
        </div>
      </div>

      {/* Future Jobs List */}
      {displayedJobs.length === 0 ? (
        <div className="text-center py-4 md:py-6">
          <p className="text-slate-400 text-xs md:text-sm italic">No jobs queued</p>
          <p className="text-slate-300 text-[10px] md:text-xs mt-1">Add potential jobs to remember them</p>
        </div>
      ) : (
        <div className="space-y-2">
          {displayedJobs.map(job => (
            <div
              key={job.id}
              className={`flex items-center gap-2 md:gap-3 p-2 md:p-3 rounded-xl transition-all ${
                job.isCompleted ? 'bg-slate-50 opacity-60' : 'bg-indigo-50'
              }`}
            >
              <button onClick={() => toggleFutureJobComplete(job.id)}>
                <CheckCircle2
                  size={18}
                  className={`md:w-5 md:h-5 ${job.isCompleted ? 'text-green-500' : 'text-slate-300'}`}
                />
              </button>
              <div className="flex-1 min-w-0">
                <p className={`text-sm md:text-base font-medium truncate ${job.isCompleted ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                  {job.name}
                </p>
                {job.notes && (
                  <p className="text-[10px] md:text-xs text-slate-500 truncate">{job.notes}</p>
                )}
              </div>
              <div className="flex gap-1">
                {!job.isCompleted && onCreateJob && (
                  <button
                    onClick={() => convertToJobPack(job)}
                    className="p-1.5 text-indigo-600 hover:bg-indigo-100 rounded-lg transition-colors"
                    title="Convert to Job Pack"
                  >
                    <ArrowRightCircle size={16} className="md:w-5 md:h-5" />
                  </button>
                )}
                <button
                  onClick={() => deleteFutureJob(job.id)}
                  className="p-1 text-slate-400 hover:text-red-500"
                >
                  <Trash2 size={14} className="md:w-4 md:h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
