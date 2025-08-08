'use client';

import { useEffect, useState } from 'react';

export function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const current = document.documentElement.classList.contains('dark');
    setIsDark(current);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
      localStorage.setItem('bc-theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('bc-theme', 'light');
    }
  }, [isDark, mounted]);

  if (!mounted) return null;

  return (
    <button
      type="button"
      aria-label="Alternar tema"
      onClick={() => setIsDark((v) => !v)}
      className="rounded-md border px-2.5 py-1.5 text-xs hover:bg-gray-50 dark:hover:bg-gray-800"
    >
      {isDark ? 'Dark' : 'Light'}
    </button>
  );
}
