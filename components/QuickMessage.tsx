import React, { useState } from 'react';
import {
  X, Send, Loader2, CheckCircle2, Navigation, Clock, MapPinCheck, CircleCheck, ChevronRight,
} from 'lucide-react';
import type { ScheduleEntry, Customer, AppSettings } from '../types';
import { emailService } from '../src/services/emailService';

type QuickMessageType = 'on_my_way' | 'running_late' | 'arrived' | 'job_complete';

interface MessageOption {
  type: QuickMessageType;
  label: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  hoverColor: string;
  subject: (title: string) => string;
  hasEta: boolean;
}

const MESSAGE_OPTIONS: MessageOption[] = [
  {
    type: 'on_my_way',
    label: "I'm on my way",
    icon: <Navigation size={20} />,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    hoverColor: 'active:bg-blue-100',
    subject: (title) => `On my way — ${title}`,
    hasEta: true,
  },
  {
    type: 'running_late',
    label: 'Running ~15 mins late',
    icon: <Clock size={20} />,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    hoverColor: 'active:bg-amber-100',
    subject: (title) => `Running a bit late — ${title}`,
    hasEta: false,
  },
  {
    type: 'arrived',
    label: "I've arrived",
    icon: <MapPinCheck size={20} />,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
    hoverColor: 'active:bg-emerald-100',
    subject: (title) => `Arrived on site — ${title}`,
    hasEta: false,
  },
  {
    type: 'job_complete',
    label: 'Job complete',
    icon: <CircleCheck size={20} />,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    hoverColor: 'active:bg-purple-100',
    subject: (title) => `Job complete — ${title}`,
    hasEta: false,
  },
];

interface QuickMessageProps {
  entry: ScheduleEntry;
  customer: Customer;
  settings: AppSettings;
  onClose: () => void;
  onSent?: () => void;
}

function buildHtml(
  type: QuickMessageType,
  customer: Customer,
  entry: ScheduleEntry,
  settings: AppSettings,
  eta?: string,
): string {
  const companyName = settings.companyName || 'TradeSync';
  const name = customer.name;
  const title = entry.title;
  const location = entry.location;

  const appointmentDate = new Date(entry.start);
  const formattedDate = appointmentDate.toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long',
  });
  const formattedTime = appointmentDate.toLocaleTimeString('en-GB', {
    hour: '2-digit', minute: '2-digit',
  });

  let body = '';
  switch (type) {
    case 'on_my_way':
      body = eta
        ? `<p style="color:#334155;">Just letting you know I'm on my way for <strong>${title}</strong>. I should be with you in about <strong>${eta} minutes</strong>.</p>`
        : `<p style="color:#334155;">Just letting you know I'm on my way for <strong>${title}</strong>.</p>`;
      break;
    case 'running_late':
      body = `<p style="color:#334155;">I'm running about 15 minutes behind schedule for <strong>${title}</strong>. Apologies for the delay — I'll be with you shortly.</p>`;
      break;
    case 'arrived':
      body = `<p style="color:#334155;">I've arrived on site for <strong>${title}</strong>.</p>`;
      break;
    case 'job_complete':
      body = `<p style="color:#334155;">Just to let you know, the work for <strong>${title}</strong> is now complete.</p>
        <p style="color:#334155;">If you have any questions or notice anything you'd like adjusted, please don't hesitate to get in touch.</p>`;
      break;
  }

  return `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:600px;margin:0 auto;">
      <div style="background:#1e293b;color:white;padding:24px;border-radius:12px 12px 0 0;">
        <h1 style="margin:0;font-size:20px;">${companyName}</h1>
      </div>
      <div style="background:white;padding:24px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px;">
        <p style="color:#334155;">Hi ${name},</p>
        ${body}
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin:16px 0;">
          <p style="margin:0 0 4px;color:#1e293b;font-weight:bold;font-size:15px;">${title}</p>
          <p style="margin:0 0 4px;color:#475569;font-size:14px;">📅 ${formattedDate} at ${formattedTime}</p>
          ${location ? `<p style="margin:0;color:#475569;font-size:14px;">📍 ${location}</p>` : ''}
        </div>
        <p style="color:#64748b;font-size:13px;margin-top:24px;">
          Kind regards,<br/>${companyName}${settings.phone ? `<br/>${settings.phone}` : ''}
        </p>
      </div>
    </div>
  `;
}

