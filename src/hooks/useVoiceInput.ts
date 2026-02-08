import { useState, useRef, useCallback } from 'react';
import { hapticTap, hapticSuccess } from './useHaptic';

/**
 * Normalizes spoken numbers to digits.
 * Converts "one two three" → "123", "oh seven" → "07", etc.
 * Essential for email addresses, phone numbers, and addresses.
 */
function normalizeSpokenNumbers(text: string): string {
  const wordToDigit: Record<string, string> = {
    'zero': '0',
    'oh': '0',
    'one': '1',
    'two': '2',
    'to': '2',
    'too': '2',
    'three': '3',
    'four': '4',
    'for': '4',
    'five': '5',
    'six': '6',
    'seven': '7',
    'eight': '8',
    'nine': '9',
    'niner': '9',
  };

  // Replace word numbers with digits (case insensitive, word boundaries)
  let result = text;
  for (const [word, digit] of Object.entries(wordToDigit)) {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    result = result.replace(regex, digit);
  }

  // Clean up spaces between consecutive digits (e.g., "0 7 7 5 1" → "07751")
  // But only when they appear to be part of a number sequence
  result = result.replace(/(\d)\s+(?=\d)/g, '$1');

  return result;
}

interface UseVoiceInputOptions {
  onResult: (text: string) => void;
  onError?: (error: string) => void;
  lang?: string;
}

interface UseVoiceInputReturn {
  isListening: boolean;
  isSupported: boolean;
  startListening: () => void;
  stopListening: () => void;
}

// Detect iOS (iPhone, iPad, iPod)
const isIOS = (): boolean => {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
};

// Check if native Web Speech API is available and working
const hasNativeSpeechRecognition = (): boolean => {
  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  // iOS Safari has webkitSpeechRecognition but it doesn't work reliably
  return !!SpeechRecognition && !isIOS();
};

// Check if MediaRecorder is available (for cloud fallback)
const hasMediaRecorder = (): boolean => {
  return typeof MediaRecorder !== 'undefined' && typeof navigator.mediaDevices?.getUserMedia === 'function';
};

export function useVoiceInput({ onResult, onError, lang = 'en-GB' }: UseVoiceInputOptions): UseVoiceInputReturn {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const isSupported = hasNativeSpeechRecognition() || hasMediaRecorder();

  // Cloud transcription via Gemini (for iOS)
  const transcribeWithCloud = useCallback(async (audioBlob: Blob): Promise<string> => {
    const base64 = await blobToBase64(audioBlob);

    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gemini`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        action: 'transcribeAudio',
        data: { audioBase64: base64, mimeType: audioBlob.type || 'audio/webm' },
      }),
    });

    if (!response.ok) {
      throw new Error('Transcription failed');
    }

    const result = await response.json();
    return result.text || '';
  }, []);

  // Start listening using native Speech Recognition
  const startNativeListening = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = lang;

    recognition.onstart = () => {
      hapticTap();
      setIsListening(true);
    };
    recognition.onend = () => setIsListening(false);

    recognition.onresult = (event: any) => {
      const rawText = event.results[0][0].transcript;
      const text = normalizeSpokenNumbers(rawText);
      hapticSuccess();
      onResult(text);
    };

    recognition.onerror = (event: any) => {
      setIsListening(false);
      if (event.error === 'not-allowed') {
        onError?.('Microphone access denied. Please enable in settings.');
      } else if (event.error !== 'aborted') {
        onError?.(`Speech recognition error: ${event.error}`);
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [lang, onResult, onError]);

  // Start listening using MediaRecorder (iOS fallback)
  const startMediaRecorderListening = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Determine supported MIME type
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
        // Stop all tracks
        streamRef.current?.getTracks().forEach(track => track.stop());

        if (audioChunksRef.current.length > 0) {
          const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });

          try {
            const rawText = await transcribeWithCloud(audioBlob);
            if (rawText) {
              const text = normalizeSpokenNumbers(rawText);
              hapticSuccess();
              onResult(text);
            } else {
              onError?.('No speech detected. Please try again.');
            }
          } catch (err) {
            console.error('Cloud transcription error:', err);
            onError?.('Transcription failed. Please try again.');
          }
        }

        setIsListening(false);
      };

      mediaRecorder.onerror = () => {
        setIsListening(false);
        onError?.('Recording failed. Please try again.');
      };

      setIsListening(true);
      hapticTap();
      mediaRecorder.start();

      // Auto-stop after 30 seconds to allow longer dictation
      setTimeout(() => {
        if (mediaRecorderRef.current?.state === 'recording') {
          mediaRecorderRef.current.stop();
        }
      }, 30000);

    } catch (err: any) {
      setIsListening(false);
      if (err.name === 'NotAllowedError') {
        onError?.('Microphone access denied. Please enable in settings.');
      } else {
        onError?.('Could not access microphone.');
      }
    }
  }, [transcribeWithCloud, onResult, onError]);

  const startListening = useCallback(() => {
    if (isListening) {
      // Already listening, stop instead
      stopListening();
      return;
    }

    if (hasNativeSpeechRecognition()) {
      startNativeListening();
    } else if (hasMediaRecorder()) {
      startMediaRecorderListening();
    } else {
      onError?.('Voice input is not supported in this browser.');
    }
  }, [isListening, startNativeListening, startMediaRecorderListening, onError]);

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
    setIsListening(false);
  }, []);

  return {
    isListening,
    isSupported,
    startListening,
    stopListening,
  };
}

// Helper to convert Blob to base64
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      // Remove data URL prefix (e.g., "data:audio/webm;base64,")
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
