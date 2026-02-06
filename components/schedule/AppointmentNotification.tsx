import React, { useState } from 'react';
import { X, Send, Loader2, CheckCircle2, Calendar, Clock, MapPin, User } from 'lucide-react';
import type { ScheduleEntry, Customer, AppSettings } from '../../types';
import { emailService } from '../../src/services/emailService';

interface AppointmentNotificationProps {
  entry: ScheduleEntry;
  customer: Customer;
  settings: AppSettings;
  type: 'confirmation' | 'reminder';
  onClose: () => void;
  onSent?: () => void;
}

export const AppointmentNotification: React.FC<AppointmentNotificationProps> = ({
  entry,
  customer,
  settings,
  type,
  onClose,
  onSent,
}) => {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const appointmentDate = new Date(entry.start);
  const formattedDate = appointmentDate.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const formattedTime = appointmentDate.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  });
  const endTime = new Date(entry.end).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const isConfirmation = type === 'confirmation';
  const subject = isConfirmation
    ? `Appointment Confirmed: ${entry.title} — ${formattedDate}`
    : `Reminder: Your appointment tomorrow — ${entry.title}`;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #1e293b; color: white; padding: 24px; border-radius: 12px 12px 0 0;">
        <h1 style="margin: 0; font-size: 20px;">${settings.companyName || 'TradeSync'}</h1>
        <p style="margin: 4px 0 0; opacity: 0.7; font-size: 14px;">
          ${isConfirmation ? 'Appointment Confirmation' : 'Appointment Reminder'}
        </p>
      </div>
      <div style="background: white; padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
        <p style="color: #334155;">Hi ${customer.name},</p>
        <p style="color: #334155;">
          ${isConfirmation
            ? 'This is to confirm your upcoming appointment:'
            : 'Just a friendly reminder about your upcoming appointment:'
          }
        </p>
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <p style="margin: 0 0 8px; color: #1e293b; font-weight: bold; font-size: 16px;">${entry.title}</p>
          <p style="margin: 0 0 4px; color: #475569; font-size: 14px;">📅 ${formattedDate}</p>
          <p style="margin: 0 0 4px; color: #475569; font-size: 14px;">🕐 ${formattedTime} — ${endTime}</p>
          ${entry.location ? `<p style="margin: 0; color: #475569; font-size: 14px;">📍 ${entry.location}</p>` : ''}
        </div>
        ${entry.description ? `<p style="color: #64748b; font-size: 13px; font-style: italic;">${entry.description}</p>` : ''}
        <p style="color: #334155;">
          If you need to reschedule or have any questions, please don't hesitate to get in touch.
        </p>
        <p style="color: #64748b; font-size: 13px; margin-top: 24px;">
          Kind regards,<br/>${settings.companyName || 'TradeSync'}
        </p>
      </div>
    </div>
  `;

  const handleSend = async () => {
    if (!customer.email) {
      setError('No email address for this customer');
      return;
    }

    setSending(true);
    setError(null);

    try {
      await emailService.send({
        to: customer.email,
        subject,
        html,
        fromName: settings.companyName || 'TradeSync',
        templateType: isConfirmation ? 'appointment_confirmation' : 'appointment_reminder',
      });
      setSent(true);
      onSent?.();
    } catch (err) {
      setError('Failed to send email. Please try again.');
      console.error('Failed to send appointment notification:', err);
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 text-center animate-in zoom-in-95">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={32} className="text-emerald-500" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-2">
            {isConfirmation ? 'Confirmation Sent!' : 'Reminder Sent!'}
          </h3>
          <p className="text-sm text-slate-600 mb-4">
            Email sent to {customer.email}
          </p>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden animate-in slide-in-from-bottom-4">
        {/* Header */}
        <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Send size={16} className={isConfirmation ? 'text-blue-500' : 'text-amber-500'} />
            <h3 className="font-bold text-slate-900">
              {isConfirmation ? 'Send Confirmation' : 'Send Reminder'}
            </h3>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-200 rounded-lg transition-colors">
            <X size={18} className="text-slate-400" />
          </button>
        </div>

        {/* Appointment Details */}
        <div className="p-5 space-y-4">
          <div className="bg-slate-50 rounded-xl p-4 space-y-2">
            <h4 className="font-bold text-slate-900">{entry.title}</h4>
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Calendar size={14} className="text-slate-400" />
              <span>{formattedDate}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Clock size={14} className="text-slate-400" />
              <span>{formattedTime} — {endTime}</span>
            </div>
            {entry.location && (
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <MapPin size={14} className="text-slate-400" />
                <span>{entry.location}</span>
              </div>
            )}
          </div>

          {/* Recipient */}
          <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <User size={18} className="text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">{customer.name}</p>
              <p className="text-xs text-slate-500">{customer.email || 'No email address'}</p>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
              {error}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="px-5 py-4 bg-slate-50 border-t border-slate-200 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={sending || !customer.email}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-colors flex items-center justify-center gap-2 ${
              isConfirmation
                ? 'bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300'
                : 'bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300'
            }`}
          >
            {sending ? (
              <><Loader2 size={16} className="animate-spin" /> Sending...</>
            ) : (
              <><Send size={16} /> Send {isConfirmation ? 'Confirmation' : 'Reminder'}</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