export const QuickMessage: React.FC<QuickMessageProps> = ({
  entry,
  customer,
  settings,
  onClose,
  onSent,
}) => {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [sentType, setSentType] = useState<QuickMessageType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [etaStep, setEtaStep] = useState(false);
  const [eta, setEta] = useState('');

  const handleSend = async (option: MessageOption, etaValue?: string) => {
    setSending(true);
    setError(null);

    try {
      const html = buildHtml(option.type, customer, entry, settings, etaValue);
      await emailService.send({
        to: customer.email,
        subject: option.subject(entry.title),
        html,
        fromName: settings.companyName || 'TradeSync',
        templateType: `quick_${option.type}`,
      });
      setSent(true);
      setSentType(option.type);
      onSent?.();
    } catch {
      setError('Failed to send. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const handleOptionTap = (option: MessageOption) => {
    if (option.hasEta) {
      setEtaStep(true);
    } else {
      handleSend(option);
    }
  };

  // Success screen
  if (sent) {
    const sentOption = MESSAGE_OPTIONS.find(o => o.type === sentType);
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-0 md:p-4">
        <div className="bg-white rounded-t-2xl md:rounded-2xl shadow-xl max-w-md w-full p-6 text-center animate-in slide-in-from-bottom-4">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={32} className="text-emerald-500" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-1">Message Sent!</h3>
          <p className="text-sm text-slate-500 mb-1">
            "{sentOption?.label}" sent to {customer.name}
          </p>
          <p className="text-xs text-slate-400 mb-5">{customer.email}</p>
          <button
            onClick={onClose}
            className="w-full py-3.5 bg-slate-900 text-white rounded-xl font-bold text-sm active:bg-slate-700 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  // ETA step for "On my way"
  if (etaStep) {
    const onMyWayOption = MESSAGE_OPTIONS[0];
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-0 md:p-4">
        <div className="bg-white rounded-t-2xl md:rounded-2xl shadow-xl max-w-md w-full overflow-hidden animate-in slide-in-from-bottom-4">
          <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <h3 className="font-bold text-slate-900">ETA (optional)</h3>
            <button onClick={() => setEtaStep(false)} className="p-1.5 hover:bg-slate-200 rounded-lg transition-colors">
              <X size={18} className="text-slate-400" />
            </button>
          </div>
          <div className="p-5 space-y-4">
            <p className="text-sm text-slate-600">How many minutes until you arrive?</p>
            <div className="flex flex-wrap gap-2">
              {['5', '10', '15', '20', '30', '45'].map(mins => (
                <button
                  key={mins}
                  onClick={() => setEta(mins)}
                  className={`px-4 py-3 rounded-xl text-sm font-bold transition-colors ${
                    eta === mins
                      ? 'bg-blue-500 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 active:bg-slate-200'
                  }`}
                >
                  {mins} min
                </button>
              ))}
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                {error}
              </div>
            )}
          </div>
          <div className="px-5 py-4 bg-slate-50 border-t border-slate-200 flex gap-3">
            <button
              onClick={() => handleSend(onMyWayOption)}
              disabled={sending}
              className="flex-1 py-3.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 active:bg-slate-50 transition-colors"
            >
              Skip ETA
            </button>
            <button
              onClick={() => handleSend(onMyWayOption, eta)}
              disabled={sending || !eta}
              className="flex-1 py-3.5 bg-blue-500 text-white rounded-xl text-sm font-bold active:bg-blue-600 disabled:bg-blue-300 transition-colors flex items-center justify-center gap-2"
            >
              {sending ? (
                <><Loader2 size={16} className="animate-spin" /> Sending...</>
              ) : (
                <><Send size={16} /> Send</>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Main menu — message options
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-0 md:p-4">
      <div className="bg-white rounded-t-2xl md:rounded-2xl shadow-xl max-w-md w-full overflow-hidden animate-in slide-in-from-bottom-4">
        {/* Header */}
        <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900">Quick Message</h3>
            <p className="text-xs text-slate-500 mt-0.5">to {customer.name}</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-200 rounded-lg transition-colors">
            <X size={18} className="text-slate-400" />
          </button>
        </div>

        {/* Message Options */}
        <div className="p-4 space-y-2">
          {MESSAGE_OPTIONS.map(option => (
            <button
              key={option.type}
              onClick={() => handleOptionTap(option)}
              disabled={sending}
              className={`w-full flex items-center gap-4 p-4 rounded-xl border border-slate-100 ${option.bgColor} ${option.hoverColor} transition-colors text-left`}
            >
              <div className={`${option.color} shrink-0`}>
                {option.icon}
              </div>
              <span className="flex-1 text-sm font-bold text-slate-900">{option.label}</span>
              <ChevronRight size={16} className="text-slate-300 shrink-0" />
            </button>
          ))}
        </div>

        {error && (
          <div className="mx-4 mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
            {error}
          </div>
        )}

        {sending && (
          <div className="px-4 pb-4">
            <div className="flex items-center justify-center gap-2 py-3 text-sm text-slate-500">
              <Loader2 size={16} className="animate-spin" /> Sending...
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
