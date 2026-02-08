import React, { useEffect, useState } from 'react';
import { ArrowLeft, MapPin, User, FileText, Camera, Package, Loader2 } from 'lucide-react';
import { useData } from '../src/contexts/DataContext';

interface WorkerJobDetailProps {
  jobPackId: string;
  onBack: () => void;
}

export const WorkerJobDetail: React.FC<WorkerJobDetailProps> = ({ jobPackId, onBack }) => {
  const { projects, customers } = useData();
  const job = projects.find(p => p.id === jobPackId);
  const customer = job ? customers.find(c => c.id === job.customerId) : null;

  if (!job) {
    return (
      <div className="px-4 pt-4">
        <button onClick={onBack} className="flex items-center gap-2 text-slate-400 mb-4">
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">Back</span>
        </button>
        <div className="bg-slate-800/50 rounded-xl p-8 text-center">
          <p className="text-sm text-slate-500">Job not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 pt-4 space-y-4">
      {/* Header */}
      <div>
        <button onClick={onBack} className="flex items-center gap-2 text-slate-400 mb-3">
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">Back to Jobs</span>
        </button>
        <h1 className="text-lg font-bold text-slate-200">{job.title}</h1>
        <div className="flex items-center gap-2 mt-1">
          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
            job.status === 'active' ? 'bg-teal-500/20 text-teal-400' :
            job.status === 'completed' ? 'bg-green-500/20 text-green-400' :
            'bg-slate-600/20 text-slate-400'
          }`}>
            {job.status}
          </span>
        </div>
      </div>

      {/* Customer info */}
      {customer && (
        <div className="bg-slate-800/50 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-slate-700 rounded-lg flex items-center justify-center">
              <User className="w-4 h-4 text-slate-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-200">{customer.name}</p>
              {customer.phone && (
                <a href={`tel:${customer.phone}`} className="text-xs text-teal-400">
                  {customer.phone}
                </a>
              )}
            </div>
          </div>
          {customer.address && (
            <div className="flex items-start gap-2 mt-3 pt-3 border-t border-slate-700">
              <MapPin className="w-4 h-4 text-slate-500 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-slate-400">{customer.address}</p>
            </div>
          )}
        </div>
      )}

      {/* Notepad */}
      {job.notepad && (
        <div className="bg-slate-800/50 rounded-xl p-4">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Notes</h3>
          <p className="text-sm text-slate-300 whitespace-pre-wrap">{job.notepad}</p>
        </div>
      )}

      {/* Site Notes */}
      {job.notes && job.notes.length > 0 && (
        <div className="bg-slate-800/50 rounded-xl p-4">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
            <FileText className="w-3.5 h-3.5 inline mr-1" />
            Site Notes ({job.notes.length})
          </h3>
          <div className="space-y-2">
            {job.notes.map((note: any) => (
              <div key={note.id} className="bg-slate-700/50 rounded-lg p-3">
                <p className="text-sm text-slate-300">{note.text}</p>
                <p className="text-[10px] text-slate-500 mt-1">
                  {new Date(note.timestamp).toLocaleDateString('en-GB')}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Site Photos */}
      {job.photos && job.photos.length > 0 && (
        <div className="bg-slate-800/50 rounded-xl p-4">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
            <Camera className="w-3.5 h-3.5 inline mr-1" />
            Photos ({job.photos.length})
          </h3>
          <div className="grid grid-cols-3 gap-2">
            {job.photos.slice(0, 6).map((photo: any) => (
              <div key={photo.id} className="aspect-square bg-slate-700 rounded-lg overflow-hidden">
                {photo.url ? (
                  <img src={photo.url} alt={photo.caption || ''} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Camera className="w-5 h-5 text-slate-600" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Materials */}
      {job.materials && job.materials.length > 0 && (
        <div className="bg-slate-800/50 rounded-xl p-4">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
            <Package className="w-3.5 h-3.5 inline mr-1" />
            Materials ({job.materials.length})
          </h3>
          <div className="space-y-1.5">
            {job.materials.map((mat: any) => (
              <div key={mat.id} className="flex items-center justify-between py-1.5">
                <span className="text-sm text-slate-300">{mat.name}</span>
                <span className="text-xs text-slate-500">
                  {mat.quoted_qty} {mat.unit}
                  {mat.status !== 'pending' && (
                    <span className={`ml-2 px-1.5 py-0.5 rounded text-[10px] font-medium ${
                      mat.status === 'delivered' ? 'bg-green-500/20 text-green-400' :
                      mat.status === 'ordered' ? 'bg-blue-500/20 text-blue-400' :
                      'bg-amber-500/20 text-amber-400'
                    }`}>
                      {mat.status}
                    </span>
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
