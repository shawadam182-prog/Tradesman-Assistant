import { useState, useEffect, useCallback, useRef } from 'react';

interface UseFormDraftOptions<T> {
  key: string;
  data: T;
  enabled?: boolean;
  debounceMs?: number;
  expiryMs?: number;
  onBackgroundSave?: () => void;
}

interface UseFormDraftReturn<T> {
  savedDraft: T | null;
  clearDraft: () => void;
  saveDraftNow: () => void;
}

const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

export function useFormDraft<T>({
  key,
  data,
  enabled = true,
  debounceMs = 1000,
  expiryMs = SEVEN_DAYS,
  onBackgroundSave,
}: UseFormDraftOptions<T>): UseFormDraftReturn<T> {
  // Recover draft once on mount
  const [savedDraft] = useState<T | null>(() => {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed._draftSavedAt && Date.now() - parsed._draftSavedAt < expiryMs) {
        const { _draftSavedAt, ...draft } = parsed;
        return draft as T;
      }
      localStorage.removeItem(key);
    } catch { /* ignore */ }
    return null;
  });

  // Refs to avoid stale closures in event handlers
  const dataRef = useRef(data);
  dataRef.current = data;
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;
  const onBackgroundSaveRef = useRef(onBackgroundSave);
  onBackgroundSaveRef.current = onBackgroundSave;

  const saveDraftNow = useCallback(() => {
    if (!enabledRef.current) return;
    try {
      localStorage.setItem(key, JSON.stringify({ ...dataRef.current, _draftSavedAt: Date.now() }));
    } catch { /* quota exceeded */ }
  }, [key]);

  const clearDraft = useCallback(() => {
    try { localStorage.removeItem(key); } catch { /* ignore */ }
  }, [key]);

  // Debounced auto-save on data change
  useEffect(() => {
    if (!enabled) return;
    const timeout = setTimeout(saveDraftNow, debounceMs);
    return () => clearTimeout(timeout);
  }, [data, saveDraftNow, debounceMs, enabled]);

  // Immediate save + server save on background
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        saveDraftNow();
        onBackgroundSaveRef.current?.();
      }
    };
    const handleBeforeUnload = () => saveDraftNow();
    const handlePageHide = () => {
      saveDraftNow();
      onBackgroundSaveRef.current?.();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handlePageHide);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handlePageHide);
    };
  }, [saveDraftNow]);

  return { savedDraft, clearDraft, saveDraftNow };
}
