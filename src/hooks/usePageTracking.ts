import { useEffect, useRef } from 'react';
import { activityService } from '../services/activityService';

// Map of tab IDs to human-readable page names
const PAGE_NAMES: Record<string, string> = {
  home: 'Home',
  jobpacks: 'Jobs',
  schedule: 'Schedule',
  quotes: 'Quotes',
  invoices: 'Invoices',
  customers: 'Customers',
  expenses: 'Expenses',
  materials: 'Materials',
  files: 'Files',
  bank: 'Bank Import',
  reconcile: 'Reconciliation',
  vat: 'VAT Summary',
  profitloss: 'Profit & Loss',
  payables: 'Payables',
  settings: 'Settings',
  wholesalers: 'Referrals Admin',
  support: 'Support Requests',
  trial_analytics: 'Trial Analytics',
  future_jobs: 'Future Jobs',
  view: 'Document View',
  jobpack_detail: 'Job Detail',
  quote_edit: 'Quote Editor',
};

/**
 * Hook to track page views when the active tab changes.
 * Call this in your main App component with the current tab.
 */
export function usePageTracking(activeTab: string): void {
  const previousTab = useRef<string | null>(null);

  useEffect(() => {
    // Only track if tab actually changed
    if (activeTab && activeTab !== previousTab.current) {
      const pageName = PAGE_NAMES[activeTab] || activeTab;
      const pagePath = `/${activeTab}`;

      // Log the page view asynchronously (don't await)
      activityService.logPageView(pagePath, pageName).catch(() => {
        // Silently ignore errors - tracking shouldn't break the app
      });

      previousTab.current = activeTab;
    }
  }, [activeTab]);
}

/**
 * Helper function to manually track a page view.
 * Useful for tracking sub-pages or modals.
 */
export function trackPageView(pagePath: string, pageName: string): void {
  activityService.logPageView(pagePath, pageName).catch(() => {
    // Silently ignore errors
  });
}

/**
 * Helper function to track feature usage.
 * Use this when a user performs a significant action.
 */
export function trackFeatureUsed(featureName: string, details?: Record<string, any>): void {
  activityService.logFeatureUsed(featureName, details).catch(() => {
    // Silently ignore errors
  });
}
