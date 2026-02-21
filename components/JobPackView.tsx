import React, { useState, useRef, useEffect, useCallback } from 'react';
import { JobPack, Customer, Quote, SiteNote, SitePhoto, SiteDocument, AppSettings } from '../types';
import {
  ArrowLeft, Camera, Mic, FileText, Plus, Trash2,
  Clock, CheckCircle2, Image as ImageIcon,
  MessageSquare, History, FileDown, Paperclip, Loader2, Send,
  FileCheck, ReceiptText, FolderOpen, Sparkles, PackageSearch, Navigation,
  StickyNote, Eraser, MicOff, Ruler, X, RotateCw, Pencil, Check,
  ZoomIn, ZoomOut, Maximize2, Users, ChevronDown, ChevronUp,
  MapPin, Phone, Mail, Edit3, Save, List
} from 'lucide-react';
import { MaterialsTracker } from './MaterialsTracker';
import { JobProfitSummary } from './JobProfitSummary';
import { hapticTap } from '../src/hooks/useHaptic';
import { useToast } from '../src/contexts/ToastContext';
import { sitePhotosService } from '../src/services/dataService';
import { MapPinIcon } from 'lucide-react';
import { ConfirmDialog } from './ConfirmDialog';
import { JobAssignmentModal } from './JobAssignmentModal';
import { teamService } from '../src/services/teamService';
import { usePermissions } from '../src/hooks/usePermissions';
import { useVoiceInput } from '../src/hooks/useVoiceInput';

// Detect iOS for voice input fallback
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

// Read GPS coordinates from image EXIF data
const readExifGps = (file: File): Promise<{ lat: number; lng: number } | null> =>
  new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const view = new DataView(e.target!.result as ArrayBuffer);
        // Check for JPEG
        if (view.getUint16(0) !== 0xFFD8) { resolve(null); return; }
        let offset = 2;
        while (offset < view.byteLength - 2) {
          const marker = view.getUint16(offset);
          if (marker === 0xFFE1) { // APP1 (EXIF)
            const exifData = parseExifGps(view, offset + 4);
            resolve(exifData);
            return;
          }
          offset += 2 + view.getUint16(offset + 2);
        }
        resolve(null);
      } catch { resolve(null); }
    };
    reader.onerror = () => resolve(null);
    reader.readAsArrayBuffer(file.slice(0, 128 * 1024)); // Read first 128KB for EXIF
  });

const parseExifGps = (view: DataView, start: number): { lat: number; lng: number } | null => {
  try {
    // Check for "Exif\0\0"
    const exifHeader = String.fromCharCode(view.getUint8(start), view.getUint8(start+1), view.getUint8(start+2), view.getUint8(start+3));
    if (exifHeader !== 'Exif') return null;
    const tiffStart = start + 6;
    const bigEndian = view.getUint16(tiffStart) === 0x4D4D;
    const get16 = (o: number) => bigEndian ? view.getUint16(o) : view.getUint16(o, true);
    const get32 = (o: number) => bigEndian ? view.getUint32(o) : view.getUint32(o, true);

    // Find GPS IFD
    let ifdOffset = tiffStart + get32(tiffStart + 4);
    const entries = get16(ifdOffset);
    let gpsOffset = 0;
    for (let i = 0; i < entries; i++) {
      const tag = get16(ifdOffset + 2 + i * 12);
      if (tag === 0x8825) { // GPSInfo
        gpsOffset = tiffStart + get32(ifdOffset + 2 + i * 12 + 8);
        break;
      }
    }
    if (!gpsOffset) return null;

    const gpsEntries = get16(gpsOffset);
    let latRef = '', lngRef = '';
    let latRational: number[] = [], lngRational: number[] = [];

    const readRational = (offset: number): number => {
      const num = get32(offset);
      const den = get32(offset + 4);
      return den ? num / den : 0;
    };

    for (let i = 0; i < gpsEntries; i++) {
      const tag = get16(gpsOffset + 2 + i * 12);
      const valueOffset = tiffStart + get32(gpsOffset + 2 + i * 12 + 8);
      if (tag === 1) latRef = String.fromCharCode(view.getUint8(gpsOffset + 2 + i * 12 + 8));
      if (tag === 3) lngRef = String.fromCharCode(view.getUint8(gpsOffset + 2 + i * 12 + 8));
      if (tag === 2) latRational = [readRational(valueOffset), readRational(valueOffset + 8), readRational(valueOffset + 16)];
      if (tag === 4) lngRational = [readRational(valueOffset), readRational(valueOffset + 8), readRational(valueOffset + 16)];
    }

    if (latRational.length === 3 && lngRational.length === 3) {
      let lat = latRational[0] + latRational[1] / 60 + latRational[2] / 3600;
      let lng = lngRational[0] + lngRational[1] / 60 + lngRational[2] / 3600;
      if (latRef === 'S') lat = -lat;
      if (lngRef === 'W') lng = -lng;
      if (lat !== 0 || lng !== 0) return { lat, lng };
    }
    return null;
  } catch { return null; }
};

