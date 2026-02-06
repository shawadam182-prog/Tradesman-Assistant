import React from 'react';
import { Bell, Clock } from 'lucide-react';

interface AppointmentReminderSettingsProps {
  enabled: boolean;
  reminderHours: number;
  onToggle: (enabled: boolean) => void;
  onUpdateHours: (hours: number) => void;
}

const HOUR_OPTIONS = [
  { value: 1, label: '1 hour before' },
  { value: 2, label: '2 hours before' },
  { value: 4, label: '4 hours before' },
  { value: 12, label: '12 hours before' },
  { value: 24, label: '1 day before' },
  { value: 48, label: '2 days before' },
];

export const AppointmentReminderSettings: React.FC<AppointmentReminderSettingsProps> = ({
  enabled,
  reminderHours,
  onToggle,
  onUpdateHours,
}) => {
  return (
    <div className="space-y-3">
      {/* Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock size={16} className="text-blue-500" />
          <div>
            <p className="text-sm font-bold text-slate-900">Appointment Reminders</p>
            <p className="text-[10px] text-slate-500">Automatically remind customers before their appointments</p>
          </div>
        </div>
        <button
          onClick={() => onToggle(!enabled)}
          className={`relative w-11 h-6 rounded-full transition-colors ${enabled ? 'bg-emerald-500' : 'bg-slate-200'}`}
        >
          <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${enabled ? 'left-[22px]' : 'left-0.5'}`} />
        </button>
      </div>

      {enabled && (
        <div className="pl-7 space-y-2">
          <p className="text-xs text-slate-500">Send automatic reminders:</p>
          <div className="flex flex-wrap gap-2">
            {HOUR_OPTIONS.map(option => (
              <button
                key={option.value}
                onClick={() => onUpdateHours(option.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  reminderHours === option.value
                    ? 'bg-blue-500 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
