'use client';

import React from 'react';
import { AlertTriangle, Info, X } from 'lucide-react';

export interface ErrorBannerProps {
  error: string | null;
  onDismiss?: () => void;
  onRetry?: () => void;
}

function isInfoMessage(msg: string): boolean {
  const lower = (msg || '').toLowerCase();
  return (
    lower.includes('limited results') ||
    lower.includes('fewer products') ||
    lower.includes('showing') ||
    lower.includes('sample catalog') ||
    lower.includes('fallback')
  );
}

export function ErrorBanner({ error, onDismiss, onRetry }: ErrorBannerProps) {
  if (!error) return null;

  const info = isInfoMessage(error);

  return (
    <div
      role={info ? 'status' : 'alert'}
      className={`flex items-start justify-between gap-3 rounded-2xl px-4 py-3 text-xs sm:text-sm border transition-all animate-fade-in ${
        info
          ? 'bg-cyan-950/40 border-cyan-800/60 text-cyan-300'
          : 'bg-amber-950/40 border-amber-800/60 text-amber-300'
      }`}
    >
      <div className="flex items-start gap-2.5">
        <span className="shrink-0 mt-0.5">
          {info ? (
            <Info className="w-4 h-4 text-cyan-400" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          )}
        </span>
        <div>
          <p className="font-medium leading-relaxed">{error}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-1 text-xs underline hover:no-underline font-bold transition-opacity"
            >
              Retry Operation
            </button>
          )}
        </div>
      </div>

      {onDismiss && (
        <button
          onClick={onDismiss}
          className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
