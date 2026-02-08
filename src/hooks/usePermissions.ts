import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { supabase } from '../lib/supabase';
import type { TeamRole } from '../../types';

interface Permissions {
  role: TeamRole | null;
  isOwner: boolean;
  isAdmin: boolean;
  isFieldWorker: boolean;
  // Jobs
  canViewAllJobs: boolean;
  canCreateJobs: boolean;
  canAssignJobs: boolean;
  // Quotes & Invoices
  canAccessQuotes: boolean;
  canAccessInvoices: boolean;
  // Customers
  canViewAllCustomers: boolean;
  // Timesheets
  canApproveTimesheets: boolean;
  // Team
  canManageAdmins: boolean;
  canManageFieldWorkers: boolean;
  // Accounting
  canAccessAccounting: boolean;
  // Billing
  canManageBilling: boolean;
}

const OWNER_OR_SOLO: Permissions = {
  role: 'owner',
  isOwner: true,
  isAdmin: false,
  isFieldWorker: false,
  canViewAllJobs: true,
  canCreateJobs: true,
  canAssignJobs: true,
  canAccessQuotes: true,
  canAccessInvoices: true,
  canViewAllCustomers: true,
  canApproveTimesheets: true,
  canManageAdmins: true,
  canManageFieldWorkers: true,
  canAccessAccounting: true,
  canManageBilling: true,
};

const LOADING_PERMISSIONS: Permissions = {
  role: null,
  isOwner: false,
  isAdmin: false,
  isFieldWorker: false,
  canViewAllJobs: false,
  canCreateJobs: false,
  canAssignJobs: false,
  canAccessQuotes: false,
  canAccessInvoices: false,
  canViewAllCustomers: false,
  canApproveTimesheets: false,
  canManageAdmins: false,
  canManageFieldWorkers: false,
  canAccessAccounting: false,
  canManageBilling: false,
};

function permissionsForRole(role: TeamRole, tier: string): Permissions {
  if (role === 'owner') return OWNER_OR_SOLO;

  if (role === 'admin') {
    return {
      role: 'admin',
      isOwner: false,
      isAdmin: true,
      isFieldWorker: false,
      canViewAllJobs: true,
      canCreateJobs: true,
      canAssignJobs: true,
      canAccessQuotes: true,
      canAccessInvoices: true,
      canViewAllCustomers: true,
      canApproveTimesheets: true,
      canManageAdmins: false,
      canManageFieldWorkers: true,
      canAccessAccounting: false,
      canManageBilling: false,
    };
  }

  // field_worker
  return {
    role: 'field_worker',
    isOwner: false,
    isAdmin: false,
    isFieldWorker: true,
    canViewAllJobs: false,
    canCreateJobs: false,
    canAssignJobs: false,
    canAccessQuotes: false,
    canAccessInvoices: false,
    canViewAllCustomers: false,
    canApproveTimesheets: false,
    canManageAdmins: false,
    canManageFieldWorkers: false,
    canAccessAccounting: false,
    canManageBilling: false,
  };
}

export function usePermissions(): Permissions {
  const { user } = useAuth();
  const { settings } = useData();
  const [teamRole, setTeamRole] = useState<TeamRole | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!user) return;

    // Check if user is a team member (not owner) in any team
    const fetchRole = async () => {
      const { data } = await supabase
        .from('team_members')
        .select('role, team_id')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .limit(1)
        .maybeSingle();

      setTeamRole((data?.role as TeamRole) || null);
      setLoaded(true);
    };

    fetchRole();
  }, [user?.id]);

  // Still loading — return restrictive defaults so nothing leaks
  if (!loaded) {
    return LOADING_PERMISSIONS;
  }

  // Loaded but no team membership → solo user → full owner permissions
  if (!teamRole) {
    return OWNER_OR_SOLO;
  }

  return permissionsForRole(teamRole, settings.subscriptionTier || 'free');
}
