'use client';

import React, { useState, useRef, useEffect } from 'react';
import type { CustomCellRendererProps } from 'ag-grid-react';
import { ShieldAlert, CheckCircle2, RotateCcw, AlertTriangle } from 'lucide-react';

export interface HateoasActionCellData {
  disputeId?: string;
  transactionId?: string;
  hateoasAllowedActions?: string[];
  links?: Array<{ rel: string; href: string; method: string }>;
  [key: string]: unknown;
}

export function HateoasActionCellRenderer(props: CustomCellRendererProps<HateoasActionCellData>) {
  const data = props.data;
  const actions = data?.hateoasAllowedActions ||
    (data?.links?.map((l) => l.rel) ?? ['provide-evidence', 'make-offer', 'accept-claim']);

  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const startHold = (actionName: string) => {
    setActiveAction(actionName);
    setProgress(0);

    const startTime = Date.now();
    const duration = 2000; // 2 seconds hold-to-confirm

    progressIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, Math.round((elapsed / duration) * 100));
      setProgress(pct);
    }, 50);

    timerRef.current = setTimeout(() => {
      clearInterval(progressIntervalRef.current!);
      setProgress(100);
      executeAction(actionName);
    }, duration);
  };

  const cancelHold = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    setActiveAction(null);
    setProgress(0);
  };

  const executeAction = (actionName: string) => {
    setActiveAction(null);
    setProgress(0);
    const id = data?.disputeId || data?.transactionId || 'Record';
    setToastMessage(`Executed ${actionName.toUpperCase()} for ${id} (Undo active 5s)`);
    setTimeout(() => {
      setToastMessage(null);
    }, 5000);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, []);

  if (!data) return <span className="text-slate-500 text-xs">—</span>;

  return (
    <div className="flex items-center gap-1.5 h-full relative py-1">
      {toastMessage ? (
        <div className="flex items-center gap-1.5 bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-[11px] px-2 py-0.5 rounded font-mono animate-fade-in">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          <span className="truncate max-w-[200px]">{toastMessage}</span>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="ml-1 text-[10px] text-emerald-200 underline hover:text-white"
          >
            Undo
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-1.5">
          {actions.includes('accept-claim') && (
            <button
              type="button"
              onMouseDown={() => startHold('accept-claim')}
              onMouseUp={cancelHold}
              onMouseLeave={cancelHold}
              onTouchStart={() => startHold('accept-claim')}
              onTouchEnd={cancelHold}
              className="relative overflow-hidden px-2 py-0.5 text-[11px] font-bold rounded bg-emerald-950/40 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-900/40 cursor-pointer transition-colors"
            >
              {activeAction === 'accept-claim' && (
                <div
                  className="absolute inset-0 bg-emerald-500/30 transition-all duration-75"
                  style={{ width: `${progress}%` }}
                />
              )}
              <span className="relative z-10 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                Accept Claim
              </span>
            </button>
          )}

          {actions.includes('make-offer') && (
            <button
              type="button"
              onMouseDown={() => startHold('make-offer')}
              onMouseUp={cancelHold}
              onMouseLeave={cancelHold}
              onTouchStart={() => startHold('make-offer')}
              onTouchEnd={cancelHold}
              className="relative overflow-hidden px-2 py-0.5 text-[11px] font-bold rounded bg-amber-950/40 text-amber-300 border border-amber-500/30 hover:bg-amber-900/40 cursor-pointer transition-colors"
            >
              {activeAction === 'make-offer' && (
                <div
                  className="absolute inset-0 bg-amber-500/30 transition-all duration-75"
                  style={{ width: `${progress}%` }}
                />
              )}
              <span className="relative z-10 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 text-amber-400" />
                Make Offer
              </span>
            </button>
          )}

          {actions.includes('provide-evidence') && (
            <button
              type="button"
              onMouseDown={() => startHold('provide-evidence')}
              onMouseUp={cancelHold}
              onMouseLeave={cancelHold}
              onTouchStart={() => startHold('provide-evidence')}
              onTouchEnd={cancelHold}
              className="relative overflow-hidden px-2 py-0.5 text-[11px] font-bold rounded bg-cyan-950/40 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-900/40 cursor-pointer transition-colors"
            >
              {activeAction === 'provide-evidence' && (
                <div
                  className="absolute inset-0 bg-cyan-500/30 transition-all duration-75"
                  style={{ width: `${progress}%` }}
                />
              )}
              <span className="relative z-10 flex items-center gap-1">
                <ShieldAlert className="w-3 h-3 text-cyan-400" />
                Evidence
              </span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default HateoasActionCellRenderer;
