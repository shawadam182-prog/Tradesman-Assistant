import React from 'react';
import { Check, AlertCircle, Clock, RefreshCw, Mail, Eye } from 'lucide-react';
import type { EmailLogEntry } from '../../types';

interface EmailStatusBadgeProps {
  entry: EmailLogEntry;
  onRetry?: () => void;
  compact?: boolean;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: 'Pending', color: 'amber', icon: <Clock size={12} /> },
  queued: { label: 'Queued', color: 'blue', icon: <Clock size={12} /> },
  sent: { label: 'Sent', color: 'emerald', icon: <Check size={12} /> },
  failed: { label: 'Failed', color: 'red', icon: <AlertCircle size={12} /> },
  bounced: { label: 'Bounced', color: 'red', icon: <AlertCircle size={12} /> },
};

export const EmailStatusBadge: React.FC<EmailStatusBadgeProps> = ({ entry, onRetry, compact = false }) => {
  const config = STATUS_CONFIG[entry.status] || STATUS_CONFIG.pending;
  const isRetryable = (entry.status === 'failed' || entry.status === 'bounced') && entry.retryCount < entry.maxRetries;

  if (compact) {
    return (
      <div className="flex items-center gap-1.5">
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-${config.color}-100 text-${config.color}-700`}>
          {config.icon}
          {config.label}
        </span>
        {entry.openedAt && (
          <span className="inline-flex items-center gap-0.5 text-[10px] text-purple-600">
            <Eye size={10} />
            Opened
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border bg-${config.color}-50 border-${config.color}-200`}>
      <Mail size={14} className={`text-${config.color}-600`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className={`text-xs font-bold text-${config.color}-800`}>{config.label}</span>
          {entry.openedAt && (
            <span className="inline-flex items-center gap-0.5 text-[10px] text-purple-600 font-bold">
              <Eye size={10} />
              Opened
            </span>
          )}
        </div>
        <p className="text-[10px] text-slate-500 truncate">{entry.recipientEmail}</p>
        {entry.errorMessage && (
          <p className="text-[10px] text-red-600 mt-0.5">{entry.errorMessage}</p>
        )}
      </div>
      {isRetryable && onRetry && (
        <button
          onClick={onRetry}
          className="p-1.5 bg-white rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
          title="Retry sending"
        >
          <RefreshCw size={12} className="text-slate-500" />
        </button>
      )}
    </div>
  );
};
