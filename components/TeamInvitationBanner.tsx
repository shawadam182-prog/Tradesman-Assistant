import React, { useState } from 'react';
import { Users, Check, X, Loader2 } from 'lucide-react';
import { useTeam } from '../src/contexts/TeamContext';
import { useToast } from '../src/contexts/ToastContext';

export const TeamInvitationBanner: React.FC = () => {
  const { pendingInvitations, acceptInvitation, declineInvitation } = useTeam();
  const toast = useToast();
  const [processingToken, setProcessingToken] = useState<string | null>(null);

  if (pendingInvitations.length === 0) return null;

  const handleAccept = async (token: string, teamName: string) => {
    setProcessingToken(token);
    try {
      await acceptInvitation(token);
      toast.success(`Joined ${teamName}!`);
    } catch (err) {
      toast.error('Failed to accept invitation');
    } finally {
      setProcessingToken(null);
    }
  };

  const handleDecline = async (token: string) => {
    setProcessingToken(token);
    try {
      await declineInvitation(token);
      toast.info('Invitation declined');
    } catch (err) {
      toast.error('Failed to decline invitation');
    } finally {
      setProcessingToken(null);
    }
  };

  return (
    <div className="space-y-3 mb-4">
      {pendingInvitations.map((invitation) => (
        <div
          key={invitation.id}
          className="bg-teal-500/10 border border-teal-500/20 rounded-xl p-4"
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-teal-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <Users className="w-5 h-5 text-teal-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-200">
                Team Invitation
              </p>
              <p className="text-sm text-slate-400 mt-0.5">
                You've been invited to join <span className="text-teal-400 font-medium">{invitation.teamName}</span> as a{' '}
                {invitation.role === 'field_worker' ? 'Field Worker' : invitation.role}
              </p>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => handleAccept(invitation.token, invitation.teamName)}
                  disabled={processingToken !== null}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-500 text-white text-sm font-medium rounded-lg hover:bg-teal-600 transition-colors disabled:opacity-50"
                >
                  {processingToken === invitation.token ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                  Accept
                </button>
                <button
                  onClick={() => handleDecline(invitation.token)}
                  disabled={processingToken !== null}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 text-slate-300 text-sm font-medium rounded-lg hover:bg-slate-600 transition-colors disabled:opacity-50"
                >
                  <X className="w-3.5 h-3.5" />
                  Decline
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
