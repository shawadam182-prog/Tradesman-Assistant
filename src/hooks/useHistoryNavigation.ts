import { useEffect, useCallback, useRef } from 'react';

interface NavigationState {
  tab: string;
  projectId?: string | null;
  quoteId?: string | null;
  timestamp: number;
}

interface UseHistoryNavigationOptions {
  activeTab: string;
  activeProjectId: string | null;
  viewingQuoteId: string | null;
  setActiveTab: (tab: string) => void;
  setActiveProjectId: (id: string | null) => void;
  setViewingQuoteId: (id: string | null) => void;
}

// Main tabs that users can navigate to (non-detail views)
const MAIN_TABS = [
  'home', 'jobpacks', 'quotes', 'invoices', 'customers',
  'schedule', 'expenses', 'materials', 'files', 'bank',
  'reconcile', 'vat', 'payables', 'settings', 'wholesalers', 'future_jobs'
];

export function useHistoryNavigation({
  activeTab,
  activeProjectId,
  viewingQuoteId,
  setActiveTab,
  setActiveProjectId,
  setViewingQuoteId,
}: UseHistoryNavigationOptions) {
  const isHandlingPopState = useRef(false);
  const lastPushedState = useRef<string>('');
  const historyLength = useRef(0);

  // Push state to history when navigation changes
  useEffect(() => {
    // Skip if we're handling a popstate event
    if (isHandlingPopState.current) {
      isHandlingPopState.current = false;
      return;
    }

    const state: NavigationState = {
      tab: activeTab,
      projectId: activeProjectId,
      quoteId: viewingQuoteId,
      timestamp: Date.now(),
    };

    const stateKey = `${activeTab}-${activeProjectId}-${viewingQuoteId}`;

    // Avoid pushing duplicate states
    if (stateKey === lastPushedState.current) {
      return;
    }

    lastPushedState.current = stateKey;

    // Always push to history for navigation (allows back button to work)
    // Don't push if going to home and we're already at the start
    if (activeTab === 'home' && historyLength.current === 0) {
      window.history.replaceState(state, '', window.location.pathname);
    } else {
      window.history.pushState(state, '', window.location.pathname);
      historyLength.current++;
    }
  }, [activeTab, activeProjectId, viewingQuoteId]);

  // Handle browser/phone back button
  const handlePopState = useCallback((event: PopStateEvent) => {
    isHandlingPopState.current = true;
    historyLength.current = Math.max(0, historyLength.current - 1);

    const state = event.state as NavigationState | null;

    if (state?.tab) {
      // Restore previous state
      setActiveTab(state.tab);
      setActiveProjectId(state.projectId ?? null);
      setViewingQuoteId(state.quoteId ?? null);
      lastPushedState.current = `${state.tab}-${state.projectId}-${state.quoteId}`;
    } else {
      // No state - we're at the beginning, go to home
      // Push a new state to prevent exiting the app
      const homeState: NavigationState = {
        tab: 'home',
        projectId: null,
        quoteId: null,
        timestamp: Date.now()
      };
      window.history.pushState(homeState, '', window.location.pathname);
      historyLength.current = 1;
      setActiveTab('home');
      setActiveProjectId(null);
      setViewingQuoteId(null);
      lastPushedState.current = 'home-null-null';
    }
  }, [setActiveTab, setActiveProjectId, setViewingQuoteId]);

  // Set up popstate listener
  useEffect(() => {
    window.addEventListener('popstate', handlePopState);

    // Initialize history state on mount
    const initialState: NavigationState = {
      tab: activeTab,
      projectId: activeProjectId,
      quoteId: viewingQuoteId,
      timestamp: Date.now(),
    };

    // Replace current state to establish baseline
    window.history.replaceState(initialState, '', window.location.pathname);
    lastPushedState.current = `${activeTab}-${activeProjectId}-${viewingQuoteId}`;
    historyLength.current = 0;

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [handlePopState]); // Only run on mount and when handler changes
}
