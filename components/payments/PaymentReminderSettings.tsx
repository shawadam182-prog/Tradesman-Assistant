import React, { useState } from 'react';
import { Bell, Plus, X } from 'lucide-react';

interface PaymentReminderSettingsProps {
  enabled: boolean;
  reminderDays: number[];
  onToggle: (enabled: boolean) => void;
  onUpdateDays: (days: number[]) => void;
}

export const PaymentReminderSettings: React.FC<PaymentReminderSettingsProps> = ({
  enabled,
  reminderDays,
  onToggle,
  onUpdateDays,
}) => {
  const [newDay, setNewDay] = useState('');

  const addDay = () => {
    const day = parseInt(newDay);
    if (day > 0 && !reminderDays.includes(day)) {
      onUpdateDays([...reminderDays, day].sort((a, b) => a - b));
      setNewDay('');
    }
  };

  const removeDay = (day: number) => {
    onUpdateDays(reminderDays.filter(d => d !== day));
  };

  return (
    <div className="space-y-3">
      {/* Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell size={16} className="text-amber-500" />
          <div>
            <p className="text-sm font-bold text-slate-900">Payment Reminders</p>
            <p className="text-[10px] text-slate-500">Automatically remind customers about overdue payments</p>
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
          <p className="text-xs text-slate-500">Send reminders after these many days overdue:</p>
          <div className="flex flex-wrap gap-1.5">
            {reminderDays.map(day => (
              <span key={day} className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-800 rounded-lg text-xs font-bold">
                {day} day{day !== 1 ? 's' : ''}
                <button onClick={() => removeDay(day)} className="text-amber-500 hover:text-amber-700">
                  <X size={12} />
                </button>
              </span>
            ))}
            <div className="flex items-center gap-1">
              <input
                type="number"
                value={newDay}
                onChange={(e) => setNewDay(e.target.value)}
                placeholder="Days"
                className="w-16 px-2 py-1 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                min="1"
                onKeyDown={(e) => { if (e.key === 'Enter') addDay(); }}
              />
              <button
                onClick={addDay}
                className="p-1 bg-amber-50 text-amber-600 rounded-lg hover:bg-amber-100 transition-colors"
              >
                <Plus size={14} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
