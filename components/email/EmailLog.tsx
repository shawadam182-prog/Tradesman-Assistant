import React, { useState, useEffect, useCallback } from 'react';
import { Mail, Clock, RefreshCw } from 'lucide-react';
import { EmailStatusBadge } from './EmailStatusBadge';
import { emailService } from '../../src/services/emailService';
import type { EmailLogEntry } from '../../types';

interface EmailLogProps {
  quoteId: string;
}

export const EmailLog: React.FC<EmailLogProps> = ({ quoteId }) => {
  const [entries, setEntries] = useState<EmailLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const loadLog = useCallback(async () => {
    try {
      const data = await emailService.getLogForQuote(quoteId);
      setEntries(data);
    } catch (err) {
      console.error('Failed to load email log:', err);
    } finally {
      setLoading(false);
    }
  }, [quoteId]);

  useEffect(() => {
    loadLog();
  }, [loadLog]);

  const handleRetry = async (logId: string) => {
    try {
      await emailService.retry(logId);
      await loadLog();
    } catch (err) {
      console.error('Failed to retry email:', err);
    }
  };

  if (loading) return null;
  if (entries.length === 0) return null;

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
        <Mail size={14} className="text-slate-500" />
        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Email History</h4>
        <span className="ml-auto text-[10px] text-slate-400">{entries.length} email{entries.length !== 1 ? 's' : ''}</span>
      </div>
      <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto">
        {entries.map(entry => (
          <div key={entry.id} className="px-4 py-3 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-900 truncate">{entry.subject}</span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] text-slate-400">{entry.recipientEmail}</span>
                <span className="text-[10px] text-slate-300">·</span>
                <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                  <Clock size={8} />
                  {formatDate(entry.createdAt)}
                </span>
              </div>
            </div>
            <EmailStatusBadge
              entry={entry}
              onRetry={() => handleRetry(entry.id)}
              compact
            />
          </div>
        ))}
      </div>
    </div>
  );
};
