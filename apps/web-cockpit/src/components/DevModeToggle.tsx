'use client';

import React from 'react';
import { useUiMode } from '@/context/UiModeContext';
import { Terminal } from 'lucide-react';

export function DevModeToggle() {
  const { isProduction, isDevEnvironment, showTechnicalDetails, toggleTechnicalDetails } =
    useUiMode();

  // In strict production, technical details and dev toggles are completely hidden unless dev environment enabled
  if (isProduction || !isDevEnvironment) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={toggleTechnicalDetails}
      aria-label={showTechnicalDetails ? 'Dev Mode is ON. Click to toggle OFF.' : 'Dev Mode is OFF. Click to toggle ON.'}
      aria-pressed={showTechnicalDetails}
      className={`group relative w-8 h-8 sm:w-9 sm:h-9 xl:w-10 xl:h-10 rounded-xl flex items-center justify-center transition-all duration-200 border cursor-pointer select-none active:scale-95 shadow-xs ${
        showTechnicalDetails
          ? 'bg-amber-500/15 text-amber-900 dark:text-amber-300 border-amber-500/40 shadow-xs'
          : 'bg-slate-100 dark:bg-[#060b14] text-slate-600 dark:text-slate-400 border-slate-200/80 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20'
      }`}
    >
      <Terminal className={`w-4 h-4 sm:w-4.5 sm:h-4.5 xl:w-5 xl:h-5 ${showTechnicalDetails ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'}`} />

      {/* Floating tooltip on hover */}
      <span className="absolute -bottom-9 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-lg bg-slate-900/95 dark:bg-slate-100/95 backdrop-blur-md text-white dark:text-slate-900 text-xs font-mono whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-xl z-50 border border-white/10 dark:border-black/10">
        {showTechnicalDetails ? 'Dev Mode: ON' : 'Dev Mode: OFF'}
      </span>
    </button>
  );
}
