/**
 * Offline Indicator Component
 *
 * Shows offline status, pending changes count, and sync progress.
 * Appears as a floating indicator when offline or syncing.
 */

import React from 'react';
import { useOffline } from '../src/contexts/OfflineContext';
import {
  WifiOff, Wifi, Cloud, CloudOff, RefreshCw, Check, AlertTriangle, X
} from 'lucide-react';

interface OfflineIndicatorProps {
  position?: 'top' | 'bottom';
  showWhenOnline?: boolean;
}

export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({
  position = 'bottom',
  showWhenOnline = false,
}) => {
  const { isOnline, isSyncing, pendingCount, errors, forceSync } = useOffline();
  const [dismissed, setDismissed] = React.useState(false);

  // Reset dismissed when status changes
  React.useEffect(() => {
    if (!isOnline || pendingCount > 0 || errors.length > 0) {
      setDismissed(false);
    }
  }, [isOnline, pendingCount, errors.length]);

  // Don't show if online and no pending changes (unless showWhenOnline is true)
  if (isOnline && pendingCount === 0 && !isSyncing && errors.length === 0) {
    if (!showWhenOnline) return null;
  }

  // Don't show if dismissed and online with no errors
  if (dismissed && isOnline && errors.length === 0) return null;

  const positionClasses = position === 'top'
    ? 'top-4'
    : 'bottom-20 md:bottom-4';

  return (
    <div className={`fixed left-4 right-4 md:left-auto md:right-4 md:max-w-sm ${positionClasses} z-50`}>
      {/* Offline Banner */}
      {!isOnline && (
        <div className="bg-slate-800 text-white rounded-2xl p-4 shadow-2xl mb-2 flex items-center gap-3">
          <div className="p-2 bg-amber-500 rounded-xl">
            <WifiOff size={20} />
          </div>
          <div className="flex-1">
            <p className="font-bold">You're offline</p>
            <p className="text-xs text-slate-300">
              Changes will sync when you're back online
            </p>
          </div>
        </div>
      )}

      {/* Pending Changes Indicator */}
      {pendingCount > 0 && (
        <div className="bg-white border-2 border-amber-200 rounded-2xl p-4 shadow-lg mb-2 flex items-center gap-3">
          <div className={`p-2 rounded-xl ${isSyncing ? 'bg-blue-100 text-blue-600' : 'bg-amber-100 text-amber-600'}`}>
            {isSyncing ? (
              <RefreshCw size={20} className="animate-spin" />
            ) : (
              <Cloud size={20} />
            )}
          </div>
          <div className="flex-1">
            <p className="font-bold text-slate-900">
              {isSyncing ? 'Syncing...' : `${pendingCount} pending change${pendingCount !== 1 ? 's' : ''}`}
            </p>
            <p className="text-xs text-slate-500">
              {isSyncing
                ? 'Uploading your changes'
                : isOnline
                  ? 'Will sync automatically'
                  : 'Waiting for connection'}
            </p>
          </div>
          {isOnline && !isSyncing && (
            <button
              onClick={forceSync}
              className="p-2 bg-amber-500 text-white rounded-xl hover:bg-amber-600 transition-colors"
              title="Sync now"
            >
              <RefreshCw size={18} />
            </button>
          )}
        </div>
      )}

      {/* Sync Errors */}
      {errors.length > 0 && (
        <div className="bg-white border-2 border-red-200 rounded-2xl p-4 shadow-lg flex items-start gap-3">
          <div className="p-2 bg-red-100 text-red-600 rounded-xl shrink-0">
            <AlertTriangle size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-slate-900">Sync errors</p>
            <p className="text-xs text-slate-500 mb-2">
              Some changes couldn't be synced
            </p>
            <div className="text-xs text-red-600 space-y-1 max-h-20 overflow-y-auto">
              {errors.slice(0, 3).map((error, i) => (
                <p key={i} className="truncate">{error}</p>
              ))}
              {errors.length > 3 && (
                <p className="text-slate-400">+{errors.length - 3} more</p>
              )}
            </div>
          </div>
          <button
            onClick={() => setDismissed(true)}
            className="p-1 text-slate-400 hover:text-slate-600 shrink-0"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Success Indicator (brief) */}
      {isOnline && pendingCount === 0 && !isSyncing && errors.length === 0 && showWhenOnline && (
        <div className="bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-3 shadow-lg flex items-center gap-3">
          <div className="p-2 bg-emerald-100 text-emerald-600 rounded-xl">
            <Check size={18} />
          </div>
          <div className="flex-1">
            <p className="font-bold text-emerald-700 text-sm">All synced</p>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Compact offline indicator for header/navbar
 */
export const OfflineBadge: React.FC = () => {
  const { isOnline, isSyncing, pendingCount } = useOffline();

  if (isOnline && pendingCount === 0 && !isSyncing) return null;

  return (
    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-bold ${
      !isOnline
        ? 'bg-slate-800 text-white'
        : isSyncing
          ? 'bg-blue-100 text-blue-700'
          : 'bg-amber-100 text-amber-700'
    }`}>
      {!isOnline ? (
        <>
          <WifiOff size={12} />
          <span>Offline</span>
        </>
      ) : isSyncing ? (
        <>
          <RefreshCw size={12} className="animate-spin" />
          <span>Syncing</span>
        </>
      ) : (
        <>
          <Cloud size={12} />
          <span>{pendingCount}</span>
        </>
      )}
    </div>
  );
};

export default OfflineIndicator;
