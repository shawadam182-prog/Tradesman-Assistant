import React, { useState } from 'react';
import { Briefcase, Search, ChevronRight, MapPin } from 'lucide-react';
import { useData } from '../src/contexts/DataContext';

interface WorkerMyJobsProps {
  onViewJob: (jobId: string) => void;
}

export const WorkerMyJobs: React.FC<WorkerMyJobsProps> = ({ onViewJob }) => {
  const { projects, customers } = useData();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'active' | 'completed' | 'all'>('active');

  const filteredJobs = projects
    .filter(job => {
      if (filter === 'active') return job.status === 'active';
      if (filter === 'completed') return job.status === 'completed';
      return true;
    })
    .filter(job => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        job.title.toLowerCase().includes(q) ||
        customers.find(c => c.id === job.customerId)?.name?.toLowerCase().includes(q)
      );
    });

  return (
    <div className="px-4 pt-4 space-y-4">
      <h1 className="text-lg font-bold text-slate-200">My Jobs</h1>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search jobs..."
          className="w-full pl-9 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-teal-500"
        />
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {(['active', 'completed', 'all'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filter === f
                ? 'bg-teal-500/20 text-teal-400'
                : 'bg-slate-800 text-slate-500'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Job list */}
      {filteredJobs.length === 0 ? (
        <div className="bg-slate-800/50 rounded-xl p-8 text-center">
          <Briefcase className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-sm text-slate-500">
            {search ? 'No jobs match your search' : 'No jobs assigned yet'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredJobs.map(job => (
            <button
              key={job.id}
              onClick={() => onViewJob(job.id)}
              className="w-full bg-slate-800/50 rounded-xl p-4 text-left active:bg-slate-700/50 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-medium text-slate-200 truncate">{job.title}</p>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                      job.status === 'active' ? 'bg-teal-500/20 text-teal-400' :
                      job.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                      'bg-slate-600/20 text-slate-400'
                    }`}>
                      {job.status}
                    </span>
                  </div>
                  {customers.find(c => c.id === job.customerId) && (
                    <p className="text-xs text-slate-500">{customers.find(c => c.id === job.customerId)?.name}</p>
                  )}
                </div>
                <ChevronRight className="w-4 h-4 text-slate-600 flex-shrink-0 ml-2" />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
