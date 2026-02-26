import React, { useState, useRef, useEffect, useCallback } from 'react';
import { JobPack, Customer, Quote, AppSettings, JobSheetHours, SitePhoto } from '../types';
import {
  Clock, Plus, Trash2, Camera, Image as ImageIcon, Loader2,
  FileText, Users, Mic, MicOff, ChevronDown, ChevronUp, X,
  Download, Send, Mail, MessageSquare, FileDown, Share2
} from 'lucide-react';
import { useVoiceInput } from '../src/hooks/useVoiceInput';
import { useToast } from '../src/contexts/ToastContext';
import { sitePhotosService } from '../src/services/dataService';
import { generatePDFFromElement, downloadPDF } from '../src/services/pdfService';

interface JobSheetProps {
  project: JobPack;
  customer?: Customer;
  quotes: Quote[];
  settings: AppSettings;
  onSaveProject: (project: JobPack) => void;
  onRefresh?: () => Promise<void>;
}

export const JobSheet: React.FC<JobSheetProps> = ({
  project, customer, quotes, settings, onSaveProject, onRefresh
}) => {
  const toast = useToast();
  const [description, setDescription] = useState(project.jobSheetDescription || '');
  const [newMember, setNewMember] = useState('');
  const [newHours, setNewHours] = useState('');
  const [newHoursDesc, setNewHoursDesc] = useState('');
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const descSaveRef = useRef<NodeJS.Timeout | null>(null);
  const descLocalRef = useRef(false);
  const descRef = useRef<HTMLTextAreaElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const printableRef = useRef<HTMLDivElement>(null);

  const hours = project.jobSheetHours || [];
  const photos = project.jobSheetPhotos || [];

  // Sync description from prop
  useEffect(() => {
    if (!descLocalRef.current) {
      setDescription(project.jobSheetDescription || '');
    }
    descLocalRef.current = false;
  }, [project.jobSheetDescription]);

  // Auto-resize
  useEffect(() => {
    const el = descRef.current;
    if (el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; }
  }, [description]);

  const handleSaveDescription = useCallback((content: string) => {
    if (descSaveRef.current) clearTimeout(descSaveRef.current);
    descSaveRef.current = setTimeout(() => {
      descLocalRef.current = true;
      onSaveProject({ ...project, jobSheetDescription: content, updatedAt: new Date().toISOString() });
    }, 800);
  }, [project, onSaveProject]);

  // Voice for description
  const handleVoiceResult = useCallback((text: string) => {
    setDescription(prev => {
      const updated = prev ? `${prev}\n${text}` : text;
      handleSaveDescription(updated);
      return updated;
    });
  }, [handleSaveDescription]);

  const handleVoiceError = useCallback((error: string) => {
    toast.error('Voice Input', error);
  }, [toast]);

  const { isListening, startListening, stopListening } = useVoiceInput({
    onResult: handleVoiceResult,
    onError: handleVoiceError,
  });

  const addHoursEntry = () => {
    const memberName = newMember.trim();
    const hoursVal = parseFloat(newHours);
    if (!memberName || isNaN(hoursVal) || hoursVal <= 0) {
      toast.error('Invalid Entry', 'Enter a team member name and valid hours.');
      return;
    }
    const entry: JobSheetHours = {
      id: Math.random().toString(36).substr(2, 9),
      teamMember: memberName,
      hours: hoursVal,
      date: new Date().toISOString().split('T')[0],
      description: newHoursDesc.trim() || undefined,
    };
    onSaveProject({
      ...project,
      jobSheetHours: [...hours, entry],
      updatedAt: new Date().toISOString()
    });
    setNewMember('');
    setNewHours('');
    setNewHoursDesc('');
    toast.success('Hours Added', `${hoursVal}h for ${memberName}`);
  };

  const removeHoursEntry = (id: string) => {
    onSaveProject({
      ...project,
      jobSheetHours: hours.filter(h => h.id !== id),
      updatedAt: new Date().toISOString()
    });
  };

  const totalHours = hours.reduce((sum, h) => sum + h.hours, 0);

  // Photo upload
  const handlePhotoUpload = async (file: File) => {
    if (!file || isUploadingPhoto) return;
    setIsUploadingPhoto(true);
    try {
      const dbPhoto = await sitePhotosService.upload(
        project.id, file, 'Job Sheet Photo', ['jobsheet'], false
      );
      const signedUrl = await sitePhotosService.getUrl(dbPhoto.storage_path);
      if (signedUrl && onRefresh) {
        await onRefresh();
      }
      toast.success('Photo Added', 'Job sheet photo uploaded');
    } catch (err: any) {
      toast.error('Upload Failed', err.message || 'Could not upload file');
    } finally {
      setIsUploadingPhoto(false);
      if (photoInputRef.current) photoInputRef.current.value = '';
      if (cameraInputRef.current) cameraInputRef.current.value = '';
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    for (let i = 0; i < files.length; i++) {
      await handlePhotoUpload(files[i]);
    }
  };

  const removePhoto = (photoId: string) => {
    onSaveProject({
      ...project,
      jobSheetPhotos: photos.filter(p => p.id !== photoId),
      updatedAt: new Date().toISOString()
    });
  };

  // Compute materials summary from project
  const materialsList = project.materials || [];
  const materialsCount = materialsList.length;
  const deliveredCount = materialsList.filter(m => m.status === 'delivered').length;

  // Compute financials from quotes
  const linkedQuotes = quotes;
  const totalQuoted = linkedQuotes.reduce((sum, q) => {
    const sectionTotal = q.sections.reduce((s, sec) => {
      const matTotal = sec.items.reduce((t, item) => t + item.totalPrice, 0);
      const labCost = sec.labourCost || (sec.labourHours * (sec.labourRate || q.labourRate));
      return s + matTotal + labCost;
    }, 0);
    return sum + sectionTotal;
  }, 0);

  // PDF / Share handlers
  const jobSheetFilename = `JobSheet_${project.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`;

  const handleDownloadPDF = async () => {
    if (!printableRef.current) return;
    setIsGeneratingPdf(true);
    try {
      const isMobile = window.innerWidth < 768;
      await downloadPDF(printableRef.current, jobSheetFilename, { scale: isMobile ? 3 : 5 });
      toast.success('PDF Downloaded', jobSheetFilename);
    } catch (err) {
      console.error('PDF generation failed:', err);
      toast.error('PDF Failed', 'Could not generate PDF. Please try again.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleEmailShare = async () => {
    if (!printableRef.current) return;
    setIsGeneratingPdf(true);
    setShowShareMenu(false);
    try {
      const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
      const blob = await generatePDFFromElement(printableRef.current, { scale: isMobile ? 2.5 : 4 });

      if (isMobile && navigator.share && navigator.canShare) {
        try {
          const pdfFile = new File([blob], jobSheetFilename, { type: 'application/pdf' });
          const shareData = {
            files: [pdfFile],
            title: `Job Sheet - ${project.title}`,
            text: `Job Sheet for ${project.title}${customer ? ` - ${customer.name}` : ''}`,
          };
          if (navigator.canShare(shareData)) {
            await navigator.share(shareData);
            return;
          }
        } catch (shareErr) {
          if ((shareErr as Error).name === 'AbortError') return;
        }
      }

      // Desktop fallback: download PDF + open mailto
      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = jobSheetFilename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);

      const subject = encodeURIComponent(`Job Sheet - ${project.title}`);
      const body = encodeURIComponent(`Please find the job sheet for ${project.title} attached.\n\nKind regards,\n${settings.companyName || ''}`);
      const mailto = `mailto:${customer?.email || ''}?subject=${subject}&body=${body}`;
      await new Promise(resolve => setTimeout(resolve, 300));
      window.location.href = mailto;
    } catch (err) {
      console.error('Email share failed:', err);
      toast.error('Share Failed', 'Could not prepare email. Try downloading the PDF instead.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleWhatsAppShare = () => {
    setShowShareMenu(false);
    const lines = [
      `*Job Sheet - ${project.title}*`,
      '',
      customer ? `Client: ${customer.name}` : '',
      project.siteAddress ? `Site: ${project.siteAddress}` : '',
      description ? `\nDescription: ${description}` : '',
      totalHours > 0 ? `\nHours logged: ${totalHours}h` : '',
      materialsCount > 0 ? `Materials: ${deliveredCount}/${materialsCount} delivered` : '',
      '',
      settings.companyName || '',
    ].filter(Boolean).join('\n');

    const url = `https://wa.me/${customer?.phone?.replace(/\D/g, '') || ''}?text=${encodeURIComponent(lines)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleSmsShare = () => {
    setShowShareMenu(false);
    const text = `Job Sheet - ${project.title}. ${project.siteAddress ? `Site: ${project.siteAddress}. ` : ''}${totalHours > 0 ? `${totalHours}h logged. ` : ''}${settings.companyName || ''}`;
    const smsUrl = `sms:${customer?.phone || ''}?body=${encodeURIComponent(text)}`;
    window.location.href = smsUrl;
  };

  return (
    <div className="max-w-3xl mx-auto space-y-4 animate-in fade-in slide-in-from-bottom-2">
      {/* Send / PDF action bar */}
      <div className="flex gap-2 justify-end relative">
        <button
          onClick={handleDownloadPDF}
          disabled={isGeneratingPdf}
          className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-black uppercase shadow-lg hover:bg-slate-800 transition-all disabled:opacity-50"
        >
          {isGeneratingPdf ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
          PDF
        </button>
        <div className="relative">
          <button
            onClick={() => setShowShareMenu(!showShareMenu)}
            className="flex items-center gap-1.5 px-4 py-2 bg-teal-500 text-white rounded-xl text-xs font-black uppercase shadow-lg shadow-teal-200 hover:bg-teal-600 transition-all"
          >
            <Send size={14} /> Send
          </button>
          {showShareMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowShareMenu(false)} />
              <div className="absolute right-0 top-full mt-2 bg-white border-2 border-slate-100 rounded-2xl shadow-2xl z-50 min-w-[200px] overflow-hidden animate-in fade-in zoom-in-95">
                <button
                  onClick={handleEmailShare}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-teal-50 transition-all text-sm font-bold text-slate-900 border-b border-slate-50"
                >
                  <Mail size={16} className="text-teal-500" /> Email with PDF
                </button>
                <button
                  onClick={handleWhatsAppShare}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-green-50 transition-all text-sm font-bold text-slate-900 border-b border-slate-50"
                >
                  <MessageSquare size={16} className="text-green-500" /> WhatsApp
                </button>
                <button
                  onClick={handleSmsShare}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-blue-50 transition-all text-sm font-bold text-slate-900"
                >
                  <Send size={16} className="text-blue-500" /> SMS
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Printable Job Sheet (used for PDF generation) */}
      <div ref={printableRef} className="bg-white rounded-2xl border-2 border-slate-100 shadow-sm overflow-hidden">
        {/* Auto-generated Job Sheet Header */}
        <div className="p-5 space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <FileText size={16} className="text-amber-500" />
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Job Sheet</h3>
            {settings.companyName && (
              <span className="ml-auto text-[10px] font-black text-slate-400 uppercase tracking-widest">{settings.companyName}</span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Job</span>
              <span className="font-bold text-slate-900">{project.title}</span>
            </div>
            <div>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Client</span>
              <span className="font-bold text-slate-900">{customer?.name || 'N/A'}</span>
            </div>
            <div>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Site Address</span>
              <span className="font-bold text-slate-900">{project.siteAddress || customer?.address || 'N/A'}</span>
            </div>
            <div>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Status</span>
              <span className={`font-bold capitalize ${project.status === 'active' ? 'text-green-600' : project.status === 'completed' ? 'text-blue-600' : 'text-slate-500'}`}>{project.status}</span>
            </div>
            {customer?.phone && (
              <div>
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Contact</span>
                <span className="font-bold text-teal-600">{customer.phone}</span>
              </div>
            )}
            <div>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Date</span>
              <span className="font-bold text-slate-900">{new Date().toLocaleDateString()}</span>
            </div>
          </div>

          {/* Materials summary */}
          {materialsCount > 0 && (
            <div className="pt-2 border-t border-slate-100">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Materials</span>
              <span className="text-sm font-bold text-slate-700">{deliveredCount}/{materialsCount} delivered</span>
            </div>
          )}

          {/* Financial summary */}
          {linkedQuotes.length > 0 && (
            <div className="pt-2 border-t border-slate-100">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Quotes/Invoices</span>
              <span className="text-sm font-bold text-slate-700">{linkedQuotes.length} document{linkedQuotes.length !== 1 ? 's' : ''}</span>
            </div>
          )}
        </div>

        {/* Description in printable area */}
        {description && (
          <div className="px-5 pb-4 border-t border-slate-100 pt-4">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Job Description</span>
            <p className="text-sm font-medium text-slate-800 whitespace-pre-wrap leading-relaxed">{description}</p>
          </div>
        )}

        {/* Hours in printable area */}
        {hours.length > 0 && (
          <div className="px-5 pb-4 border-t border-slate-100 pt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Hours Logged</span>
              <span className="text-sm font-black text-amber-600">{totalHours}h total</span>
            </div>
            <div className="space-y-1.5">
              {hours.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between text-sm bg-slate-50 rounded-lg px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">{entry.teamMember}</span>
                    {entry.description && <span className="text-slate-500">- {entry.description}</span>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[9px] text-slate-400">{entry.date}</span>
                    <span className="font-black text-amber-600">{entry.hours}h</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Editable Job Description (separate from printable) */}
      <div className="bg-white rounded-2xl border-2 border-slate-100 p-5 space-y-3 shadow-sm">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <FileText size={16} className="text-teal-500" />
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Job Description</h4>
          </div>
          <button
            onClick={() => { if (isListening) stopListening(); else startListening(); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase transition-all ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-teal-500 text-white shadow-sm'}`}
          >
            {isListening ? <MicOff size={12} /> : <Mic size={12} />}
            {isListening ? 'Listening' : 'Dictate'}
          </button>
        </div>
        <textarea
          ref={descRef}
          className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 text-sm font-medium text-slate-800 outline-none resize-none min-h-[120px] overflow-hidden focus:border-teal-400 transition-all placeholder:text-slate-300 placeholder:italic leading-relaxed"
          placeholder="Describe the work being carried out..."
          value={description}
          onChange={(e) => {
            setDescription(e.target.value);
            handleSaveDescription(e.target.value);
          }}
        />
      </div>

      {/* Add Hours */}
      <div className="bg-white rounded-2xl border-2 border-slate-100 p-5 space-y-3 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-amber-500" />
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Hours Logged</h4>
          </div>
          {totalHours > 0 && (
            <span className="text-sm font-black text-amber-600">{totalHours}h total</span>
          )}
        </div>

        {/* Add hours form */}
        <div className="bg-slate-50 rounded-xl p-3 space-y-2 border border-slate-100">
          <div className="flex gap-2">
            <input
              type="text"
              className="flex-1 min-w-0 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-900 outline-none focus:border-amber-400 placeholder:text-slate-300"
              placeholder="Team member name"
              value={newMember}
              onChange={(e) => setNewMember(e.target.value)}
            />
            <input
              type="number"
              step="0.5"
              min="0"
              className="w-20 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-900 outline-none focus:border-amber-400 placeholder:text-slate-300 text-center"
              placeholder="Hrs"
              value={newHours}
              onChange={(e) => setNewHours(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              className="flex-1 min-w-0 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 outline-none focus:border-amber-400 placeholder:text-slate-300"
              placeholder="Description (optional)"
              value={newHoursDesc}
              onChange={(e) => setNewHoursDesc(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addHoursEntry()}
            />
            <button
              onClick={addHoursEntry}
              className="px-4 py-2 bg-amber-500 text-white rounded-lg font-black text-xs uppercase shadow-sm hover:bg-amber-600 transition-all"
            >
              <Plus size={16} />
            </button>
          </div>
        </div>

        {/* Hours list */}
        {hours.length > 0 ? (
          <div className="space-y-2">
            {hours.map((entry) => (
              <div key={entry.id} className="group flex items-center justify-between bg-slate-50 rounded-xl p-3 border border-slate-100">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Users size={12} className="text-slate-400 shrink-0" />
                    <span className="font-bold text-sm text-slate-900 truncate">{entry.teamMember}</span>
                    <span className="text-xs font-black text-amber-600 shrink-0">{entry.hours}h</span>
                  </div>
                  {entry.description && (
                    <p className="text-xs text-slate-500 mt-0.5 ml-5 truncate">{entry.description}</p>
                  )}
                  <p className="text-[9px] text-slate-400 mt-0.5 ml-5">{entry.date}</p>
                </div>
                <button
                  onClick={() => removeHoursEntry(entry.id)}
                  className="p-1.5 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-sm text-slate-300 italic py-4">No hours logged yet</p>
        )}
      </div>

      {/* Job Photos */}
      <div className="bg-white rounded-2xl border-2 border-slate-100 p-5 space-y-3 shadow-sm">
        <div className="flex items-center gap-2">
          <ImageIcon size={16} className="text-teal-500" />
          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Job Photos</h4>
        </div>

        <input ref={photoInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileChange} />
        <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileChange} />

        <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
          <button
            onClick={() => cameraInputRef.current?.click()}
            disabled={isUploadingPhoto}
            className="aspect-square border-2 border-dashed border-amber-300 rounded-xl flex flex-col items-center justify-center text-amber-500 hover:border-amber-400 hover:bg-amber-50 transition-all bg-amber-50/50 disabled:opacity-50"
          >
            {isUploadingPhoto ? <Loader2 size={24} className="animate-spin" /> : <Camera size={24} />}
            <span className="text-[9px] font-bold mt-1">{isUploadingPhoto ? 'Uploading...' : 'Camera'}</span>
          </button>
          <button
            onClick={() => photoInputRef.current?.click()}
            disabled={isUploadingPhoto}
            className="aspect-square border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center text-slate-400 hover:border-amber-300 hover:text-amber-500 transition-all bg-slate-50 disabled:opacity-50"
          >
            {isUploadingPhoto ? <Loader2 size={24} className="animate-spin" /> : <Plus size={24} />}
            <span className="text-[9px] font-bold mt-1">{isUploadingPhoto ? 'Uploading...' : 'Add'}</span>
          </button>
          {photos.map(photo => (
            <div key={photo.id} className="aspect-square relative group overflow-hidden rounded-xl border border-slate-100 cursor-pointer">
              <img src={photo.url} className="w-full h-full object-cover" alt="Job" />
              <button
                onClick={() => removePhoto(photo.id)}
                className="absolute top-1 right-1 p-1 bg-black/50 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
