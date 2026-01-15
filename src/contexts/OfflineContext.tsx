/**
 * Offline Context
 *
 * Provides React context for offline state and sync status.
 * Components can use this to show offline indicators and sync status.
 */

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { syncManager } from '../services/syncManager';
import { offlineService } from '../services/offlineStorage';

interface OfflineState {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  lastSyncTime: number;
  errors: string[];
}

interface OfflineContextType extends OfflineState {
  forceSync: () => Promise<void>;
  clearPendingMutations: () => Promise<void>;
}

const OfflineContext = createContext<OfflineContextType | undefined>(undefined);

export const useOffline = () => {
  const context = useContext(OfflineContext);
  if (!context) {
    throw new Error('useOffline must be used within an OfflineProvider');
  }
  return context;
};

export const OfflineProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<OfflineState>({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isSyncing: false,
    pendingCount: 0,
    lastSyncTime: 0,
    errors: [],
  });

  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;

    // Subscribe to sync manager updates
    const unsubscribe = syncManager.subscribe((syncState) => {
      if (!mounted.current) return;
      setState({
        isOnline: syncState.isOnline,
        isSyncing: syncState.status === 'syncing',
        pendingCount: syncState.pendingCount,
        lastSyncTime: syncState.lastSyncTime,
        errors: syncState.errors,
      });
    });

    // Initial sync check on mount
    if (navigator.onLine) {
      syncManager.syncPendingMutations();
    }

    return () => {
      mounted.current = false;
      unsubscribe();
    };
  }, []);

  const forceSync = useCallback(async () => {
    if (state.isOnline) {
      await syncManager.forcSync();
    }
  }, [state.isOnline]);

  const clearPendingMutations = useCallback(async () => {
    const mutations = await offlineService.getPendingMutations();
    for (const mutation of mutations) {
      await offlineService.removeMutation(mutation.id);
    }
    setState(prev => ({ ...prev, pendingCount: 0 }));
  }, []);

  const value: OfflineContextType = {
    ...state,
    forceSync,
    clearPendingMutations,
  };

  return (
    <OfflineContext.Provider value={value}>
      {children}
    </OfflineContext.Provider>
  );
};

export default OfflineContext;
