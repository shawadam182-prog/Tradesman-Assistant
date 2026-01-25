import React, { useState, useRef, useEffect, useCallback, ReactNode } from 'react';
import { X, Mic, MicOff, Check, RotateCcw, Loader2, AlertCircle } from 'lucide-react';
import { hapticTap, hapticSuccess, hapticError } from '../src/hooks/useHaptic';

// Detect iOS for voice input fallback
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

export interface VoiceFieldConfig {
  key: string;
  label: string;
  icon?: ReactNode;
}

interface LiveVoiceFillProps {
  fields: VoiceFieldConfig[];
  currentData: Record<string, string>;
  onComplete: (data: Record<string, string>) => void;
  onCancel: () => void;
  parseAction: (input: string) => Promise<Record<string, any>>;
  title?: string;
}

type FieldStatus = 'empty' | 'existing' | 'detected' | 'detecting';

export const LiveVoiceFill: React.FC<LiveVoiceFillProps> = ({
  fields,
  currentData,
  onComplete,
  onCancel,
  parseAction,
  title = 'Voice Fill',
}) => {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [detectedData, setDetectedData] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const parseTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const requestIdRef = useRef(0);
  const lastParsedTextRef = useRef('');

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopListening();
      if (parseTimeoutRef.current) {
        clearTimeout(parseTimeoutRef.current);
      }
    };
  }, []);

  // Get field status for display
  const getFieldStatus = (key: string): FieldStatus => {
    if (isProcessing && !detectedData[key] && !currentData[key]) {
      return 'detecting';
    }
    if (detectedData[key]) {
      return 'detected';
    }
    if (currentData[key]) {
      return 'existing';
    }
    return 'empty';
  };

  // Get display value for a field
  const getFieldValue = (key: string): string => {
    if (detectedData[key]) {
      return detectedData[key];
    }
    if (currentData[key]) {
      return currentData[key];
    }
    return '';
  };

  // Parse transcript with debounce and request tracking
  const parseTranscript = useCallback(async (text: string) => {
    if (!text.trim() || text.trim() === lastParsedTextRef.current) {
      return;
    }

    const currentRequestId = ++requestIdRef.current;
    lastParsedTextRef.current = text.trim();
    setIsProcessing(true);
    setError(null);

    try {
      const result = await parseAction(text);

      // Ignore stale responses
      if (currentRequestId !== requestIdRef.current) {
        return;
      }

      // Filter out null/empty values and only update detected fields
      const validFields = Object.fromEntries(
        Object.entries(result).filter(([_, v]) => v !== null && v !== '' && v !== undefined)
      ) as Record<string, string>;

      setDetectedData(prev => ({ ...prev, ...validFields }));

      if (Object.keys(validFields).length > 0) {
        hapticSuccess();
      }
    } catch (err) {
      if (currentRequestId === requestIdRef.current) {
        setError('Failed to parse. Keep speaking or try again.');
        hapticError();
      }
    } finally {
      if (currentRequestId === requestIdRef.current) {
        setIsProcessing(false);
      }
    }
  }, [parseAction]);

  // Schedule parsing with debounce (1.5s after last speech)
  const scheduleParse = useCallback((text: string) => {
    if (parseTimeoutRef.current) {
      clearTimeout(parseTimeoutRef.current);
    }

    parseTimeoutRef.current = setTimeout(() => {
      parseTranscript(text);
    }, 1500);
  }, [parseTranscript]);

  // Native speech recognition (non-iOS)
  const startNativeListening = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError('Speech recognition not supported in this browser.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-GB';
    recognition.maxAlternatives = 1;

    let finalTranscript = '';
    let silenceTimeout: NodeJS.Timeout | null = null;

    recognition.onstart = () => {
      hapticTap();
      setIsListening(true);
      setError(null);
    };

    recognition.onresult = (event: any) => {
      let interim = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += result + ' ';
        } else {
          interim += result;
        }
      }

      const fullTranscript = (finalTranscript + interim).trim();
      setTranscript(fullTranscript);

      // Schedule parse on silence
      scheduleParse(fullTranscript);

      // Reset silence timeout
      if (silenceTimeout) clearTimeout(silenceTimeout);
      silenceTimeout = setTimeout(() => {
        recognition.stop();
      }, 6000); // Stop after 6s silence - gives time to pause and think
    };

    recognition.onend = () => {
      setIsListening(false);
      if (silenceTimeout) clearTimeout(silenceTimeout);

      // Final parse on stop
      if (finalTranscript.trim()) {
        parseTranscript(finalTranscript.trim());
      }
    };

    recognition.onerror = (event: any) => {
      setIsListening(false);
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        setError(`Speech error: ${event.error}`);
        hapticError();
      }
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch (e) {
      setError('Could not start speech recognition.');
    }
  }, [scheduleParse, parseTranscript]);

  // MediaRecorder fallback (iOS) - batch at end
  const startMediaRecorderListening = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/mp4')
          ? 'audio/mp4'
          : 'audio/wav';

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        streamRef.current?.getTracks().forEach(track => track.stop());
        setIsListening(false);

        if (audioChunksRef.current.length > 0) {
          setIsProcessing(true);
          setTranscript('Processing audio...');

          try {
            const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
            const base64 = await blobToBase64(audioBlob);

            // Call transcription endpoint
            const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gemini`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
              },
              body: JSON.stringify({
                action: 'transcribeAudio',
                data: { audioBase64: base64, mimeType },
              }),
            });

            if (!response.ok) throw new Error('Transcription failed');

            const { text } = await response.json();

            if (text) {
              setTranscript(text);
              await parseTranscript(text);
            } else {
              setError('No speech detected. Please try again.');
            }
          } catch (err) {
            setError('Failed to process audio. Please try again.');
            hapticError();
          } finally {
            setIsProcessing(false);
          }
        }
      };

      mediaRecorder.onerror = () => {
        setIsListening(false);
        setError('Recording failed. Please try again.');
        hapticError();
      };

      hapticTap();
      setIsListening(true);
      setError(null);
      setTranscript('Listening...');
      mediaRecorder.start();

      // Auto-stop after 15 seconds
      setTimeout(() => {
        if (mediaRecorderRef.current?.state === 'recording') {
          mediaRecorderRef.current.stop();
        }
      }, 15000);

    } catch (err: any) {
      if (err.name === 'NotAllowedError') {
        setError('Microphone access denied. Please enable in settings.');
      } else {
        setError('Could not access microphone.');
      }
      hapticError();
    }
  }, [parseTranscript]);

  const startListening = useCallback(() => {
    setTranscript('');
    lastParsedTextRef.current = '';

    if (isIOS) {
      startMediaRecorderListening();
    } else {
      startNativeListening();
    }
  }, [startNativeListening, startMediaRecorderListening]);

  const stopListening = useCallback(() => {
    hapticTap();

    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }

    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }

    streamRef.current?.getTracks().forEach(track => track.stop());

    if (parseTimeoutRef.current) {
      clearTimeout(parseTimeoutRef.current);
    }
  }, []);

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const clearField = (key: string) => {
    hapticTap();
    setDetectedData(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const resetAll = () => {
    hapticTap();
    setDetectedData({});
    setTranscript('');
    lastParsedTextRef.current = '';
    setError(null);
  };

  const handleComplete = () => {
    hapticSuccess();

    // Merge detected data with current data (detected takes precedence, but only for non-empty fields)
    const merged: Record<string, string> = {};

    for (const field of fields) {
      const detected = detectedData[field.key];
      const existing = currentData[field.key];

      // Use detected value if present, otherwise keep existing
      if (detected) {
        merged[field.key] = detected;
      } else if (existing) {
        merged[field.key] = existing;
      }
    }

    onComplete(merged);
  };

  const hasDetectedFields = Object.keys(detectedData).length > 0;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[300] flex items-end sm:items-center justify-center animate-in fade-in duration-200">
      <div className="bg-white w-full sm:w-[480px] sm:max-h-[90vh] rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col animate-in slide-in-from-bottom-4 duration-300">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <h2 className="font-black text-lg text-slate-900">{title}</h2>
          <button
            onClick={onCancel}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-all"
          >
            <X size={20} />
          </button>
        </div>

        {/* Mic Button Section */}
        <div className="p-6 flex flex-col items-center gap-4">
          <button
            onClick={toggleListening}
            disabled={isProcessing && !isListening}
            className={`w-24 h-24 rounded-full flex items-center justify-center transition-all shadow-lg ${
              isListening
                ? 'bg-red-500 text-white animate-pulse shadow-red-200'
                : isProcessing
                  ? 'bg-amber-500 text-white shadow-amber-200'
                  : 'bg-slate-900 text-white hover:bg-slate-800 shadow-slate-300 active:scale-95'
            }`}
          >
            {isProcessing && !isListening ? (
              <Loader2 size={36} className="animate-spin" />
            ) : isListening ? (
              <MicOff size={36} />
            ) : (
              <Mic size={36} />
            )}
          </button>

          <p className="text-sm text-slate-500 text-center">
            {isListening
              ? 'Listening... Tap to stop'
              : isProcessing
                ? 'Detecting fields...'
                : 'Tap to start speaking'}
          </p>

          {/* Transcript Display */}
          {transcript && (
            <div className="w-full bg-slate-50 rounded-xl p-3 max-h-24 overflow-y-auto">
              <p className="text-sm text-slate-700 leading-relaxed">{transcript}</p>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="w-full flex items-center gap-2 p-3 bg-red-50 text-red-600 rounded-xl">
              <AlertCircle size={16} />
              <p className="text-xs font-medium">{error}</p>
            </div>
          )}
        </div>

        {/* Fields Display */}
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          <div className="space-y-2">
            {fields.map((field) => {
              const status = getFieldStatus(field.key);
              const value = getFieldValue(field.key);

              return (
                <div
                  key={field.key}
                  className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${
                    status === 'detected'
                      ? 'bg-teal-50 border-teal-200'
                      : status === 'detecting'
                        ? 'bg-amber-50 border-amber-200 animate-pulse'
                        : status === 'existing'
                          ? 'bg-slate-50 border-slate-100'
                          : 'bg-white border-slate-100'
                  }`}
                >
                  {/* Icon */}
                  <div className={`shrink-0 ${
                    status === 'detected' ? 'text-teal-500' : 'text-slate-300'
                  }`}>
                    {field.icon || <div className="w-4 h-4" />}
                  </div>

                  {/* Label & Value */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      {field.label}
                    </p>
                    <p className={`text-sm font-medium truncate ${
                      status === 'detected'
                        ? 'text-teal-700'
                        : status === 'existing'
                          ? 'text-slate-500'
                          : 'text-slate-300 italic'
                    }`}>
                      {value || (status === 'detecting' ? 'Detecting...' : 'Not detected')}
                    </p>
                  </div>

                  {/* Status Indicator */}
                  {status === 'detected' && (
                    <div className="flex items-center gap-1">
                      <Check size={16} className="text-teal-500" />
                      <button
                        onClick={() => clearField(field.key)}
                        className="p-1 text-slate-300 hover:text-red-500 transition-colors"
                        title="Clear this field"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )}

                  {status === 'existing' && (
                    <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                      existing
                    </span>
                  )}

                  {status === 'detecting' && (
                    <Loader2 size={16} className="text-amber-500 animate-spin" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Actions */}
        <div className="p-4 border-t border-slate-100 flex gap-2">
          {hasDetectedFields && (
            <button
              onClick={resetAll}
              className="p-3 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-all"
              title="Reset all detected fields"
            >
              <RotateCcw size={20} />
            </button>
          )}

          <button
            onClick={handleComplete}
            disabled={!hasDetectedFields && !Object.values(currentData).some(v => v)}
            className={`flex-1 py-3 px-6 rounded-xl font-bold text-sm transition-all ${
              hasDetectedFields
                ? 'bg-teal-500 text-white hover:bg-teal-600 shadow-lg shadow-teal-200'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
            }`}
          >
            {hasDetectedFields ? 'Use These Details' : 'No Fields Detected'}
          </button>
        </div>
      </div>
    </div>
  );
};

// Helper to convert Blob to base64
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
