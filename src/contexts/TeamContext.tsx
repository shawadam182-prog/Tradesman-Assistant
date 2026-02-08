import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { teamService } from '../services/teamService';

interface TeamMembership {
  id: string;
  teamId: string;
  teamName: string;
  ownerId: string;
  role: 'owner' | 'field_worker';
  displayName: string;
  status: string;
}

interface PendingInvitation {
  id: string;
  teamId: string;
  teamName: string;
  role: string;
  token: string;
  expiresAt: string;
}

interface TeamContextType {
  membership: TeamMembership | null;
  pendingInvitations: PendingInvitation[];
  isFieldWorker: boolean;
  isTeamOwner: boolean;
  loading: boolean;
  acceptInvitation: (token: string) => Promise<void>;
  declineInvitation: (token: string) => Promise<void>;
  refresh: () => Promise<void>;
}

const TeamContext = createContext<TeamContextType | undefined>(undefined);

export const useTeam = () => {
  const context = useContext(TeamContext);
  if (!context) throw new Error('useTeam must be used within a TeamProvider');
  return context;
};

export const TeamProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [membership, setMembership] = useState<TeamMembership | null>(null);
  const [pendingInvitations, setPendingInvitations] = useState<PendingInvitation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTeamData = useCallback(async () => {
    if (!user) {
      setMembership(null);
      setPendingInvitations([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Fetch membership and invitations in parallel
      const [membershipData, invitationsData] = await Promise.all([
        teamService.getMyMembership(),
        teamService.getMyInvitations(),
      ]);

      if (membershipData && membershipData.team) {
        setMembership({
          id: membershipData.id,
          teamId: membershipData.team_id,
          teamName: membershipData.team.name,
          ownerId: membershipData.team.owner_id,
          role: membershipData.role as 'owner' | 'field_worker',
          displayName: membershipData.display_name,
          status: membershipData.status,
        });
      } else {
        setMembership(null);
      }

      setPendingInvitations(
        (invitationsData || [])
          .filter((inv: any) => inv.team)
          .map((inv: any) => ({
            id: inv.id,
            teamId: inv.team_id,
            teamName: inv.team?.name || 'Unknown Team',
            role: inv.role,
            token: inv.token,
            expiresAt: inv.expires_at,
          }))
      );
    } catch (err) {
      console.error('Failed to fetch team data:', err);
      setMembership(null);
      setPendingInvitations([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchTeamData();
  }, [fetchTeamData]);

  const acceptInvitation = useCallback(async (token: string) => {
    await teamService.acceptInvitation(token);
    await fetchTeamData();
  }, [fetchTeamData]);

  const declineInvitation = useCallback(async (token: string) => {
    await teamService.declineInvitation(token);
    await fetchTeamData();
  }, [fetchTeamData]);

  const isFieldWorker = membership?.role === 'field_worker';
  const isTeamOwner = membership?.role === 'owner';

  return (
    <TeamContext.Provider
      value={{
        membership,
        pendingInvitations,
        isFieldWorker,
        isTeamOwner,
        loading,
        acceptInvitation,
        declineInvitation,
        refresh: fetchTeamData,
      }}
    >
      {children}
    </TeamContext.Provider>
  );
};
