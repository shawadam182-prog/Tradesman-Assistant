import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Users, Check, Loader2 } from 'lucide-react';
import { teamService } from '../src/services/teamService';
import { useToast } from '../src/contexts/ToastContext';

interface JobAssignmentModalProps {
  jobPackId: string;
  jobTitle: string;
  onClose: () => void;
}

export const JobAssignmentModal: React.FC<JobAssignmentModalProps> = ({ jobPackId, jobTitle, onClose }) => {
  const toast = useToast();
  const [team, setTeam] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    const fetch = async () => {
      try {
        const [teamData, assignData] = await Promise.all([
          teamService.getMyTeamWithMembers(),
          teamService.getAssignmentsForJob(jobPackId),
        ]);
        setTeam(teamData);
        setMembers(((teamData?.team_members as any[]) || []).filter((m: any) => m.status === 'active' && m.role !== 'owner'));
        setAssignments(assignData);
      } catch (err) {
        console.error('Failed to fetch assignments:', err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [jobPackId]);

  const isAssigned = (memberId: string) => {
    return assignments.some(a => a.team_member_id === memberId);
  };

  const handleToggle = async (memberId: string, memberName: string) => {
    setProcessingId(memberId);
    try {
      if (isAssigned(memberId)) {
        await teamService.unassignJob(jobPackId, memberId);
        setAssignments(prev => prev.filter(a => a.team_member_id !== memberId));
        toast.info(`${memberName} unassigned`);
      } else {
        const assignment = await teamService.assignJob(jobPackId, memberId);
        setAssignments(prev => [...prev, assignment]);
        toast.success(`${memberName} assigned`);
      }
    } catch (err) {
      toast.error('Failed to update assignment');
    } finally {
      setProcessingId(null);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative w-full sm:max-w-md bg-slate-800 rounded-t-2xl sm:rounded-2xl animate-in slide-in-from-bottom-4 duration-300 max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <div>
            <h2 className="text-sm font-semibold text-slate-200">Assign Team</h2>
            <p className="text-xs text-slate-500 mt-0.5">{jobTitle}</p>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[60vh]">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 text-teal-500 animate-spin" />
            </div>
          ) : !team ? (
            <div className="text-center py-8">
              <Users className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <p className="text-sm text-slate-400">No team created yet.</p>
              <p className="text-xs text-slate-500 mt-1">Go to Team Setup to create one.</p>
            </div>
          ) : members.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <p className="text-sm text-slate-400">No team members yet.</p>
              <p className="text-xs text-slate-500 mt-1">Invite field workers from Team Setup.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {members.map(member => {
                const assigned = isAssigned(member.id);
                const isProcessing = processingId === member.id;

                return (
                  <button
                    key={member.id}
                    onClick={() => handleToggle(member.id, member.display_name)}
                    disabled={isProcessing}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${
                      assigned
                        ? 'bg-teal-500/10 border border-teal-500/30'
                        : 'bg-slate-700/50 border border-transparent active:bg-slate-600/50'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      assigned ? 'bg-teal-500' : 'bg-slate-600'
                    }`}>
                      {isProcessing ? (
                        <Loader2 className="w-4 h-4 text-white animate-spin" />
                      ) : assigned ? (
                        <Check className="w-4 h-4 text-white" />
                      ) : (
                        <Users className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-medium text-slate-200">{member.display_name}</p>
                      <p className="text-xs text-slate-500">{member.role}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
