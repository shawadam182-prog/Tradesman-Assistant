import { useCallback, useEffect, useRef } from 'react';

/**
 * Android-safe file input hook.
 *
 * Creates a singleton <input type="file"> on document.body OUTSIDE React's
 * component tree. This survives React re-renders, unmounts, and Android's
 * WebView lifecycle (page freeze/resume).
 *
 * Listens to BOTH 'change' AND 'input' events because Android Chrome
 * sometimes fires 'input' instead of 'change' (Chromium bug #90917).
 *
 * Includes a visibility-change polling fallback that checks the input's
 * .files property when the page regains visibility, in case neither event fires.
 */

// Singleton: one input per accept type, persists for the app's lifetime
const inputCache = new Map<string, HTMLInputElement>();

function getOrCreateInput(accept: string): HTMLInputElement {
  const existing = inputCache.get(accept);
  if (existing && document.body.contains(existing)) {
    return existing;
  }

  const input = document.createElement('input');
  input.type = 'file';
  input.accept = accept;
  // Hide off-screen but keep in DOM
  input.style.position = 'fixed';
  input.style.top = '-9999px';
  input.style.left = '-9999px';
  input.style.opacity = '0';
  input.style.pointerEvents = 'none';
  input.setAttribute('aria-hidden', 'true');
  document.body.appendChild(input);
  inputCache.set(accept, input);
  return input;
}

interface UseFileInputOptions {
  accept?: string;
}

export function useFileInput(
  onFileSelected: (file: File) => void,
  options: UseFileInputOptions = {}
) {
  const callbackRef = useRef(onFileSelected);
  callbackRef.current = onFileSelected;
  const pickerOpenRef = useRef(false);
  const handledRef = useRef(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const accept = options.accept || '';

  // Clean up polling on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, []);

  const openFilePicker = useCallback(() => {
    const input = getOrCreateInput(accept);
    handledRef.current = false;
    pickerOpenRef.current = true;

    // Suppress DataContext sync while picker is open
    (window as any).__bqSuppressSync = true;

    // Reset value so same file can be re-selected
    input.value = '';

    // Remove any previous listeners
    const oldCleanup = (input as any).__cleanup;
    if (oldCleanup) oldCleanup();

    const deliver = () => {
      if (handledRef.current) return;
      if (input.files && input.files.length > 0) {
        handledRef.current = true;
        pickerOpenRef.current = false;
        callbackRef.current(input.files[0]);
        // Release sync suppression after a delay
        setTimeout(() => { (window as any).__bqSuppressSync = false; }, 5000);
        // Stop polling
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
        }
      }
    };

    // Listen to BOTH change and input events (Android fires input, desktop fires change)
    const onChangeOrInput = () => deliver();
    input.addEventListener('change', onChangeOrInput);
    input.addEventListener('input', onChangeOrInput);

    // Polling fallback: when page regains visibility, poll .files for up to 5 seconds
    const onVisibility = () => {
      if (document.visibilityState === 'visible' && pickerOpenRef.current && !handledRef.current) {
        let attempts = 0;
        if (pollingRef.current) clearInterval(pollingRef.current);
        pollingRef.current = setInterval(() => {
          attempts++;
          deliver();
          if (handledRef.current || attempts > 50) {
            if (pollingRef.current) {
              clearInterval(pollingRef.current);
              pollingRef.current = null;
            }
            if (!handledRef.current) {
              // Picker was cancelled or event truly lost - release sync
              pickerOpenRef.current = false;
              (window as any).__bqSuppressSync = false;
            }
          }
        }, 100);
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    // Store cleanup function
    (input as any).__cleanup = () => {
      input.removeEventListener('change', onChangeOrInput);
      input.removeEventListener('input', onChangeOrInput);
      document.removeEventListener('visibilitychange', onVisibility);
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };

    // Trigger the native file picker
    input.click();
  }, [accept]);

  return openFilePicker;
}
