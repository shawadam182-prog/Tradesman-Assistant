import React from 'react';
import { Mic, Bell, BellRing, CheckCircle2, Trash2, Loader2, MicOff, Plus } from 'lucide-react';
import { hapticTap, hapticSuccess } from '../../src/hooks/useHaptic';

export interface Reminder {
  id: string;
  text: string;
  time: string;
  isCompleted: boolean;
  isAlarming?: boolean;
}

interface HomeRemindersProps {
  reminders: Reminder[];
  isListeningReminder: boolean;
  isProcessingReminder: boolean;
  newReminderText: string;
  newReminderTime: string;
  onSetReminders: React.Dispatch<React.SetStateAction<Reminder[]>>;
  onSetNewReminderText: (text: string) => void;
  onSetNewReminderTime: (time: string) => void;
  onStartVoiceReminder: () => void;
  onAddReminder: () => void;
}

export const HomeReminders: React.FC<HomeRemindersProps> = ({
  reminders,
  isListeningReminder,
  isProcessingReminder,
  newReminderText,
  newReminderTime,
  onSetReminders,
  onSetNewReminderText,
  onSetNewReminderTime,
  onStartVoiceReminder,
  onAddReminder,
}) => {
  const toggleReminder = (id: string) => {
    onSetReminders(prev => prev.map(r =>
      r.id === id ? { ...r, isCompleted: !r.isCompleted, isAlarming: false } : r
    ));
    hapticSuccess();
  };

  const deleteReminder = (id: string) => {
    onSetReminders(prev => prev.filter(r => r.id !== id));
    hapticTap();
  };

  const snoozeReminder = (id: string) => {
    onSetReminders(prev => prev.map(r => {
      if (r.id === id) {
        const now = new Date();
        now.setMinutes(now.getMinutes() + 5);
        const newTime = now.toTimeString().slice(0, 5);
        return { ...r, time: newTime, isAlarming: false };
      }
      return r;
    }));
    hapticTap();
  };

  return (
    <div className="bg-white rounded-2xl md:rounded-[32px] border border-slate-200 p-4 md:p-6 shadow-sm">
      <div className="flex items-center justify-between mb-3 md:mb-4">
        <div className="flex items-center gap-2 md:gap-3">
          <div className="p-2 md:p-3 bg-purple-500 rounded-xl md:rounded-2xl text-white">
            <Bell size={18} className="md:w-6 md:h-6" />
          </div>
          <h3 className="font-black text-slate-900 text-sm md:text-lg">Reminders</h3>
        </div>
        <button
          onClick={() => { hapticTap(); onStartVoiceReminder(); }}
          disabled={isProcessingReminder}
          className={`p-2 md:p-3 rounded-xl md:rounded-2xl transition-all ${
            isListeningReminder
              ? 'bg-red-500 text-white animate-pulse'
              : isProcessingReminder
              ? 'bg-purple-100 text-purple-400'
              : 'bg-purple-100 hover:bg-purple-200 text-purple-600'
          }`}
        >
          {isProcessingReminder ? (
            <Loader2 size={18} className="md:w-5 md:h-5 animate-spin" />
          ) : isListeningReminder ? (
            <MicOff size={18} className="md:w-5 md:h-5" />
          ) : (
            <Mic size={18} className="md:w-5 md:h-5" />
          )}
        </button>
      </div>

      {/* Add Reminder Form */}
      <div className="flex gap-2 mb-3 md:mb-4">
        <input
          type="text"
          placeholder="Reminder text..."
          value={newReminderText}
          onChange={(e) => onSetNewReminderText(e.target.value)}
          className="flex-1 px-3 py-2 text-sm md:text-base border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
        <input
          type="time"
          value={newReminderTime}
          onChange={(e) => onSetNewReminderTime(e.target.value)}
          className="px-2 py-2 text-sm md:text-base border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
        <button
          onClick={onAddReminder}
          disabled={!newReminderText || !newReminderTime}
          className="p-2 bg-purple-500 text-white rounded-xl hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus size={18} />
        </button>
      </div>

      {/* Reminders List */}
      {reminders.length === 0 ? (
        <div className="text-center py-4 md:py-6">
          <p className="text-slate-400 text-xs md:text-sm italic">No reminders set</p>
          <p className="text-slate-300 text-[10px] md:text-xs mt-1">Tap the mic to add one by voice</p>
        </div>
      ) : (
        <div className="space-y-2">
          {reminders.map(reminder => (
            <div
              key={reminder.id}
              className={`flex items-center gap-2 md:gap-3 p-2 md:p-3 rounded-xl transition-all ${
                reminder.isAlarming
                  ? 'bg-red-100 border-2 border-red-500 animate-pulse'
                  : reminder.isCompleted
                  ? 'bg-slate-50 opacity-60'
                  : 'bg-purple-50'
              }`}
            >
              {reminder.isAlarming ? (
                <BellRing size={18} className="md:w-5 md:h-5 text-red-500 animate-bounce" />
              ) : (
                <button onClick={() => toggleReminder(reminder.id)}>
                  <CheckCircle2
                    size={18}
                    className={`md:w-5 md:h-5 ${reminder.isCompleted ? 'text-green-500' : 'text-slate-300'}`}
                  />
                </button>
              )}
              <div className="flex-1 min-w-0">
                <p className={`text-sm md:text-base font-medium truncate ${reminder.isCompleted ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                  {reminder.text}
                </p>
                <p className="text-[10px] md:text-xs text-slate-500">{reminder.time}</p>
              </div>
              {reminder.isAlarming ? (
                <div className="flex gap-1">
                  <button
                    onClick={() => snoozeReminder(reminder.id)}
                    className="px-2 py-1 text-xs font-bold bg-amber-500 text-white rounded-lg"
                  >
                    +5min
                  </button>
                  <button
                    onClick={() => toggleReminder(reminder.id)}
                    className="px-2 py-1 text-xs font-bold bg-green-500 text-white rounded-lg"
                  >
                    Done
                  </button>
                </div>
              ) : (
                <button onClick={() => deleteReminder(reminder.id)} className="p-1 text-slate-400 hover:text-red-500">
                  <Trash2 size={14} className="md:w-4 md:h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
