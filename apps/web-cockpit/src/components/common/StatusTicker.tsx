'use client';

import React from 'react';
import { Activity } from 'lucide-react';

export interface StatusTickerProps {
  status?: string | null;
  loading?: boolean;
  className?: string;
}

export function StatusTicker({
  status,
  loading = false,
  className = '',
}: StatusTickerProps) {
  if (!status && !loading) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-slate-900/80 border border-slate-700/60 shadow-lg backdrop-blur-md text-xs font-mono transition-all duration-300 ${
        loading ? 'text-cyan-300' : 'text-slate-400'
      } ${className}`}
    >
      {loading ? (
        <span className="flex items-center gap-1" aria-hidden="true">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse [animation-delay:150ms]" />
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse [animation-delay:300ms]" />
        </span>
      ) : (
        <Activity className="w-3.5 h-3.5 text-slate-500" />
      )}

      <span className="truncate max-w-xs sm:max-w-md">
        {status || 'Autonomous clearing pipeline processing...'}
      </span>
    </div>
  );
}
