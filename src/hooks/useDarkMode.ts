import { useState, useEffect } from 'react';

export function useDarkMode() {
  const [isDark, setIsDark] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('bq_dark_mode');
      if (saved !== null) return saved === 'true';
      // Check system preference as default
      return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('bq_dark_mode', isDark.toString());
  }, [isDark]);

  const toggle = () => setIsDark(prev => !prev);

  return { isDark, toggle, setIsDark };
}
