import React, { useState, useMemo } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, MapPin, Clock } from 'lucide-react';
import { useData } from '../src/contexts/DataContext';

export const WorkerSchedule: React.FC = () => {
  const { schedule } = useData();
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Generate week dates
  const weekDates = useMemo(() => {
    const startOfWeek = new Date(selectedDate);
    const day = startOfWeek.getDay();
    const diff = day === 0 ? -6 : 1 - day; // Start on Monday
    startOfWeek.setDate(startOfWeek.getDate() + diff);

    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(startOfWeek);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [selectedDate]);

  const selectedDateStr = selectedDate.toISOString().split('T')[0];

  // Filter schedule entries for selected date
  const dayEntries = schedule.filter(entry => {
    const entryDate = entry.start?.split('T')[0] || '';
    return entryDate === selectedDateStr;
  }).sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

  const navigateWeek = (direction: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + direction * 7);
    setSelectedDate(newDate);
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isSelected = (date: Date) => {
    return date.toDateString() === selectedDate.toDateString();
  };

  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div className="px-4 pt-4 space-y-4">
      <h1 className="text-lg font-bold text-slate-200">Schedule</h1>

      {/* Week navigator */}
      <div className="bg-slate-800/50 rounded-xl p-3">
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => navigateWeek(-1)} className="p-1 text-slate-400">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <p className="text-sm font-medium text-slate-300">
            {weekDates[0].toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })}
            {' - '}
            {weekDates[6].toLocaleDateString('en-GB', { month: 'short', day: 'numeric', year: 'numeric' })}
          </p>
          <button onClick={() => navigateWeek(1)} className="p-1 text-slate-400">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1">
          {weekDates.map((date, i) => {
            const dateStr = date.toISOString().split('T')[0];
            const hasEntries = schedule.some(e => (e.start?.split('T')[0] || '') === dateStr);

            return (
              <button
                key={i}
                onClick={() => setSelectedDate(new Date(date))}
                className={`flex flex-col items-center py-2 rounded-lg transition-colors ${
                  isSelected(date)
                    ? 'bg-teal-500 text-white'
                    : isToday(date)
                    ? 'bg-teal-500/20 text-teal-400'
                    : 'text-slate-400 active:bg-slate-700'
                }`}
              >
                <span className="text-[10px] font-medium">{dayNames[i]}</span>
                <span className="text-sm font-bold mt-0.5">{date.getDate()}</span>
                {hasEntries && !isSelected(date) && (
                  <div className="w-1 h-1 bg-teal-400 rounded-full mt-1" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Day entries */}
      <div>
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
          {selectedDate.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
        </h2>

        {dayEntries.length === 0 ? (
          <div className="bg-slate-800/50 rounded-xl p-6 text-center">
            <CalendarDays className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-sm text-slate-500">Nothing scheduled</p>
          </div>
        ) : (
          <div className="space-y-2">
            {dayEntries.map(entry => (
              <div key={entry.id} className="bg-slate-800/50 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <div className="w-1 h-full min-h-[40px] bg-teal-500 rounded-full flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-200">{entry.title}</p>
                    <div className="flex items-center gap-3 mt-1.5">
                      <div className="flex items-center gap-1 text-xs text-slate-400">
                        <Clock className="w-3 h-3" />
                        {new Date(entry.start).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                        {entry.end && (
                          <> - {new Date(entry.end).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</>
                        )}
                      </div>
                      {entry.location && (
                        <div className="flex items-center gap-1 text-xs text-slate-500">
                          <MapPin className="w-3 h-3" />
                          <span className="truncate max-w-[150px]">{entry.location}</span>
                        </div>
                      )}
                    </div>
                    {entry.description && (
                      <p className="text-xs text-slate-500 mt-2">{entry.description}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
