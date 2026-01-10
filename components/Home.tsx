
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ScheduleEntry, Customer, JobPack } from '../types';
import { 
  Mic, Trash2, MapPin, Clock, Navigation, 
  Bell, BellRing, Play, CheckCircle2,
  Calendar, ArrowRight, Sparkles, 
  Timer, Loader2, MicOff, StickyNote, Eraser
} from 'lucide-react';
import { parseReminderVoiceInput } from '../src/services/geminiService';

interface HomeProps {
  schedule: ScheduleEntry[];
  customers: Customer[];
  projects: JobPack[];
  onNavigateToSchedule: () => void;
}

interface Reminder {
  id: string;
  text: string;
  time: string;
  isCompleted: boolean;
  isAlarming?: boolean;
}

export const Home: React.FC<HomeProps> = ({ schedule, customers, projects, onNavigateToSchedule }) => {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [quickNotes, setQuickNotes] = useState<string>('');
  const [isListeningReminder, setIsListeningReminder] = useState(false);
  const [isListeningNote, setIsListeningNote] = useState(false);
  const [isProcessingReminder, setIsProcessingReminder] = useState(false);
  
  const [newReminderText, setNewReminderText] = useState('');
  const [newReminderTime, setNewReminderTime] = useState('');
  
  const recognitionRef = useRef<any>(null);
  const noteRecognitionRef = useRef<any>(null);

  useEffect(() => {
    const savedReminders = localStorage.getItem('bq_home_reminders');
    const savedNotes = localStorage.getItem('bq_home_quick_notes');
    if (savedReminders) setReminders(JSON.parse(savedReminders));
    if (savedNotes) setQuickNotes(savedNotes);
  }, []);

  useEffect(() => {
    localStorage.setItem('bq_home_reminders', JSON.stringify(reminders));
  }, [reminders]);

  useEffect(() => {
    localStorage.setItem('bq_home_quick_notes', quickNotes);
  }, [quickNotes]);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const currentTimeStr = now.toTimeString().slice(0, 5); 
      
      setReminders(prev => prev.map(r => {
        if (!r.isCompleted && r.time === currentTimeStr && !r.isAlarming) {
          return { ...r, isAlarming: true };
        }
        return r;
      }));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      // Setup for Reminders
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.lang = 'en-GB';
      recognition.onstart = () => setIsListeningReminder(true);
      recognition.onend = () => setIsListeningReminder(false);
      recognition.onresult = async (event: any) => {
        const transcript = event.results[0][0].transcript;
        handleVoiceReminder(transcript);
      };
      recognitionRef.current = recognition;

      // Setup for Quick Notes
      const noteRecognition = new SpeechRecognition();
      noteRecognition.continuous = false;
      noteRecognition.lang = 'en-GB';
      noteRecognition.onstart = () => setIsListeningNote(true);
      noteRecognition.onend = () => {
        setIsListeningNote(false);
      };
      noteRecognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setQuickNotes(prev => (prev ? `${prev}\n${transcript}` : transcript));
      };
      noteRecognitionRef.current = noteRecognition;
    }
  }, []);

  const startVoiceReminder = () => {
    if (isListeningReminder) {
      recognitionRef.current?.stop();
      return;
    }
    try {
      recognitionRef.current?.start();
    } catch (e) {
      console.error("Mic start failed", e);
    }
  };

  const startVoiceNote = () => {
    if (isListeningNote) {
      noteRecognitionRef.current?.stop();
      return;
    }
    try {
      noteRecognitionRef.current?.start();
    } catch (e) {
      console.error("Note mic start failed", e);
    }
  };

  const handleVoiceReminder = async (transcript: string) => {
    setIsProcessingReminder(true);
    try {
      const parsed = await parseReminderVoiceInput(transcript);
      if (parsed.text && parsed.time) {
        const reminder: Reminder = {
          id: Math.random().toString(36).substr(2, 9),
          text: parsed.text,
          time: parsed.time,
          isCompleted: false
        };
        setReminders(prev => [...prev, reminder].sort((a, b) => a.time.localeCompare(b.time)));
      }
    } catch (err) {
      console.error("AI Reminder Error", err);
    } finally {
      setIsProcessingReminder(false);
    }
  };

  const addReminder = () => {
    if (!newReminderText || !newReminderTime) return;
    const reminder: Reminder = {
      id: Math.random().toString(36).substr(2, 9),
      text: newReminderText,
      time: newReminderTime,
      isCompleted: false
    };
    setReminders(prev => [...prev, reminder].sort((a, b) => a.time.localeCompare(b.time)));
    setNewReminderText('');
    setNewReminderTime('');
  };

  const nextJob = useMemo(() => {
    const now = new Date();
    return [...schedule]
      .filter(entry => new Date(entry.start) > now)
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())[0];
  }, [schedule]);

  const nextJobCustomer = useMemo(() => 
    nextJob ? customers.find(c => c.id === nextJob.customerId) : null
  , [nextJob, customers]);

  const getTimeUntil = (dateStr: string) => {
    const diff = new Date(dateStr).getTime() - new Date().getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m until start`;
    const hours = Math.floor(mins / 60);
    return `${hours}h ${mins % 60}m until start`;
  };

  return (
    <div className="space-y-8 pb-10 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tight">Daily Brief</h2>
          <p className="text-slate-500 font-medium italic mt-1">Ready for the site. Your immediate priorities at a glance.</p>
        </div>
        <div className="bg-white border-2 border-slate-100 rounded-2xl px-5 py-3 shadow-sm flex items-center gap-3">
          <Clock size={20} className="text-amber-500" />
          <span className="font-black text-slate-900 text-lg">
            {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>

      <div className="relative group">
        {!nextJob ? (
          <div onClick={onNavigateToSchedule} className="bg-white border-4 border-dashed border-slate-100 rounded-[48px] p-16 text-center cursor-pointer hover:border-amber-200 transition-all flex flex-col items-center">
            <Calendar size={60} className="text-slate-200 mb-4" />
            <p className="text-slate-400 font-black uppercase tracking-widest">No upcoming jobs found</p>
          </div>
        ) : (
          <div className="bg-slate-900 rounded-[48px] p-10 md:p-12 text-white shadow-2xl overflow-hidden relative border-b-8 border-amber-600">
            <div className="absolute top-0 right-0 p-12 opacity-5 scale-150 rotate-12 pointer-events-none">
              <Navigation size={200} />
            </div>
            
            <div className="flex flex-col md:flex-row justify-between items-start gap-10 relative z-10">
              <div className="space-y-6 flex-1">
                <div className="flex items-center gap-3">
                  <div className="px-4 py-2 bg-amber-500 rounded-full text-slate-900 text-[10px] font-black uppercase tracking-widest animate-pulse">
                    Next Job
                  </div>
                  <div className="text-amber-500 font-black text-xs uppercase tracking-widest flex items-center gap-2">
                    <Timer size={14} /> {getTimeUntil(nextJob.start)}
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="text-4xl md:text-5xl font-black tracking-tight leading-none">{nextJob.title}</h3>
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2 text-slate-400 font-bold text-lg italic">
                      <Clock size={20} className="text-amber-500" />
                      {new Date(nextJob.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} — {new Date(nextJob.end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-4">
                  {nextJobCustomer && (
                    <div className="flex items-center gap-3 bg-white/5 p-4 rounded-3xl border border-white/10 hover:bg-white/10 transition-colors cursor-pointer">
                      <div className="w-10 h-10 bg-amber-500 rounded-2xl flex items-center justify-center text-slate-900 font-black">
                        {nextJobCustomer.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic leading-none">Client</p>
                        <p className="font-bold text-sm text-white mt-1">{nextJobCustomer.name}</p>
                      </div>
                    </div>
                  )}
                  
                  {nextJob.location && (
                    <a 
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(nextJob.location)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 min-w-[200px] flex items-center justify-between gap-4 bg-amber-500 p-4 rounded-3xl hover:bg-amber-400 transition-all text-slate-900 shadow-xl shadow-amber-500/20"
                    >
                      <div className="flex items-center gap-3 truncate pr-2">
                        <MapPin size={24} className="shrink-0" />
                        <span className="font-black text-sm truncate uppercase tracking-tighter">{nextJob.location}</span>
                      </div>
                      <div className="h-10 w-10 bg-slate-900 rounded-2xl flex items-center justify-center text-amber-500 shrink-0">
                        <Navigation size={20} />
                      </div>
                    </a>
                  )}
                </div>
              </div>

              <button 
                onClick={onNavigateToSchedule}
                className="w-full md:w-auto h-auto md:h-64 bg-white/5 border border-white/10 rounded-[32px] p-8 flex flex-col justify-between hover:bg-white/10 transition-all group"
              >
                <div className="h-12 w-12 bg-white rounded-2xl flex items-center justify-center text-slate-900 group-hover:scale-110 transition-transform">
                  <ArrowRight size={24} />
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic">Full Schedule</p>
                  <p className="text-xl font-black text-white mt-1">View Week</p>
                </div>
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Reminders Section */}
        <div className="bg-white rounded-[40px] border border-slate-200 p-8 shadow-sm flex flex-col min-h-[500px]">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="p-4 bg-blue-50 text-blue-600 rounded-3xl">
                <Bell size={28} />
              </div>
              <div>
                <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Reminders</h3>
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest italic">Time-sensitive site alarms</p>
              </div>
            </div>
            <button 
              onClick={startVoiceReminder}
              disabled={isProcessingReminder}
              className={`h-16 w-16 rounded-[24px] flex items-center justify-center shadow-2xl transition-all ${
                isListeningReminder 
                  ? 'bg-red-500 text-white animate-pulse' 
                  : isProcessingReminder 
                    ? 'bg-amber-500 text-white' 
                    : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {isProcessingReminder ? <Loader2 size={24} className="animate-spin" /> : isListeningReminder ? <MicOff size={24} /> : <Mic size={24} />}
            </button>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 mb-8">
            <input 
              type="text" 
              placeholder="What needs reminding?..." 
              className="flex-1 bg-slate-50 border-2 border-slate-100 rounded-[24px] p-5 font-bold text-slate-900 outline-none focus:border-blue-400 transition-all"
              value={newReminderText}
              onChange={e => setNewReminderText(e.target.value)}
            />
            <input 
              type="time" 
              className="w-full sm:w-40 bg-slate-50 border-2 border-slate-100 rounded-[24px] p-5 font-bold text-slate-900 outline-none focus:border-blue-400 transition-all cursor-pointer"
              value={newReminderTime}
              onChange={e => setNewReminderTime(e.target.value)}
            />
            <button 
              onClick={addReminder}
              disabled={!newReminderText || !newReminderTime}
              className="bg-slate-900 text-white px-8 py-5 rounded-[24px] shadow-lg hover:bg-black transition-all disabled:opacity-20 font-black uppercase text-xs tracking-widest"
            >
              Add
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-4 no-scrollbar pr-1">
            {reminders.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-300 opacity-30 py-20">
                <BellRing size={64} className="mb-4" />
                <p className="text-sm font-black uppercase tracking-widest">No active alarms</p>
              </div>
            ) : (
              reminders.map(reminder => (
                <div 
                  key={reminder.id} 
                  className={`p-6 rounded-[32px] border-2 transition-all flex items-center justify-between group ${
                    reminder.isAlarming 
                      ? 'bg-amber-500 border-amber-600 text-slate-900 animate-pulse' 
                      : reminder.isCompleted 
                        ? 'bg-slate-50 border-transparent opacity-40' 
                        : 'bg-white border-slate-100 hover:border-blue-200'
                  }`}
                >
                  <div className="flex items-center gap-6 min-w-0">
                    <button 
                      onClick={() => {
                        setReminders(prev => prev.map(r => r.id === reminder.id ? { ...r, isCompleted: !r.isCompleted, isAlarming: false } : r));
                      }}
                      className={`h-12 w-12 rounded-[20px] flex items-center justify-center shrink-0 transition-all ${
                        reminder.isAlarming 
                          ? 'bg-slate-900 text-white shadow-2xl' 
                          : reminder.isCompleted ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-400 hover:bg-blue-100 hover:text-blue-600'
                      }`}
                    >
                      {reminder.isCompleted ? <CheckCircle2 size={24} /> : reminder.isAlarming ? <BellRing size={24} className="animate-bounce" /> : <Play size={22} />}
                    </button>
                    <div className="truncate">
                      <p className={`font-black text-lg truncate ${reminder.isCompleted ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                        {reminder.text}
                      </p>
                      <p className={`text-[12px] font-black uppercase tracking-widest italic ${reminder.isAlarming ? 'text-slate-900' : 'text-slate-400'}`}>
                        {reminder.time}
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setReminders(prev => prev.filter(r => r.id !== reminder.id))}
                    className={`p-3 transition-colors ${reminder.isAlarming ? 'text-slate-900' : 'text-slate-200 hover:text-red-500 opacity-0 group-hover:opacity-100'}`}
                  >
                    <Trash2 size={24} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick Notes Section */}
        <div className="bg-white rounded-[40px] border border-slate-200 p-8 shadow-sm flex flex-col min-h-[500px]">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="p-4 bg-amber-50 text-amber-600 rounded-3xl">
                <StickyNote size={28} />
              </div>
              <div>
                <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Quick Notes</h3>
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest italic">Daily site scratchpad</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => setQuickNotes('')}
                className="h-16 w-16 rounded-[24px] flex items-center justify-center bg-slate-50 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all shadow-sm"
                title="Clear Notes"
              >
                <Eraser size={24} />
              </button>
              <button 
                onClick={startVoiceNote}
                className={`h-16 w-16 rounded-[24px] flex items-center justify-center shadow-2xl transition-all ${
                  isListeningNote 
                    ? 'bg-red-500 text-white animate-pulse' 
                    : 'bg-amber-500 text-white hover:bg-amber-600'
                }`}
              >
                {isListeningNote ? <MicOff size={24} /> : <Mic size={24} />}
              </button>
            </div>
          </div>

          <div className="flex-1 flex flex-col gap-4">
            <textarea 
              className="flex-1 bg-slate-50 border-2 border-slate-100 rounded-[32px] p-8 font-medium text-slate-900 outline-none focus:border-amber-400 transition-all shadow-inner leading-relaxed text-lg resize-none placeholder:text-slate-300 placeholder:italic"
              placeholder="Jot down site measurements, material shortages, or general notes..."
              value={quickNotes}
              onChange={e => setQuickNotes(e.target.value)}
            />
            <div className="flex items-center gap-2 px-2">
              <Sparkles size={14} className="text-amber-500" />
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tap mic to dictate and append to your notes.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
