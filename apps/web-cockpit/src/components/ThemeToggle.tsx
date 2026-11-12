'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from './ThemeProvider';
import { Sun, Moon, Laptop, Check } from 'lucide-react';

export function ThemeToggle() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const ActiveIcon = resolvedTheme === 'dark' ? Moon : Sun;

  return (
    <div
      ref={containerRef}
      className="relative"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle theme selector"
        aria-expanded={isOpen}
        className="w-8 h-8 sm:w-9 sm:h-9 xl:w-10 xl:h-10 rounded-xl flex items-center justify-center border border-slate-200/80 dark:border-white/10 bg-slate-100 hover:bg-slate-200 dark:bg-[#060b14] dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300 transition-all cursor-pointer shadow-xs active:scale-95"
      >
        <ActiveIcon className="w-4 h-4 sm:w-4.5 sm:h-4.5 xl:w-5 xl:h-5 text-cyan-600 dark:text-cyan-400" />
      </button>

      {/* Floating Theme Selection Menu */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-1.5 w-32 p-1 rounded-xl bg-white dark:bg-[#0c1424] border border-slate-200/80 dark:border-white/10 shadow-xl shadow-black/10 dark:shadow-black/40 backdrop-blur-xl z-50 animate-in fade-in zoom-in-95 duration-150">
          <button
            type="button"
            onClick={() => {
              setTheme('light');
              setIsOpen(false);
            }}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              theme === 'light'
                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50'
            }`}
          >
            <span className="flex items-center gap-2">
              <Sun className="w-3.5 h-3.5 text-amber-500" />
              <span>Light</span>
            </span>
            {theme === 'light' && <Check className="w-3 h-3 text-amber-500" />}
          </button>

          <button
            type="button"
            onClick={() => {
              setTheme('dark');
              setIsOpen(false);
            }}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              theme === 'dark'
                ? 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50'
            }`}
          >
            <span className="flex items-center gap-2">
              <Moon className="w-3.5 h-3.5 text-cyan-400" />
              <span>Dark</span>
            </span>
            {theme === 'dark' && <Check className="w-3 h-3 text-cyan-400" />}
          </button>

          <button
            type="button"
            onClick={() => {
              setTheme('system');
              setIsOpen(false);
            }}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              theme === 'system'
                ? 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50'
            }`}
          >
            <span className="flex items-center gap-2">
              <Laptop className="w-3.5 h-3.5 text-slate-500" />
              <span>System</span>
            </span>
            {theme === 'system' && <Check className="w-3 h-3 text-cyan-400" />}
          </button>
        </div>
      )}
    </div>
  );
}
