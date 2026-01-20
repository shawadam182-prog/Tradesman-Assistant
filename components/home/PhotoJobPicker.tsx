import React from 'react';
import { createPortal } from 'react-dom';
import { Camera, FolderPlus, X } from 'lucide-react';
import { JobPack, Customer } from '../../types';

interface PhotoJobPickerProps {
  show: boolean;
  projects: JobPack[];
  customers: Customer[];
  newJobName: string;
  onSetNewJobName: (name: string) => void;
  onSelectJob: (jobId: string) => void;
  onCreateJob: () => void;
  onCancel: () => void;
}

export const PhotoJobPicker: React.FC<PhotoJobPickerProps> = ({
  show,
  projects,
  customers,
  newJobName,
  onSetNewJobName,
  onSelectJob,
  onCreateJob,
  onCancel,
}) => {
  if (!show) return null;

  const activeProjects = projects.filter(p => p.status === 'active');

  return createPortal(
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-2">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md max-h-[85vh] overflow-hidden animate-in slide-in-from-bottom-4">
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-teal-500 rounded-xl flex items-center justify-center">
              <Camera size={20} />
            </div>
            <div>
              <h3 className="font-bold">Add Site Photo</h3>
              <p className="text-xs text-slate-400">Choose where to save this photo</p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 overflow-y-auto max-h-[60vh]">
          {/* Create New Job Option */}
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Create New Job</p>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Enter job name..."
                value={newJobName}
                onChange={(e) => onSetNewJobName(e.target.value)}
                className="flex-1 px-3 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              <button
                onClick={onCreateJob}
                disabled={!newJobName.trim()}
                className="px-4 py-3 bg-teal-500 hover:bg-teal-600 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-xl transition-colors flex items-center gap-2"
              >
                <FolderPlus size={18} />
              </button>
            </div>
          </div>

          {/* Existing Jobs List */}
          {activeProjects.length > 0 && (
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Add to Existing Job</p>
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {activeProjects.map(project => (
                  <button
                    key={project.id}
                    onClick={() => onSelectJob(project.id)}
                    className="w-full p-3 bg-slate-50 hover:bg-slate-100 rounded-xl text-left transition-colors flex items-center justify-between group"
                  >
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 truncate">{project.title}</p>
                      <p className="text-xs text-slate-500 truncate">
                        {customers.find(c => c.id === project.customerId)?.name || 'No customer'}
                      </p>
                    </div>
                    <div className="p-2 bg-slate-200 group-hover:bg-teal-500 group-hover:text-white rounded-lg transition-colors shrink-0 ml-2">
                      <Camera size={16} />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Cancel Button */}
          <button
            onClick={onCancel}
            className="w-full mt-4 p-3 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold text-slate-600 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
