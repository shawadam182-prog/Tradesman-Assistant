
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { ScheduleEntry, JobPack, Customer } from '../types';
import {
  ChevronLeft, ChevronRight, Plus, Mic, Sparkles,
  Trash2, MapPin, Clock, Loader2,
  AlertCircle, X, Calendar as CalendarIcon,
  ChevronDown, MicOff,
  Pencil,
  UserPlus, User, Mail, Phone, Hammer, MapPinned, LocateFixed,
  Briefcase, Link2
} from 'lucide-react';
import { parseScheduleVoiceInput, parseCustomerVoiceInput, formatAddressAI, reverseGeocode } from '../src/services/geminiService';
import { hapticTap } from '../src/hooks/useHaptic';

interface ScheduleCalendarProps {
  entries: ScheduleEntry[];
  projects: JobPack[];
  customers: Customer[];
  onAddCustomer: (customer: Customer) => Promise<Customer>;
  onAddEntry: (entry: Omit<ScheduleEntry, 'id'>) => Promise<ScheduleEntry>;
  onUpdateEntry: (id: string, updates: Partial<ScheduleEntry>) => Promise<void>;
  onDeleteEntry: (id: string) => Promise<void>;
}

export const ScheduleCalendar: React.FC<ScheduleCalendarProps> = ({
  entries,
  projects,
  customers,
  onAddCustomer,
  onAddEntry,
  onUpdateEntry,
  onDeleteEntry
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date>(new Date());
  const [viewType, setViewType] = useState<'month' | 'week' | 'day'>('month');
  
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isAddingManual, setIsAddingManual] = useState(false);
  const [isReviewingAI, setIsReviewingAI] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<ScheduleEntry>>({});
  const [isListeningTitle, setIsListeningTitle] = useState(false);

  // Customer Quick Add States
  const [isAddingCustomer, setIsAddingCustomer] = useState(false);
  const [newCustomer, setNewCustomer] = useState<Partial<Customer>>({});
  const [isListeningCustomer, setIsListeningCustomer] = useState(false);
  const [isProcessingCustomer, setIsProcessingCustomer] = useState(false);
  const [isVerifyingAddress, setIsVerifyingAddress] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [customerError, setCustomerError] = useState<string | null>(null);

  // Schedule entry location and linking
  const [isLocatingEntry, setIsLocatingEntry] = useState(false);
  const [linkType, setLinkType] = useState<'none' | 'job' | 'customer'>('none');

  const recognitionRef = useRef<any>(null);
  const customerRecognitionRef = useRef<any>(null);
  const titleRecognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.lang = 'en-GB';

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onerror = () => setIsListening(false);
      recognition.onresult = async (event: any) => {
        if (event.results?.[0]?.[0]?.transcript) {
          handleVoiceBooking(event.results[0][0].transcript);
        }
      };
      recognitionRef.current = recognition;

      // Customer Recognition
      const custRec = new SpeechRecognition();
      custRec.continuous = false;
      custRec.lang = 'en-GB';
      custRec.onstart = () => setIsListeningCustomer(true);
      custRec.onend = () => setIsListeningCustomer(false);
      custRec.onerror = () => setIsListeningCustomer(false);
      custRec.onresult = async (event: any) => {
        if (event.results?.[0]?.[0]?.transcript) {
          handleVoiceCustomer(event.results[0][0].transcript);
        }
      };
      customerRecognitionRef.current = custRec;

      // Title Recognition
      const titleRec = new SpeechRecognition();
      titleRec.continuous = false;
      titleRec.lang = 'en-GB';
      titleRec.onstart = () => setIsListeningTitle(true);
      titleRec.onend = () => setIsListeningTitle(false);
      titleRec.onerror = () => setIsListeningTitle(false);
      titleRec.onresult = (event: any) => {
        if (event.results?.[0]?.[0]?.transcript) {
          const transcript = event.results[0][0].transcript;
          setDraft(prev => ({ ...prev, title: transcript }));
        }
      };
      titleRecognitionRef.current = titleRec;
    }
    return () => {
      recognitionRef.current?.abort();
      customerRecognitionRef.current?.abort();
      titleRecognitionRef.current?.abort();
    };
  }, []);

  const handleVoiceBooking = async (transcript: string) => {
    setIsProcessing(true);
    setError(null);
    try {
      const parsed = await parseScheduleVoiceInput(transcript);
      setDraft(parsed);
      setIsReviewingAI(true);
    } catch (err) {
      setError("AI was unable to interpret that. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleVoiceCustomer = async (transcript: string) => {
    setIsProcessingCustomer(true);
    setCustomerError(null);
    try {
      const details = await parseCustomerVoiceInput(transcript);
      setNewCustomer(prev => ({ ...prev, ...details }));
    } catch (err) {
      setCustomerError("Magic fill failed to parse client info.");
    } finally {
      setIsProcessingCustomer(false);
    }
  };

  const handleVerifyAddress = async () => {
    if (!newCustomer.address) return;
    setIsVerifyingAddress(true);
    try {
      const formatted = await formatAddressAI(newCustomer.address);
      setNewCustomer(prev => ({ ...prev, address: formatted }));
    } catch (err) {
      setCustomerError("Address verification failed.");
    } finally {
      setIsVerifyingAddress(false);
    }
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setCustomerError("Geolocation is not supported by your browser.");
      return;
    }

    setIsLocating(true);
    setCustomerError(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const address = await reverseGeocode(latitude, longitude);
          if (address) {
            setNewCustomer(prev => ({ ...prev, address }));
          } else {
            setCustomerError("Could not determine address from your location.");
          }
        } catch (err) {
          setCustomerError("Failed to geocode your location.");
        } finally {
          setIsLocating(false);
        }
      },
      (err) => {
        setIsLocating(false);
        setCustomerError("Location access denied or unavailable.");
      }
    );
  };

  const saveQuickCustomer = async () => {
    if (!newCustomer.name?.trim()) {
      setCustomerError("Client name is required.");
      return;
    }
    const customer: Customer = {
      id: Math.random().toString(36).substr(2, 9),
      name: newCustomer.name.trim(),
      email: newCustomer.email || '',
      phone: newCustomer.phone || '',
      address: newCustomer.address || '',
      company: newCustomer.company || '',
    };

    try {
      const createdCustomer = await onAddCustomer(customer);
      setDraft(prev => ({
        ...prev,
        customerId: createdCustomer.id,
        location: prev.location || createdCustomer.address || ''
      }));
      setLinkType('customer');
      setIsAddingCustomer(false);
      setNewCustomer({});
      setCustomerError(null);
    } catch (error) {
      setCustomerError("Failed to create customer. Please try again.");
    }
  };

  // Get current location for schedule entry
  const handleUseLocationForEntry = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser.");
      return;
    }

    setIsLocatingEntry(true);
    setError(null);
    hapticTap();

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const address = await reverseGeocode(latitude, longitude);
          if (address) {
            setDraft(prev => ({ ...prev, location: address }));
          } else {
            setError("Could not determine address from your location.");
          }
        } catch (err) {
          setError("Failed to geocode your location.");
        } finally {
          setIsLocatingEntry(false);
        }
      },
      (err) => {
        setIsLocatingEntry(false);
        setError("Location access denied or unavailable.");
      }
    );
  };

  // Handle linking to job pack
  const handleLinkToJob = (jobId: string) => {
    const job = projects.find(p => p.id === jobId);
    if (job) {
      setDraft(prev => ({
        ...prev,
        projectId: jobId,
        customerId: job.customerId,
        title: prev.title || job.title,
        location: prev.location || customers.find(c => c.id === job.customerId)?.address || '',
      }));
      setLinkType('job');
    }
  };

  const handleEdit = (entry: ScheduleEntry) => {
    setDraft(entry);
    setEditingId(entry.id);
    setIsAddingManual(true);
    // Set link type based on existing entry data
    if ((entry as any).projectId) {
      setLinkType('job');
    } else if (entry.customerId) {
      setLinkType('customer');
    } else {
      setLinkType('none');
    }
  };

  const saveEntry = async () => {
    if (!draft.title) {
      setError("Title is required.");
      return;
    }

    // Default start time to 8:00 AM today if not provided
    const defaultStart = draft.start || (() => {
      const date = new Date(selectedDay);
      date.setHours(8, 0, 0, 0);
      return date.toISOString();
    })();

    const entryData = {
      title: draft.title,
      start: defaultStart,
      end: draft.end || new Date(new Date(defaultStart).getTime() + 3600000).toISOString(),
      location: draft.location,
      customerId: draft.customerId,
      projectId: (draft as any).projectId,
      description: draft.description
    };

    try {
      if (editingId) {
        await onUpdateEntry(editingId, entryData);
      } else {
        await onAddEntry(entryData);
      }

      setIsReviewingAI(false);
      setIsAddingManual(false);
      setEditingId(null);
      setDraft({});
      setError(null);
      setLinkType('none');

      setSelectedDay(new Date(entryData.start));
    } catch (err) {
      setError("Failed to save entry. Please try again.");
    }
  };

  const getDayEntries = (date: Date) => 
    entries.filter(e => new Date(e.start).toDateString() === date.toDateString())
           .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

  const daysInMonth = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInMo = new Date(year, month + 1, 0).getDate();
    
    const days = [];
    const offset = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;
    
    for (let i = 0; i < offset; i++) days.push(null);
    for (let i = 1; i <= daysInMo; i++) days.push(new Date(year, month, i));
    
    return days;
  }, [currentDate]);

  const daysInWeek = useMemo(() => {
    const curr = new Date(currentDate);
    const day = curr.getDay();
    const diff = curr.getDate() - day + (day === 0 ? -6 : 1);
    const startOfWeek = new Date(curr); startOfWeek.setDate(diff);
    
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      days.push(d);
    }
    return days;
  }, [currentDate]);

  const handlePrev = () => {
    const d = new Date(currentDate);
    if (viewType === 'month') d.setMonth(d.getMonth() - 1);
    else d.setDate(d.getDate() - 7);
    setCurrentDate(d);
  };

  const handleNext = () => {
    const d = new Date(currentDate);
    if (viewType === 'month') d.setMonth(d.getMonth() + 1);
    else d.setDate(d.getDate() + 7);
    setCurrentDate(d);
  };

  const selectedCustomer = customers.find(c => c.id === draft.customerId);

  // Split View Logic
  const selectedDayEntries = getDayEntries(selectedDay);

  return (
    <div className="bg-slate-50 min-h-screen pb-24">
      {/* Sticky Header */}
      <div className="sticky top-0 z-40 bg-white border-b border-slate-100 p-3 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <CalendarIcon size={20} className="text-amber-500"/>
            Site Diary
          </h2>
          <div className="flex gap-2">
            <button
              onClick={() => {
                const now = new Date();
                setDraft({ start: now.toISOString() });
                setIsAddingManual(true);
              }}
              className="p-2 bg-slate-900 text-white rounded-full hover:bg-black transition-all active:scale-95"
            >
              <Plus size={20} />
            </button>
            <button
              onClick={() => isListening ? recognitionRef.current?.stop() : recognitionRef.current?.start()}
              className={`p-2 rounded-full transition-all active:scale-95 ${
                isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-100 text-amber-600'
              }`}
            >
              <Mic size={20} />
            </button>
          </div>
        </div>
        
        {/* Navigation & View Switcher */}
        <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 bg-slate-100 rounded-lg p-1">
               <button onClick={handlePrev} className="p-1 hover:bg-white rounded-md transition-all text-slate-500"><ChevronLeft size={16}/></button>
               <span className="text-xs font-bold text-slate-700 min-w-[100px] text-center">
                 {viewType === 'month' ? currentDate.toLocaleString('default', { month: 'long', year: 'numeric' }) :
                  `Week of ${daysInWeek[0].toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}`}
               </span>
               <button onClick={handleNext} className="p-1 hover:bg-white rounded-md transition-all text-slate-500"><ChevronRight size={16}/></button>
            </div>

            <div className="flex bg-slate-100 p-1 rounded-lg">
              <button 
                onClick={() => setViewType('month')}
                className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all ${viewType === 'month' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}
              >
                Month
              </button>
              <button
                onClick={() => setViewType('week')}
                className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all ${viewType === 'week' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}
              >
                Week
              </button>
            </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-3 space-y-4">
        
        {/* Compact Month View */}
        {viewType === 'month' && (
          <div className="bg-white rounded-2xl p-2 border border-slate-100 shadow-sm">
             <div className="grid grid-cols-7 mb-2 border-b border-slate-50 pb-2">
                {['M','T','W','T','F','S','S'].map(d => (
                  <div key={d} className="text-center text-[10px] font-bold text-slate-300">{d}</div>
                ))}
             </div>
             <div className="grid grid-cols-7 gap-1">
                {daysInMonth.map((date, i) => {
                  if (!date) return <div key={i} className="aspect-square"></div>;
                  const isSelected = date.toDateString() === selectedDay.toDateString();
                  const isToday = date.toDateString() === new Date().toDateString();
                  const hasEvents = entries.some(e => new Date(e.start).toDateString() === date.toDateString());
                  
                  return (
                    <button
                      key={i}
                      onClick={() => setSelectedDay(date)}
                      className={`aspect-square flex flex-col items-center justify-center rounded-xl relative transition-all ${
                        isSelected ? 'bg-slate-900 text-white shadow-md' :
                        isToday ? 'bg-amber-50 text-amber-600 border border-amber-200' : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <span className={`text-xs font-bold ${isSelected ? 'text-white' : ''}`}>{date.getDate()}</span>
                      {hasEvents && (
                        <div className={`w-1 h-1 rounded-full mt-1 ${isSelected ? 'bg-amber-500' : 'bg-slate-400'}`}></div>
                      )}
                    </button>
                  );
                })}
             </div>
          </div>
        )}

        {/* Scrollable Week Strip */}
        {viewType === 'week' && (
           <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
              {daysInWeek.map((date, i) => {
                 const isSelected = date.toDateString() === selectedDay.toDateString();
                 const isToday = date.toDateString() === new Date().toDateString();
                 const hasEvents = entries.some(e => new Date(e.start).toDateString() === date.toDateString());

                 return (
                   <button
                     key={i}
                     onClick={() => setSelectedDay(date)}
                     className={`flex-shrink-0 w-14 h-20 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all border ${
                       isSelected ? 'bg-slate-900 text-white border-slate-900 shadow-lg' :
                       isToday ? 'bg-white text-amber-600 border-amber-200' : 'bg-white text-slate-500 border-slate-100'
                     }`}
                   >
                      <span className="text-[10px] font-bold uppercase">{date.toLocaleDateString(undefined, { weekday: 'short' })}</span>
                      <span className="text-lg font-black">{date.getDate()}</span>
                      {hasEvents && <div className={`w-1 h-1 rounded-full ${isSelected ? 'bg-amber-500' : 'bg-slate-300'}`}></div>}
                   </button>
                 );
              })}
           </div>
        )}

        {/* Agenda / Event List */}
        <div>
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 pl-1">
            {selectedDay.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}
          </h3>

          <div className="space-y-3">
             {selectedDayEntries.length === 0 ? (
               <div className="bg-white rounded-2xl p-8 text-center border border-slate-100 border-dashed">
                  <p className="text-slate-400 text-sm font-medium italic">No events scheduled</p>
                  <button
                    onClick={() => {
                      const d = new Date(selectedDay);
                      d.setHours(8,0,0,0);
                      setDraft({ start: d.toISOString() });
                      setIsAddingManual(true);
                    }}
                    className="mt-3 text-amber-600 text-xs font-bold uppercase tracking-wider hover:text-amber-700"
                  >
                    + Add Event
                  </button>
               </div>
             ) : (
               selectedDayEntries.map(entry => {
                 const customer = customers.find(c => c.id === entry.customerId);
                 const project = projects.find(p => p.id === (entry as any).projectId);

                 return (
                   <div key={entry.id} onClick={() => handleEdit(entry)} className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm relative overflow-hidden active:scale-[0.99] transition-transform">
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-500"></div>
                      <div className="flex justify-between items-start pl-2">
                         <div className="space-y-1">
                            <h4 className="font-bold text-slate-900">{entry.title}</h4>
                            <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                               <Clock size={12} className="text-amber-500"/>
                               {new Date(entry.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                               -
                               {new Date(entry.end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                            {(customer || project) && (
                              <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-1">
                                {project ? <Briefcase size={12}/> : <User size={12}/>}
                                <span>{project?.title || customer?.name}</span>
                              </div>
                            )}
                            {entry.location && (
                               <div className="flex items-center gap-1.5 text-xs text-blue-400 mt-1 truncate max-w-[200px]">
                                  <MapPin size={12}/>
                                  <span className="truncate">{entry.location}</span>
                               </div>
                            )}
                         </div>
                         <button onClick={(e) => { e.stopPropagation(); onDeleteEntry(entry.id); }} className="p-2 text-slate-300 hover:text-red-500"><Trash2 size={16}/></button>
                      </div>
                   </div>
                 );
               })
             )}
          </div>
        </div>
      </div>

      {/* Add/Edit Modal - Full Screen Overlay */}
      {(isAddingManual || isReviewingAI) && (
        <div className="fixed inset-0 bg-slate-50 z-50 flex flex-col animate-in slide-in-from-bottom-10 duration-200">
           {/* Modal Header */}
           <div className="bg-white px-4 py-3 border-b border-slate-100 flex items-center justify-between sticky top-0 z-10">
              <button onClick={() => { setIsAddingManual(false); setIsReviewingAI(false); setEditingId(null); setDraft({}); }} className="p-2 -ml-2 text-slate-400 hover:text-slate-600"><X size={24}/></button>
              <h3 className="font-bold text-slate-900">{editingId ? 'Edit Event' : 'New Event'}</h3>
              <button onClick={saveEntry} className="text-amber-600 font-bold text-sm bg-amber-50 px-3 py-1.5 rounded-lg">Save</button>
           </div>

           <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div className="ios-form-group">
                 <div className="ios-form-item">
                    <label className="ios-label">Title</label>
                    <input type="text" className="ios-input" placeholder="Event Title" value={draft.title || ''} onChange={e => setDraft({...draft, title: e.target.value})} />
                    <button onClick={() => isListeningTitle ? titleRecognitionRef.current?.stop() : titleRecognitionRef.current?.start()} className={`p-2 ${isListeningTitle ? 'text-red-500 animate-pulse' : 'text-slate-400'}`}><Mic size={18}/></button>
                 </div>
                 <div className="ios-form-item">
                    <label className="ios-label">Description</label>
                    <input type="text" className="ios-input" placeholder="Details..." value={draft.description || ''} onChange={e => setDraft({...draft, description: e.target.value})} />
                 </div>
              </div>

              <div className="ios-form-group">
                 <div className="ios-form-item">
                    <label className="ios-label">Starts</label>
                    <input type="datetime-local" className="ios-input" value={draft.start ? new Date(draft.start).toISOString().slice(0, 16) : ''} onChange={e => setDraft({...draft, start: new Date(e.target.value).toISOString()})} />
                 </div>
                 <div className="ios-form-item">
                    <label className="ios-label">Ends</label>
                    <input type="datetime-local" className="ios-input" value={draft.end ? new Date(draft.end).toISOString().slice(0, 16) : ''} onChange={e => setDraft({...draft, end: new Date(e.target.value).toISOString()})} />
                 </div>
              </div>

              <div className="ios-form-group">
                 <div className="ios-form-item">
                    <label className="ios-label">Location</label>
                    <input type="text" className="ios-input" placeholder="Address" value={draft.location || ''} onChange={e => setDraft({...draft, location: e.target.value})} />
                    <button onClick={handleUseLocationForEntry} className="p-2 text-blue-500"><LocateFixed size={18}/></button>
                 </div>
              </div>

              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider pl-2 mt-4 mb-2">Link To</h4>
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                 <div className="flex divide-x divide-slate-100 border-b border-slate-100">
                    <button onClick={() => setLinkType('none')} className={`flex-1 py-3 text-xs font-bold uppercase ${linkType === 'none' ? 'bg-slate-900 text-white' : 'text-slate-500'}`}>None</button>
                    <button onClick={() => setLinkType('job')} className={`flex-1 py-3 text-xs font-bold uppercase ${linkType === 'job' ? 'bg-slate-900 text-white' : 'text-slate-500'}`}>Job</button>
                    <button onClick={() => setLinkType('customer')} className={`flex-1 py-3 text-xs font-bold uppercase ${linkType === 'customer' ? 'bg-slate-900 text-white' : 'text-slate-500'}`}>Client</button>
                 </div>

                 {linkType === 'job' && (
                    <div className="p-2">
                       <select className="w-full text-sm p-2 outline-none bg-transparent font-medium" value={(draft as any).projectId || ''} onChange={e => handleLinkToJob(e.target.value)}>
                          <option value="">Select Job Pack...</option>
                          {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                       </select>
                    </div>
                 )}

                 {linkType === 'customer' && (
                    <div className="p-2 flex items-center gap-2">
                       <select className="w-full text-sm p-2 outline-none bg-transparent font-medium" value={draft.customerId || ''} onChange={e => setDraft({...draft, customerId: e.target.value})}>
                          <option value="">Select Client...</option>
                          {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                       </select>
                       <button onClick={() => setIsAddingCustomer(true)} className="p-2 bg-slate-100 rounded-lg text-slate-500"><UserPlus size={16}/></button>
                    </div>
                 )}
              </div>

              {isReviewingAI && (
                 <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 flex items-start gap-3">
                    <Sparkles size={16} className="text-amber-500 mt-0.5 shrink-0"/>
                    <div>
                       <p className="text-xs font-bold text-amber-800 uppercase tracking-wide mb-1">AI Suggestion</p>
                       <p className="text-xs text-amber-700 leading-relaxed">Please review the details above. The AI has pre-filled this from your voice command.</p>
                    </div>
                 </div>
              )}
           </div>
        </div>
      )}

      {/* Quick Add Customer Modal (Reused Logic) */}
      {isAddingCustomer && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] p-6 w-full max-w-lg shadow-2xl">
             <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-lg">New Client</h3>
                <button onClick={() => setIsAddingCustomer(false)}><X size={24} className="text-slate-400"/></button>
             </div>
             <div className="space-y-4">
                <div className="ios-form-group border border-slate-200">
                   <div className="ios-form-item"><label className="ios-label">Name</label><input type="text" className="ios-input" value={newCustomer.name || ''} onChange={e => setNewCustomer({...newCustomer, name: e.target.value})} placeholder="Name"/></div>
                   <div className="ios-form-item"><label className="ios-label">Company</label><input type="text" className="ios-input" value={newCustomer.company || ''} onChange={e => setNewCustomer({...newCustomer, company: e.target.value})} placeholder="Company"/></div>
                   <div className="ios-form-item"><label className="ios-label">Phone</label><input type="tel" className="ios-input" value={newCustomer.phone || ''} onChange={e => setNewCustomer({...newCustomer, phone: e.target.value})} placeholder="Number"/></div>
                </div>
                <button onClick={saveQuickCustomer} className="w-full bg-amber-500 text-white font-bold py-3 rounded-xl uppercase tracking-wider text-xs">Save Client</button>
             </div>
          </div>
        </div>
      )}

    </div>
  );
};