// Calculate distance between two GPS coordinates in meters (Haversine formula)
const gpsDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng/2) * Math.sin(dLng/2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
};

interface JobPackViewProps {
  project: JobPack;
  customers: Customer[];
  quotes: Quote[];
  settings: AppSettings;
  onSaveProject: (project: JobPack) => void;
  onViewQuote: (id: string) => void;
  onCreateQuote: () => void;
  onBack: () => void;
  onDeleteProject?: (id: string) => Promise<void>;
  onRefresh?: () => Promise<void>;
  onUpdateCustomer?: (customer: Customer) => Promise<void>;
  initialTab?: 'log' | 'photos' | 'drawings' | 'materials' | 'finance';
}

export const JobPackView: React.FC<JobPackViewProps> = ({
  project, customers, quotes, settings, onSaveProject, onViewQuote, onCreateQuote, onBack, onDeleteProject, onRefresh, onUpdateCustomer, initialTab
}) => {
  const [activeTab, setActiveTab] = useState<'log' | 'photos' | 'drawings' | 'materials' | 'finance'>(initialTab || 'log');
  const [isRecording, setIsRecording] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignmentCount, setAssignmentCount] = useState(0);
  const recognitionInstance = useRef<any>(null);
  const toast = useToast();
  const permissions = usePermissions();

  // Fetch assignment count for team owners
  const refreshAssignmentCount = useCallback(async () => {
    if (!permissions.canAssignJobs) return;
    try {
      const a = await teamService.getAssignmentsForJob(project.id);
      setAssignmentCount(a.length);
    } catch { /* ignore */ }
  }, [permissions.canAssignJobs, project.id]);

  useEffect(() => { refreshAssignmentCount(); }, [refreshAssignmentCount]);

  const [notepadContent, setNotepadContent] = useState(project.notepad || '');
  const [isNotepadExpanded, setIsNotepadExpanded] = useState(true);
  const notepadTextareaRef = useRef<HTMLTextAreaElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const notepadContentRef = useRef(notepadContent);
  const isLocalChangeRef = useRef(false);
  notepadContentRef.current = notepadContent;

  // File input refs to prevent navigation bugs
  const photoInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const drawingInputRef = useRef<HTMLInputElement>(null);
  const galleryFinderInputRef = useRef<HTMLInputElement>(null);

  // Gallery geodata finder state
  const [galleryResults, setGalleryResults] = useState<{ file: File; preview: string; distance: number | null; hasGps: boolean }[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [showGalleryFinder, setShowGalleryFinder] = useState(false);
  const [jobCoords, setJobCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Modal states
  const [selectedImage, setSelectedImage] = useState<{ item: SitePhoto, type: 'photo' | 'drawing' } | null>(null);
  const [rotation, setRotation] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isEditingCaption, setIsEditingCaption] = useState(false);
  const [tempCaption, setTempCaption] = useState('');
  
  // Pan/drag state for image viewer
  const [panPosition, setPanPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const lastPinchDistance = useRef<number | null>(null);

  // Title editing state
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState(project.title);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Delete entire job pack
  const handleDeleteProject = () => {
    hapticTap();
    setShowDeleteConfirm(true);
  };

  const handleConfirmDeleteProject = async () => {
    setShowDeleteConfirm(false);
    try {
      await onDeleteProject?.(project.id);
      toast.success('Job Pack Deleted', `"${project.title}" has been removed`);
      onBack();
    } catch (err) {
      toast.error('Delete Failed', 'Could not delete job pack');
    }
  };

  // Keep internal notepad state in sync with project prop when it changes externally
  // BUT only if it wasn't a local change (prevents save-loop corruption)
  useEffect(() => {
    if (!isLocalChangeRef.current) {
      setNotepadContent(project.notepad || '');
    }
    isLocalChangeRef.current = false;
  }, [project.notepad]);

  // Auto-resize notepad textarea to fit content
  useEffect(() => {
    const el = notepadTextareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = el.scrollHeight + 'px';
    }
  }, [notepadContent, isNotepadExpanded]);

  // Customer editing state
  const [isEditingCustomer, setIsEditingCustomer] = useState(false);
  const [editCustomerData, setEditCustomerData] = useState<Partial<Customer>>({});

  // Sync temp title when project changes
  useEffect(() => {
    setTempTitle(project.title);
  }, [project.title]);

  const customer = customers.find(c => c.id === project.customerId);

  // Debounced save for notepad to prevent glitchy typing
  const handleSaveNotepad = useCallback((content: string) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      isLocalChangeRef.current = true; // Mark as local change to prevent useEffect sync loop
      onSaveProject({
        ...project,
        notepad: content,
        updatedAt: new Date().toISOString()
      });
    }, 800); // Save after 800ms of no typing
  }, [project, onSaveProject]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  const handleSaveTitle = () => {
    if (!tempTitle.trim()) {
      setTempTitle(project.title);
      setIsEditingTitle(false);
      return;
    }
    onSaveProject({
      ...project,
      title: tempTitle.trim(),
      updatedAt: new Date().toISOString()
    });
    setIsEditingTitle(false);
  };

  // Voice input hook for iOS fallback
  const handleVoiceResult = useCallback((text: string) => {
    const current = notepadContentRef.current;
    const updated = current ? `${current}\n${text}` : text;
    setNotepadContent(updated);
    handleSaveNotepad(updated);
    setIsRecording(false);
  }, [handleSaveNotepad]);

  const handleVoiceError = useCallback((error: string) => {
    toast.error('Voice Input', error);
    setIsRecording(false);
  }, [toast]);

  const { isListening: isHookListening, startListening: startHookListening, stopListening: stopHookListening } = useVoiceInput({
    onResult: handleVoiceResult,
    onError: handleVoiceError,
  });

  const toggleRecording = () => {
    // iOS: use cloud transcription via hook
    if (isIOS) {
      if (isRecording || isHookListening) {
        stopHookListening();
        setIsRecording(false);
      } else {
        setIsRecording(true);
        startHookListening();
      }
      return;
    }

    // Non-iOS: use native Web Speech API
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      toast.error('Not Supported', 'Voice input is not available in this browser.');
      return;
    }

    if (isRecording) {
      recognitionInstance.current?.stop();
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.lang = 'en-GB';

    recognition.onstart = () => setIsRecording(true);
    recognition.onend = () => {
      setIsRecording(false);
    };
    recognition.onresult = (event: any) => {
      if (event.results?.[0]?.[0]?.transcript) {
        const transcript = event.results[0][0].transcript;
        const updated = notepadContent ? `${notepadContent}\n${transcript}` : transcript;
        setNotepadContent(updated);
        handleSaveNotepad(updated);
      }
    };
    recognition.onerror = () => setIsRecording(false);

    recognitionInstance.current = recognition;
    recognition.start();
  };

  // Unified photo upload handler that works with refs
  const handlePhotoUpload = async (file: File, isDrawing: boolean = false) => {
    if (!file || isUploadingPhoto) return;

    setIsUploadingPhoto(true);
    try {
      // Upload to Supabase Storage
      const dbPhoto = await sitePhotosService.upload(
        project.id,
        file,
        isDrawing ? 'Technical Drawing' : 'New Site Photo',
        isDrawing ? ['drawing'] : ['site'],
        isDrawing
      );

      // Get signed URL for display
      const signedUrl = await sitePhotosService.getUrl(dbPhoto.storage_path);

      if (signedUrl) {
        // Refresh data from database to get the updated photo list
        if (onRefresh) {
          await onRefresh();
        }

        toast.success(isDrawing ? 'Drawing Added' : 'Photo Added',
          isDrawing ? 'Technical drawing uploaded successfully' : 'Site photo uploaded successfully');
      } else {
        throw new Error('Failed to get photo URL');
      }
    } catch (err: any) {
      console.error('Upload failed:', err);
      toast.error('Upload Failed', err.message || 'Could not upload file');
    } finally {
      setIsUploadingPhoto(false);
      // Reset all file inputs to prevent duplicate uploads
      if (photoInputRef.current) photoInputRef.current.value = '';
      if (cameraInputRef.current) cameraInputRef.current.value = '';
      if (drawingInputRef.current) drawingInputRef.current.value = '';
    }
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>, isDrawing: boolean = false) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    // Process all selected files
    for (let i = 0; i < files.length; i++) {
      await handlePhotoUpload(files[i], isDrawing);
    }
  };

  // Gallery geodata finder: geocode job address then scan selected photos
  const startGalleryFinder = async () => {
    const address = project.siteAddress || customer?.address;
    if (!address) {
      toast.error('No Address', 'Set a site or client address to use this feature.');
      return;
    }
    // Geocode the address using Nominatim (free)
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`);
      const data = await res.json();
      if (data.length > 0) {
        setJobCoords({ lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) });
        setShowGalleryFinder(true);
        galleryFinderInputRef.current?.click();
      } else {
        toast.error('Address Not Found', 'Could not geocode the job address.');
      }
    } catch {
      toast.error('Network Error', 'Could not look up the address location.');
    }
  };

  const handleGalleryFinderFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !jobCoords) return;
    setIsScanning(true);
    const results: typeof galleryResults = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const gps = await readExifGps(file);
      const preview = URL.createObjectURL(file);
      if (gps) {
        const dist = gpsDistance(jobCoords.lat, jobCoords.lng, gps.lat, gps.lng);
        results.push({ file, preview, distance: dist, hasGps: true });
      } else {
        results.push({ file, preview, distance: null, hasGps: false });
      }
    }

    // Sort: nearby first (within 500m), then no GPS, then far away
    results.sort((a, b) => {
      if (a.distance !== null && b.distance !== null) return a.distance - b.distance;
      if (a.distance !== null) return -1;
      if (b.distance !== null) return 1;
      return 0;
    });

    setGalleryResults(results);
    setIsScanning(false);
    if (galleryFinderInputRef.current) galleryFinderInputRef.current.value = '';
  };

  const addGalleryPhoto = async (file: File) => {
    await handlePhotoUpload(file, false);
    setGalleryResults(prev => prev.filter(r => r.file !== file));
  };

  const openImageViewer = (item: SitePhoto, type: 'photo' | 'drawing') => {
    setSelectedImage({ item, type });
    setRotation(0);
    setZoomLevel(1);
    setTempCaption(item.caption || '');
    setIsEditingCaption(false);
  };

  const closeImageViewer = () => {
    setSelectedImage(null);
    setZoomLevel(1);
    setPanPosition({ x: 0, y: 0 });
    setRotation(0);
  };

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
    setPanPosition({ x: 0, y: 0 }); // Reset pan on rotate
  };

  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 0.5, 4));
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 0.5, 0.5));
  };

  const handleResetZoom = () => {
    setZoomLevel(1);
    setPanPosition({ x: 0, y: 0 });
  };

  // Mouse drag handlers for panning
  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoomLevel > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - panPosition.x, y: e.clientY - panPosition.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && zoomLevel > 1) {
      setPanPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch handlers for pinch-to-zoom and pan
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      // Pinch start
      const distance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      lastPinchDistance.current = distance;
    } else if (e.touches.length === 1 && zoomLevel > 1) {
      // Pan start
      setIsDragging(true);
      setDragStart({ 
        x: e.touches[0].clientX - panPosition.x, 
        y: e.touches[0].clientY - panPosition.y 
      });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && lastPinchDistance.current !== null) {
      // Pinch zoom
      const distance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const scale = distance / lastPinchDistance.current;
      setZoomLevel(prev => Math.min(Math.max(prev * scale, 0.5), 4));
      lastPinchDistance.current = distance;
    } else if (e.touches.length === 1 && isDragging && zoomLevel > 1) {
      // Pan
      setPanPosition({
        x: e.touches[0].clientX - dragStart.x,
        y: e.touches[0].clientY - dragStart.y
      });
    }
  };

  const handleTouchEnd = () => {
    lastPinchDistance.current = null;
    setIsDragging(false);
  };

  const saveAnnotation = () => {
    if (!selectedImage) return;

    const listKey = selectedImage.type === 'photo' ? 'photos' : 'drawings';
    const updatedList = (project[listKey] || []).map(p =>
      p.id === selectedImage.item.id ? { ...p, caption: tempCaption } : p
    );

    onSaveProject({
      ...project,
      [listKey]: updatedList,
      updatedAt: new Date().toISOString()
    });

    setSelectedImage({
      ...selectedImage,
      item: { ...selectedImage.item, caption: tempCaption }
    });
    setIsEditingCaption(false);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-3 md:space-y-6 pb-28">
      {/* Large View Modal */}
      {selectedImage && (
        <div className="fixed inset-0 z-[1000] bg-slate-900/90 backdrop-blur-xl flex flex-col animate-in fade-in duration-300">
          {/* Header Controls */}
          <div className="flex items-center justify-between p-3 md:p-6 bg-slate-900/50 border-b border-white/10">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/10 rounded-2xl text-white">
                {selectedImage.type === 'photo' ? <ImageIcon size={24} /> : <Ruler size={24} />}
              </div>
              <div className="text-left">
                <h3 className="text-white font-black text-lg leading-none uppercase tracking-tight">
                  {selectedImage.type === 'photo' ? 'Site Photo' : 'Technical Drawing'}
                </h3>
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1">
                  Captured: {new Date(selectedImage.item.timestamp).toLocaleString()}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 md:gap-3">
              {/* Zoom controls */}
              <button
                onClick={handleZoomOut}
                className="p-3 md:p-4 bg-white/10 hover:bg-white/20 text-white rounded-xl md:rounded-2xl transition-all disabled:opacity-30"
                title="Zoom Out"
                disabled={zoomLevel <= 0.5}
              >
                <ZoomOut size={20} className="md:w-6 md:h-6" />
              </button>
              <button
                onClick={handleResetZoom}
                className="px-3 py-2 md:px-4 md:py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl md:rounded-2xl transition-all text-xs md:text-sm font-bold min-w-[50px] md:min-w-[60px]"
                title="Reset Zoom"
              >
                {Math.round(zoomLevel * 100)}%
              </button>
              <button
                onClick={handleZoomIn}
                className="p-3 md:p-4 bg-white/10 hover:bg-white/20 text-white rounded-xl md:rounded-2xl transition-all disabled:opacity-30"
                title="Zoom In"
                disabled={zoomLevel >= 4}
              >
                <ZoomIn size={20} className="md:w-6 md:h-6" />
              </button>
              <div className="w-px h-8 bg-white/20 mx-1 md:mx-2" />
              <button
                onClick={handleRotate}
                className="p-3 md:p-4 bg-white/10 hover:bg-white/20 text-white rounded-xl md:rounded-2xl transition-all"
                title="Rotate 90°"
              >
                <RotateCw size={20} className="md:w-6 md:h-6" />
              </button>
              <button
                onClick={closeImageViewer}
                className="p-3 md:p-4 bg-white/10 hover:bg-white/20 text-white rounded-xl md:rounded-2xl transition-all"
              >
                <X size={20} className="md:w-6 md:h-6" />
              </button>
            </div>
          </div>

          {/* Main Viewport */}
          <div className={`flex-1 flex flex-col md:flex-row items-center justify-center gap-8 overflow-hidden ${zoomLevel > 1 ? 'p-0' : 'p-4 md:p-8'}`}>
            <div
              className={`flex-1 w-full h-full flex items-center justify-center relative overflow-hidden bg-slate-950/50 transition-all ${zoomLevel > 1 ? 'rounded-none' : 'rounded-[40px] border border-white/5'} ${zoomLevel > 1 ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-zoom-in'}`}
              style={{ touchAction: 'none' }}
              onDoubleClick={() => {
                if (zoomLevel === 1) {
                  setZoomLevel(2);
                } else {
                  setZoomLevel(1);
                  setPanPosition({ x: 0, y: 0 });
                }
              }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              <img
                src={selectedImage.item.url}
                className="object-contain select-none"
                style={{
                  transform: `translate(${panPosition.x}px, ${panPosition.y}px) rotate(${rotation}deg) scale(${zoomLevel})`,
                  transition: isDragging ? 'none' : 'transform 0.2s ease-out',
                  maxWidth: '100%',
                  maxHeight: '100%'
                }}
                alt="Large View"
                draggable={false}
              />
            </div>

            {/* Annotation Sidebar - hidden when zoomed in */}
            <div className={`w-full md:w-80 bg-white/5 p-4 md:p-8 rounded-[40px] border border-white/10 flex flex-col gap-3 md:gap-6 ${zoomLevel > 1 ? 'hidden' : ''}`}>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Annotations</h4>
                  <button
                    onClick={() => setIsEditingCaption(!isEditingCaption)}
                    className="p-2 text-amber-500 hover:bg-amber-500/10 rounded-lg transition-all"
                  >
                    <Pencil size={18} />
                  </button>
                </div>

                {isEditingCaption ? (
                  <div className="space-y-3">
                    <textarea
                      className="w-full bg-slate-900 border border-white/10 rounded-2xl p-4 text-white font-medium text-sm outline-none focus:border-amber-500 transition-all min-h-[120px]"
                      value={tempCaption}
                      onChange={(e) => setTempCaption(e.target.value)}
                      placeholder="Enter notes/caption..."
                    />
                    <button
                      onClick={saveAnnotation}
                      className="w-full bg-amber-500 text-slate-900 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-amber-500/20"
                    >
                      Save Annotation
                    </button>
                  </div>
                ) : (
                  <div className="bg-white/5 p-5 rounded-3xl border border-white/5">
                    <p className="text-white font-bold italic leading-relaxed text-sm">
                      {selectedImage.item.caption || "No annotations added yet."}
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-auto pt-6 border-t border-white/10 space-y-4">
                <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-500">
                  <span>File Reference</span>
                  <span className="text-slate-300">{selectedImage.item.id}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedImage.item.tags.map(tag => (
                    <span key={tag} className="px-3 py-1 bg-amber-500/10 text-amber-500 rounded-lg text-[9px] font-black uppercase tracking-tighter italic">
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Unified Header */}
      <div className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-100 p-4 flex items-center justify-between shadow-sm -mx-4 md:mx-0 mb-4">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 -ml-2 text-slate-400 hover:text-slate-700">
            <ArrowLeft size={20} />
          </button>
          <div className="flex flex-col">
            {isEditingTitle ? (
              <input
                autoFocus
                className="text-lg font-bold text-slate-900 outline-none bg-slate-50 rounded px-2 -ml-2"
                value={tempTitle}
                onChange={e => setTempTitle(e.target.value)}
                onBlur={handleSaveTitle}
              />
            ) : (
              <h1 onClick={() => setIsEditingTitle(true)} className="text-xl md:text-2xl font-black text-slate-900 flex items-center gap-2 cursor-text tracking-tight">
                {project.title}
              </h1>
            )}
            <button
              onClick={() => {
                if (customer && onUpdateCustomer) {
                  setEditCustomerData({ ...customer });
                  setIsEditingCustomer(true);
                }
              }}
              className="text-xs text-slate-500 hover:text-teal-600 flex items-center gap-1 transition-colors"
            >
              {customer?.name || 'No Client'}
              {customer && onUpdateCustomer && <Edit3 size={10} />}
            </button>
          </div>
        </div>
        <div className="flex gap-2">
          {customer?.address && (
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(customer.address)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 bg-slate-50 text-slate-600 rounded-lg hover:bg-slate-100"
            >
              <Navigation size={18} />
            </a>
          )}
          {permissions.canAssignJobs && (
            <button
              onClick={() => setShowAssignModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-teal-50 text-teal-600 rounded-lg hover:bg-teal-100 text-xs font-bold"
            >
              <Users size={16} />
              <span>{assignmentCount > 0 ? `Team (${assignmentCount})` : 'Assign'}</span>
            </button>
          )}
          {onDeleteProject && <button onClick={handleDeleteProject} className="p-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-100"><Trash2 size={18} /></button>}
        </div>
      </div>

      {/* Address Info - Client vs Site */}
      {(customer?.address || project.siteAddress) && (
        <div className="px-2 pb-2 flex flex-col gap-1.5">
          {customer?.address && (
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(customer.address)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-xl border border-blue-100 text-xs hover:bg-blue-100 transition-all"
            >
              <MapPin size={12} className="text-blue-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="text-[8px] font-black text-blue-400 uppercase tracking-widest block">Client Address</span>
                <span className="text-blue-700 font-bold truncate block">{customer.address}</span>
              </div>
              <Navigation size={12} className="text-blue-400 shrink-0" />
            </a>
          )}
          {project.siteAddress && project.siteAddress !== customer?.address && (
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(project.siteAddress)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2 bg-amber-50 rounded-xl border border-amber-100 text-xs hover:bg-amber-100 transition-all"
            >
              <MapPin size={12} className="text-amber-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="text-[8px] font-black text-amber-400 uppercase tracking-widest block">Site Address</span>
                <span className="text-amber-700 font-bold truncate block">{project.siteAddress}</span>
              </div>
              <Navigation size={12} className="text-amber-400 shrink-0" />
            </a>
          )}
        </div>
      )}

      <div className="px-2 pb-4">
        <div className="flex flex-wrap gap-1.5 bg-slate-100 p-1 rounded-xl w-full">
          {[
            { id: 'log', label: 'Log', icon: StickyNote },
            { id: 'photos', label: 'Photos', icon: ImageIcon },
            { id: 'drawings', label: 'Drawings', icon: Ruler },
            { id: 'materials', label: 'Materials', icon: PackageSearch },
            { id: 'finance', label: 'Finance', icon: ReceiptText },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-[9px] font-bold transition-all whitespace-nowrap ${activeTab === tab.id
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
                }`}
            >
              <tab.icon size={12} /> {tab.label}
            </button>
          ))}
        </div>
      </div>

      {
    activeTab === 'log' && (
      <div className="max-w-4xl mx-auto space-y-4 animate-in fade-in slide-in-from-bottom-2 pb-8">
        <div className="flex justify-between items-center px-2">
          <div className="flex items-center gap-2">
            <StickyNote className="text-amber-500" size={16} />
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Site Notes & Daily Log</h3>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => { if (confirm('Clear notepad?')) { setNotepadContent(''); handleSaveNotepad(''); } }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 text-slate-400 rounded-xl text-[9px] font-black uppercase hover:bg-red-50 hover:text-red-500 transition-all"
            >
              <Eraser size={12} /> Clear Pad
            </button>
            <button
              onClick={toggleRecording}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-[9px] font-black uppercase transition-all ${isRecording ? 'bg-red-500 text-white' : 'bg-teal-500 text-white shadow-lg shadow-teal-200'}`}
            >
              {isRecording ? <MicOff size={12} /> : <Mic size={12} />}
              {isRecording ? 'Listening' : 'Dictate'}
            </button>
          </div>
        </div>

        <div className="bg-[#fffdf2] rounded-[24px] border border-amber-100 shadow-xl relative">
          {/* Collapsible header */}
          <button
            onClick={() => setIsNotepadExpanded(!isNotepadExpanded)}
            className="w-full flex items-center justify-between p-4 md:px-10 md:pt-6 md:pb-2 relative z-10"
          >
            <span className="text-[9px] font-black text-amber-400 uppercase tracking-widest">
              {notepadContent ? `${notepadContent.split('\n').length} lines` : 'Empty'}
            </span>
            <div className="flex items-center gap-1.5 text-amber-400">
              <span className="text-[9px] font-black uppercase">{isNotepadExpanded ? 'Collapse' : 'Expand'}</span>
              {isNotepadExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </div>
          </button>

          {isNotepadExpanded && (
            <>
              {/* Notepad lines decoration */}
              <div className="absolute inset-0 pointer-events-none opacity-[0.03] rounded-[24px]" style={{ backgroundImage: 'linear-gradient(#000 1px, transparent 1px)', backgroundSize: '100% 2.5rem' }}></div>

              <textarea
                ref={notepadTextareaRef}
                className="w-full bg-transparent px-4 pb-4 md:px-10 md:pb-10 text-base md:text-lg font-medium text-slate-800 outline-none resize-none leading-[2.5rem] relative z-10 placeholder:text-amber-200 placeholder:italic min-h-[200px] overflow-hidden"
                placeholder="Start typing your site notes here, or use the mic to dictate..."
                value={notepadContent}
                onChange={(e) => {
                  setNotepadContent(e.target.value);
                  handleSaveNotepad(e.target.value);
                }}
              />
            </>
          )}

          <div className="p-3 border-t border-amber-50 bg-[#fffef7] flex justify-between items-center text-[8px] font-black text-amber-300 uppercase tracking-widest italic relative z-10 px-4 md:px-10 rounded-b-[24px]">
            <span>Ref: {project.id.substr(0, 8)}</span>
            <span>Saved: {new Date(project.updatedAt).toLocaleTimeString()}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 rounded-xl border border-amber-100 text-[9px] font-bold text-amber-700 italic">
          <Sparkles size={10} className="shrink-0" />
          Notes saved automatically. Use dictation for hands-free updates.
        </div>
      </div>
    )
  }

  {
    activeTab === 'photos' && (
      <div className="animate-in fade-in space-y-4">
        {/* Hidden file inputs */}
        <input
          ref={photoInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => handleFileInputChange(e, false)}
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => handleFileInputChange(e, false)}
        />
        <input
          ref={galleryFinderInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleGalleryFinderFiles}
        />

        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 md:gap-4">
          {/* Camera button */}
          <button
            onClick={() => cameraInputRef.current?.click()}
            disabled={isUploadingPhoto}
            className="aspect-square border-2 border-dashed border-amber-300 rounded-xl flex flex-col items-center justify-center text-amber-500 hover:border-amber-400 hover:bg-amber-50 transition-all bg-amber-50/50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUploadingPhoto ? <Loader2 size={24} className="animate-spin" /> : <Camera size={24} />}
            <span className="text-[9px] font-bold mt-1">{isUploadingPhoto ? 'Uploading...' : 'Camera'}</span>
          </button>
          {/* Add from files button */}
          <button
            onClick={() => photoInputRef.current?.click()}
            disabled={isUploadingPhoto}
            className="aspect-square border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center text-slate-400 hover:border-amber-300 hover:text-amber-500 transition-all bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUploadingPhoto ? <Loader2 size={24} className="animate-spin" /> : <Plus size={24} />}
            <span className="text-[9px] font-bold mt-1">{isUploadingPhoto ? 'Uploading...' : 'Add'}</span>
          </button>
          {/* Find from Gallery by location */}
          <button
            onClick={startGalleryFinder}
            disabled={isScanning}
            className="aspect-square border-2 border-dashed border-teal-300 rounded-xl flex flex-col items-center justify-center text-teal-500 hover:border-teal-400 hover:bg-teal-50 transition-all bg-teal-50/50 disabled:opacity-50"
          >
            {isScanning ? <Loader2 size={24} className="animate-spin" /> : <MapPin size={24} />}
            <span className="text-[9px] font-bold mt-1 text-center leading-tight">{isScanning ? 'Scanning...' : 'Find by\nLocation'}</span>
          </button>
          {(project.photos || []).map(photo => (
            <div
              key={photo.id}
              onClick={() => openImageViewer(photo, 'photo')}
              className="aspect-square relative group overflow-hidden rounded-xl border border-slate-100 cursor-pointer"
            >
              <img src={photo.url} className="w-full h-full object-cover" alt="Site" />
              <button
                onClick={(e) => { e.stopPropagation(); onSaveProject({ ...project, photos: (project.photos || []).filter(p => p.id !== photo.id) }); }}
                className="absolute top-1 right-1 p-1 bg-black/50 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>

        {/* Gallery Finder Results */}
        {galleryResults.length > 0 && (
          <div className="bg-teal-50 rounded-2xl border border-teal-200 p-4 space-y-3 animate-in fade-in">
            <div className="flex justify-between items-center">
              <h4 className="text-[10px] font-black text-teal-700 uppercase tracking-widest flex items-center gap-1.5">
                <MapPin size={12} /> Gallery Photos ({galleryResults.length})
              </h4>
              <button onClick={() => { setGalleryResults([]); setShowGalleryFinder(false); }} className="text-[9px] font-black text-teal-400 uppercase hover:text-red-500">Close</button>
            </div>
            <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
              {galleryResults.map((r, i) => (
                <div key={i} className="relative rounded-xl overflow-hidden border-2 border-white shadow-sm">
                  <img src={r.preview} className="w-full aspect-square object-cover" alt="Gallery" />
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent p-1.5">
                    {r.hasGps && r.distance !== null ? (
                      <span className={`text-[8px] font-black uppercase ${r.distance < 500 ? 'text-green-400' : r.distance < 2000 ? 'text-amber-400' : 'text-red-400'}`}>
                        {r.distance < 1000 ? `${Math.round(r.distance)}m away` : `${(r.distance / 1000).toFixed(1)}km away`}
                      </span>
                    ) : (
                      <span className="text-[8px] font-bold text-slate-300">No GPS data</span>
                    )}
                  </div>
                  <button
                    onClick={() => addGalleryPhoto(r.file)}
                    className="absolute top-1 right-1 p-1 bg-teal-500 text-white rounded-lg shadow-lg"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  {
    activeTab === 'drawings' && (
      <div className="animate-in fade-in space-y-4">
        {/* Hidden file input for drawings */}
        <input
          ref={drawingInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => handleFileInputChange(e, true)}
        />

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <button
            onClick={() => drawingInputRef.current?.click()}
            disabled={isUploadingPhoto}
            className="aspect-square border-4 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center text-slate-400 hover:border-amber-300 hover:text-amber-500 transition-all bg-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUploadingPhoto ? <Loader2 size={40} className="animate-spin" /> : <Plus size={40} />}
            <span className="text-[10px] font-black uppercase mt-2">{isUploadingPhoto ? 'Uploading...' : 'Add Drawing'}</span>
          </button>
          {(project.drawings || []).map(drawing => (
            <div
              key={drawing.id}
              onClick={() => openImageViewer(drawing, 'drawing')}
              className="aspect-square relative group overflow-hidden rounded-3xl border-2 border-slate-100 cursor-pointer"
            >
              <img src={drawing.url} className="w-full h-full object-cover group-hover:scale-110 transition-all duration-500" alt="Drawing" />
              <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Plus className="text-white" size={32} />
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); onSaveProject({ ...project, drawings: (project.drawings || []).filter(p => p.id !== drawing.id) }); }}
                className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      </div>
    )
  }

  {
    activeTab === 'materials' && (
      <MaterialsTracker project={project} quotes={quotes} settings={settings} onSaveProject={onSaveProject} />
    )
  }

  {
    activeTab === 'finance' && (
      <div className="space-y-3 md:space-y-6 animate-in fade-in">
        {/* Profit Summary for completed jobs */}
        {project.status === 'completed' && (
          <JobProfitSummary jobPackId={project.id} quotes={quotes} />
        )}

        <div className="flex justify-between items-center">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Financials</h3>
          <button onClick={onCreateQuote} className="bg-teal-500 text-white px-6 py-2 rounded-xl text-xs font-black uppercase shadow-lg shadow-teal-200">+ New Doc</button>
        </div>
        <div className="bg-white rounded-3xl border-2 border-slate-100 overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-4 md:px-6 py-4 text-[10px] font-black text-slate-400 uppercase">Document</th>
                <th className="px-4 md:px-6 py-4 text-[10px] font-black text-slate-400 uppercase text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {quotes.map(q => (
                <tr key={q.id}>
                  <td className="px-4 md:px-6 py-4"><p className="text-sm font-black text-slate-900">{q.title}</p></td>
                  <td className="px-4 md:px-6 py-4 text-right"><button onClick={() => onViewQuote(q.id)} className="text-amber-500 font-black text-xs uppercase">View</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }
      <ConfirmDialog
        open={showDeleteConfirm}
        title="Delete Job Pack"
        message={`Delete job pack "${project.title}"? This will remove all photos, drawings, notes, and materials. This cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleConfirmDeleteProject}
        onCancel={() => setShowDeleteConfirm(false)}
      />
      {showAssignModal && (
        <JobAssignmentModal
          jobPackId={project.id}
          jobTitle={project.title}
          onClose={() => setShowAssignModal(false)}
          onAssignmentChange={refreshAssignmentCount}
        />
      )}

      {/* Customer Edit Modal */}
      {isEditingCustomer && customer && onUpdateCustomer && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in zoom-in-95">
            <h3 className="font-black text-lg text-slate-900 uppercase tracking-tight">Edit Client Details</h3>
            <div className="space-y-3">
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Name</label>
                <input className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-3 py-2 text-sm font-bold text-slate-900 outline-none focus:border-teal-400" value={editCustomerData.name || ''} onChange={e => setEditCustomerData({ ...editCustomerData, name: e.target.value })} />
              </div>
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Company</label>
                <input className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-3 py-2 text-sm font-bold text-slate-900 outline-none focus:border-teal-400" value={editCustomerData.company || ''} onChange={e => setEditCustomerData({ ...editCustomerData, company: e.target.value })} />
              </div>
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Phone</label>
                <input type="tel" className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-3 py-2 text-sm font-bold text-slate-900 outline-none focus:border-teal-400" value={editCustomerData.phone || ''} onChange={e => setEditCustomerData({ ...editCustomerData, phone: e.target.value })} />
              </div>
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Email</label>
                <input type="email" className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-3 py-2 text-sm font-bold text-slate-900 outline-none focus:border-teal-400" value={editCustomerData.email || ''} onChange={e => setEditCustomerData({ ...editCustomerData, email: e.target.value })} />
              </div>
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Address</label>
                <input className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-3 py-2 text-sm font-bold text-slate-900 outline-none focus:border-teal-400" value={editCustomerData.address || ''} onChange={e => setEditCustomerData({ ...editCustomerData, address: e.target.value })} />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={async () => {
                  if (editCustomerData.name?.trim()) {
                    await onUpdateCustomer(editCustomerData as Customer);
                    setIsEditingCustomer(false);
                    toast.success('Client Updated', editCustomerData.name);
                  }
                }}
                className="flex-1 bg-teal-500 text-white py-3 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg"
              >
                Save Changes
              </button>
              <button onClick={() => setIsEditingCustomer(false)} className="px-6 bg-slate-50 text-slate-400 py-3 rounded-xl font-black text-xs uppercase">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
